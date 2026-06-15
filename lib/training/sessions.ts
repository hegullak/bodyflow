import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  exercises,
  exerciseCategories,
  exerciseMuscles,
  workoutPrograms,
  workoutProgramExercises,
  workoutSessions,
  workoutSetLogs,
} from "@/db/schema";
import { getProgram, type ProgramBlock } from "./programs";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ActiveSession {
  id: string;
  programId: string | null;
  programName: string;
  startedAt: Date;
  blocks: ProgramBlock[];
  completedSets: CompletedSet[];
}

export interface CompletedSet {
  programExerciseId: string | null;
  setNumber: number;
}

export interface SessionHistoryItem {
  id: string;
  programName: string;
  startedAt: Date;
  endedAt: Date | null;
  durationMinutes: number | null;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function getActiveSession(userId: string): Promise<ActiveSession | null> {
  const db = getDb();

  const [session] = await db
    .select()
    .from(workoutSessions)
    .where(and(eq(workoutSessions.userId, userId), isNull(workoutSessions.endedAt)))
    .orderBy(desc(workoutSessions.startedAt))
    .limit(1);

  if (!session) return null;

  // Load program blocks
  let blocks: ProgramBlock[] = [];
  if (session.programId) {
    const prog = await getProgram(session.programId, userId);
    blocks = prog?.blocks ?? [];
  }

  // Load completed sets
  const setRows = await db
    .select({
      programExerciseId: workoutSetLogs.programExerciseId,
      setNumber: workoutSetLogs.setNumber,
    })
    .from(workoutSetLogs)
    .where(eq(workoutSetLogs.sessionId, session.id))
    .orderBy(asc(workoutSetLogs.completedAt));

  return {
    id: session.id,
    programId: session.programId,
    programName: session.programName,
    startedAt: session.startedAt,
    blocks,
    completedSets: setRows.map((r) => ({
      programExerciseId: r.programExerciseId,
      setNumber: r.setNumber,
    })),
  };
}

export async function getSessionHistory(userId: string, limit = 30): Promise<SessionHistoryItem[]> {
  const db = getDb();

  const rows = await db
    .select({
      id: workoutSessions.id,
      programName: workoutSessions.programName,
      startedAt: workoutSessions.startedAt,
      endedAt: workoutSessions.endedAt,
    })
    .from(workoutSessions)
    .where(and(eq(workoutSessions.userId, userId)))
    .orderBy(desc(workoutSessions.startedAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    programName: r.programName,
    startedAt: r.startedAt,
    endedAt: r.endedAt,
    durationMinutes:
      r.endedAt
        ? Math.round((r.endedAt.getTime() - r.startedAt.getTime()) / 60000)
        : null,
  }));
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function startSession(userId: string, programId: string) {
  const db = getDb();

  const [prog] = await db
    .select({ name: workoutPrograms.name })
    .from(workoutPrograms)
    .where(and(eq(workoutPrograms.id, programId), eq(workoutPrograms.userId, userId)))
    .limit(1);
  if (!prog) return null;

  const [session] = await db
    .insert(workoutSessions)
    .values({ userId, programId, programName: prog.name })
    .returning();
  return session;
}

export async function endSession(id: string, userId: string) {
  const db = getDb();
  const [updated] = await db
    .update(workoutSessions)
    .set({ endedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(workoutSessions.id, id), eq(workoutSessions.userId, userId)))
    .returning();
  return updated ?? null;
}

export async function logSet(
  sessionId: string,
  userId: string,
  programExerciseId: string,
  setNumber: number,
) {
  const db = getDb();

  // Verify session belongs to user
  const [session] = await db
    .select({ id: workoutSessions.id })
    .from(workoutSessions)
    .where(and(eq(workoutSessions.id, sessionId), eq(workoutSessions.userId, userId)))
    .limit(1);
  if (!session) return null;

  // Get exercise info from program exercise
  const [pe] = await db
    .select({
      exerciseId: workoutProgramExercises.exerciseId,
      exerciseName: exercises.name,
      exerciseNameNo: exercises.nameNo,
      isBodyweight: workoutProgramExercises.isBodyweight,
    })
    .from(workoutProgramExercises)
    .innerJoin(exercises, eq(workoutProgramExercises.exerciseId, exercises.id))
    .where(eq(workoutProgramExercises.id, programExerciseId))
    .limit(1);
  if (!pe) return null;

  const [log] = await db
    .insert(workoutSetLogs)
    .values({
      sessionId,
      programExerciseId,
      exerciseId: pe.exerciseId,
      exerciseName: pe.exerciseName,
      setNumber,
      isBodyweight: pe.isBodyweight,
    })
    .returning();
  return log;
}

export async function unlogSet(
  sessionId: string,
  userId: string,
  programExerciseId: string,
  setNumber: number,
) {
  const db = getDb();

  const [session] = await db
    .select({ id: workoutSessions.id })
    .from(workoutSessions)
    .where(and(eq(workoutSessions.id, sessionId), eq(workoutSessions.userId, userId)))
    .limit(1);
  if (!session) return false;

  await db
    .delete(workoutSetLogs)
    .where(
      and(
        eq(workoutSetLogs.sessionId, sessionId),
        eq(workoutSetLogs.programExerciseId, programExerciseId),
        eq(workoutSetLogs.setNumber, setNumber),
      ),
    );
  return true;
}
