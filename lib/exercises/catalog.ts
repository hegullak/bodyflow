import { and, asc, count, eq, ilike, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import {
  exercises,
  exerciseCategories,
  exerciseMuscles,
  exerciseSecondaryMuscles,
} from "@/db/schema";

export interface ExerciseFilters {
  search?: string;
  /** slug, e.g. "chest" */
  bodyPart?: string;
  /** slug, e.g. "pectorals" */
  targetMuscle?: string;
  /** exact string, e.g. "barbell" */
  equipment?: string;
  limit?: number;
  offset?: number;
}

export async function listExercises(filters: ExerciseFilters = {}) {
  const db = getDb();
  const { search, bodyPart, targetMuscle, equipment, limit = 20, offset = 0 } = filters;

  const conditions = [];

  if (search) conditions.push(ilike(exercises.name, `%${search}%`));
  if (equipment) conditions.push(eq(exercises.equipment, equipment));

  if (bodyPart) {
    const cat = await db
      .select({ id: exerciseCategories.id })
      .from(exerciseCategories)
      .where(eq(exerciseCategories.slug, bodyPart))
      .limit(1);
    if (cat.length === 0) return { data: [], total: 0 };
    conditions.push(eq(exercises.categoryId, cat[0].id));
  }

  if (targetMuscle) {
    const mus = await db
      .select({ id: exerciseMuscles.id })
      .from(exerciseMuscles)
      .where(eq(exerciseMuscles.slug, targetMuscle))
      .limit(1);
    if (mus.length === 0) return { data: [], total: 0 };
    conditions.push(eq(exercises.targetMuscleId, mus[0].id));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: exercises.id,
        externalId: exercises.externalId,
        slug: exercises.slug,
        name: exercises.name,
        nameNo: exercises.nameNo,
        equipment: exercises.equipment,
        imageUrl: exercises.imageUrl,
        instructions: exercises.instructions,
        source: exercises.source,
        categorySlug: exerciseCategories.slug,
        categoryName: exerciseCategories.name,
        targetMuscleSlug: exerciseMuscles.slug,
        targetMuscleName: exerciseMuscles.name,
      })
      .from(exercises)
      .leftJoin(exerciseCategories, eq(exercises.categoryId, exerciseCategories.id))
      .leftJoin(exerciseMuscles, eq(exercises.targetMuscleId, exerciseMuscles.id))
      .where(where)
      .orderBy(asc(exercises.name))
      .limit(limit)
      .offset(offset),

    db.select({ total: count() }).from(exercises).where(where),
  ]);

  const exerciseIds = rows.map((r) => r.id);
  const secondaryMap = await loadSecondaryMuscles(db, exerciseIds);

  return {
    data: rows.map((r) => formatRow(r, secondaryMap.get(r.id) ?? [])),
    total: totalRows[0]?.total ?? 0,
  };
}

export async function getExerciseById(id: string) {
  const db = getDb();

  const rows = await db
    .select({
      id: exercises.id,
      externalId: exercises.externalId,
      slug: exercises.slug,
      name: exercises.name,
      nameNo: exercises.nameNo,
      equipment: exercises.equipment,
      imageUrl: exercises.imageUrl,
      instructions: exercises.instructions,
      source: exercises.source,
      categorySlug: exerciseCategories.slug,
      categoryName: exerciseCategories.name,
      targetMuscleSlug: exerciseMuscles.slug,
      targetMuscleName: exerciseMuscles.name,
    })
    .from(exercises)
    .leftJoin(exerciseCategories, eq(exercises.categoryId, exerciseCategories.id))
    .leftJoin(exerciseMuscles, eq(exercises.targetMuscleId, exerciseMuscles.id))
    .where(eq(exercises.id, id))
    .limit(1);

  if (rows.length === 0) return null;

  const row = rows[0];
  const secondaryMap = await loadSecondaryMuscles(db, [row.id]);

  return formatRow(row, secondaryMap.get(row.id) ?? []);
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

type Db = ReturnType<typeof getDb>;
type Muscle = { slug: string; name: string };

async function loadSecondaryMuscles(
  db: Db,
  exerciseIds: string[],
): Promise<Map<string, Muscle[]>> {
  if (exerciseIds.length === 0) return new Map();

  const rows = await db
    .select({
      exerciseId: exerciseSecondaryMuscles.exerciseId,
      slug: exerciseMuscles.slug,
      name: exerciseMuscles.name,
    })
    .from(exerciseSecondaryMuscles)
    .innerJoin(exerciseMuscles, eq(exerciseSecondaryMuscles.muscleId, exerciseMuscles.id))
    .where(inArray(exerciseSecondaryMuscles.exerciseId, exerciseIds));

  const map = new Map<string, Muscle[]>();
  for (const r of rows) {
    const list = map.get(r.exerciseId) ?? [];
    list.push({ slug: r.slug, name: r.name });
    map.set(r.exerciseId, list);
  }
  return map;
}

type ExerciseRow = {
  id: string;
  externalId: string;
  slug: string;
  name: string;
  nameNo: string | null;
  equipment: string;
  imageUrl: string | null;
  instructions: string[];
  source: string;
  categorySlug: string | null;
  categoryName: string | null;
  targetMuscleSlug: string | null;
  targetMuscleName: string | null;
};

function formatRow(row: ExerciseRow, secondaryMuscles: Muscle[]) {
  return {
    id: row.id,
    externalId: row.externalId,
    slug: row.slug,
    name: row.name,
    nameEn: row.name,
    bodyPart: row.categorySlug
      ? { slug: row.categorySlug, name: row.categoryName! }
      : null,
    targetMuscle: row.targetMuscleSlug
      ? { slug: row.targetMuscleSlug, name: row.targetMuscleName! }
      : null,
    secondaryMuscles,
    equipment: row.equipment,
    imageUrl: row.imageUrl,
    instructions: row.instructions,
    source: row.source,
  };
}

export type ExerciseListItem = ReturnType<typeof formatRow>;
