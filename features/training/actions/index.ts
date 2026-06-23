"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db/client";
import { exerciseFavorites } from "@/db/schema";
import { requireUserId } from "@/lib/auth/current-user";
import {
  getSessionHistory,
  deleteSession,
  logSet,
  unlogSet,
  endSession,
} from "../sessions";
import {
  getProgram,
  renameProgram,
  deleteProgram,
  duplicateProgram,
  updateProgramExercise,
  removeProgramExercise,
  reorderProgramExercises,
  createSuperset,
  removeSuperset,
  addExerciseToProgram,
} from "../programs";

export interface TrainingSession {
  id: string;
  programName: string;
  startedAt: Date;
  endedAt: Date | null;
  durationMinutes: number | null;
}

// Sessions
export async function getTrainingHistoryAction(): Promise<TrainingSession[]> {
  const userId = await requireUserId();
  return getSessionHistory(userId);
}

export async function deleteTrainingSessionAction(sessionId: string): Promise<void> {
  const userId = await requireUserId();
  await deleteSession(userId, sessionId);
}

export async function logSetAction(
  sessionId: string,
  programExerciseId: string,
  setNumber: number,
  weightKg: number | null,
  reps: number | null,
): Promise<void> {
  const userId = await requireUserId();
  await logSet(sessionId, userId, programExerciseId, setNumber, weightKg, reps);
}

export async function unlogSetAction(
  sessionId: string,
  programExerciseId: string,
  setNumber: number,
): Promise<void> {
  const userId = await requireUserId();
  await unlogSet(sessionId, userId, programExerciseId, setNumber);
}

export async function endSessionAction(sessionId: string): Promise<void> {
  const userId = await requireUserId();
  await endSession(sessionId, userId);
}

// Programs
export async function getProgramAction(programId: string) {
  const userId = await requireUserId();
  return getProgram(programId, userId);
}

export async function updateProgramNameAction(programId: string, name: string): Promise<void> {
  const userId = await requireUserId();
  await renameProgram(programId, userId, name);
}

export async function deleteProgramAction(programId: string): Promise<void> {
  const userId = await requireUserId();
  await deleteProgram(programId, userId);
}

export async function duplicateProgramAction(programId: string) {
  const userId = await requireUserId();
  const copy = await duplicateProgram(programId, userId);
  if (!copy) throw new Error("Failed to duplicate program");
  return copy;
}

export async function updateExerciseAction(
  programId: string,
  exerciseId: string,
  patch: { sets?: number; reps?: number; restSeconds?: number },
): Promise<void> {
  const userId = await requireUserId();
  await updateProgramExercise(exerciseId, programId, userId, patch);
}

export async function removeExerciseAction(programId: string, exerciseId: string): Promise<void> {
  const userId = await requireUserId();
  await removeProgramExercise(exerciseId, programId, userId);
  revalidatePath("/training/workout");
  revalidatePath(`/training/programs/${programId}`);
}

export async function reorderExercisesAction(programId: string, orderIds: string[]): Promise<void> {
  const userId = await requireUserId();
  await reorderProgramExercises(programId, userId, orderIds);
}

export async function createSupersetAction(programId: string, exerciseIds: string[]): Promise<void> {
  const userId = await requireUserId();
  await createSuperset(programId, userId, exerciseIds);
}

export async function removeSupersetAction(programId: string, supersetId: string): Promise<void> {
  const userId = await requireUserId();
  await removeSuperset(supersetId, programId, userId);
}

export async function addExerciseAction(
  programId: string,
  exerciseId: string,
): Promise<void> {
  const userId = await requireUserId();
  await addExerciseToProgram(programId, userId, exerciseId);
  revalidatePath("/training/workout");
  revalidatePath(`/training/programs/${programId}`);
}

// Favorites
export async function getExerciseFavoriteIdsAction(): Promise<string[]> {
  try {
    const userId = await requireUserId();
    const db = getDb();
    const results = await db
      .select({ exerciseId: exerciseFavorites.exerciseId })
      .from(exerciseFavorites)
      .where(eq(exerciseFavorites.userId, userId));
    console.log("✅ getExerciseFavoriteIdsAction - found", results.length, "favorites");
    return results.map((r) => r.exerciseId);
  } catch (err) {
    console.error("❌ getExerciseFavoriteIdsAction failed:", err);
    return [];
  }
}

export async function toggleExerciseFavoriteAction(
  exerciseId: string,
): Promise<{ ok: true; isFavorited: boolean } | { ok: false; error: string }> {
  try {
    const userId = await requireUserId();
    const db = getDb();
    console.log("🔍 toggleExerciseFavoriteAction - userId:", userId, "exerciseId:", exerciseId);

    const existing = await db.query.exerciseFavorites.findFirst({
      where: and(eq(exerciseFavorites.userId, userId), eq(exerciseFavorites.exerciseId, exerciseId)),
    });
    console.log("🔍 existing favorite:", existing ? "YES" : "NO");

    if (existing) {
      await db.delete(exerciseFavorites).where(eq(exerciseFavorites.id, existing.id));
      console.log("✅ Deleted favorite");
      return { ok: true, isFavorited: false };
    }

    console.log("💾 Inserting favorite...");
    await db.insert(exerciseFavorites).values({ userId, exerciseId });
    console.log("✅ Inserted favorite");
    return { ok: true, isFavorited: true };
  } catch (err) {
    console.error("❌ toggleExerciseFavoriteAction error:", err);
    return { ok: false, error: err instanceof Error ? err.message : "Kunne ikke oppdatere favoritt." };
  }
}
