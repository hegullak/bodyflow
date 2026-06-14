/**
 * Import exercises from wger (https://wger.de) into the local database.
 *
 * wger is open-source, no auth required, ~800 English exercises.
 * License: Creative Commons Attribution Share Alike 3.0 (CC BY-SA 3.0)
 * Attribution: wger Project — https://wger.de
 *
 * Usage:  npm run import:exercises
 * Safe to rerun: all operations use upsert / idempotent deletes.
 */

import dotenv from "dotenv";
import { existsSync, mkdirSync, appendFileSync, writeFileSync, readFileSync } from "fs";
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

const BASE_URL = "https://wger.de/api/v2";
const LANGUAGE_ENGLISH = 2;
const PAGE_LIMIT = 100;
const SOURCE = "wger";
const SOURCE_LICENSE = "CC BY-SA 3.0 (wger Project — https://wger.de)";
const REQUEST_DELAY_MS = 1000;
const LOGS_DIR = join(process.cwd(), "..", "logs", "bodyflow");
const STATE_FILE = join(process.cwd(), ".import-state.json");
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
// State (resume support)
// ---------------------------------------------------------------------------

interface ImportState {
  lastOffset: number;
  totalImported: number;
  lastRun: string;
}

function loadState(): ImportState {
  try {
    if (existsSync(STATE_FILE)) {
      return JSON.parse(readFileSync(STATE_FILE, "utf-8")) as ImportState;
    }
  } catch {}
  return { lastOffset: 0, totalImported: 0, lastRun: new Date().toISOString() };
}

function saveState(state: ImportState) {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf-8");
}

// ---------------------------------------------------------------------------
// wger API types
// ---------------------------------------------------------------------------

interface WgerMuscle {
  id: number;
  name_en: string;
  is_front: boolean;
}

interface WgerEquipment {
  id: number;
  name: string;
}

interface WgerCategory {
  id: number;
  name: string;
}

interface WgerImage {
  id: number;
  image: string;
  is_main: boolean;
}

interface WgerTranslation {
  id: number;
  language: number;
  name: string;
  description: string;
}

interface WgerExercise {
  id: number;
  uuid: string;
  category: WgerCategory;
  muscles: WgerMuscle[];
  muscles_secondary: WgerMuscle[];
  equipment: WgerEquipment[];
  images: WgerImage[];
  translations: WgerTranslation[];
}

interface WgerResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: WgerExercise[];
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

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function getEnglishTranslation(translations: WgerTranslation[]): WgerTranslation | null {
  return translations.find((t) => t.language === LANGUAGE_ENGLISH) ?? null;
}

// ---------------------------------------------------------------------------
// Fetch
// ---------------------------------------------------------------------------

async function fetchPage(offset: number): Promise<WgerResponse> {
  const url = `${BASE_URL}/exerciseinfo/?format=json&language=${LANGUAGE_ENGLISH}&limit=${PAGE_LIMIT}&offset=${offset}`;

  const res = await fetch(url, {
    headers: { "User-Agent": "bodyflow-import/1.0 (https://github.com/hegullak/bodyflow)" },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "(could not read response)");
    throw new Error(`wger responded ${res.status} at offset=${offset}\n${body.slice(0, 200)}`);
  }

  return res.json() as Promise<WgerResponse>;
}

async function fetchAllExercises(): Promise<WgerExercise[]> {
  const state = loadState();
  const startOffset = state.lastOffset;

  log(`[import] Fetching first page to get total count...`);
  const first = await fetchPage(0);
  log(`[import] wger has ${first.count} exercises total`);

  const allItems: WgerExercise[] = startOffset === 0 ? [...first.results] : [];
  let offset = startOffset === 0 ? PAGE_LIMIT : startOffset;

  if (startOffset > 0) {
    log(`[resume] Starting from offset=${startOffset} (previously imported: ${state.totalImported})`);
  }

  while (offset < first.count) {
    await sleep(REQUEST_DELAY_MS);
    log(`[import] Fetching offset=${offset} / ${first.count} ...`);
    try {
      const page = await fetchPage(offset);
      allItems.push(...page.results);
      state.lastOffset = offset;
      saveState(state);
      offset += PAGE_LIMIT;
      if (!page.next) break; // no more pages
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log(`[import] Stopped at offset=${offset}. Error: ${msg}`);
      log(`[import] Run again to resume.`);
      break;
    }
  }

  log(`[import] Fetched ${allItems.length} exercises from wger`);
  return allItems;
}

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

type Db = ReturnType<typeof drizzle<typeof schema>>;

async function upsertCategories(db: Db, exercises: WgerExercise[]): Promise<Map<number, string>> {
  const categories = new Map<number, string>(); // wger id → name
  for (const ex of exercises) {
    if (ex.category) categories.set(ex.category.id, ex.category.name);
  }

  const rows = [...categories.entries()].map(([wgerId, name]) => ({
    slug: slugify(`wger-cat-${wgerId}`),
    name,
  }));

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

  const slugToId = new Map(result.map((r) => [r.slug, r.id]));
  const wgerIdToDbId = new Map<number, string>();
  for (const [wgerId] of categories.entries()) {
    const slug = slugify(`wger-cat-${wgerId}`);
    const dbId = slugToId.get(slug);
    if (dbId) wgerIdToDbId.set(wgerId, dbId);
  }
  log(`[import] Categories upserted: ${result.length}`);
  return wgerIdToDbId;
}

