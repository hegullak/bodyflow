import { and, asc, desc, eq, isNull, not } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  exercises,
  workoutPrograms,
  workoutProgramExercises,
  workoutSessions,
  workoutSetLogs,
} from "@/db/schema";
import { getProgram, type ProgramBlock } from "./programs";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CompletedSet {
  programExerciseId: string | null;
  setNumber: number;
  weightKg: number | null;
  reps: number | null;
}

export interface LastSetRow {
  programExerciseId: string;
  setNumber: number;
  weightKg: number | null;
  reps: number | null;
  completedAt: Date;
}

export interface ActiveSession {
  id: string;
  programId: string | null;
  programName: string;
  startedAt: Date;
  blocks: ProgramBlock[];
  completedSets: CompletedSet[];
  /** programExerciseId → sets ordered by setNumber, from most recent completed session */
  lastSets: Record<string, LastSetRow[]>;
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

  const blocks: ProgramBlock[] = session.programId
    ? (await getProgram(session.programId, userId))?.blocks ?? []
    : [];

  const setRows = await db
    .select({
      programExerciseId: workoutSetLogs.programExerciseId,
      setNumber: workoutSetLogs.setNumber,
      weightKg: workoutSetLogs.weightKg,
      reps: workoutSetLogs.reps,
    })
    .from(workoutSetLogs)
    .where(eq(workoutSetLogs.sessionId, session.id))
    .orderBy(asc(workoutSetLogs.completedAt));

  // Last completed session for the same program (for LAST column)
  const lastSets: Record<string, LastSetRow[]> = {};
  if (session.programId) {
    const [lastSession] = await db
      .select({ id: workoutSessions.id })
      .from(workoutSessions)
      .where(
        and(
          eq(workoutSessions.userId, userId),
          eq(workoutSessions.programId, session.programId),
          not(isNull(workoutSessions.endedAt)),
        ),
      )
      .orderBy(desc(workoutSessions.startedAt))
      .limit(1);

    if (lastSession) {
      const rows = await db
        .select({
          programExerciseId: workoutSetLogs.programExerciseId,
          setNumber: workoutSetLogs.setNumber,
          weightKg: workoutSetLogs.weightKg,
          reps: workoutSetLogs.reps,
          completedAt: workoutSetLogs.completedAt,
        })
        .from(workoutSetLogs)
        .where(eq(workoutSetLogs.sessionId, lastSession.id))
        .orderBy(asc(workoutSetLogs.setNumber));

      for (const r of rows) {
        if (!r.programExerciseId) continue;
        const list = lastSets[r.programExerciseId] ?? [];
        list.push({
          programExerciseId: r.programExerciseId,
          setNumber: r.setNumber,
          weightKg: r.weightKg,
          reps: r.reps,
          completedAt: r.completedAt,
        });
        lastSets[r.programExerciseId] = list;
      }
    }
  }

  return {
    id: session.id,
    programId: session.programId,
    programName: session.programName,
    startedAt: session.startedAt,
    blocks,
    completedSets: setRows.map((r) => ({
      programExerciseId: r.programExerciseId,
      setNumber: r.setNumber,
      weightKg: r.weightKg,
      reps: r.reps,
    })),
    lastSets,
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
    .where(eq(workoutSessions.userId, userId))
    .orderBy(desc(workoutSessions.startedAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    programName: r.programName,
    startedAt: r.startedAt,
    endedAt: r.endedAt,
    durationMinutes: r.endedAt
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

export async function deleteSession(id: string, userId: string) {
  const db = getDb();
  await db
    .delete(workoutSessions)
    .where(and(eq(workoutSessions.id, id), eq(workoutSessions.userId, userId)));
}

export async function logSet(
  sessionId: string,
  userId: string,
  programExerciseId: string,
  setNumber: number,
  weightKg?: number | null,
  reps?: number | null,
) {
  const db = getDb();

  const [session] = await db
    .select({ id: workoutSessions.id })
    .from(workoutSessions)
    .where(and(eq(workoutSessions.id, sessionId), eq(workoutSessions.userId, userId)))
    .limit(1);
  if (!session) return null;

  const [pe] = await db
    .select({
      exerciseId: workoutProgramExercises.exerciseId,
      exerciseName: exercises.name,
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
      weightKg: pe.isBodyweight ? null : (weightKg ?? null),
      reps: reps ?? null,
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
