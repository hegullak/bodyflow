# bodyflow Developer Standard

This document defines the development standard for the bodyflow project.

bodyflow is a Next.js / TypeScript product, but the codebase should be built with the same seriousness you would expect from a mature Java codebase: clear boundaries, safe types, immutability, testability, and explicit domain logic.

The goal is not to write Java in TypeScript. The goal is to translate good engineering principles into idiomatic Next.js and TypeScript.

---

## 1. Core development principles

### Prefer domain clarity over framework convenience

Next.js is the delivery platform. TypeScript is the language. React is the UI layer.

The domain logic for bodyflow should not be trapped inside pages, components, route handlers, or UI events.

Core bodyflow concepts should live in feature/domain modules:

- training-flow
- nutrition-flow
- measure-flow
- mentalflow
- recoveryflow
- batteryflow
- bodyflow brand and messaging

These modules should be as pure, deterministic and testable as possible.

### Build for reuse between web and future mobile

bodyflow may later have both:

- Next.js web app
- iOS / React Native app

Therefore shared logic must not depend unnecessarily on React, Next.js, DOM APIs, browser state, or server-only APIs.

Keep calculation logic, message selection, brand constants and domain rules portable.

---

## 2. Recommended project structure

Prefer feature/domain structure over generic technical buckets.

Good:

```text
src/
  app/
    dashboard/
    training/
    nutrition/
    measure/
    settings/

  features/
    brand/
      bodyflowBrand.ts
      bodyflowBrand.test.ts

    mentalflow/
      mentalflow.ts
      mentalflow.test.ts
      types.ts

    recoveryflow/
      recoveryflow.ts
      recoveryflow.test.ts
      types.ts

    batteryflow/
      batteryflow.ts
      batteryflow.test.ts
      types.ts

    training/
      components/
      actions/
      queries/
      schemas.ts
      types.ts
      trainingLoad.ts
      workoutRules.ts

    nutrition/
      components/
      actions/
      queries/
      schemas.ts
      types.ts
      nutritionSummary.ts
      recipeCalculations.ts

    measure/
      components/
      actions/
      queries/
      schemas.ts
      types.ts
      weightTrend.ts
      measurementTrend.ts

  shared/
    ui/
    lib/
    config/
    constants/

  docs/
    bodyflow-concept.md
    developer_standard.md
```

Avoid large generic folders like:

```text
utils/
helpers/
services/
stuff/
common/
```

These become junk drawers unless heavily disciplined.

**Exception: framework glue.** A small `lib/utils.ts` containing only framework-level helpers (`cn` for Tailwind, date formatters used across all features) is acceptable. It should contain zero business logic and zero domain concepts. If a function belongs to a domain, move it there.

---

## 3. Next.js boundaries

### `app/` is routing and composition

The `app/` directory should primarily compose pages, layouts and route-level behavior.

Avoid placing domain logic directly in `page.tsx`, `layout.tsx`, or route handlers.

Good:

```tsx
// app/dashboard/page.tsx
import { getDashboardData } from "@/features/dashboard/queries";
import { Dashboard } from "@/features/dashboard/components/Dashboard";

export default async function DashboardPage() {
  const data = await getDashboardData();

  return <Dashboard data={data} />;
}
```

Bad:

```tsx
// app/dashboard/page.tsx
export default async function DashboardPage() {
  const workouts = await db.query.workouts.findMany(...);
  const score = calculateLotsOfInlineBusinessLogic(...);

  return <div>{score}</div>;
}
```

### Server Components by default

Prefer Server Components unless interactivity is required.

Use Client Components only for:

- local component state
- event handlers
- forms with client behavior
- modals
- drag/drop
- timers
- live UI updates

Do not place `"use client"` at the top of large page or layout files just because one small component needs state.

Split out the interactive piece instead.

Good:

```tsx
// Server component
export function Dashboard({ data }: DashboardProps) {
  return (
    <>
      <DashboardSummary data={data} />
      <MentalFlowPicker />
    </>
  );
}
```

```tsx
// Client component
"use client";

export function MentalFlowPicker() {
  // useState, event handlers, optimistic UI, etc.
}
```

---

## 4. TypeScript over Java-style classes

Do not automatically recreate Java service classes in TypeScript.

Prefer:

- pure functions
- explicit input/output types
- module-private helpers
- small files with clear responsibility

Avoid god services:

