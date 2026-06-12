import dotenv from "dotenv";
import { readFileSync } from "node:fs";
import { join } from "node:path";

dotenv.config({ path: ".env.local" });
dotenv.config();

import { getDb } from "./client";
import { bodyMeasurements } from "./schema";
import { parseMeasurementFiles } from "@/lib/import/parse-measurements";

async function main() {
  const userId = process.env.SEED_USER_ID;
  if (!userId) {
    console.error("[seed] Set SEED_USER_ID to your Clerk user id (e.g. user_xxx).");
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error("[seed] DATABASE_URL is not set.");
    process.exit(1);
  }

  const dir = join(process.cwd(), "data", "import");
  const file1 = readFileSync(join(dir, "body-measurements-1.txt"), "utf8");
  const file2 = readFileSync(join(dir, "body-measurements-2.txt"), "utf8");
  const entries = parseMeasurementFiles(file1, file2);

  console.log(`[seed] parsed ${entries.length} unique measurement dates`);

  const db = getDb();
  let inserted = 0;

  for (const entry of entries) {
    await db
      .insert(bodyMeasurements)
      .values({
        userId,
        measuredOn: entry.measuredOn,
        waistCm: entry.waistCm,
        chestCm: entry.chestCm,
        hipCm: entry.hipCm,
        note: entry.note ?? null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [bodyMeasurements.userId, bodyMeasurements.measuredOn],
        set: {
          waistCm: entry.waistCm,
          chestCm: entry.chestCm,
          hipCm: entry.hipCm,
          note: entry.note ?? null,
          updatedAt: new Date(),
        },
      });
    inserted += 1;
  }

  console.log(`[seed] upserted ${inserted} measurements for ${userId}`);
}

main().catch((err) => {
  console.error("[seed] failed:", err);
  process.exit(1);
});
