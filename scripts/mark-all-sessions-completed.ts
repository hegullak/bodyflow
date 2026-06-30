/**
 * Mark all active sessions as completed (ended).
 * Run: npx tsx --env-file=.env.local scripts/mark-all-sessions-completed.ts
 */

import { eq, isNull } from "drizzle-orm";
import { getDb } from "../db/client";
import { trainingSessions } from "../db/schema";

async function main() {
  console.log("[mark-sessions] Starting...");
  const db = getDb();

  // Find all active sessions (endedAt is null)
  const activeSessions = await db
    .select({ id: trainingSessions.id, programName: trainingSessions.programName })
    .from(trainingSessions)
    .where(isNull(trainingSessions.endedAt));

  console.log(`[mark-sessions] Found ${activeSessions.length} active sessions`);

  if (activeSessions.length === 0) {
    console.log("[mark-sessions] No active sessions to mark");
    return;
  }

  // Mark all as completed (set endedAt to now)
  const now = new Date();
  const updated = await db
    .update(trainingSessions)
    .set({ endedAt: now })
    .where(isNull(trainingSessions.endedAt));

  console.log(`[mark-sessions] Marked all sessions as completed`);
  activeSessions.forEach((s) => {
    console.log(`  ✓ ${s.programName}`);
  });

  console.log("[mark-sessions] Done!");
}

main().catch((err) => {
  console.error("[mark-sessions] Error:", err);
  process.exit(1);
});
