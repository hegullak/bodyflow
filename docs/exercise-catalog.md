# Exercise Catalog

**Status:** Foundation module (no user-facing UI yet)  
**Source:** [OSS ExerciseDB v1](https://oss.exercisedb.dev/docs)  
**License:** CC BY-SA 4.0 (ExerciseDB OSS dataset)

---

## Overview

The Exercise Catalog is a shared, non-user-owned reference module that stores
exercise data locally in Postgres, imported from the OSS ExerciseDB dataset.
ExerciseDB is only an import source — the frontend never calls it directly.
Bodyflow owns the data after import.

---

## Entity Relationship

```
exercise_category   exercise_muscle
       │ FK (RESTRICT)       │ FK (RESTRICT, target_muscle_id)
       └─────────────────────┤
                         exercise
                             │ FK (CASCADE)
               exercise_secondary_muscle → exercise_muscle
```

## Tables

| Table | Purpose |
|---|---|
| `exercise_category` | Body-part categories (chest, back, legs, …) |
| `exercise_muscle` | Shared muscle reference (target + secondary) |
| `exercise` | Main exercise entity |
| `exercise_secondary_muscle` | M2M join: exercise ↔ secondary muscles |

### Documented deviations from DATABASE_STANDARDS.md

**`exercises.equipment` (text, indexed)**  
Denormalized: equipment is a small controlled set (~15 values) used only as
a filter. A separate FK table would add two joins on every query with no
practical benefit. Change to a reference table if equipment rows need
additional attributes in the future.

**`exercises.instructions` (jsonb `string[]`)**  
Denormalized: an ordered list always read atomically with its exercise. Never
queried independently. JSON array is appropriate here per §5.2 of
DATABASE_STANDARDS.md.

---

## Running the import

```bash
npm run import:exercises
```

- Fetches all exercises from `https://oss.exercisedb.dev/exercises` (paginated)
- Upserts `exercise_category`, `exercise_muscle`, `exercise` rows
- Replaces `exercise_secondary_muscle` rows per exercise batch
- Safe to rerun — all operations are idempotent
- Logs progress to stdout; exits 1 on any batch error

**When to rerun:** only when you want to pull ExerciseDB dataset updates.
Local customisations on `exercise` rows (e.g. custom `gif_url` or
`instructions`) will be overwritten on next import unless the import script
is updated to skip those fields for locally-modified rows.

---

## API

Both endpoints require Clerk authentication. Rate limited at 60 req/min per user.

### `GET /api/exercises`

List exercises with optional filters.

| Query param | Type | Description |
|---|---|---|
| `search` / `q` | string | Case-insensitive name search |
| `bodyPart` | string | Category slug (e.g. `chest`) |
| `targetMuscle` | string | Muscle slug (e.g. `pectorals`) |
| `equipment` | string | Exact equipment string (e.g. `barbell`) |
| `limit` | number | 1–100, default 20 |
| `offset` | number | Default 0 |

Response:
```json
{
  "data": [
    {
      "id": "uuid",
      "externalId": "0001",
      "slug": "barbell-bench-press",
      "name": "Barbell Bench Press",
      "bodyPart": { "slug": "chest", "name": "Chest" },
      "targetMuscle": { "slug": "pectorals", "name": "Pectorals" },
      "secondaryMuscles": [{ "slug": "triceps", "name": "Triceps" }],
      "equipment": "barbell",
      "gifUrl": "https://oss.exercisedb.dev/media/...",
      "instructions": ["Lie flat on bench", "…"],
      "source": "exercisedb"
    }
  ],
  "total": 1350
}
```

### `GET /api/exercises/[id]`

Fetch a single exercise by its Bodyflow UUID. Returns 404 if not found,
400 if the id is not a valid UUID.

---

## GIF handling — current state and R2 proposal

### Current: remote URL reference only

`gif_url` stores the ExerciseDB CDN URL as-is. No media is cached locally.

**Implications:**
- GIF availability depends on ExerciseDB CDN uptime
- Users' browsers fetch GIFs directly from ExerciseDB CDN
- No bandwidth cost on Bodyflow infra

### R2 caching — future proposal

When media reliability or CDN costs become a concern, cache GIFs in
Cloudflare R2.

**License check first:** ExerciseDB OSS dataset is CC BY-SA 4.0. Redistribution
is permitted with attribution. Verify the current license in the ExerciseDB OSS
repo before caching — it may change. R2 storage of GIFs counts as redistribution.

**Migration approach:**
1. Add `gif_url_r2` column (nullable) to `exercise` table.
2. Create a background job (e.g. cron or on-demand) that:
   - Fetches `gif_url` for rows where `gif_url_r2 IS NULL`
   - Uploads to R2 bucket `bodyflow-exercise-gifs/{external_id}.gif`
   - Sets `gif_url_r2` on success
3. API responses serve `gif_url_r2 ?? gif_url` (R2 with CDN fallback).
4. Once all rows are populated, `gif_url` becomes the fallback/audit field only.

No code change needed in the import script — it can continue writing the
original ExerciseDB URL to `gif_url` on every reimport.

---

## Recommended follow-up issues

1. **`import:exercises` — skip locally-modified rows**  
   Add a `locally_modified` boolean flag (default `false`) to `exercise`.
   The import script should skip updating fields other than `gif_url` for
   rows where `locally_modified = true`.

2. **Category and equipment list endpoints**  
   `GET /api/exercises/categories` and `GET /api/exercises/equipment` —
   thin wrappers around `SELECT DISTINCT` for populating filter dropdowns.

3. **Exercise search UI component**  
   Reusable `<ExerciseSearch>` component with debounced search and filter
   chips for body part / equipment — similar pattern to `<MealSearch>`.

4. **Favorites / saved exercises** (user-owned)  
   `user_exercise_favorite` table: `user_id`, `exercise_id`, `created_at`.
   Gate behind a feature flag until workout logging is ready.

5. **Workout template module**  
   `workout_template` + `workout_template_exercise` tables.
   Depends on favorites being in place first.

6. **Workout logging**  
   `workout_log` + `workout_log_set` tables: `user_id`, `exercise_id`,
   `reps`, `weight_kg`, `logged_at`. Personal records derived via query.

7. **R2 GIF caching**  
   Implement the migration plan described above once the catalog has
   been running in production for a sprint.
