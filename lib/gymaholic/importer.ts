import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { workoutSessions, workoutSetLogs } from "@/db/schema";
import { scopeBy } from "@/lib/auth/scope";
import type { GymaholicSetRow } from "./parser";
import { groupBySession } from "./parser";
import { getOrCreateExercise } from "./exercise-matcher";
import { logger } from "@/lib/logger";

export interface ImportStats {
  sessionsCreated: number;
  sessionsSkipped: number;
  setsCreated: number;
  setsSkipped: number;
}

/**
 * Import Gymaholic CSV rows into bodyflow. Idempotent: checks for existing
 * sessions by startedAt timestamp before insert.
 */
export async function importGymaholicSets(
  userId: string,
  rows: GymaholicSetRow[],
): Promise<ImportStats> {
  const db = getDb();
  const sessions = groupBySession(rows);

  const stats: ImportStats = {
    sessionsCreated: 0,
    sessionsSkipped: 0,
    setsCreated: 0,
    setsSkipped: 0,
  };

  for (const [workoutDatetime, exMap] of sessions) {
    try {
      // Parse datetime into a UTC timestamp.
      const startedAtDate = new Date(workoutDatetime.replace(" ", "T") + ":00Z");

      // Check if session already exists for this user at this time.
      const existing = await db.query.workoutSessions.findFirst({
        where: and(
          scopeBy(workoutSessions.userId, userId),
          eq(workoutSessions.startedAt, startedAtDate),
        ),
        columns: { id: true },
      });

      let sessionId: string;

      if (existing) {
        sessionId = existing.id;
        stats.sessionsSkipped++;
      } else {
        // Create new session.
        const sample = Array.from(exMap.values())[0]![0];
        const [session] = await db
          .insert(workoutSessions)
          .values({
            userId,
            programName: sample.workoutName,
            startedAt: startedAtDate,
          })
          .returning({ id: workoutSessions.id });

        sessionId = session.id;
        stats.sessionsCreated++;
      }

      // For each exercise in this session...
      for (const [exerciseKey, setRows] of exMap) {
        const sample = setRows[0];
        const exerciseId = await getOrCreateExercise(exerciseKey, sample.exerciseName);

        // Import each set.
        for (const row of setRows) {
          // Check if set already exists (by sessionId, exerciseId, setNumber).
          const existingSet = await db.query.workoutSetLogs.findFirst({
            where: and(
              eq(workoutSetLogs.sessionId, sessionId),
              eq(workoutSetLogs.exerciseId, exerciseId),
              eq(workoutSetLogs.setNumber, row.setIndex),
            ),
            columns: { id: true },
          });

          if (existingSet) {
            stats.setsSkipped++;
            continue;
          }

          // Create set.
          await db.insert(workoutSetLogs).values({
            sessionId,
            exerciseId,
            exerciseName: row.exerciseName,
            setNumber: row.setIndex,
            weightKg: row.weightKg || null,
            reps: row.reps,
            completedAt: new Date(row.workoutDatetime.replace(" ", "T") + ":00Z"),
          });

          stats.setsCreated++;
        }
      }
    } catch (err) {
      logger.error(
        "GymaholicImport",
        `Failed to import session at ${workoutDatetime}`,
        { err: String(err) },
      );
      throw err;
    }
  }

  return stats;
}
