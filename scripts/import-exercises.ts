/**
 * Import exercises from OSS ExerciseDB v1 into the local database.
 *
 * Usage:  npm run import:exercises
 * Safe to rerun: all operations use upsert / idempotent deletes.
 *
 * Only touches exercise_category, exercise_muscle, exercise,
 * exercise_secondary_muscle — no existing tables are affected.
 */

import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config();

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, inArray } from "drizzle-orm";
import * as schema from "../db/schema";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const BASE_URL = "https://exercisedb.p.rapidapi.com";
const PAGE_LIMIT = 100;
const SOURCE = "exercisedb";
const SOURCE_LICENSE = "CC BY-SA 4.0 (ExerciseDB OSS dataset)";
const REQUEST_DELAY_MS = 100;

// ---------------------------------------------------------------------------
// Types from ExerciseDB API
// ---------------------------------------------------------------------------

interface ExerciseDbItem {
  id: string;
  name: string;
  bodyPart: string;
  equipment: string;
  gifUrl: string;
  target: string;
  secondaryMuscles: string[];
  instructions: string[];
}

interface ExerciseDbResponse {
  success?: boolean;
  data?: ExerciseDbItem[];
  total?: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPage(offset: number): Promise<{ items: ExerciseDbItem[]; total: number }> {
  const apiKey = process.env["X-RapidAPI-Key"];
  if (!apiKey) {
    throw new Error("X-RapidAPI-Key environment variable not set");
  }

  const url = `${BASE_URL}/exercises?offset=${offset}&limit=${PAGE_LIMIT}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      "X-RapidAPI-Key": apiKey,
      "X-RapidAPI-Host": "exercisedb.p.rapidapi.com",
      "User-Agent": "bodyflow-import/1.0",
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(
      `ExerciseDB responded ${res.status} for offset=${offset}\nURL: ${url}\nResponse: ${body}`
    );
  }

  const json = (await res.json()) as ExerciseDbResponse | ExerciseDbItem[];

  // Handle both array and {success, data, total} envelope formats
  if (Array.isArray(json)) {
    return { items: json, total: json.length };
  }

  const items = json.data ?? [];
  const total = json.total ?? items.length;
  return { items, total };
}

async function fetchAllExercises(): Promise<ExerciseDbItem[]> {
  console.log("[import] Fetching first page to discover total count...");
  const first = await fetchPage(0);

  if (first.total <= PAGE_LIMIT) {
    console.log(`[import] Fetched ${first.items.length} exercises (single page).`);
    return first.items;
  }

  const allItems: ExerciseDbItem[] = [...first.items];
  let offset = PAGE_LIMIT;

  while (offset < first.total) {
    await sleep(REQUEST_DELAY_MS);
    console.log(`[import] Fetching offset=${offset} / ${first.total} ...`);
    const page = await fetchPage(offset);
    allItems.push(...page.items);
    offset += PAGE_LIMIT;
  }

  console.log(`[import] Fetched ${allItems.length} exercises total.`);
  return allItems;
}

// ---------------------------------------------------------------------------
// Upsert helpers
// ---------------------------------------------------------------------------

type Db = ReturnType<typeof drizzle<typeof schema>>;

async function upsertCategories(
  db: Db,
  bodyParts: string[],
): Promise<Map<string, string>> {
  const rows = bodyParts.map((bp) => ({
    slug: slugify(bp),
    name: bp,
    updatedAt: new Date(),
  }));

  const result = await db
    .insert(schema.exerciseCategories)
    .values(rows)
    .onConflictDoUpdate({
      target: schema.exerciseCategories.slug,
      set: { name: schema.exerciseCategories.name, updatedAt: new Date() },
    })
    .returning({ id: schema.exerciseCategories.id, slug: schema.exerciseCategories.slug });

  const map = new Map<string, string>();
  for (const r of result) map.set(r.slug, r.id);
  return map;
}

async function upsertMuscles(
  db: Db,
  muscles: string[],
): Promise<Map<string, string>> {
  const rows = muscles.map((m) => ({
    slug: slugify(m),
    name: m,
    updatedAt: new Date(),
  }));

  const result = await db
    .insert(schema.exerciseMuscles)
    .values(rows)
    .onConflictDoUpdate({
      target: schema.exerciseMuscles.slug,
      set: { name: schema.exerciseMuscles.name, updatedAt: new Date() },
    })
    .returning({ id: schema.exerciseMuscles.id, slug: schema.exerciseMuscles.slug });

  const map = new Map<string, string>();
  for (const r of result) map.set(r.slug, r.id);
  return map;
}

// Deduplicate slugs: if the same name produces the same slug, append -N.
function uniqueSlug(base: string, seen: Set<string>): string {
  let slug = base;
  let n = 2;
  while (seen.has(slug)) {
    slug = `${base}-${n++}`;
  }
  seen.add(slug);
  return slug;
}

async function upsertExerciseBatch(
  db: Db,
  batch: ExerciseDbItem[],
  categoryMap: Map<string, string>,
  muscleMap: Map<string, string>,
  seenSlugs: Set<string>,
): Promise<Map<string, string>> {
  const rows = batch.map((ex) => {
    const categoryId = categoryMap.get(slugify(ex.bodyPart));
    const targetMuscleId = muscleMap.get(slugify(ex.target));

    if (!categoryId) {
      throw new Error(`Unknown bodyPart "${ex.bodyPart}" for exercise id=${ex.id}`);
    }

    return {
      externalId: ex.id,
      slug: uniqueSlug(slugify(ex.name), seenSlugs),
      name: ex.name,
      categoryId,
      targetMuscleId: targetMuscleId ?? null,
      equipment: ex.equipment,
      gifUrl: ex.gifUrl || null,
      instructions: ex.instructions,
      source: SOURCE,
      sourceLicense: SOURCE_LICENSE,
      updatedAt: new Date(),
    };
  });

  const result = await db
    .insert(schema.exercises)
    .values(rows)
    .onConflictDoUpdate({
      target: [schema.exercises.source, schema.exercises.externalId],
      set: {
        name: schema.exercises.name,
        categoryId: schema.exercises.categoryId,
        targetMuscleId: schema.exercises.targetMuscleId,
        equipment: schema.exercises.equipment,
        gifUrl: schema.exercises.gifUrl,
        instructions: schema.exercises.instructions,
        sourceLicense: schema.exercises.sourceLicense,
        updatedAt: new Date(),
      },
    })
    .returning({ id: schema.exercises.id, externalId: schema.exercises.externalId });

  const map = new Map<string, string>();
  for (const r of result) map.set(r.externalId, r.id);
  return map;
}

async function replaceSecondaryMuscles(
  db: Db,
  exerciseIdMap: Map<string, string>,
  batch: ExerciseDbItem[],
  muscleMap: Map<string, string>,
): Promise<void> {
  const exerciseIds = [...exerciseIdMap.values()];
  if (exerciseIds.length === 0) return;

  // Delete existing secondary muscles for this batch
  await db
    .delete(schema.exerciseSecondaryMuscles)
    .where(inArray(schema.exerciseSecondaryMuscles.exerciseId, exerciseIds));

  const rows: { exerciseId: string; muscleId: string }[] = [];
  for (const ex of batch) {
    const exerciseId = exerciseIdMap.get(ex.id);
    if (!exerciseId) continue;

    for (const m of ex.secondaryMuscles) {
      const muscleId = muscleMap.get(slugify(m));
      if (muscleId) rows.push({ exerciseId, muscleId });
    }
  }

  if (rows.length > 0) {
    await db
      .insert(schema.exerciseSecondaryMuscles)
      .values(rows)
      .onConflictDoNothing();
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("[import] DATABASE_URL not set. Copy .env.example to .env.local.");
    process.exit(1);
  }

  const sql = neon(url);
  const db = drizzle({ client: sql, schema, casing: "snake_case" });

  console.log("[import] Starting ExerciseDB import...");

  let rawExercises: ExerciseDbItem[];
  try {
    rawExercises = await fetchAllExercises();
  } catch (err) {
    console.error("[import] Failed to fetch exercises from ExerciseDB:", err);
    process.exit(1);
  }

  if (rawExercises.length === 0) {
    console.warn("[import] ExerciseDB returned 0 exercises. Nothing to import.");
    return;
  }

  // Collect unique controlled values
  const bodyParts = [...new Set(rawExercises.map((e) => e.bodyPart))];
  const allMuscles = [
    ...new Set([
      ...rawExercises.map((e) => e.target),
      ...rawExercises.flatMap((e) => e.secondaryMuscles),
    ]),
  ];

  console.log(`[import] Upserting ${bodyParts.length} categories...`);
  const categoryMap = await upsertCategories(db, bodyParts);

  console.log(`[import] Upserting ${allMuscles.length} muscles...`);
  const muscleMap = await upsertMuscles(db, allMuscles);

  // Process exercises in batches of 100 to stay within Neon's parameter limits
  const BATCH = 100;
  const seenSlugs = new Set<string>();
  let imported = 0;
  let errors = 0;

  for (let i = 0; i < rawExercises.length; i += BATCH) {
    const batch = rawExercises.slice(i, i + BATCH);
    try {
      const exerciseIdMap = await upsertExerciseBatch(
        db,
        batch,
        categoryMap,
        muscleMap,
        seenSlugs,
      );
      await replaceSecondaryMuscles(db, exerciseIdMap, batch, muscleMap);
      imported += batch.length;
      process.stdout.write(`\r[import] ${imported} / ${rawExercises.length} exercises processed`);
    } catch (err) {
      errors++;
      console.error(`\n[import] Batch starting at index ${i} failed:`, err);
    }
  }

  console.log(`\n[import] Done. ${imported} exercises imported, ${errors} batch errors.`);

  if (errors > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[import] Unhandled error:", err);
  process.exit(1);
});
