CREATE TABLE "bodyflow"."food_favorite" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"food_product_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "food_favorite_user_food_unique" UNIQUE("user_id","food_product_id")
);
--> statement-breakpoint
ALTER TABLE "bodyflow"."food_favorite" ADD CONSTRAINT "food_favorite_food_product_id_fk" FOREIGN KEY ("food_product_id") REFERENCES "bodyflow"."food_product"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "food_favorite_user_idx" ON "bodyflow"."food_favorite" USING btree ("user_id");
