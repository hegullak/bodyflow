CREATE TABLE "bodyflow"."recipe" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"total_weight_g" real DEFAULT 0 NOT NULL,
	"cooked_weight_g" real,
	"kcal_per_100g" real DEFAULT 0 NOT NULL,
	"food_product_id" uuid,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bodyflow"."recipe_ingredient" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipe_id" uuid NOT NULL,
	"food_product_id" uuid,
	"product_name" text NOT NULL,
	"kcal_per_100g" real NOT NULL,
	"quantity_grams" real NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bodyflow"."recipe" ADD CONSTRAINT "recipe_food_product_id_fk" FOREIGN KEY ("food_product_id") REFERENCES "bodyflow"."food_product"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "bodyflow"."recipe_ingredient" ADD CONSTRAINT "recipe_ingredient_recipe_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "bodyflow"."recipe"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "bodyflow"."recipe_ingredient" ADD CONSTRAINT "recipe_ingredient_food_product_id_fk" FOREIGN KEY ("food_product_id") REFERENCES "bodyflow"."food_product"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "recipe_user_idx" ON "bodyflow"."recipe" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "recipe_ingredient_recipe_idx" ON "bodyflow"."recipe_ingredient" USING btree ("recipe_id");
