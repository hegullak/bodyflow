import { eq, ilike } from "drizzle-orm";
import { getDb } from "@/db/client";
import { exercises } from "@/db/schema";
import type { GymaholicSetRow } from "./parser";
import { groupBySession } from "./parser";

export interface ExerciseMatch {
  exerciseKey: string;
  exerciseName: string;
  found: boolean;
  matchedId?: string;
  matchType?: "key" | "name";
}

export interface DryRunReport {
  totalRows: number;
  totalSessions: number;
  totalExerciseInstances: number;
  totalSets: number;
  exerciseMatches: ExerciseMatch[];
  unmatchedExercises: ExerciseMatch[];
  invalidRows: number;
  errors: string[];
}

/**
 * Analyze parsed rows: count sessions, exercises, sets, and check what
 * exercises need to be created. Does NOT modify database.
 */
export async function generateDryRun(
  rows: GymaholicSetRow[],
  errors: Array<{ rowNumber: number; reason: string }>,
): Promise<DryRunReport> {
  const db = getDb();
  const sessions = groupBySession(rows);

  // Collect all unique exercise keys and names.
  const exerciseKeyMap = new Map<string, string>(); // exerciseKey -> exerciseName
  for (const row of rows) {
    if (!exerciseKeyMap.has(row.exerciseKey)) {
      exerciseKeyMap.set(row.exerciseKey, row.exerciseName);
    }
  }

  // Try to match each exercise key against existing exercises.
  const matches: ExerciseMatch[] = [];
  const unmatched: ExerciseMatch[] = [];

  for (const [key, name] of exerciseKeyMap) {
    // First, try to match by slug (exercise_key maps to exercise.slug).
    let found = await db.query.exercises.findFirst({
      where: eq(exercises.slug, key),
      columns: { id: true },
    });

    if (found) {
      matches.push({
        exerciseKey: key,
        exerciseName: name,
        found: true,
        matchedId: found.id,
        matchType: "key",
      });
      continue;
    }

    // Second, try to match by name (case-insensitive).
    found = await db.query.exercises.findFirst({
      where: ilike(exercises.name, name),
      columns: { id: true },
    });

    if (found) {
      matches.push({
        exerciseKey: key,
        exerciseName: name,
        found: true,
        matchedId: found.id,
        matchType: "name",
      });
      continue;
    }

    // No match: will need to create.
    unmatched.push({
      exerciseKey: key,
      exerciseName: name,
      found: false,
    });
  }

  return {
    totalRows: rows.length,
    totalSessions: sessions.size,
    totalExerciseInstances: Array.from(sessions.values()).reduce(
      (sum, exMap) => sum + exMap.size,
      0,
    ),
    totalSets: rows.length,
    exerciseMatches: matches,
    unmatchedExercises: unmatched,
    invalidRows: errors.length,
    errors: errors.map((e) => `Row ${e.rowNumber}: ${e.reason}`),
  };
}
