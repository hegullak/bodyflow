/**
 * One-time migration: copy all user data from old Neon DB (ep-quiet-shadow)
 * to new Neon DB (ep-gentle-tooth).
 *
 * Seed/reference tables (exercise, food_product from matvaretabellen) are
 * already present in the new DB, so we only copy user-owned tables.
 * Foreign keys to exercises and food_products are re-mapped via external_id.
 *
 * Usage:  npx tsx scripts/migrate-user-data.ts
 */

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";

const OLD_URL =
  "postgresql://neondb_owner:npg_oNvWdHLVc3w8@ep-quiet-shadow-ab1f98ju.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require";
const NEW_URL = process.env.DATABASE_URL!;

if (!NEW_URL) throw new Error("DATABASE_URL not set in .env.local");

const old = neon(OLD_URL);
const nw = neon(NEW_URL);

function log(msg: string) {
  console.log(`[migrate] ${msg}`);
}

// ---------------------------------------------------------------------------
// Build exercise ID mapping: old UUID → new UUID (via external_id)
// ---------------------------------------------------------------------------
async function buildExerciseMap(): Promise<Map<string, string>> {
  const [oldRows, newRows] = (await Promise.all([
    old.query(`SELECT id, external_id FROM bodyflow.exercise`),
    nw.query(`SELECT id, external_id FROM bodyflow.exercise`),
  ])) as [Record<string, string>[], Record<string, string>[]];
  const newByExternal = new Map(newRows.map((r) => [r.external_id as string, r.id as string]));
  const map = new Map<string, string>();
  for (const r of oldRows) {
    const newId = newByExternal.get(r.external_id as string);
    if (newId) map.set(r.id as string, newId);
  }
  log(`Exercise map: ${map.size} / ${oldRows.length} matched`);
  return map;
}

// ---------------------------------------------------------------------------
// Build food_product ID mapping: old UUID → new UUID
// For matvaretabellen/kassal: match via (source, external_id)
// For custom: insert the row first, then use the new ID
// ---------------------------------------------------------------------------
async function buildFoodProductMap(): Promise<Map<string, string>> {
  const [oldRows, newRows] = (await Promise.all([
    old.query(`SELECT * FROM bodyflow.food_product`),
    nw.query(`SELECT id, source, external_id FROM bodyflow.food_product`),
  ])) as [Record<string, unknown>[], Record<string, string>[]];

  const newByKey = new Map(newRows.map((r) => [`${r.source}:${r.external_id}`, r.id as string]));
  const map = new Map<string, string>();
  const customToInsert: typeof oldRows = [];

  for (const r of oldRows) {
    const key = `${r.source}:${r.external_id}`;
    const newId = newByKey.get(key);
    if (newId) {
      map.set(r.id as string, newId);
    } else {
      customToInsert.push(r);
    }
  }

  if (customToInsert.length > 0) {
    log(`Inserting ${customToInsert.length} custom food products...`);
    for (const r of customToInsert) {
      const inserted = await nw`
        INSERT INTO bodyflow.food_product
          (id, source, external_id, ean, name, brand, image_url, kcal_per_100g,
           package_grams, search_text, fetched_at, created_at, updated_at)
        VALUES
          (${r.id}, ${r.source}, ${r.external_id}, ${r.ean}, ${r.name}, ${r.brand},
           ${r.image_url}, ${r.kcal_per_100g}, ${r.package_grams}, ${r.search_text},
           ${r.fetched_at}, ${r.created_at}, ${r.updated_at})
        ON CONFLICT DO NOTHING
        RETURNING id
      `;
      const newId = inserted[0]?.id ?? r.id;
      map.set(r.id as string, newId as string);
    }
  }

  log(`Food product map: ${map.size} / ${oldRows.length} mapped`);
  return map;
}

