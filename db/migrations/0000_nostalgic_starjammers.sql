CREATE SCHEMA "bodyflow";
--> statement-breakpoint
CREATE TYPE "bodyflow"."activity_level" AS ENUM('sedentary', 'light', 'moderate', 'active', 'very_active');--> statement-breakpoint
CREATE TYPE "bodyflow"."goal" AS ENUM('fat_loss', 'maintenance', 'muscle_gain');--> statement-breakpoint
CREATE TYPE "bodyflow"."preferred_units" AS ENUM('metric', 'imperial');--> statement-breakpoint
CREATE TYPE "bodyflow"."sex" AS ENUM('male', 'female', 'other', 'prefer_not_to_say');--> statement-breakpoint
CREATE TABLE "bodyflow"."body_measurements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"measured_on" date NOT NULL,
	"chest_cm" real,
	"waist_cm" real,
	"hip_cm" real,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bodyflow"."daily_body_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"log_date" date NOT NULL,
	"weight_kg" real,
	"calorie_intake" integer,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bodyflow"."user_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"sex" "bodyflow"."sex",
	"birth_year" integer,
	"birth_date" date,
	"height_cm" real,
	"activity_level" "bodyflow"."activity_level" DEFAULT 'moderate' NOT NULL,
	"goal" "bodyflow"."goal" DEFAULT 'maintenance' NOT NULL,
	"target_weight_kg" real,
	"preferred_units" "bodyflow"."preferred_units" DEFAULT 'metric' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE INDEX "body_measurements_user_date_idx" ON "bodyflow"."body_measurements" USING btree ("user_id","measured_on");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_body_logs_user_date_unique" ON "bodyflow"."daily_body_logs" USING btree ("user_id","log_date");--> statement-breakpoint
CREATE INDEX "daily_body_logs_user_date_idx" ON "bodyflow"."daily_body_logs" USING btree ("user_id","log_date");--> statement-breakpoint
CREATE INDEX "user_profiles_user_idx" ON "bodyflow"."user_profiles" USING btree ("user_id");