async function upsertMuscles(db: Db, exercises: WgerExercise[]): Promise<Map<number, string>> {
  const muscles = new Map<number, string>(); // wger id → name_en
  for (const ex of exercises) {
    for (const m of [...ex.muscles, ...ex.muscles_secondary]) {
      if (m.name_en) muscles.set(m.id, m.name_en);
    }
  }

  const rows = [...muscles.entries()].map(([wgerId, name]) => ({
    slug: slugify(`wger-muscle-${wgerId}`),
    name,
  }));

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

  const slugToId = new Map(result.map((r) => [r.slug, r.id]));
  const wgerIdToDbId = new Map<number, string>();
  for (const [wgerId] of muscles.entries()) {
    const slug = slugify(`wger-muscle-${wgerId}`);
    const dbId = slugToId.get(slug);
    if (dbId) wgerIdToDbId.set(wgerId, dbId);
  }
  log(`[import] Muscles upserted: ${result.length}`);
  return wgerIdToDbId;
}

async function upsertExerciseBatch(
  db: Db,
  batch: WgerExercise[],
  categoryMap: Map<number, string>,
  muscleMap: Map<number, string>,
  seenSlugs: Set<string>
): Promise<Map<number, string>> {
  const rows: (typeof schema.exercises.$inferInsert)[] = [];

  for (const ex of batch) {
    const translation = getEnglishTranslation(ex.translations);
    if (!translation?.name) continue; // skip exercises without English name

    const categoryId = categoryMap.get(ex.category?.id);
    if (!categoryId) continue; // skip if no category

    const primaryMuscle = ex.muscles[0];
    const targetMuscleId = primaryMuscle ? muscleMap.get(primaryMuscle.id) : undefined;
    const primaryEquipment = ex.equipment[0]?.name ?? "body weight";
    const mainImage = ex.images.find((img) => img.is_main) ?? ex.images[0];

    const description = translation.description ? stripHtml(translation.description) : "";
    const instructions = description ? [description] : [];

    rows.push({
      externalId: String(ex.id),
      slug: uniqueSlug(slugify(translation.name), seenSlugs),
      name: translation.name,
      categoryId,
      targetMuscleId: targetMuscleId ?? null,
      equipment: primaryEquipment,
      imageUrl: mainImage?.image ?? null,
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

  log(`[import] Batch: ${result.length}/${rows.length} exercises inserted`);

  const map = new Map<number, string>();
  for (const r of result) map.set(Number(r.externalId), r.id);
  return map;
}

async function upsertSecondaryMuscles(
  db: Db,
  exerciseIdMap: Map<number, string>,
  batch: WgerExercise[],
  muscleMap: Map<number, string>
): Promise<void> {
  const exerciseDbIds = [...exerciseIdMap.values()];
  if (exerciseDbIds.length === 0) return;

  await db
    .delete(schema.exerciseSecondaryMuscles)
    .where(inArray(schema.exerciseSecondaryMuscles.exerciseId, exerciseDbIds));

  const rows: { exerciseId: string; muscleId: string }[] = [];
  for (const ex of batch) {
    const exerciseId = exerciseIdMap.get(ex.id);
    if (!exerciseId) continue;

    const primaryMuscleId = ex.muscles[0] ? muscleMap.get(ex.muscles[0].id) : null;

    for (const m of ex.muscles_secondary) {
      const muscleId = muscleMap.get(m.id);
      if (muscleId && muscleId !== primaryMuscleId) {
        rows.push({ exerciseId, muscleId });
      }
    }
  }

  if (rows.length > 0) {
    await db.insert(schema.exerciseSecondaryMuscles).values(rows).onConflictDoNothing();
    log(`[import] Secondary muscles: ${rows.length} links inserted`);
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

  // NOTE: Do NOT use casing: "snake_case" — schema uses explicit column names.
  // Combining casing with explicit names in drizzle-orm v0.45 generates invalid SQL.
  const sql = neon(url);
  const db = drizzle({ client: sql, schema });

  let rawExercises: WgerExercise[];
  try {
    rawExercises = await fetchAllExercises();
  } catch (err) {
    log(`[ERROR] Failed to fetch exercises: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }

  if (rawExercises.length === 0) {
    log("[WARN] No exercises fetched. Nothing to import.");
    return;
  }

  // Filter: only exercises with English translation
  const withEnglish = rawExercises.filter((ex) => getEnglishTranslation(ex.translations));
  log(`[import] ${withEnglish.length} / ${rawExercises.length} exercises have English translations`);

  const categoryMap = await upsertCategories(db, withEnglish);
  const muscleMap = await upsertMuscles(db, withEnglish);

  const BATCH = 50;
  const seenSlugs = new Set<string>();
  let imported = 0;
  let errors = 0;

  for (let i = 0; i < withEnglish.length; i += BATCH) {
    const batch = withEnglish.slice(i, i + BATCH);
    try {
      const exerciseIdMap = await upsertExerciseBatch(db, batch, categoryMap, muscleMap, seenSlugs);
      await upsertSecondaryMuscles(db, exerciseIdMap, batch, muscleMap);
      imported += exerciseIdMap.size;
      process.stdout.write(`\r[import] ${imported} exercises inserted so far...`);
    } catch (err) {
      errors++;
      const msg = err instanceof Error ? err.message : String(err);
      log(`\n[ERROR] Batch at index ${i}: ${msg.slice(0, 300)}`);
    }
  }

  const state = loadState();
  state.totalImported += imported;
  state.lastRun = new Date().toISOString();
  saveState(state);

  log(`\n[import] Done. ${imported} exercises imported, ${errors} batch errors.`);
  log(`[state] Total across all runs: ${state.totalImported}`);
}

main().catch((err) => {
  log(`[FATAL] ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
