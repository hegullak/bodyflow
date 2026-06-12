import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

import { eq } from "drizzle-orm";
import { getDb } from "../db/client";
import { withingsConnections } from "../db/schema";
import {
  encryptTokensForStorage,
  needsTokenEncryption,
} from "../lib/withings/connection-secrets";
import {
  decryptWithingsToken,
  getWithingsTokenEncryptionKey,
} from "../lib/withings/token-crypto";

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("[encrypt-withings-tokens] DATABASE_URL is not set.");
    process.exit(1);
  }

  try {
    getWithingsTokenEncryptionKey();
  } catch (error) {
    console.error(
      "[encrypt-withings-tokens] WITHINGS_TOKEN_ENCRYPTION_KEY is missing or invalid.",
    );
    if (error instanceof Error) console.error(error.message);
    process.exit(1);
  }

  const db = getDb();
  const rows = await db.query.withingsConnections.findMany();

  let encrypted = 0;
  let skipped = 0;

  for (const row of rows) {
    if (!needsTokenEncryption(row)) {
      skipped += 1;
      continue;
    }

    const sealed = encryptTokensForStorage({
      accessToken: decryptWithingsToken(row.accessToken),
      refreshToken: decryptWithingsToken(row.refreshToken),
    });

    await db
      .update(withingsConnections)
      .set({
        accessToken: sealed.accessToken,
        refreshToken: sealed.refreshToken,
        updatedAt: new Date(),
      })
      .where(eq(withingsConnections.id, row.id));

    encrypted += 1;
    console.log(`[encrypt-withings-tokens] encrypted connection id=${row.id} user_id=${row.userId}`);
  }

  console.log(
    `[encrypt-withings-tokens] done. encrypted=${encrypted} skipped=${skipped} total=${rows.length}`,
  );
}

main().catch((error) => {
  console.error("[encrypt-withings-tokens] failed.");
  if (error instanceof Error) console.error(error.message);
  process.exit(1);
});
