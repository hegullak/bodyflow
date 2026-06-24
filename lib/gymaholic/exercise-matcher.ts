import { and, eq, ilike } from "drizzle-orm";
import { getDb } from "@/db/client";
import { exercises, exerciseCategories } from "@/db/schema";

const IMPORT_SOURCE = "gymaholic-import";

/**
 * Find an exercise by slug (exerciseKey) or name, or create a custom one.
 * Always returns an exercise ID.
 */
export async function getOrCreateExercise(
  exerciseKey: string,
  exerciseName: string,
): Promise<string> {
  const db = getDb();

  // Try to find by slug first.
  let found = await db.query.exercises.findFirst({
    where: eq(exercises.slug, exerciseKey),
    columns: { id: true },
  });
  if (found) return found.id;

  // Try to find by name (case-insensitive).
  found = await db.query.exercises.findFirst({
    where: ilike(exercises.name, exerciseName),
    columns: { id: true },
  });
  if (found) return found.id;

  // No match: create a custom exercise. First, ensure a default category exists.
  const defaultCat = await db.query.exerciseCategories.findFirst({
    where: eq(exerciseCategories.name, "Other"),
    columns: { id: true },
  });

  if (!defaultCat) {
    throw new Error('No "Other" exercise category found; cannot create custom exercise');
  }

  // Create the custom exercise with source = gymaholic-import.
  const [newExercise] = await db
    .insert(exercises)
    .values({
      externalId: `${IMPORT_SOURCE}:${exerciseKey}`,
      slug: exerciseKey,
      name: exerciseName,
      categoryId: defaultCat.id,
      equipment: "unknown",
      source: IMPORT_SOURCE,
    })
    .returning({ id: exercises.id });

  return newExercise.id;
}
