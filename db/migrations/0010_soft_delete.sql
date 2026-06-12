ALTER TABLE "bodyflow"."daily_body_log" ADD COLUMN IF NOT EXISTS "deleted_at" timestamptz;
--> statement-breakpoint
ALTER TABLE "bodyflow"."meal_log_item" ADD COLUMN IF NOT EXISTS "deleted_at" timestamptz;
--> statement-breakpoint
ALTER TABLE "bodyflow"."body_measurement" ADD COLUMN IF NOT EXISTS "deleted_at" timestamptz;
