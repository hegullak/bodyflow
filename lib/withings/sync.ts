import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { dailyBodyLogs, withingsConnections, type WithingsConnection } from "@/db/schema";
import { scopeBy } from "@/lib/auth/scope";
import { logger } from "@/lib/logger";
import {
  fetchMeasurements,
  refreshAccessToken,
  subscribeToBodyMetrics,
  WithingsApiError,
} from "./api";
import {
  decryptConnectionTokens,
  encryptTokensForStorage,
  type WithingsConnectionSecrets,
} from "./connection-secrets";
import {
  getWithingsWebhookUrl,
  isWithingsConfigured,
  WITHINGS_INITIAL_LOOKBACK_SECONDS,
  WITHINGS_SYNC_INTERVAL_MS,
} from "./config";
import { decodeWeightKg, unixToIsoDate, type WithingsMeasureGroup } from "./measurements";

export async function getWithingsConnection(userId: string) {
  const db = getDb();
  return (
    (await db.query.withingsConnections.findFirst({
      where: eq(withingsConnections.userId, userId),
    })) ?? null
  );
}

export async function getWithingsConnectionByWithingsUserId(withingsUserId: string) {
  const db = getDb();
  return (
    (await db.query.withingsConnections.findFirst({
      where: eq(withingsConnections.withingsUserId, withingsUserId),
    })) ?? null
  );
}

async function ensureFreshTokens(connection: WithingsConnection): Promise<WithingsConnectionSecrets> {
  const secrets = decryptConnectionTokens(connection);
  const expiresAt = connection.tokenExpiresAt?.getTime() ?? 0;
  const needsRefresh = expiresAt - Date.now() < 5 * 60 * 1000;

  if (!needsRefresh) return secrets;

  const tokens = await refreshAccessToken(secrets.refreshToken);
  const db = getDb();
  const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);
  const encrypted = encryptTokensForStorage({
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
  });

  const [updated] = await db
    .update(withingsConnections)
    .set({
      accessToken: encrypted.accessToken,
      refreshToken: encrypted.refreshToken,
      tokenExpiresAt,
      scope: tokens.scope,
      updatedAt: new Date(),
    })
    .where(eq(withingsConnections.id, connection.id))
    .returning();

  return decryptConnectionTokens(updated);
}

async function ensureWebhookSubscription(secrets: WithingsConnectionSecrets): Promise<void> {
  if (secrets.webhookSubscribed) return;

  const webhookUrl = getWithingsWebhookUrl();
  if (webhookUrl.includes("localhost")) {
    return;
  }

  try {
    const fresh = await ensureFreshTokens(secrets);
    await subscribeToBodyMetrics(fresh.accessToken, webhookUrl);
    const db = getDb();
    await db
      .update(withingsConnections)
      .set({ webhookSubscribed: true, updatedAt: new Date() })
      .where(eq(withingsConnections.id, secrets.id));
  } catch (error) {
    logger.warn("Withings", "Webhook subscription failed", {
      reason: error instanceof Error ? error.message : "unknown",
    });
  }
}

function shouldSync(connection: WithingsConnection, force: boolean): boolean {
  if (force) return true;
  if (!connection.lastSyncAt) return true;
  return Date.now() - connection.lastSyncAt.getTime() >= WITHINGS_SYNC_INTERVAL_MS;
}

async function applyWeightGroups(
  userId: string,
  groups: WithingsMeasureGroup[],
): Promise<number> {
  const db = getDb();
  let applied = 0;

  for (const group of groups) {
    const weightKg = decodeWeightKg(group.measures);
    if (weightKg == null) continue;

    const logDate = unixToIsoDate(group.date);
    const existing = await db.query.dailyBodyLogs.findFirst({
      where: scopeBy(dailyBodyLogs.userId, userId, eq(dailyBodyLogs.logDate, logDate)),
    });

    if (existing?.weightSource === "manual") continue;

    await db
      .insert(dailyBodyLogs)
      .values({
        userId,
        logDate,
        weightKg,
        weightSource: "withings",
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [dailyBodyLogs.userId, dailyBodyLogs.logDate],
        set: {
          weightKg,
          weightSource: "withings",
          updatedAt: new Date(),
        },
      });

    applied += 1;
  }

  return applied;
}

