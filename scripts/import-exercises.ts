/**
 * Import exercises from the ExerciseDB open-source dataset on GitHub.
 * Source: https://github.com/bootstrapping-lab/exercisedb-api
 * License: MIT
 *
 * Usage:  npm run import:exercises
 * Safe to rerun — all operations use upsert / idempotent deletes.
 */

import dotenv from "dotenv";
import { existsSync, mkdirSync, appendFileSync, writeFileSync } from "fs";
import { join } from "path";

dotenv.config({ path: ".env.local" });
dotenv.config();

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { inArray } from "drizzle-orm";
import * as schema from "../db/schema";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const GITHUB_URL =
  "https://raw.githubusercontent.com/bootstrapping-lab/exercisedb-api/main/src/data/exercises.json";
const SOURCE = "exercisedb";
const SOURCE_LICENSE =
  "MIT (bootstrapping-lab/exercisedb-api — https://github.com/bootstrapping-lab/exercisedb-api)";
const LOGS_DIR = join(process.cwd(), "..", "logs", "bodyflow");
const LOG_FILE = join(
  LOGS_DIR,
  `import-${new Date().toISOString().replace(/[:.]/g, "-")}.log`
);

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------

function ensureLogsDir() {
  if (!existsSync(LOGS_DIR)) mkdirSync(LOGS_DIR, { recursive: true });
}

function log(message: string) {
  ensureLogsDir();
  const line = `[${new Date().toISOString()}] ${message}\n`;
  appendFileSync(LOG_FILE, line, "utf-8");
  console.log(message);
}

// ---------------------------------------------------------------------------
// ExerciseDB types
// ---------------------------------------------------------------------------