// ---------------------------------------------------------------------------
// Generic table copy (no FK remapping needed)
// ---------------------------------------------------------------------------
async function copyTable(tableName: string, columns: string[]) {
  const rows = (await old.query(`SELECT * FROM bodyflow.${tableName}`)) as Record<string, unknown>[];
  if (rows.length === 0) {
    log(`${tableName}: 0 rows — skipping`);
    return;
  }
  const colList = columns.join(", ");
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
  let inserted = 0;
  for (const row of rows) {
    const vals = columns.map((c) => row[c]);
    try {
      const result = (await nw.query(
        `INSERT INTO bodyflow.${tableName} (${colList}) VALUES (${placeholders}) ON CONFLICT DO NOTHING RETURNING id`,
        vals,
      )) as Record<string, unknown>[];
      if (result.length > 0) inserted++;
    } catch (e) {
      console.error(`  Error on ${tableName} row ${row.id}:`, (e as Error).message.slice(0, 120));
    }
  }
  log(`${tableName}: ${inserted} / ${rows.length} inserted`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  log("Starting migration...\n");

  // 1. user_profile
  await copyTable("user_profile", [
    "id", "user_id", "sex", "birth_year", "birth_date", "height_cm", "activity_level",
    "goal", "target_weight_kg", "daily_calorie_target", "preferred_units", "notes",
    "created_at", "updated_at",
  ]);

  // 2. withings_connection
  await copyTable("withings_connection", [
    "id", "user_id", "withings_user_id", "access_token", "refresh_token",
    "token_expires_at", "scope", "last_sync_at", "last_withings_update",
    "webhook_subscribed", "created_at", "updated_at",
  ]);

  // 3. daily_body_log
  await copyTable("daily_body_log", [
    "id", "user_id", "log_date", "weight_kg", "weight_source",
    "calorie_intake", "note", "deleted_at", "created_at", "updated_at",
  ]);

  // 4. body_measurement
  await copyTable("body_measurement", [
    "id", "user_id", "measured_on", "chest_cm", "waist_cm", "hip_cm",
    "note", "deleted_at", "created_at", "updated_at",
  ]);

  // 5. reminder
  await copyTable("reminder", [
    "id", "user_id", "reminder_type", "enabled", "weekdays", "reminder_time",
    "timezone", "target_route", "last_triggered_at", "deleted_at", "created_at", "updated_at",
  ]);

  // 6. Build mappings
  const exerciseMap = await buildExerciseMap();
  const foodProductMap = await buildFoodProductMap();

  // 7. meal_log_item (food_product_id remapped)
  {
    const rows = await old`SELECT * FROM bodyflow.meal_log_item`;
    let inserted = 0;
    for (const r of rows) {
      const newFpId = r.food_product_id ? (foodProductMap.get(r.food_product_id) ?? null) : null;
      try {
        const result = await nw`
          INSERT INTO bodyflow.meal_log_item
            (id, user_id, log_date, meal_type, food_product_id, kassal_product_id, ean,
             product_name, brand, quantity_grams, kcal_per_100g, calories_kcal,
             deleted_at, created_at, updated_at)
          VALUES
            (${r.id}, ${r.user_id}, ${r.log_date}, ${r.meal_type}, ${newFpId},
             ${r.kassal_product_id}, ${r.ean}, ${r.product_name}, ${r.brand},
             ${r.quantity_grams}, ${r.kcal_per_100g}, ${r.calories_kcal},
             ${r.deleted_at}, ${r.created_at}, ${r.updated_at})
          ON CONFLICT DO NOTHING
          RETURNING id
        `;
        if (result.length > 0) inserted++;
      } catch (e) {
        console.error(`  meal_log_item ${r.id}:`, (e as Error).message.slice(0, 120));
      }
    }
    log(`meal_log_item: ${inserted} / ${rows.length} inserted`);
  }

  // 8. saved_meal
  await copyTable("saved_meal", [
    "id", "user_id", "name", "total_kcal", "total_grams",
    "created_at", "updated_at", "deleted_at",
  ]);

  // 9. saved_meal_item (food_product_id remapped)
  {
    const rows = await old`SELECT * FROM bodyflow.saved_meal_item`;
    let inserted = 0;
    for (const r of rows) {
      const newFpId = r.food_product_id ? (foodProductMap.get(r.food_product_id) ?? null) : null;
      try {
        const result = await nw`
          INSERT INTO bodyflow.saved_meal_item
            (id, saved_meal_id, food_product_id, product_name, brand,
             quantity_grams, kcal_per_100g, calories_kcal, created_at)
          VALUES
            (${r.id}, ${r.saved_meal_id}, ${newFpId}, ${r.product_name}, ${r.brand},
             ${r.quantity_grams}, ${r.kcal_per_100g}, ${r.calories_kcal}, ${r.created_at})
          ON CONFLICT DO NOTHING
          RETURNING id
        `;
        if (result.length > 0) inserted++;
      } catch (e) {
        console.error(`  saved_meal_item ${r.id}:`, (e as Error).message.slice(0, 120));
      }
    }
    log(`saved_meal_item: ${inserted} / ${rows.length} inserted`);
  }

  // 10. workout_program
  await copyTable("workout_program", [
    "id", "user_id", "name", "sort_order", "created_at", "updated_at",
  ]);

  // 11. workout_superset
  await copyTable("workout_superset", [
    "id", "program_id", "created_at",
  ]);

  // 12. workout_program_exercise (exercise_id remapped)
  {
    const rows = await old`SELECT * FROM bodyflow.workout_program_exercise`;
    let inserted = 0;
    let skipped = 0;
    for (const r of rows) {
      const newExId = exerciseMap.get(r.exercise_id);
      if (!newExId) {
        console.warn(`  workout_program_exercise ${r.id}: exercise ${r.exercise_id} not mapped — skipping`);
        skipped++;
        continue;
      }
      try {
        const result = await nw`
          INSERT INTO bodyflow.workout_program_exercise
            (id, program_id, exercise_id, superset_id, program_order, superset_order,
             sets, reps, rest_seconds, is_bodyweight, created_at, updated_at)
          VALUES
            (${r.id}, ${r.program_id}, ${newExId}, ${r.superset_id}, ${r.program_order},
             ${r.superset_order}, ${r.sets}, ${r.reps}, ${r.rest_seconds},
             ${r.is_bodyweight}, ${r.created_at}, ${r.updated_at})
          ON CONFLICT DO NOTHING
          RETURNING id
        `;
        if (result.length > 0) inserted++;
      } catch (e) {
        console.error(`  workout_program_exercise ${r.id}:`, (e as Error).message.slice(0, 120));
      }
    }
    log(`workout_program_exercise: ${inserted} inserted, ${skipped} skipped (unmapped exercise)`);
  }

  // 13. workout_session
  await copyTable("workout_session", [
    "id", "user_id", "program_id", "program_name",
    "started_at", "ended_at", "created_at", "updated_at",
  ]);

  // 14. workout_set_log (exercise_id + program_exercise_id remapped)
  {
    const rows = await old`SELECT * FROM bodyflow.workout_set_log`;
    let inserted = 0;
    for (const r of rows) {
      const newExId = r.exercise_id ? (exerciseMap.get(r.exercise_id) ?? null) : null;
      const newProgExId = r.program_exercise_id ?? null;
      try {
        const result = await nw`
          INSERT INTO bodyflow.workout_set_log
            (id, session_id, program_exercise_id, exercise_id, exercise_name,
             set_number, is_bodyweight, weight_kg, reps, completed_at, created_at)
          VALUES
            (${r.id}, ${r.session_id}, ${newProgExId}, ${newExId}, ${r.exercise_name},
             ${r.set_number}, ${r.is_bodyweight}, ${r.weight_kg}, ${r.reps},
             ${r.completed_at}, ${r.created_at})
          ON CONFLICT DO NOTHING
          RETURNING id
        `;
        if (result.length > 0) inserted++;
      } catch (e) {
        console.error(`  workout_set_log ${r.id}:`, (e as Error).message.slice(0, 120));
      }
    }
    log(`workout_set_log: ${inserted} / ${rows.length} inserted`);
  }

  // 15. audit_log
  await copyTable("audit_log", [
    "id", "entity_type", "entity_id", "action", "changed_by", "changed_at",
    "before_json", "after_json",
  ]);

  log("\nMigration complete!");
}

main().catch((e) => {
  console.error("[FATAL]", e);
  process.exit(1);
});
