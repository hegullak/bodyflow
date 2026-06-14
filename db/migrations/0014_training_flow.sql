CREATE TABLE "bodyflow"."workout_program" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bodyflow"."workout_superset" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bodyflow"."workout_program_exercise" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"program_id" uuid NOT NULL,
	"exercise_id" uuid NOT NULL,
	"superset_id" uuid,
	"program_order" integer DEFAULT 0 NOT NULL,
	"superset_order" integer,
	"sets" integer DEFAULT 3 NOT NULL,
	"reps" integer DEFAULT 8 NOT NULL,
	"rest_seconds" integer DEFAULT 90 NOT NULL,
	"is_bodyweight" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bodyflow"."workout_session" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"program_id" uuid,
	"program_name" text NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bodyflow"."workout_set_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"program_exercise_id" uuid,
	"exercise_id" uuid,
	"exercise_name" text NOT NULL,
	"set_number" integer NOT NULL,
	"is_bodyweight" boolean DEFAULT false NOT NULL,
	"weight_kg" real,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bodyflow"."workout_superset" ADD CONSTRAINT "workout_superset_program_id_workout_program_id_fk" FOREIGN KEY ("program_id") REFERENCES "bodyflow"."workout_program"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "bodyflow"."workout_program_exercise" ADD CONSTRAINT "workout_program_exercise_program_id_workout_program_id_fk" FOREIGN KEY ("program_id") REFERENCES "bodyflow"."workout_program"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "bodyflow"."workout_program_exercise" ADD CONSTRAINT "workout_program_exercise_exercise_id_exercise_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "bodyflow"."exercise"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "bodyflow"."workout_program_exercise" ADD CONSTRAINT "workout_program_exercise_superset_id_workout_superset_id_fk" FOREIGN KEY ("superset_id") REFERENCES "bodyflow"."workout_superset"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "bodyflow"."workout_session" ADD CONSTRAINT "workout_session_program_id_workout_program_id_fk" FOREIGN KEY ("program_id") REFERENCES "bodyflow"."workout_program"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "bodyflow"."workout_set_log" ADD CONSTRAINT "workout_set_log_session_id_workout_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "bodyflow"."workout_session"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "bodyflow"."workout_set_log" ADD CONSTRAINT "workout_set_log_program_exercise_id_workout_program_exercise_id_fk" FOREIGN KEY ("program_exercise_id") REFERENCES "bodyflow"."workout_program_exercise"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "bodyflow"."workout_set_log" ADD CONSTRAINT "workout_set_log_exercise_id_exercise_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "bodyflow"."exercise"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "workout_program_user_idx" ON "bodyflow"."workout_program" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "workout_superset_program_idx" ON "bodyflow"."workout_superset" USING btree ("program_id");
--> statement-breakpoint
CREATE INDEX "workout_program_exercise_program_idx" ON "bodyflow"."workout_program_exercise" USING btree ("program_id");
--> statement-breakpoint
CREATE INDEX "workout_program_exercise_superset_idx" ON "bodyflow"."workout_program_exercise" USING btree ("superset_id");
--> statement-breakpoint
CREATE INDEX "workout_session_user_idx" ON "bodyflow"."workout_session" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX "workout_session_user_ended_idx" ON "bodyflow"."workout_session" USING btree ("user_id","ended_at");
--> statement-breakpoint
CREATE INDEX "workout_set_log_session_idx" ON "bodyflow"."workout_set_log" USING btree ("session_id");