```ts
class BodyflowService {
  calculateCalories() {}
  calculateRecovery() {}
  updateWorkout() {}
  getMeasurements() {}
  saveRecipe() {}
}
```

Prefer focused modules:

```text
features/nutrition/calculateDailyCalories.ts
features/recoveryflow/calculateRecoveryFlow.ts
features/batteryflow/calculateBatteryFlow.ts
features/training/createWorkoutSession.ts
```

---

## 5. Encapsulation with modules

In TypeScript, encapsulation is often best handled by module boundaries.

Export only the public API of a module.

Good:

```ts
// features/recoveryflow/recoveryflow.ts

const HIGH_LOAD_SESSION_THRESHOLD = 5;

function calculateTrainingLoadPenalty(input: RecoveryFlowInput): number {
  // private implementation detail
}

function calculateFuelMismatchPenalty(input: RecoveryFlowInput): number {
  // private implementation detail
}

export function calculateRecoveryFlow(
  input: RecoveryFlowInput,
): RecoveryFlowResult {
  // public API
}
```

Do not export helper functions unless another module genuinely needs them.

---

## 6. Naming standards

### General naming

Use precise domain names.

Avoid vague names:

```text
utils.ts
helpers.ts
service.ts
data.ts
misc.ts
common.ts
```

Prefer names that describe intent:

```text
calculateBatteryFlow.ts
calculateRecoveryFlow.ts
getTrainingSessionsForWeek.ts
calculateCalorieSummary.ts
getWeightTrend.ts
parseMealEntry.ts
```

### Function names

Use verb + object.

Good:

```ts
calculateBatteryFlow()
calculateRecoveryFlow()
getTrainingSessionsForWeek()
createWorkoutTemplate()
updateRecipeIngredient()
parseCalorieEntry()
```

### Type names

Use clear nouns.

Good:

```ts
BatteryFlowResult
RecoveryFlowInput
TrainingSession
NutritionEntry
MeasureTrend
MentalFlowCheckIn
UserGoal
```

### Constants

Use `SCREAMING_SNAKE_CASE` for true constants.

```ts
export const BODYFLOW_SLOGAN = "A little beats nothing. Every time.";
export const BODYFLOW_PHILOSOPHY = "Adjust, don’t reinvent.";
```

Use `camelCase` for ordinary values.

```ts
const defaultRecoveryThreshold = 14;
```

---

## 7. Type modeling

### Prefer union types over enums

Good:

```ts
export const goalTypes = [
  "weight_loss",
  "maintenance",
  "muscle_gain",
  "general_health",
] as const;

export type GoalType = (typeof goalTypes)[number];
```

Avoid enums unless there is a strong reason.

### Prefer explicit domain types

Good:

```ts
export type UserGoal = Readonly<{
  type: GoalType;
  dailyCalorieTarget?: number;
  weeklyTrainingTarget?: number;
  minimumRestDaysPerWeek?: number;
}>;
```

### Avoid `any`

Do not use `any` unless there is a documented reason.

Prefer:

- `unknown` at boundaries
- schema validation
- narrowed types
- explicit conversion

Good:

```ts
export function parseUserGoal(input: unknown): UserGoal {
  return userGoalSchema.parse(input);
}
```

---

## 8. Immutability

Prefer immutable data and immutable updates.

Good:

```ts
export type RecoveryFlowInput = Readonly<{
  workouts: readonly WorkoutSummary[];
  calorieEntries: readonly CalorieEntry[];
}>;
```

Good:

```ts
const updatedGoal: UserGoal = {
  ...goal,
  dailyCalorieTarget: 2200,
};
```

Avoid mutating inputs:

```ts
goal.dailyCalorieTarget = 2200;
```

For domain calculations, treat input as read-only.

---

## 9. Validation and schemas

Validate at system boundaries.

Use schema validation for:

- form input
- server actions
- API requests
- URL params
- imported files
- localStorage
- third-party API responses
- untrusted database-shaped data when needed

Recommended pattern with Zod:

```ts
import { z } from "zod";

export const userGoalSchema = z.object({
  type: z.enum(["weight_loss", "maintenance", "muscle_gain", "general_health"]),
  dailyCalorieTarget: z.number().int().positive().optional(),
  weeklyTrainingTarget: z.number().int().min(0).max(14).optional(),
  minimumRestDaysPerWeek: z.number().int().min(0).max(7).optional(),
});

export type UserGoal = z.infer<typeof userGoalSchema>;
```

