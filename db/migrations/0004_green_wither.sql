CREATE TYPE "bodyflow"."meal_type" AS ENUM('breakfast', 'lunch', 'snack', 'dinner', 'evening');--> statement-breakpoint
CREATE TABLE "bodyflow"."meal_log_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"log_date" date NOT NULL,
	"meal_type" "bodyflow"."meal_type" NOT NULL,
	"kassal_product_id" integer,
	"ean" text,
	"product_name" text NOT NULL,
	"brand" text,
	"quantity_grams" real NOT NULL,
	"kcal_per_100g" real NOT NULL,
	"calories_kcal" real NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "meal_log_items_user_date_idx" ON "bodyflow"."meal_log_items" USING btree ("user_id","log_date");--> statement-breakpoint
CREATE INDEX "meal_log_items_user_date_meal_idx" ON "bodyflow"."meal_log_items" USING btree ("user_id","log_date","meal_type");