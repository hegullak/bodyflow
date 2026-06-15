CREATE TABLE "bodyflow"."saved_meal" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"total_kcal" real NOT NULL,
	"total_grams" real NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "bodyflow"."saved_meal_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"saved_meal_id" uuid NOT NULL,
	"food_product_id" uuid,
	"product_name" text NOT NULL,
	"brand" text,
	"quantity_grams" real NOT NULL,
	"kcal_per_100g" real NOT NULL,
	"calories_kcal" real NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bodyflow"."saved_meal_item" ADD CONSTRAINT "saved_meal_item_saved_meal_id_fk" FOREIGN KEY ("saved_meal_id") REFERENCES "bodyflow"."saved_meal"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "bodyflow"."saved_meal_item" ADD CONSTRAINT "saved_meal_item_food_product_id_fk" FOREIGN KEY ("food_product_id") REFERENCES "bodyflow"."food_product"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "saved_meal_user_idx" ON "bodyflow"."saved_meal" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "saved_meal_item_meal_idx" ON "bodyflow"."saved_meal_item" USING btree ("saved_meal_id");
