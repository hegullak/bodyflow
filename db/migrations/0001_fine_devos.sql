CREATE TYPE "bodyflow"."weight_source" AS ENUM('manual', 'withings');--> statement-breakpoint
CREATE TABLE "bodyflow"."withings_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"withings_user_id" text NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"token_expires_at" timestamp with time zone,
	"scope" text,
	"last_sync_at" timestamp with time zone,
	"last_withings_update" integer,
	"webhook_subscribed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "withings_connections_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "bodyflow"."daily_body_logs" ADD COLUMN "weight_source" "bodyflow"."weight_source";--> statement-breakpoint
CREATE INDEX "withings_connections_user_idx" ON "bodyflow"."withings_connections" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "withings_connections_withings_user_unique" ON "bodyflow"."withings_connections" USING btree ("withings_user_id");