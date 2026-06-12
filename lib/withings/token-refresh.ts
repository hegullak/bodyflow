import { and, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import { withingsConnections, type WithingsConnection } from "@/db/schema";
import { refreshAccessToken, WithingsApiError } from "./api";
import {
  decryptConnectionTokens,
  encryptTokensForStorage,
  type WithingsConnectionSecrets,
} from "./connection-secrets";

const REFRESH_BUFFER_MS = 5 * 60 * 1000;

const inFlightRefreshes = new Map<string, Promise<WithingsConnectionSecrets>>();

function tokenIsFresh(tokenExpiresAt: Date | null): boolean {
  const expiresAt = tokenExpiresAt?.getTime() ?? 0;
  return expiresAt - Date.now() >= REFRESH_BUFFER_MS;
}

async function getConnectionById(connectionId: string): Promise<WithingsConnection | null> {
  const db = getDb();
  return (
    (await db.query.withingsConnections.findFirst({
      where: eq(withingsConnections.id, connectionId),
    })) ?? null
  );
}

async function refreshAndPersistTokens(
  connection: WithingsConnection,
  refreshToken: string,
  snapshotExpiresAt: Date | null | undefined,
): Promise<WithingsConnectionSecrets> {
  const tokens = await refreshAccessToken(refreshToken);
  const db = getDb();
  const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);
  const encrypted = encryptTokensForStorage({
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
  });

  const expiryCondition =
    snapshotExpiresAt == null
      ? isNull(withingsConnections.tokenExpiresAt)
      : eq(withingsConnections.tokenExpiresAt, snapshotExpiresAt);

  const updated = await db
    .update(withingsConnections)
    .set({
      accessToken: encrypted.accessToken,
      refreshToken: encrypted.refreshToken,
      tokenExpiresAt,
      scope: tokens.scope,
      updatedAt: new Date(),
    })
    .where(and(eq(withingsConnections.id, connection.id), expiryCondition))
    .returning();

  if (updated.length > 0) {
    return decryptConnectionTokens(updated[0]);
  }

  const latest = await getConnectionById(connection.id);
  if (!latest) {
    throw new Error("Withings connection disappeared during token refresh.");
  }
  return decryptConnectionTokens(latest);
}

async function ensureFreshTokensInner(
  connection: WithingsConnection,
): Promise<WithingsConnectionSecrets> {
  const latest = await getConnectionById(connection.id);
  if (!latest) {
    throw new Error("Withings connection not found.");
  }

  if (tokenIsFresh(latest.tokenExpiresAt)) {
    return decryptConnectionTokens(latest);
  }

  const secrets = decryptConnectionTokens(latest);
  const snapshotExpiresAt = latest.tokenExpiresAt;

  try {
    return await refreshAndPersistTokens(latest, secrets.refreshToken, snapshotExpiresAt);
  } catch (error) {
    if (error instanceof WithingsApiError && (error.status === 601 || error.status === 503)) {
      const recovered = await getConnectionById(latest.id);
      if (recovered && tokenIsFresh(recovered.tokenExpiresAt)) {
        return decryptConnectionTokens(recovered);
      }
    }
    throw error;
  }
}

export async function ensureFreshTokens(
  connection: WithingsConnection,
): Promise<WithingsConnectionSecrets> {
  if (tokenIsFresh(connection.tokenExpiresAt)) {
    return decryptConnectionTokens(connection);
  }

  const inFlight = inFlightRefreshes.get(connection.id);
  if (inFlight) return inFlight;

  const refreshPromise = ensureFreshTokensInner(connection).finally(() => {
    inFlightRefreshes.delete(connection.id);
  });

  inFlightRefreshes.set(connection.id, refreshPromise);
  return refreshPromise;
}
