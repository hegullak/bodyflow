import { and, asc, eq, inArray, isNull, max } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  exercises,
  exerciseCategories,
  exerciseMuscles,
  workoutPrograms,
  workoutProgramExercises,
  workoutSupersets,
} from "@/db/schema";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProgramExerciseRow {
  id: string;
  exerciseId: string;
  exerciseName: string;
  exerciseNameNo: string | null;
  supersetId: string | null;
  programOrder: number;
  supersetOrder: number | null;
  sets: number;
  reps: number;
  restSeconds: number;
  isBodyweight: boolean;
  categoryName: string | null;
  targetMuscleName: string | null;
  equipment: string;
  imageUrl: string | null;
}

export interface ProgramBlock {
  type: "exercise" | "superset";
  programOrder: number;
  supersetId: string | null;
  exercises: ProgramExerciseRow[];
}

export interface ProgramDetail {
  id: string;
  name: string;
  sortOrder: number;
  blocks: ProgramBlock[];
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function getProgramMeta(id: string, userId: string) {
  const db = getDb();
  const [program] = await db
    .select({ id: workoutPrograms.id, name: workoutPrograms.name })
    .from(workoutPrograms)
    .where(and(eq(workoutPrograms.id, id), eq(workoutPrograms.userId, userId)))
    .limit(1);
  return program ?? null;
}

export async function listPrograms(userId: string) {
  const db = getDb();
  return db
    .select({
      id: workoutPrograms.id,
      name: workoutPrograms.name,
      sortOrder: workoutPrograms.sortOrder,
      createdAt: workoutPrograms.createdAt,
    })
    .from(workoutPrograms)
    .where(eq(workoutPrograms.userId, userId))
    .orderBy(asc(workoutPrograms.sortOrder), asc(workoutPrograms.createdAt));
}

export async function getProgram(id: string, userId: string): Promise<ProgramDetail | null> {
  const db = getDb();

  const [programRows, exerciseRows] = await Promise.all([
    db
      .select({ id: workoutPrograms.id, name: workoutPrograms.name, sortOrder: workoutPrograms.sortOrder })
      .from(workoutPrograms)
      .where(and(eq(workoutPrograms.id, id), eq(workoutPrograms.userId, userId)))
      .limit(1),
    db
      .select({
        id: workoutProgramExercises.id,
        exerciseId: workoutProgramExercises.exerciseId,
        exerciseName: exercises.name,
        exerciseNameNo: exercises.nameNo,
        supersetId: workoutProgramExercises.supersetId,
        programOrder: workoutProgramExercises.programOrder,
        supersetOrder: workoutProgramExercises.supersetOrder,
        sets: workoutProgramExercises.sets,
        reps: workoutProgramExercises.reps,
        restSeconds: workoutProgramExercises.restSeconds,
        isBodyweight: workoutProgramExercises.isBodyweight,
        categoryName: exerciseCategories.name,
        targetMuscleName: exerciseMuscles.name,
        equipment: exercises.equipment,
        imageUrl: exercises.imageUrl,
      })
      .from(workoutProgramExercises)
      .innerJoin(exercises, eq(workoutProgramExercises.exerciseId, exercises.id))
      .leftJoin(exerciseCategories, eq(exercises.categoryId, exerciseCategories.id))
      .leftJoin(exerciseMuscles, eq(exercises.targetMuscleId, exerciseMuscles.id))
      .where(eq(workoutProgramExercises.programId, id))
      .orderBy(asc(workoutProgramExercises.programOrder), asc(workoutProgramExercises.supersetOrder)),
  ]);

  if (programRows.length === 0) return null;

  return { ...programRows[0], blocks: buildBlocks(exerciseRows) };
}

function buildBlocks(rows: ProgramExerciseRow[]): ProgramBlock[] {
  const orderMap = new Map<number, ProgramExerciseRow[]>();
  for (const row of rows) {
    const list = orderMap.get(row.programOrder) ?? [];
    list.push(row);
    orderMap.set(row.programOrder, list);
  }

  const blocks: ProgramBlock[] = [];
  for (const [programOrder, exs] of [...orderMap.entries()].sort(([a], [b]) => a - b)) {
    if (exs.length === 1 && exs[0].supersetId === null) {
      blocks.push({ type: "exercise", programOrder, supersetId: null, exercises: exs });
    } else {
      blocks.push({
        type: "superset",
        programOrder,
        supersetId: exs[0].supersetId,
        exercises: exs,
      });
    }
  }
  return blocks;
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

export async function createProgram(userId: string, name: string) {
  const db = getDb();
  const [maxRow] = await db
    .select({ maxOrder: max(workoutPrograms.sortOrder) })
    .from(workoutPrograms)
    .where(eq(workoutPrograms.userId, userId));
  const nextOrder = (maxRow?.maxOrder ?? -1) + 1;

  const [program] = await db
    .insert(workoutPrograms)
    .values({ userId, name, sortOrder: nextOrder })
    .returning();
  return program;
}

export async function renameProgram(id: string, userId: string, name: string) {
  const db = getDb();
  const [updated] = await db
    .update(workoutPrograms)
    .set({ name, updatedAt: new Date() })
    .where(and(eq(workoutPrograms.id, id), eq(workoutPrograms.userId, userId)))
    .returning();
  return updated ?? null;
}

export async function deleteProgram(id: string, userId: string) {
  const db = getDb();
  await db
    .delete(workoutPrograms)
    .where(and(eq(workoutPrograms.id, id), eq(workoutPrograms.userId, userId)));
}

export async function duplicateProgram(id: string, userId: string) {
  const db = getDb();
  const source = await getProgram(id, userId);
  if (!source) return null;

  const [maxRow] = await db
    .select({ maxOrder: max(workoutPrograms.sortOrder) })
    .from(workoutPrograms)
    .where(eq(workoutPrograms.userId, userId));
  const nextOrder = (maxRow?.maxOrder ?? -1) + 1;

  const [newProgram] = await db
    .insert(workoutPrograms)
    .values({ userId, name: `${source.name} (kopi)`, sortOrder: nextOrder })
    .returning();

  for (const block of source.blocks) {
    let newSupersetId: string | null = null;
    if (block.type === "superset" && block.supersetId) {
      const [ss] = await db
        .insert(workoutSupersets)
        .values({ programId: newProgram.id })
        .returning();
      newSupersetId = ss.id;
    }
    for (const ex of block.exercises) {
      await db.insert(workoutProgramExercises).values({
        programId: newProgram.id,
        exerciseId: ex.exerciseId,
        supersetId: newSupersetId,
        programOrder: ex.programOrder,
        supersetOrder: ex.supersetOrder,
        sets: ex.sets,
        reps: ex.reps,
        restSeconds: ex.restSeconds,
        isBodyweight: ex.isBodyweight,
      });
    }
  }

  return newProgram;
}

export async function addExerciseToProgram(
  programId: string,
  userId: string,
  exerciseId: string,
  opts: { sets?: number; reps?: number; restSeconds?: number; isBodyweight?: boolean } = {},
) {
  const db = getDb();

  // Verify ownership
  const [prog] = await db
    .select({ id: workoutPrograms.id })
    .from(workoutPrograms)
    .where(and(eq(workoutPrograms.id, programId), eq(workoutPrograms.userId, userId)))
    .limit(1);
  if (!prog) return null;

  const [maxRow] = await db
    .select({ maxOrder: max(workoutProgramExercises.programOrder) })
    .from(workoutProgramExercises)
    .where(eq(workoutProgramExercises.programId, programId));
  const nextOrder = (maxRow?.maxOrder ?? -1) + 1;

  const [row] = await db
    .insert(workoutProgramExercises)
    .values({
      programId,
      exerciseId,
      programOrder: nextOrder,
      sets: opts.sets ?? 3,
      reps: opts.reps ?? 8,
      restSeconds: opts.restSeconds ?? 90,
      isBodyweight: opts.isBodyweight ?? false,
    })
    .returning();
  return row;
}

export async function updateProgramExercise(
  id: string,
  programId: string,
  userId: string,
  patch: { sets?: number; reps?: number; restSeconds?: number; isBodyweight?: boolean },
) {
  const db = getDb();

  // Verify ownership via join
  const [exists] = await db
    .select({ id: workoutProgramExercises.id })
    .from(workoutProgramExercises)
    .innerJoin(workoutPrograms, eq(workoutProgramExercises.programId, workoutPrograms.id))
    .where(
      and(
        eq(workoutProgramExercises.id, id),
        eq(workoutProgramExercises.programId, programId),
        eq(workoutPrograms.userId, userId),
      ),
    )
    .limit(1);
  if (!exists) return null;

  const [updated] = await db
    .update(workoutProgramExercises)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(workoutProgramExercises.id, id))
    .returning();
  return updated;
}

export async function removeProgramExercise(id: string, programId: string, userId: string) {
  const db = getDb();

  const [exists] = await db
    .select({ id: workoutProgramExercises.id })
    .from(workoutProgramExercises)
    .innerJoin(workoutPrograms, eq(workoutProgramExercises.programId, workoutPrograms.id))
    .where(
      and(
        eq(workoutProgramExercises.id, id),
        eq(workoutProgramExercises.programId, programId),
        eq(workoutPrograms.userId, userId),
      ),
    )
    .limit(1);
  if (!exists) return false;

  await db.delete(workoutProgramExercises).where(eq(workoutProgramExercises.id, id));
  return true;
}

export async function reorderProgramExercises(
  programId: string,
  userId: string,
  orderedIds: string[],
) {
  const db = getDb();

  const [prog] = await db
    .select({ id: workoutPrograms.id })
    .from(workoutPrograms)
    .where(and(eq(workoutPrograms.id, programId), eq(workoutPrograms.userId, userId)))
    .limit(1);
  if (!prog) return false;

  for (let i = 0; i < orderedIds.length; i++) {
    await db
      .update(workoutProgramExercises)
      .set({ programOrder: i, updatedAt: new Date() })
      .where(
        and(
          eq(workoutProgramExercises.id, orderedIds[i]),
          eq(workoutProgramExercises.programId, programId),
        ),
      );
  }
  return true;
}

export async function createSuperset(
  programId: string,
  userId: string,
  exerciseIds: string[],
) {
  if (exerciseIds.length < 2) return null;
  const db = getDb();

  const [prog] = await db
    .select({ id: workoutPrograms.id })
    .from(workoutPrograms)
    .where(and(eq(workoutPrograms.id, programId), eq(workoutPrograms.userId, userId)))
    .limit(1);
  if (!prog) return null;

  // Get the minimum program_order of the selected exercises to keep position
  const selected = await db
    .select({
      id: workoutProgramExercises.id,
      programOrder: workoutProgramExercises.programOrder,
    })
    .from(workoutProgramExercises)
    .where(
      and(
        eq(workoutProgramExercises.programId, programId),
        inArray(workoutProgramExercises.id, exerciseIds),
      ),
    );

  const minOrder = Math.min(...selected.map((r) => r.programOrder));

  const [superset] = await db
    .insert(workoutSupersets)
    .values({ programId })
    .returning();

  for (let i = 0; i < exerciseIds.length; i++) {
    await db
      .update(workoutProgramExercises)
      .set({
        supersetId: superset.id,
        programOrder: minOrder,
        supersetOrder: i,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(workoutProgramExercises.id, exerciseIds[i]),
          eq(workoutProgramExercises.programId, programId),
        ),
      );
  }

  return superset;
}

export async function removeSuperset(supersetId: string, programId: string, userId: string) {
  const db = getDb();

  const [prog] = await db
    .select({ id: workoutPrograms.id })
    .from(workoutPrograms)
    .where(and(eq(workoutPrograms.id, programId), eq(workoutPrograms.userId, userId)))
    .limit(1);
  if (!prog) return false;

  // Get current max order so we can place unbundled exercises after existing ones
  const [maxRow] = await db
    .select({ maxOrder: max(workoutProgramExercises.programOrder) })
    .from(workoutProgramExercises)
    .where(
      and(
        eq(workoutProgramExercises.programId, programId),
        isNull(workoutProgramExercises.supersetId),
      ),
    );
  let nextOrder = (maxRow?.maxOrder ?? -1) + 1;

  // Detach exercises from superset, give them sequential standalone positions
  const members = await db
    .select({ id: workoutProgramExercises.id })
    .from(workoutProgramExercises)
    .where(eq(workoutProgramExercises.supersetId, supersetId))
    .orderBy(asc(workoutProgramExercises.supersetOrder));

  for (const m of members) {
    await db
      .update(workoutProgramExercises)
      .set({ supersetId: null, programOrder: nextOrder++, supersetOrder: null, updatedAt: new Date() })
      .where(eq(workoutProgramExercises.id, m.id));
  }

  await db.delete(workoutSupersets).where(eq(workoutSupersets.id, supersetId));
  return true;
}