interface ExerciseDBItem {
  exerciseId: string;
  name: string;
  gifUrl: string;
  targetMuscles: string[];
  bodyParts: string[];
  equipments: string[];
  secondaryMuscles: string[];
  instructions: string[];
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

function uniqueSlug(base: string, seen: Set<string>): string {
  let slug = base;
  let i = 2;
  while (seen.has(slug)) slug = `${base}-${i++}`;
  seen.add(slug);
  return slug;
}

function stripStepPrefix(instruction: string): string {
  return instruction.replace(/^Step:\d+\s*/i, "").trim();
}

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

async function fetchExercises(): Promise<ExerciseDBItem[]> {
  log(`[import] Fetching exercise data from GitHub...`);
  const res = await fetch(GITHUB_URL);
  if (!res.ok) throw new Error(`GitHub responded ${res.status}`);
  const data = (await res.json()) as ExerciseDBItem[];
  log(`[import] Fetched ${data.length} exercises`);
  return data;
}

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

type Db = ReturnType<typeof drizzle<typeof schema>>;

async function upsertCategories(
  db: Db,
  exercises: ExerciseDBItem[]
): Promise<Map<string, string>> {
  const names = new Set<string>();
  for (const ex of exercises) {
    if (ex.bodyParts[0]) names.add(ex.bodyParts[0]);
  }

  const rows = [...names].map((name) => ({ slug: slugify(name), name }));
  if (rows.length === 0) return new Map();

  log(`[import] Upserting ${rows.length} categories...`);
  const result = await db
    .insert(schema.exerciseCategories)
    .values(rows)
    .onConflictDoUpdate({
      target: schema.exerciseCategories.slug,
      set: { name: schema.exerciseCategories.name, updatedAt: new Date() },
    })
    .returning({ id: schema.exerciseCategories.id, slug: schema.exerciseCategories.slug });

  log(`[import] Categories upserted: ${result.length}`);
  return new Map(result.map((r) => [r.slug, r.id]));
}

async function upsertMuscles(
  db: Db,
  exercises: ExerciseDBItem[]
): Promise<Map<string, string>> {
  const names = new Set<string>();
  for (const ex of exercises) {
    for (const m of [...ex.targetMuscles, ...ex.secondaryMuscles]) {
      if (m) names.add(m);
    }
  }

  const rows = [...names].map((name) => ({ slug: slugify(name), name }));
  if (rows.length === 0) return new Map();

  log(`[import] Upserting ${rows.length} muscles...`);
  const result = await db
    .insert(schema.exerciseMuscles)
    .values(rows)
    .onConflictDoUpdate({
      target: schema.exerciseMuscles.slug,
      set: { name: schema.exerciseMuscles.name, updatedAt: new Date() },
    })
    .returning({ id: schema.exerciseMuscles.id, slug: schema.exerciseMuscles.slug });

  log(`[import] Muscles upserted: ${result.length}`);
  return new Map(result.map((r) => [r.slug, r.id]));
}

async function upsertExerciseBatch(
  db: Db,
  batch: ExerciseDBItem[],
  categoryMap: Map<string, string>,
  muscleMap: Map<string, string>,
  seenSlugs: Set<string>
): Promise<Map<string, string>> {
  const rows: (typeof schema.exercises.$inferInsert)[] = [];

  for (const ex of batch) {
    const categorySlug = slugify(ex.bodyParts[0] ?? "");
    const categoryId = categoryMap.get(categorySlug);
    if (!categoryId) continue;

    const targetMuscleSlug = slugify(ex.targetMuscles[0] ?? "");
    const targetMuscleId = muscleMap.get(targetMuscleSlug) ?? null;

    const instructions = ex.instructions.map(stripStepPrefix).filter(Boolean);

    rows.push({
      externalId: ex.exerciseId,
      slug: uniqueSlug(slugify(ex.name), seenSlugs),
      name: ex.name,
      categoryId,
      targetMuscleId,
      equipment: ex.equipments[0] ?? "body weight",
      imageUrl: ex.gifUrl ?? null,
      instructions,
      source: SOURCE,
      sourceLicense: SOURCE_LICENSE,
      updatedAt: new Date(),
    });
  }

  if (rows.length === 0) return new Map();

  const result = await db
    .insert(schema.exercises)
    .values(rows)
    .onConflictDoNothing()
    .returning({ id: schema.exercises.id, externalId: schema.exercises.externalId });

  const map = new Map<string, string>();
  for (const r of result) map.set(r.externalId, r.id);
  return map;
}

async function upsertSecondaryMuscles(
  db: Db,
  exerciseIdMap: Map<string, string>,
  batch: ExerciseDBItem[],
  muscleMap: Map<string, string>
): Promise<void> {
  const exerciseDbIds = [...exerciseIdMap.values()];
  if (exerciseDbIds.length === 0) return;

  await db
    .delete(schema.exerciseSecondaryMuscles)
    .where(inArray(schema.exerciseSecondaryMuscles.exerciseId, exerciseDbIds));

  const rows: { exerciseId: string; muscleId: string }[] = [];
  for (const ex of batch) {
    const exerciseId = exerciseIdMap.get(ex.exerciseId);
    if (!exerciseId) continue;

    const primaryMuscleSlug = slugify(ex.targetMuscles[0] ?? "");

    for (const muscleName of ex.secondaryMuscles) {
      const slug = slugify(muscleName);
      const muscleId = muscleMap.get(slug);
      if (muscleId && slug !== primaryMuscleSlug) {
        rows.push({ exerciseId, muscleId });
      }
    }
  }

  if (rows.length > 0) {
    await db.insert(schema.exerciseSecondaryMuscles).values(rows).onConflictDoNothing();
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  ensureLogsDir();
  log(`\n========== Import started at ${new Date().toISOString()} ==========`);

  const url = process.env.DATABASE_URL;
  if (!url) {
    log("[ERROR] DATABASE_URL not set");
    process.exit(1);
  }

  // NOTE: No casing option — schema uses explicit column names.
  const sql = neon(url);
  const db = drizzle({ client: sql, schema });

  let exercises: ExerciseDBItem[];
  try {
    exercises = await fetchExercises();
  } catch (err) {
    log(`[ERROR] ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }

  const categoryMap = await upsertCategories(db, exercises);
  const muscleMap = await upsertMuscles(db, exercises);

  const BATCH = 50;
  const seenSlugs = new Set<string>();
  let imported = 0;
  let errors = 0;

  for (let i = 0; i < exercises.length; i += BATCH) {
    const batch = exercises.slice(i, i + BATCH);
    try {
      const exerciseIdMap = await upsertExerciseBatch(db, batch, categoryMap, muscleMap, seenSlugs);
      await upsertSecondaryMuscles(db, exerciseIdMap, batch, muscleMap);
      imported += exerciseIdMap.size;
      process.stdout.write(`\r[import] ${imported} / ${exercises.length} exercises inserted...`);
    } catch (err) {
      errors++;
      const msg = err instanceof Error ? err.message : String(err);
      log(`\n[ERROR] Batch at index ${i}: ${msg.slice(0, 300)}`);
    }
  }

  log(`\n[import] Done. ${imported} exercises imported, ${errors} batch errors.`);
}

main().catch((err) => {
  log(`[FATAL] ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
