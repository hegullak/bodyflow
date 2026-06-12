CREATE TYPE "bodyflow"."food_source" AS ENUM('kassal', 'matvaretabellen');--> statement-breakpoint
CREATE TABLE "bodyflow"."food_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" "bodyflow"."food_source" NOT NULL,
	"external_id" text NOT NULL,
	"ean" text,
	"name" text NOT NULL,
	"brand" text,
	"image_url" text,
	"kcal_per_100g" real NOT NULL,
	"package_grams" real,
	"search_text" text,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bodyflow"."meal_log_items" ADD COLUMN "food_product_id" uuid;--> statement-breakpoint
CREATE UNIQUE INDEX "food_products_source_external_unique" ON "bodyflow"."food_products" USING btree ("source","external_id");--> statement-breakpoint
CREATE UNIQUE INDEX "food_products_ean_unique" ON "bodyflow"."food_products" USING btree ("ean");--> statement-breakpoint
CREATE INDEX "food_products_name_idx" ON "bodyflow"."food_products" USING btree ("name");