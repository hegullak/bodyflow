CREATE TYPE "bodyflow"."reminder_type" AS ENUM('weigh_in');--> statement-breakpoint
CREATE TABLE "bodyflow"."reminder" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"reminder_type" "bodyflow"."reminder_type" NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"weekdays" integer[] NOT NULL,
	"reminder_time" text NOT NULL,
	"timezone" text NOT NULL,
	"target_route" text NOT NULL,
	"last_triggered_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE INDEX "reminder_user_idx" ON "bodyflow"."reminder" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "reminder_user_type_idx" ON "bodyflow"."reminder" USING btree ("user_id","reminder_type");--> statement-breakpoint
CREATE UNIQUE INDEX "reminder_user_type_active_unique" ON "bodyflow"."reminder" USING btree ("user_id","reminder_type") WHERE "deleted_at" IS NULL;
