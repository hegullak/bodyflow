CREATE TABLE "bodyflow"."scheduled_session" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" text NOT NULL,
  "date" text NOT NULL,
  "program_id" uuid REFERENCES "bodyflow"."workout_program"("id") ON DELETE SET NULL,
  "cardio_slug" text,
  "is_completed" boolean NOT NULL DEFAULT false,
  "completed_at" timestamptz,
  "notes" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX "scheduled_session_user_date_idx" ON "bodyflow"."scheduled_session" ("user_id", "date");
