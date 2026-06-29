import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgSchema,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { relations } from "drizzle-orm";

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

export const goalEnum = pgEnum("goal", [
  "fat_loss",
  "maintenance",
  "muscle_gain",
]);

export const preferredUnitsEnum = pgEnum("preferred_units", [
  "metric",
  "imperial",
]);

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

  "openfoodfacts",
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

    weightKg: real("weight_kg"),

    activityLevel: activityLevelEnum("activity_level")
      .notNull()
      .default("moderate"),

    goal: goalEnum("goal").notNull().default("maintenance"),

    targetWeightKg: real("target_weight_kg"),

    dailyCalorieTarget: integer("daily_calorie_target"),

    preferredUnits: preferredUnitsEnum("preferred_units")
      .notNull()
      .default("metric"),

    notes: text("notes"),

    lookingForwardTo: text("looking_forward_to"),

    vibe: text("vibe"),

    language: text("language").notNull().default("no"),

    defaultFlow: text("default_flow").notNull().default("meals"),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
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

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
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

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
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

    prettyName: text("pretty_name"),

    brand: text("brand"),

    imageUrl: text("image_url"),

    kcalPer100g: real("kcal_per_100g").notNull(),

    packageGrams: real("package_grams"),

    searchText: text("search_text"),

    fetchedAt: timestamp("fetched_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },

  (t) => [
    uniqueIndex("food_product_source_external_unique").on(
      t.source,
      t.externalId,
    ),

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

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },

  (t) => [
    index("meal_log_item_user_date_idx").on(t.userId, t.logDate),

    index("meal_log_item_user_date_meal_idx").on(
      t.userId,
      t.logDate,
      t.mealType,
    ),

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

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },

  (t) => [
    index("withings_connection_user_idx").on(t.userId),

    uniqueIndex("withings_connection_withings_user_unique").on(
      t.withingsUserId,
    ),
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
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
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

    changedAt: timestamp("changed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

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

// ---------------------------------------------------------------------------
// Exercise Catalog
// Shared, non-user-owned reference data imported from ExerciseDB OSS.
// No user_id or soft-delete: catalog rows are managed by the import script.
// ---------------------------------------------------------------------------

export const exerciseCategories = pgTable("exercise_category", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const exerciseMuscles = pgTable("exercise_muscle", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const exercises = pgTable(
  "exercise",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    externalId: text("external_id").notNull(),
    slug: text("slug").notNull().unique(),
    name: text("name").notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => exerciseCategories.id, { onDelete: "restrict" }),
    targetMuscleId: uuid("target_muscle_id").references(
      () => exerciseMuscles.id,
      {
        onDelete: "restrict",
      },
    ),
    equipment: text("equipment").notNull(),
    nameNo: text("name_no"),
    imageUrl: text("image_url"),
    instructions: jsonb("instructions").notNull().$type<string[]>().default([]),
    source: text("source").notNull().default("wger"),
    sourceLicense: text("source_license"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("exercise_source_external_unique").on(t.source, t.externalId),
    index("exercise_category_idx").on(t.categoryId),
    index("exercise_target_muscle_idx").on(t.targetMuscleId),
    index("exercise_equipment_idx").on(t.equipment),
    index("exercise_name_idx").on(t.name),
  ],
);

// Join table: one exercise → many secondary muscles
export const exerciseSecondaryMuscles = pgTable(
  "exercise_secondary_muscle",
  {
    exerciseId: uuid("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "cascade" }),
    muscleId: uuid("muscle_id")
      .notNull()
      .references(() => exerciseMuscles.id, { onDelete: "restrict" }),
  },
  (t) => [
    primaryKey({ columns: [t.exerciseId, t.muscleId] }),
    index("exercise_secondary_muscle_exercise_idx").on(t.exerciseId),
  ],
);

export type ExerciseCategory = typeof exerciseCategories.$inferSelect;
export type ExerciseMuscle = typeof exerciseMuscles.$inferSelect;
export type Exercise = typeof exercises.$inferSelect;
export type NewExercise = typeof exercises.$inferInsert;

// ---------------------------------------------------------------------------
// Training Flow
// User-owned data: programs, sessions, set logs.
// ---------------------------------------------------------------------------

export const workoutPrograms = pgTable(
  "workout_program",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("workout_program_user_idx").on(t.userId)],
);

export const workoutSupersets = pgTable(
  "workout_superset",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    programId: uuid("program_id")
      .notNull()
      .references(() => workoutPrograms.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("workout_superset_program_idx").on(t.programId)],
);

export const workoutProgramExercises = pgTable(
  "workout_program_exercise",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    programId: uuid("program_id")
      .notNull()
      .references(() => workoutPrograms.id, { onDelete: "cascade" }),
    exerciseId: uuid("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "restrict" }),
    supersetId: uuid("superset_id").references(() => workoutSupersets.id, {
      onDelete: "set null",
    }),
    programOrder: integer("program_order").notNull().default(0),
    supersetOrder: integer("superset_order"),
    sets: integer("sets").notNull().default(3),
    reps: integer("reps").notNull().default(8),
    restSeconds: integer("rest_seconds").notNull().default(90),
    isBodyweight: boolean("is_bodyweight").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("workout_program_exercise_program_idx").on(t.programId),
    index("workout_program_exercise_superset_idx").on(t.supersetId),
  ],
);

export const workoutSessions = pgTable(
  "workout_session",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    programId: uuid("program_id").references(() => workoutPrograms.id, {
      onDelete: "set null",
    }),
    programName: text("program_name").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("workout_session_user_idx").on(t.userId),
    index("workout_session_user_ended_idx").on(t.userId, t.endedAt),
  ],
);

export const workoutSetLogs = pgTable(
  "workout_set_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => workoutSessions.id, { onDelete: "cascade" }),
    programExerciseId: uuid("program_exercise_id").references(
      () => workoutProgramExercises.id,
      { onDelete: "set null" },
    ),
    exerciseId: uuid("exercise_id").references(() => exercises.id, {
      onDelete: "set null",
    }),
    exerciseName: text("exercise_name").notNull(),
    setNumber: integer("set_number").notNull(),
    isBodyweight: boolean("is_bodyweight").notNull().default(false),
    weightKg: real("weight_kg"),
    reps: integer("reps"),
    completedAt: timestamp("completed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("workout_set_log_session_idx").on(t.sessionId)],
);

export type WorkoutProgram = typeof workoutPrograms.$inferSelect;
export type NewWorkoutProgram = typeof workoutPrograms.$inferInsert;
export type WorkoutProgramExercise =
  typeof workoutProgramExercises.$inferSelect;
export type WorkoutSession = typeof workoutSessions.$inferSelect;
export type WorkoutSetLog = typeof workoutSetLogs.$inferSelect;

// ---------------------------------------------------------------------------
// Saved Meals
// User-defined named meal templates for quick reuse.
// ---------------------------------------------------------------------------

export const savedMeals = pgTable(
  "saved_meal",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    totalKcal: real("total_kcal").notNull(),
    totalGrams: real("total_grams").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("saved_meal_user_idx").on(t.userId)],
);

export const savedMealItems = pgTable(
  "saved_meal_item",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    savedMealId: uuid("saved_meal_id")
      .notNull()
      .references(() => savedMeals.id, { onDelete: "cascade" }),
    foodProductId: uuid("food_product_id").references(() => foodProducts.id, {
      onDelete: "set null",
    }),
    productName: text("product_name").notNull(),
    brand: text("brand"),
    quantityGrams: real("quantity_grams").notNull(),
    kcalPer100g: real("kcal_per_100g").notNull(),
    caloriesKcal: real("calories_kcal").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("saved_meal_item_meal_idx").on(t.savedMealId)],
);

export const savedMealsRelations = relations(savedMeals, ({ many }) => ({
  items: many(savedMealItems),
}));

export const savedMealItemsRelations = relations(savedMealItems, ({ one }) => ({
  meal: one(savedMeals, {
    fields: [savedMealItems.savedMealId],
    references: [savedMeals.id],
  }),
}));

export type SavedMeal = typeof savedMeals.$inferSelect;
export type SavedMealItem = typeof savedMealItems.$inferSelect;

// ---------------------------------------------------------------------------
// Recipes
// User-created multi-ingredient recipes with calculated kcal/100g.
// Each recipe is mirrored as a food_product (source=custom, externalId=recipe-{id})
// so it appears naturally in food search and meal logging.
// ---------------------------------------------------------------------------

export const recipes = pgTable(
  "recipe",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    totalWeightG: real("total_weight_g").notNull().default(0),
    cookedWeightG: real("cooked_weight_g"),
    kcalPer100g: real("kcal_per_100g").notNull().default(0),
    foodProductId: uuid("food_product_id").references(() => foodProducts.id, {
      onDelete: "set null",
    }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("recipe_user_idx").on(t.userId)],
);

export const recipeIngredients = pgTable(
  "recipe_ingredient",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    recipeId: uuid("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    foodProductId: uuid("food_product_id").references(() => foodProducts.id, {
      onDelete: "set null",
    }),
    productName: text("product_name").notNull(),
    kcalPer100g: real("kcal_per_100g").notNull(),
    quantityGrams: real("quantity_grams").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("recipe_ingredient_recipe_idx").on(t.recipeId)],
);

export type Recipe = typeof recipes.$inferSelect;
export type NewRecipe = typeof recipes.$inferInsert;
export type RecipeIngredient = typeof recipeIngredients.$inferSelect;

export const foodFavorites = pgTable(
  "food_favorite",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    foodProductId: uuid("food_product_id")
      .notNull()
      .references(() => foodProducts.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("food_favorite_user_food_unique").on(t.userId, t.foodProductId),
    index("food_favorite_user_idx").on(t.userId),
  ],
);

export const exerciseFavorites = pgTable(
  "exercise_favorite",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    exerciseId: uuid("exercise_id")
      .notNull()
      .references(() => exercises.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("exercise_favorite_user_exercise_unique").on(t.userId, t.exerciseId),
    index("exercise_favorite_user_idx").on(t.userId),
  ],
);

export const scheduledSessions = pgTable(
  "scheduled_session",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    date: text("date").notNull(),
    programId: uuid("program_id").references(() => workoutPrograms.id, {
      onDelete: "set null",
    }),
    cardioSlug: text("cardio_slug"),
    isCompleted: boolean("is_completed").notNull().default(false),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("scheduled_session_user_date_idx").on(t.userId, t.date)],
);
