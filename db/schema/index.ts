import {
  date,
  index,
  integer,
  pgSchema,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * bodyflow tables live in a dedicated Postgres schema so the same Neon project
 * can host sibling apps without collisions.
 *
 * `user_id` is the Clerk user id (text). Every query must filter by it.
 */
export const bodyflowSchema = pgSchema("bodyflow");
const pgTable = bodyflowSchema.table.bind(bodyflowSchema);
const pgEnum = bodyflowSchema.enum.bind(bodyflowSchema);

export const sexEnum = pgEnum("sex", [
  "male",
  "female",
  "other",
  "prefer_not_to_say",
]);

export const activityLevelEnum = pgEnum("activity_level", [
  "sedentary",
  "light",
  "moderate",
  "active",
  "very_active",
]);

export const goalEnum = pgEnum("goal", ["fat_loss", "maintenance", "muscle_gain"]);

export const preferredUnitsEnum = pgEnum("preferred_units", ["metric", "imperial"]);

export const userProfiles = pgTable(
  "user_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull().unique(),
    sex: sexEnum("sex"),
    birthYear: integer("birth_year"),
    birthDate: date("birth_date"),
    heightCm: real("height_cm"),
    activityLevel: activityLevelEnum("activity_level").notNull().default("moderate"),
    goal: goalEnum("goal").notNull().default("maintenance"),
    targetWeightKg: real("target_weight_kg"),
    preferredUnits: preferredUnitsEnum("preferred_units").notNull().default("metric"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("user_profiles_user_idx").on(t.userId)],
);

export const dailyBodyLogs = pgTable(
  "daily_body_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    logDate: date("log_date").notNull(),
    weightKg: real("weight_kg"),
    calorieIntake: integer("calorie_intake"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("daily_body_logs_user_date_unique").on(t.userId, t.logDate),
    index("daily_body_logs_user_date_idx").on(t.userId, t.logDate),
  ],
);

export const bodyMeasurements = pgTable(
  "body_measurements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    measuredOn: date("measured_on").notNull(),
    chestCm: real("chest_cm"),
    waistCm: real("waist_cm"),
    hipCm: real("hip_cm"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("body_measurements_user_date_idx").on(t.userId, t.measuredOn),
  ],
);

export type UserProfile = typeof userProfiles.$inferSelect;
export type NewUserProfile = typeof userProfiles.$inferInsert;
export type DailyBodyLog = typeof dailyBodyLogs.$inferSelect;
export type NewDailyBodyLog = typeof dailyBodyLogs.$inferInsert;
export type BodyMeasurement = typeof bodyMeasurements.$inferSelect;
export type NewBodyMeasurement = typeof bodyMeasurements.$inferInsert;

export type Sex = (typeof sexEnum.enumValues)[number];
export type ActivityLevel = (typeof activityLevelEnum.enumValues)[number];
export type Goal = (typeof goalEnum.enumValues)[number];
export type PreferredUnits = (typeof preferredUnitsEnum.enumValues)[number];