export interface WithingsSyncResult {
  synced: boolean;
  applied: number;
  reason?: string;
}

export async function syncWithingsForUser(
  userId: string,
  options: { force?: boolean; startdate?: number; enddate?: number } = {},
): Promise<WithingsSyncResult> {
  if (!isWithingsConfigured()) {
    return { synced: false, applied: 0, reason: "not_configured" };
  }

  const connection = await getWithingsConnection(userId);
  if (!connection) {
    return { synced: false, applied: 0, reason: "not_connected" };
  }

  if (!shouldSync(connection, options.force ?? false)) {
    return { synced: false, applied: 0, reason: "recently_synced" };
  }

  try {
    const fresh = await ensureFreshTokens(connection);
    void ensureWebhookSubscription(fresh);

    const measureParams =
      options.startdate != null || options.enddate != null
        ? {
            startdate: options.startdate,
            enddate: options.enddate,
          }
        : fresh.lastWithingsUpdate
          ? { lastupdate: fresh.lastWithingsUpdate }
          : {
              startdate: Math.floor(Date.now() / 1000) - WITHINGS_INITIAL_LOOKBACK_SECONDS,
              enddate: Math.floor(Date.now() / 1000),
            };

    const body = await fetchMeasurements(fresh.accessToken, measureParams);
    const applied = await applyWeightGroups(userId, body.measuregrps ?? []);

    const db = getDb();
    await db
      .update(withingsConnections)
      .set({
        lastSyncAt: new Date(),
        lastWithingsUpdate: body.updatetime ?? fresh.lastWithingsUpdate ?? undefined,
        updatedAt: new Date(),
      })
      .where(eq(withingsConnections.id, fresh.id));

    logger.info("Withings", "Sync completed", { userId, applied });
    return { synced: true, applied };
  } catch (error) {
    if (error instanceof WithingsApiError && error.status === 100) {
      const db = getDb();
      await db
        .update(withingsConnections)
        .set({ lastSyncAt: new Date(), updatedAt: new Date() })
        .where(eq(withingsConnections.userId, userId));
      return { synced: true, applied: 0, reason: "no_new_data" };
    }

    logger.error("Withings", "Sync failed", {
      userId,
      reason: error instanceof Error ? error.message : "unknown",
    });
    return { synced: false, applied: 0, reason: "error" };
  }
}

export async function syncWithingsForWithingsUser(
  withingsUserId: string,
  range?: { startdate: number; enddate: number },
): Promise<WithingsSyncResult> {
  const connection = await getWithingsConnectionByWithingsUserId(withingsUserId);
  if (!connection) {
    return { synced: false, applied: 0, reason: "not_connected" };
  }

  return syncWithingsForUser(connection.userId, {
    force: true,
    startdate: range?.startdate,
    enddate: range?.enddate,
  });
}

export async function saveWithingsConnection(input: {
  userId: string;
  withingsUserId: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  scope: string;
}) {
  const db = getDb();
  const tokenExpiresAt = new Date(Date.now() + input.expiresIn * 1000);
  const encrypted = encryptTokensForStorage({
    accessToken: input.accessToken,
    refreshToken: input.refreshToken,
  });

  await db
    .insert(withingsConnections)
    .values({
      userId: input.userId,
      withingsUserId: input.withingsUserId,
      accessToken: encrypted.accessToken,
      refreshToken: encrypted.refreshToken,
      tokenExpiresAt,
      scope: input.scope,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: withingsConnections.userId,
      set: {
        withingsUserId: input.withingsUserId,
        accessToken: encrypted.accessToken,
        refreshToken: encrypted.refreshToken,
        tokenExpiresAt,
        scope: input.scope,
        webhookSubscribed: false,
        updatedAt: new Date(),
      },
    });
}

export async function disconnectWithings(userId: string): Promise<void> {
  const db = getDb();
  await db.delete(withingsConnections).where(eq(withingsConnections.userId, userId));
}

export function scheduleWithingsSync(userId: string): void {
  if (!isWithingsConfigured()) return;

  void syncWithingsForUser(userId).catch((error) => {
    logger.warn("Withings", "Background sync failed", {
      userId,
      reason: error instanceof Error ? error.message : "unknown",
    });
  });
}
