-- Rename gif_url → image_url (wger uses static PNG images, not GIFs)
-- Also clear exercise data imported from ExerciseDB so we start fresh with wger.

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'bodyflow' AND table_name = 'exercise' AND column_name = 'gif_url'
  ) THEN
    ALTER TABLE "bodyflow"."exercise" RENAME COLUMN "gif_url" TO "image_url";
  END IF;
END $$;

--> statement-breakpoint

-- Clear old ExerciseDB data (idempotent — safe to run if already empty)
DELETE FROM "bodyflow"."exercise_secondary_muscle";
--> statement-breakpoint
DELETE FROM "bodyflow"."exercise";
--> statement-breakpoint
DELETE FROM "bodyflow"."exercise_category";
--> statement-breakpoint
DELETE FROM "bodyflow"."exercise_muscle";
