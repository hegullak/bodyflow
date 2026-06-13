-- Exercise Catalog: shared reference tables imported from ExerciseDB OSS.
-- No user_id column — this is catalog data, not user-owned data.
-- Soft delete intentionally omitted (catalog rows are managed by import script).

-- Body part categories (e.g. "chest", "back", "legs")
CREATE TABLE IF NOT EXISTS "bodyflow"."exercise_category" (
  "id"         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "slug"       text        NOT NULL,
  "name"       text        NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "exercise_category_slug_unique" UNIQUE ("slug")
);

--> statement-breakpoint

-- Muscle reference table (target and secondary muscles share this table)
CREATE TABLE IF NOT EXISTS "bodyflow"."exercise_muscle" (
  "id"         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "slug"       text        NOT NULL,
  "name"       text        NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "exercise_muscle_slug_unique" UNIQUE ("slug")
);

--> statement-breakpoint

-- Main exercise table.
-- Denormalized field: equipment (text) — small controlled set, filter only.
-- Denormalized field: instructions (jsonb) — ordered list, always read atomically.
CREATE TABLE IF NOT EXISTS "bodyflow"."exercise" (
  "id"               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "external_id"      text        NOT NULL,
  "slug"             text        NOT NULL,
  "name"             text        NOT NULL,
  "category_id"      uuid        NOT NULL REFERENCES "bodyflow"."exercise_category"("id") ON DELETE RESTRICT,
  "target_muscle_id" uuid        REFERENCES "bodyflow"."exercise_muscle"("id") ON DELETE RESTRICT,
  "equipment"        text        NOT NULL,
  "gif_url"          text,
  "instructions"     jsonb       NOT NULL DEFAULT '[]',
  "source"           text        NOT NULL DEFAULT 'exercisedb',
  "source_license"   text,
  "created_at"       timestamptz NOT NULL DEFAULT now(),
  "updated_at"       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT "exercise_slug_unique"            UNIQUE ("slug"),
  CONSTRAINT "exercise_source_external_unique" UNIQUE ("source", "external_id")
);

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "exercise_category_idx" ON "bodyflow"."exercise" ("category_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "exercise_target_muscle_idx" ON "bodyflow"."exercise" ("target_muscle_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "exercise_equipment_idx" ON "bodyflow"."exercise" ("equipment");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "exercise_name_idx" ON "bodyflow"."exercise" ("name");
--> statement-breakpoint

-- Many-to-many: exercise <-> secondary muscles.
-- Composite PK — pure join table needs no surrogate UUID.
-- CASCADE on exercise delete; RESTRICT on muscle delete.
CREATE TABLE IF NOT EXISTS "bodyflow"."exercise_secondary_muscle" (
  "exercise_id" uuid NOT NULL REFERENCES "bodyflow"."exercise"("id") ON DELETE CASCADE,
  "muscle_id"   uuid NOT NULL REFERENCES "bodyflow"."exercise_muscle"("id") ON DELETE RESTRICT,
  PRIMARY KEY ("exercise_id", "muscle_id")
);

--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "exercise_secondary_muscle_exercise_idx"
  ON "bodyflow"."exercise_secondary_muscle" ("exercise_id");
