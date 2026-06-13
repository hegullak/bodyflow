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
import { existsSync, mkdirSync, appendFileSync } from "fs";
import { join } from "path";

dotenv.config({ path: ".env.local" });
dotenv.config();

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, inArray } from "drizzle-orm";
import * as schema from "../db/schema";

// ---------------------------------------------------------------------------
// Logging setup
// ---------------------------------------------------------------------------

const LOGS_DIR = join(process.cwd(), "..", "logs", "bodyflow");
const LOG_FILE = join(LOGS_DIR, `import-${new Date().toISOString().replace(/[:.]/g, "-")}.log`);

function ensureLogsDir() {
  if (!existsSync(LOGS_DIR)) {
    mkdirSync(LOGS_DIR, { recursive: true });
  }
}

function logToFile(message: string) {
  ensureLogsDir();
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}\n`;
  appendFileSync(LOG_FILE, line, "utf-8");
  console.log(message);
}

interface ImportState {
  lastSuccessfulOffset: number;
  lastRun: string;
  totalImported: number;
}

function loadState(): ImportState {
  try {
    if (existsSync(STATE_FILE)) {
      const data = JSON.parse(
        require("fs").readFileSync(STATE_FILE, "utf-8")
      ) as ImportState;
      return data;
    }
  } catch {}
  return { lastSuccessfulOffset: 0, lastRun: new Date().toISOString(), totalImported: 0 };
}

function saveState(state: ImportState): void {
  require("fs").writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const BASE_URL = "https://oss.exercisedb.dev/api/v1";
const PAGE_LIMIT = 100;
const SOURCE = "exercisedb";
const SOURCE_LICENSE = "CC BY-SA 4.0 (ExerciseDB OSS dataset)";
const REQUEST_DELAY_MS = 3000; // Cloudflare rate limiting; 0.33 req/sec
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 4000;
const STATE_FILE = join(process.cwd(), ".import-state.json");

// ---------------------------------------------------------------------------
// Types from ExerciseDB API (official v1.0.0)
// Per https://oss.exercisedb.dev/docs#description/introduction
// ---------------------------------------------------------------------------

interface ExerciseDbItem {
  exerciseId: string;
  name: string;
  gifUrl: string;
  bodyParts: string[]; // e.g. ["chest", "back"]
  equipments: string[]; // e.g. ["barbell", "dumbbell"]
  targetMuscles: string[]; // e.g. ["pectorals", "triceps"]
  secondaryMuscles: string[]; // e.g. ["shoulders", "triceps"]
  instructions: string[]; // e.g. ["Step:1 Lie flat...", "Step:2 Grasp..."]
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
  const url = `${BASE_URL}/exercises?offset=${offset}&limit=${PAGE_LIMIT}`;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        method: "GET",
        headers: {
          "User-Agent": "bodyflow-import/1.0",
        },
      });

      if (res.status === 429) {
        // Rate limited — retry with exponential backoff
        const backoffMs = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        console.log(
          `[import] Rate limited at offset=${offset}, retry ${attempt}/${MAX_RETRIES} after ${backoffMs}ms`
        );
        await sleep(backoffMs);
        continue;
      }

      if (!res.ok) {
        const body = await res.text().catch(() => "(could not read response)");
        throw new Error(
          `ExerciseDB responded ${res.status} for offset=${offset}\nURL: ${url}\nResponse: ${body.slice(0, 200)}`
        );
      }

      const json = (await res.json()) as ExerciseDbResponse | ExerciseDbItem[];

      if (offset === 0) {
        console.log("[import] API response structure (first page):", JSON.stringify(json, null, 2).slice(0, 300));
      }

      // Handle both array and {success, data, total} envelope formats
      if (Array.isArray(json)) {
        return { items: json, total: 1500 }; // ExerciseDB has ~1500 exercises
      }

      const items = json.data ?? [];
      const total = json.total ?? 1500; // Assume 1500 if not specified
      return { items, total };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES && !(err instanceof Error && err.message.includes("responded"))) {
        const backoffMs = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
        console.log(`[import] Attempt ${attempt}/${MAX_RETRIES} failed, retrying after ${backoffMs}ms...`);
        await sleep(backoffMs);
      }
    }
  }

  throw lastError || new Error(`Failed to fetch page at offset=${offset} after ${MAX_RETRIES} attempts`);
}

async function fetchAllExercises(): Promise<ExerciseDbItem[]> {
  console.log("[import] Fetching first page to discover total count...");
  const first = await fetchPage(0);

  if (first.items.length === 0) {
    console.warn("[import] First page returned 0 items. API response structure may be different.");
    console.log("[import] Raw first page data:", JSON.stringify(first, null, 2).slice(0, 500));
    return [];
  }

  console.log("[import] Sample first item:", JSON.stringify(first.items[0], null, 2));

  if (first.total <= PAGE_LIMIT) {
    console.log(`[import] Fetched ${first.items.length} exercises (single page).`);
    return first.items;
  }

  const allItems: ExerciseDbItem[] = [...first.items];
  const state = loadState();
  let offset = Math.max(PAGE_LIMIT, state.lastSuccessfulOffset);

  if (state.lastSuccessfulOffset > 0) {
    logToFile(
      `[resume] Starting from offset=${offset} (last successful: ${state.lastSuccessfulOffset})`
    );
    console.log(
      `[import] Resuming from offset=${offset} (previously imported: ${state.totalImported})`
    );
  }

  while (offset < first.total) {
    await sleep(REQUEST_DELAY_MS);
    console.log(`[import] Fetching offset=${offset} / ${first.total} ...`);
    try {
      const page = await fetchPage(offset);
      allItems.push(...page.items);
      state.lastSuccessfulOffset = offset;
      saveState(state);
      offset += PAGE_LIMIT;
    } catch (err) {
      console.error(`[import] Failed to fetch offset=${offset}:`, err instanceof Error ? err.message : String(err));
      logToFile(`[import] Stopped at offset=${offset}. Run again to resume.`);
      console.warn(`[import] Stopping at ${allItems.length} exercises (rate limit reached). Run again to continue.`);
      break;
    }
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
  // Dedup by externalId — if same exercise appears twice in batch, keep first
  const deduped = batch.reduce(
    (acc, ex) => {
      if (!acc.seen.has(ex.exerciseId)) {
        acc.seen.add(ex.exerciseId);
        acc.items.push(ex);
      }
      return acc;
    },
    { items: [] as ExerciseDbItem[], seen: new Set<string>() }
  );

  if (deduped.items.length < batch.length) {
    logToFile(`[dedup] Removed ${batch.length - deduped.items.length} duplicates from batch`);
  }

  const rows = deduped.items.map((ex) => {
    // Use first body part (exercise may have multiple)
    const primaryBodyPart = ex.bodyParts?.[0];
    const categoryId = primaryBodyPart ? categoryMap.get(slugify(primaryBodyPart)) : null;

    if (!categoryId) {
      throw new Error(
        `No valid bodyPart found for exercise "${ex.name}" (id=${ex.exerciseId}). Available: ${ex.bodyParts?.join(", ")}`
      );
    }

    // Use first target muscle
    const primaryTargetMuscle = ex.targetMuscles?.[0];
    const targetMuscleId = primaryTargetMuscle ? muscleMap.get(slugify(primaryTargetMuscle)) : null;

    // Use first equipment or fall back to generic
    const primaryEquipment = ex.equipments?.[0] ?? "UNKNOWN";

    return {
      externalId: ex.exerciseId,
      slug: uniqueSlug(slugify(ex.name), seenSlugs),
      name: ex.name,
      categoryId,
      targetMuscleId: targetMuscleId ?? null,
      equipment: primaryEquipment,
      gifUrl: ex.gifUrl || null,
      instructions: ex.instructions ?? [],
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
    const exerciseId = exerciseIdMap.get(ex.exerciseId);
    if (!exerciseId) continue;

    // Skip if this muscle is already the target muscle
    const primaryTarget = ex.targetMuscles?.[0];
    const targetMuscleId = primaryTarget ? muscleMap.get(slugify(primaryTarget)) : null;

    for (const m of ex.secondaryMuscles ?? []) {
      const muscleId = muscleMap.get(slugify(m));
      // Don't add target muscle as secondary
      if (muscleId && muscleId !== targetMuscleId) {
        rows.push({ exerciseId, muscleId });
      }
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
  ensureLogsDir();
  logToFile(`\n========== Import started at ${new Date().toISOString()} ==========`);

  const url = process.env.DATABASE_URL;
  if (!url) {
    logToFile("[ERROR] DATABASE_URL not set. Copy .env.example to .env.local.");
    process.exit(1);
  }

  const sql = neon(url);
  const db = drizzle({ client: sql, schema, casing: "snake_case" });

  logToFile("[import] Starting ExerciseDB import...");

  let rawExercises: ExerciseDbItem[];
  try {
    rawExercises = await fetchAllExercises();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logToFile(`[ERROR] Failed to fetch exercises from ExerciseDB: ${msg}`);
    process.exit(1);
  }

  if (rawExercises.length === 0) {
    logToFile("[WARN] ExerciseDB returned 0 exercises. Nothing to import.");
    return;
  }

  // Collect unique controlled values from arrays
  const bodyParts = [...new Set(rawExercises.flatMap((e) => e.bodyParts))];
  const allMuscles = [
    ...new Set([
      ...rawExercises.flatMap((e) => e.targetMuscles),
      ...rawExercises.flatMap((e) => e.secondaryMuscles),
    ]),
  ];

  logToFile(`[import] Upserting ${bodyParts.length} categories...`);
  const categoryMap = await upsertCategories(db, bodyParts);

  logToFile(`[import] Upserting ${allMuscles.length} muscles...`);
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
      const msg = err instanceof Error ? err.message : String(err);
      logToFile(`[ERROR] Batch at index ${i}: ${msg.slice(0, 200)}`);
      console.error(`\n[import] Batch starting at index ${i} failed:`, msg.slice(0, 200));
    }
  }

  const summary = `\n[import] Done. ${imported} exercises imported, ${errors} batch errors.`;
  logToFile(summary);
  console.log(summary);

  // Update state with final count
  const state = loadState();
  state.totalImported += imported;
  state.lastRun = new Date().toISOString();
  saveState(state);
  logToFile(`[state] Total progress: ${state.totalImported} exercises imported across all runs`);

  if (errors > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  logToFile(`[FATAL] ${msg}`);
  console.error("[import] Unhandled error:", msg);
  process.exit(1);
});