Do not trust TypeScript types at runtime. Types are compile-time only.

---

## 10. Database and query boundaries

Keep database access out of UI components.

Good:

```ts
// features/training/queries.ts
export async function getWorkoutTemplates(userId: string) {
  return db.query.workoutTemplates.findMany({
    where: eq(workoutTemplates.userId, userId),
  });
}
```

Then call query functions from server components, server actions or route handlers.

Avoid putting raw ORM calls directly in deeply nested components.

### Repository naming

Within a feature module, technical bucket names are acceptable because the feature scope gives them meaning:

```text
features/training/queries.ts      ← clear: queries for the training domain
features/nutrition/actions.ts     ← clear: actions for the nutrition domain
features/measure/mutations.ts
```

Avoid the same names at the top level of `lib/` or `shared/`, where they become generic junk drawers:

```text
lib/queries.ts    ← unclear: queries for what?
lib/actions.ts    ← unclear: actions for what?
```

Use `repository.ts` only if the abstraction is genuinely useful.

---

## 11. Server actions and mutations

Use server actions as a thin boundary.

Server actions may:

- validate input
- check authentication and authorization
- call domain logic
- write to database
- revalidate paths
- return a typed result

They should not become large business-logic containers.

Good:

```ts
"use server";

import { mealEntrySchema } from "./schemas";
import { createMealEntry } from "./mutations";

export async function createMealEntryAction(input: unknown) {
  const parsed = mealEntrySchema.parse(input);

  // auth check here

  return createMealEntry(parsed);
}
```

---

## 12. Error handling

Use explicit result types for expected domain outcomes.

Good:

```ts
export type Result<T, E> =
  | { ok: true; value: T }
  | { ok: false; error: E };
```

Example:

```ts
export function calculateWeightTrend(
  entries: readonly WeightEntry[],
): Result<WeightTrend, "not_enough_data"> {
  if (entries.length < 2) {
    return { ok: false, error: "not_enough_data" };
  }

  return { ok: true, value: calculateTrend(entries) };
}
```

Do not throw exceptions for expected states such as:

- not enough data
- no activity yet
- no measurements yet
- no active goal
- empty dashboard

Throw only for truly exceptional or invalid states.

---

## 13. Testing standard

### Prioritize tests for pure domain logic

The following should be heavily unit tested:

- mentalflow
- recoveryflow
- batteryflow
- calorie calculations
- recipe calculations
- weight trend calculations
- training load calculations
- comeback/inactivity logic
- brand constants

Good test locations:

```text
features/recoveryflow/recoveryflow.test.ts
features/batteryflow/batteryflow.test.ts
features/mentalflow/mentalflow.test.ts
features/brand/bodyflowBrand.test.ts
```

### Important bodyflow test cases

Test that:

- the primary slogan is exactly `"A little beats nothing. Every time."`
- the primary slogan is not translated
- inactive users get comeback messaging
- recent active users do not get comeback messaging
- high training load plus low calorie intake is not green
- seven training days in a row is at least orange
- high training volume with adequate food is not automatically red
- missing data produces neutral/unknown states rather than fake confidence

### UI tests

Use UI tests for critical rendering and user flows, not every implementation detail.

### E2E tests later

Use Playwright or similar for core flows:

- create meal entry
- create recipe
- create workout program
- start workout
- log set/reps/weight
- register measurement
- view dashboard

---

## 14. Import rules

Keep dependencies directional.

Recommended rules:

- `app/` may import from `features/` and `shared/`
- `features/` may import from `shared/`
- `shared/` must not import from `features/`
- feature modules should not deeply import each other unless intentional
- shared domain logic should move to a shared/core module

Avoid circular dependencies.

If a feature needs another feature’s domain concept, consider extracting shared types/rules.

---

## 15. Bodyflow brand constants

Create and use a dedicated brand constants module.

Suggested file:

```text
src/features/brand/bodyflowBrand.ts
```

Example:

```ts
export const BODYFLOW_BRAND_NAME = "bodyflow";

export const BODYFLOW_SLOGAN =
  "A little beats nothing. Every time.";

export const BODYFLOW_PHILOSOPHY =
  "Adjust, don’t reinvent.";

export const BODYFLOW_SUPPORTING_LINES = [
  "Not all at once.",
  "Adjust, don’t ignore.",
] as const;

export const BODYFLOW_COMEBACK_TITLE =
  "Skal vi starte igjen nå?";

export const BODYFLOW_COMEBACK_MESSAGE =
  BODYFLOW_SLOGAN;
```

