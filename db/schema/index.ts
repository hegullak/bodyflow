import {

  boolean,

  date,

  index,

  integer,

  jsonb,

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

 * Table names are singular per DATABASE_STANDARDS.md.

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



export const weightSourceEnum = pgEnum("weight_source", ["manual", "withings"]);



export const mealTypeEnum = pgEnum("meal_type", [

  "breakfast",

  "lunch",

  "snack",

  "dinner",

  "evening",

  "smoke",

]);



export const foodSourceEnum = pgEnum("food_source", [

  "kassal",

  "matvaretabellen",

  "custom",

]);

export const reminderTypeEnum = pgEnum("reminder_type", ["weigh_in"]);

export const userProfiles = pgTable(

  "user_profile",

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

    dailyCalorieTarget: integer("daily_calorie_target"),

    preferredUnits: preferredUnitsEnum("preferred_units").notNull().default("metric"),

    notes: text("notes"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),

    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),

  },

  (t) => [index("user_profile_user_idx").on(t.userId)],

);



export const dailyBodyLogs = pgTable(

  "daily_body_log",

  {

    id: uuid("id").primaryKey().defaultRandom(),

    userId: text("user_id").notNull(),

    logDate: date("log_date").notNull(),

    weightKg: real("weight_kg"),

    weightSource: weightSourceEnum("weight_source"),

    calorieIntake: integer("calorie_intake"),

    note: text("note"),

    deletedAt: timestamp("deleted_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),

    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),

  },

  (t) => [

    uniqueIndex("daily_body_log_user_date_unique").on(t.userId, t.logDate),

    index("daily_body_log_user_date_idx").on(t.userId, t.logDate),

  ],

);



export const bodyMeasurements = pgTable(

  "body_measurement",

  {

    id: uuid("id").primaryKey().defaultRandom(),

    userId: text("user_id").notNull(),

    measuredOn: date("measured_on").notNull(),

    chestCm: real("chest_cm"),

    waistCm: real("waist_cm"),

    hipCm: real("hip_cm"),

    note: text("note"),

    deletedAt: timestamp("deleted_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),

    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),

  },

  (t) => [

    uniqueIndex("body_measurement_user_date_unique").on(t.userId, t.measuredOn),

    index("body_measurement_user_date_idx").on(t.userId, t.measuredOn),

  ],

);



export const foodProducts = pgTable(

  "food_product",

  {

    id: uuid("id").primaryKey().defaultRandom(),

    source: foodSourceEnum("source").notNull(),

    externalId: text("external_id").notNull(),

    ean: text("ean"),

    name: text("name").notNull(),

    brand: text("brand"),

    imageUrl: text("image_url"),

    kcalPer100g: real("kcal_per_100g").notNull(),

    packageGrams: real("package_grams"),

    searchText: text("search_text"),

    fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull().defaultNow(),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),

    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),

  },

  (t) => [

    uniqueIndex("food_product_source_external_unique").on(t.source, t.externalId),

    uniqueIndex("food_product_ean_unique").on(t.ean),

    index("food_product_name_idx").on(t.name),

  ],

);



export const mealLogItems = pgTable(

  "meal_log_item",

  {

    id: uuid("id").primaryKey().defaultRandom(),

    userId: text("user_id").notNull(),

    logDate: date("log_date").notNull(),

    mealType: mealTypeEnum("meal_type").notNull(),

    foodProductId: uuid("food_product_id").references(() => foodProducts.id, {

      onDelete: "set null",

    }),

    kassalProductId: integer("kassal_product_id"),

    ean: text("ean"),

    productName: text("product_name").notNull(),

    brand: text("brand"),

    quantityGrams: real("quantity_grams").notNull(),

    kcalPer100g: real("kcal_per_100g").notNull(),

    caloriesKcal: real("calories_kcal").notNull(),

    deletedAt: timestamp("deleted_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),

    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),

  },

  (t) => [

    index("meal_log_item_user_date_idx").on(t.userId, t.logDate),

    index("meal_log_item_user_date_meal_idx").on(t.userId, t.logDate, t.mealType),

    index("meal_log_item_food_product_id_idx").on(t.foodProductId),

  ],

);



