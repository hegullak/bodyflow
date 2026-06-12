-- DATABASE_STANDARDS.md compliance: singular table names, audit_log, FK on meal_log_item.food_product_id

ALTER TABLE "bodyflow"."user_profiles" RENAME TO "user_profile";--> statement-breakpoint
ALTER TABLE "bodyflow"."daily_body_logs" RENAME TO "daily_body_log";--> statement-breakpoint
ALTER TABLE "bodyflow"."body_measurements" RENAME TO "body_measurement";--> statement-breakpoint
ALTER TABLE "bodyflow"."food_products" RENAME TO "food_product";--> statement-breakpoint
ALTER TABLE "bodyflow"."meal_log_items" RENAME TO "meal_log_item";--> statement-breakpoint
ALTER TABLE "bodyflow"."withings_connections" RENAME TO "withings_connection";--> statement-breakpoint

CREATE TABLE "bodyflow"."audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"action" text NOT NULL,
	"changed_by" text,
	"changed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"before_json" jsonb,
	"after_json" jsonb
);--> statement-breakpoint
CREATE INDEX "audit_log_entity_idx" ON "bodyflow"."audit_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_log_changed_at_idx" ON "bodyflow"."audit_log" USING btree ("changed_at");--> statement-breakpoint
ALTER TABLE "bodyflow"."meal_log_item" ADD CONSTRAINT "meal_log_item_food_product_id_food_product_id_fk" FOREIGN KEY ("food_product_id") REFERENCES "bodyflow"."food_product"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "meal_log_item_food_product_id_idx" ON "bodyflow"."meal_log_item" USING btree ("food_product_id");
