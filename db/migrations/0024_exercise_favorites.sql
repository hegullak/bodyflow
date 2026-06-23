CREATE TABLE IF NOT EXISTS "bodyflow"."exercise_favorite" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" text NOT NULL,
  "exercise_id" uuid NOT NULL REFERENCES "bodyflow"."exercise"("id") ON DELETE CASCADE,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX "exercise_favorite_user_exercise_unique"
  ON "bodyflow"."exercise_favorite"("user_id", "exercise_id");

CREATE INDEX "exercise_favorite_user_idx"
  ON "bodyflow"."exercise_favorite"("user_id");