export const withingsConnections = pgTable(

  "withings_connection",

  {

    id: uuid("id").primaryKey().defaultRandom(),

    userId: text("user_id").notNull().unique(),

    withingsUserId: text("withings_user_id").notNull(),

    accessToken: text("access_token").notNull(),

    refreshToken: text("refresh_token").notNull(),

    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),

    scope: text("scope"),

    lastSyncAt: timestamp("last_sync_at", { withTimezone: true }),

    lastWithingsUpdate: integer("last_withings_update"),

    webhookSubscribed: boolean("webhook_subscribed").notNull().default(false),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),

    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),

  },

  (t) => [

    index("withings_connection_user_idx").on(t.userId),

    uniqueIndex("withings_connection_withings_user_unique").on(t.withingsUserId),

  ],

);



export const reminders = pgTable(
  "reminder",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    reminderType: reminderTypeEnum("reminder_type").notNull(),
    enabled: boolean("enabled").notNull().default(false),
    weekdays: integer("weekdays").array().notNull(),
    reminderTime: text("reminder_time").notNull(),
    timezone: text("timezone").notNull(),
    targetRoute: text("target_route").notNull(),
    lastTriggeredAt: timestamp("last_triggered_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("reminder_user_idx").on(t.userId),
    index("reminder_user_type_idx").on(t.userId, t.reminderType),
  ],
);

export const auditLog = pgTable(

  "audit_log",

  {

    id: uuid("id").primaryKey().defaultRandom(),

    entityType: text("entity_type").notNull(),

    entityId: uuid("entity_id").notNull(),

    action: text("action").notNull(),

    changedBy: text("changed_by"),

    changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),

    beforeJson: jsonb("before_json"),

    afterJson: jsonb("after_json"),

  },

  (t) => [

    index("audit_log_entity_idx").on(t.entityType, t.entityId),

    index("audit_log_changed_at_idx").on(t.changedAt),

  ],

);



export type FoodProduct = typeof foodProducts.$inferSelect;

export type NewFoodProduct = typeof foodProducts.$inferInsert;

export type UserProfile = typeof userProfiles.$inferSelect;

export type NewUserProfile = typeof userProfiles.$inferInsert;

export type MealLogItem = typeof mealLogItems.$inferSelect;

export type NewMealLogItem = typeof mealLogItems.$inferInsert;

export type DailyBodyLog = typeof dailyBodyLogs.$inferSelect;

export type NewDailyBodyLog = typeof dailyBodyLogs.$inferInsert;

export type BodyMeasurement = typeof bodyMeasurements.$inferSelect;

export type NewBodyMeasurement = typeof bodyMeasurements.$inferInsert;

export type Reminder = typeof reminders.$inferSelect;
export type NewReminder = typeof reminders.$inferInsert;
export type AuditLogEntry = typeof auditLog.$inferSelect;
export type NewAuditLogEntry = typeof auditLog.$inferInsert;



export type Sex = (typeof sexEnum.enumValues)[number];

export type ActivityLevel = (typeof activityLevelEnum.enumValues)[number];

export type Goal = (typeof goalEnum.enumValues)[number];

export type PreferredUnits = (typeof preferredUnitsEnum.enumValues)[number];

export type WeightSource = (typeof weightSourceEnum.enumValues)[number];

export type MealType = (typeof mealTypeEnum.enumValues)[number];

export type FoodSource = (typeof foodSourceEnum.enumValues)[number];
export type ReminderType = (typeof reminderTypeEnum.enumValues)[number];

export type WithingsConnection = typeof withingsConnections.$inferSelect;

export type NewWithingsConnection = typeof withingsConnections.$inferInsert;