Do not duplicate these strings across the app.

The primary slogan must not be translated as the main slogan.

---

## 16. bodyflow product concepts in code

Use these names consistently.

### mentalflow

Represents the user's mental status and "given all" context.

Not therapy. Not mood fluff. It helps bodyflow respond with the right level of warmth, honesty and directness.

### recoveryflow

Represents rest/readiness logic based on:

- training load
- training frequency
- consecutive training days
- rest days
- whether food intake matches training load

### batteryflow

Represents the compact recovery/readiness indicator.

This may be visualized as a battery-style score or status.

### training-flow

Workout programs, exercises, sets, reps, weights, supersets and rest timer.

### nutrition-flow

Calories, foods, meals, recipes, targets and eventually optional macros.

### measure-flow

Weight, body measurements and trends.

---

## 17. bodyflow voice and messaging

bodyflow should be:

- warm
- honest
- practical
- non-shaming
- direct when needed
- focused on health gain
- focused on small adjustments
- realistic rather than motivational fluff

bodyflow should not be:

- happy-go-lucky
- moralizing
- guilt-based
- gym-bro
- medicalized
- a transformation cult
- bloatware

Good message:

```text
Du antydet at du ville ned i vekt og trene smart. Denne uken er du litt over på mat og litt høy på belastning. Ikke dramatisk. Gjør morgendagen enkel.
```

Good comeback message:

```text
Skal vi starte igjen nå?
A little beats nothing. Every time.
```

Avoid:

```text
You failed.
You ruined your progress.
Everything is fine.
Transform your life.
No excuses.
```

---

## 18. UI and dashboard principles

Dashboard should answer:

```text
What matters now?
What does it mean?
What is the next useful action?
```

Avoid dashboards that only display static metrics.

BMI, TDEE and similar calculations may exist in profile/details/calculations, but should not dominate the main dashboard unless they drive a useful decision.

Prefer:

- daily assessment
- calories today
- recovery/batteryflow
- latest measurement trend
- training this week
- comeback/mentalflow state when relevant

Do not overuse slogans in the dashboard. Use slogans where they help, especially in:

- onboarding
- splash
- comeback after inactivity
- empty states
- about/brand screen

---

## 19. Recovery and batteryflow principles

Do not praise overtraining.

High training load plus low food intake must not produce a green or overly positive state.

Recovery logic should consider:

- sessions last 7 days
- training days in a row
- hard sessions
- lower body/full body sessions
- running distance
- days since rest day
- calories vs target
- calorie deficit combined with high load

Good recovery message:

```text
Dette er mye belastning. Du trener mye samtidig som energiinntaket ligger lavt. Hvis målet er fremgang, er hvile eller mer mat smartere enn mer push.
```

---

## 20. Documentation expectations

Important concepts should be documented in `docs/`.

Recommended files:

```text
docs/bodyflow-concept.md
docs/developer_standard.md
docs/architecture.md
```

When introducing a new core concept, update documentation in the same pull request.

Examples:

- mentalflow
- recoveryflow
- batteryflow
- bodyflow brand language
- major database changes
- architectural boundaries

---

## 21. Code review checklist

Before considering work complete, verify:

- Does the code belong in the chosen module?
- Is domain logic separated from UI?
- Are inputs validated at boundaries?
- Are types explicit?
- Are mutations avoided where practical?
- Are helpers kept private unless needed?
- Are names precise?
- Are tests added for rules and edge cases?
- Are brand strings reused from constants?
- Does the UI avoid slogan spam?
- Does the change preserve bodyflow's tone?
- Does the change avoid unnecessary dependencies?
- Did lint, typecheck and tests pass?

---

## 22. Anti-patterns to avoid

Avoid:

- giant service classes
- all-purpose utility files
- untyped API responses
- `any`
- mutation of inputs in domain logic
- business logic in React components
- raw database queries in UI components
- duplicated brand strings
- overusing `"use client"`
- adding dependencies for small problems
- premature native/mobile architecture
- building a full platform before the core product works

---

## 23. Engineering mantra

```text
Framework at the edges.
Domain in the middle.
Types at the boundaries.
Small functions.
Clear names.
No shame in the copy.
```

And for bodyflow specifically:

```text
Adjust, don’t reinvent.
A little beats nothing. Every time.
```
