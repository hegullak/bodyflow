# Project Memory — bodyflow

> **Purpose of this file:** Handoff context for humans and AI agents. Read this first, then `ARCHITECTURE.md`, `DECISIONS.md`, `db/DATABASE.md`, and `DATABASE_STANDARDS.md`.

Last updated: 2026-06-19

---

## 1. What is bodyflow?

**Private, mobile-first health app** for one user (owner: **hegullak**). Track weight, body measurements, meals/calories, and simple trends. No social features, no public meal database UX — calm personal cockpit.

| Item | Value |
|------|--------|
| Repo | https://github.com/hegullak/bodyflow |
| Production URL | https://bodyflow.echonote.no |
| Vercel (alt) | https://bodyflow-delta.vercel.app |
| Clerk app ID | `app_3F1YgZupaC522xCiwUnzuAqMFsn` |
| Dev port | **3010** (fixed in `package.json`) |
| Default branch workflow | `master` only (direct commits) |

---

## 2. Technology stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Auth | Clerk (`@clerk/nextjs` v7) — middleware in `proxy.ts` |
| Database | Neon Postgres (`ep-gentle-tooth`), schema `bodyflow` |
| ORM | Drizzle + `npm run db:migrate` |
| Styling | Tailwind CSS 4, mobile-first, max-width 640px shell |
| Tests | Vitest (`npm test` — 56 tests) |
| Barcode | `@zxing/browser` fallback + native `BarcodeDetector` when available |
| OCR | Tesseract.js (custom food labels); optional OpenAI Vision |
| PWA | `public/sw.js` + `ReminderSync` for web notifications |

---

## 3. App routes & navigation

Bottom nav (`components/layout/bottom-nav.tsx`):

| Path | Purpose |
|------|---------|
| `/dashboard` | Home — today's calories, latest weight/measurements, BMI/TDEE |
| `/check-in` | Unified daily log: weight + midje/bryst/hofte, diff vs last |
| `/meals` | Meal logging per day, calorie budget |
| `/statistics` | Historical stats |
| `/profile` | Profile, Withings, reminder settings |

**Layout:** `app/(app)/layout.tsx` — no "bodyflow" title in header, only Clerk `UserButton`. Bottom nav fixed.

**Auth:** `/sign-in`, `/sign-up`. Landing `/` is public.

---

## 4. Feature status (current)

### ✅ Built and in use

- **Profile** — Clerk name as subtitle, sex/height/activity/goal/kcal, compact weigh-in weekdays, Withings connect/disconnect
- **Dashboard** — today's calories, latest measurements, latest weight, BMI + TDEE side-by-side
- **Check-in** — weight + midje/bryst/hofte, shows 2 previous entries, diff line after save
- **Meals** — search (local DB → Matvaretabellen → Kassal), EAN barcode, custom food via photo/OCR/AI, calorie budget, date navigation
- **Meal types:** Frokost, Lunsj, Mellommåltid, Middag, Kvelds, Røk på en smell (`smoke`)
- **Saved meals** — named meal templates for quick reuse
- **Oppskrifter (Recipes)** ✅ NEW (2026-06-19):
  - Multi-ingredient recipes with auto-calculated kcal/100g
  - Optional "kokt vekt" (cooked weight) to adjust for evaporation
  - Recipes stored as `food_product` (source=custom, externalId=`recipe-{id}`) → appear automatically in food search and meal logging
  - `/meals/recipes` list + `/meals/recipes/[id]` editor
  - Entry point in Meals overview page
- **Statistics** — period views
- **Withings** — OAuth, encrypted tokens, weight sync, webhook
- **Reminders** — weigh-in reminders, PWA notifications
- **Training Flow** ✅ COMPLETE:
  - **Program Builder** — create/edit programs, individual set rows (Set#/Reps±/Rest±), drag-to-reorder, plus/delete icons in header, default 3 sets × 12 reps × 120s rest
  - **Workout Runner** — custom numeric keyboard, auto-focus KG→REPS→complete→timer, swipe-left delete sets, rest countdown timer, add/delete exercises, drag-to-reorder blocks
  - **History** — clickable sessions → `/training/history/[id]` shows full workout detail (all exercises + sets, read-only). Delete from list.
  - **API**: full CRUD for programs, sessions, sets, history

### ⏳ Backlog

- Bodyweight toggle in workout runner (instead of kg input, show body symbol)
- Clerk **production** keys (currently `pk_test_` on prod URL)
- `audit_log` usage in all mutations
- Remove legacy `kassal_product_id` on `meal_log_item`

---

## 5. Database

- **Neon project:** `bodyflow` — host: `ep-gentle-tooth-asg9bh30.c-4.eu-central-1.aws.neon.tech`
- **Old database** (`ep-quiet-shadow`) is deprecated — DO NOT use. Password was rotated after credential exposure incident (2026-06-19).
- **Migrations:** `db/migrations/` — latest: `0017_recipes.sql`
- **Migrate:** `npm run db:migrate`
- **Note:** `npm run db:generate` requires an interactive TTY terminal — run from a real terminal window, not from Claude Code tools.
- **Seeds:**
  - `npm run db:seed-matvaretabellen` — ~2100 foods (already seeded in new DB)
  - `npm run import:exercises` — 1500 exercises with initcap names (already imported)

### Core tables (singular names since `0007`)

| Table | Role |
|-------|------|
| `user_profile` | BMI/BMR/TDEE inputs, `daily_calorie_target` |
| `daily_body_log` | Weight + aggregated `calorie_intake` per day |
| `body_measurement` | waist/chest/hip per date |
| `food_product` | Shared catalog (matvaretabellen, kassal, custom, recipe mirror) |
| `meal_log_item` | User meal entries (denormalized product snapshot) |
| `saved_meal` / `saved_meal_item` | Named meal templates |
| `recipe` / `recipe_ingredient` | User recipes with calculated nutrition |
| `exercise` / `exercise_category` / `exercise_muscle` | Exercise catalog (1500 exercises from ExerciseDB) |
| `exercise_secondary_muscle` | Join table |
| `workout_program` / `workout_program_exercise` | Training programs |
| `workout_superset` | Superset groupings |
| `workout_session` / `workout_set_log` | Session history |
| `reminder` | Scheduled reminders |
| `withings_connection` | OAuth tokens (encrypted at rest) |
| `audit_log` | Change history |

**User scoping:** Always `scopeBy(table.userId, userId, …)` from `lib/auth/scope.ts`.

---

## 6. Key lib modules

```
lib/
  actions/          # Server actions (profile, meals, check-in, reminders, daily-log, saved-meals, custom-food)
  queries/          # Read models (dashboard, statistics, check-in)
  foods/            # catalog.ts, barcode-detect.ts, OCR, vision
  recipes/          # index.ts — CRUD + food_product sync
  kassal/           # Kassal.app API client
  meals/            # constants (meal types/labels)
  reminders/        # schedule.ts, client-scheduler.ts, constants
  withings/         # OAuth, sync, token-crypto, webhook-auth, token-refresh
  training/         # programs.ts, sessions.ts
  exercises/        # catalog.ts
  logger.ts         # centralized logging
  calculations/     # BMI, BMR, TDEE
  validation/       # Zod schemas per form
  rate-limit.ts     # In-memory (per-instance) — limited effectiveness on Vercel serverless
```

---

## 7. API routes

| Route | Purpose |
|-------|---------|
| `/api/foods/search` | Product search (local + kassal) — includes recipe food_products |
| `/api/foods/ean/[ean]` | EAN lookup |
| `/api/foods/extract` | Label OCR / vision |
| `/api/foods/config` | Client config |
| `/api/kassal/products` | Kassal proxy |
| `/api/exercises` | List/search exercises |
| `/api/exercises/[id]` | Single exercise |
| `/api/recipes` | GET list, POST create |
| `/api/recipes/[id]` | GET detail, PATCH (name/cookedWeightG), DELETE |
| `/api/recipes/[id]/ingredients` | POST add ingredient |
| `/api/recipes/[id]/ingredients/[ingredientId]` | PATCH qty, DELETE |
| `/api/reminders` | Reminder settings |
| `/api/integrations/withings/*` | OAuth, webhook, disconnect |
| `/api/training/programs` | POST create, GET list |
| `/api/training/programs/[id]` | GET, PUT, DELETE |
| `/api/training/programs/[id]/exercises` | POST add, exercises management |
| `/api/training/programs/[id]/reorder` | POST drag-to-reorder |
| `/api/training/programs/[id]/supersets` | POST create, DELETE unlink |
| `/api/training/programs/[id]/duplicate` | POST |
| `/api/training/sessions` | POST start |
| `/api/training/sessions/active` | GET current session |
| `/api/training/sessions/[id]` | GET detail, PUT end, DELETE |
| `/api/training/sessions/[id]/sets` | POST log, DELETE remove |
| `/api/training/sessions/history` | GET list |

---

## 8. Environment variables

See `.env.example`. Critical:

```env
DATABASE_URL=                    # Neon ep-gentle-tooth pooled URL
NEXT_PUBLIC_CLERK_* / CLERK_SECRET_KEY
NEXT_PUBLIC_APP_URL=             # https://bodyflow.echonote.no in prod
KASSAL_API_KEY=
FOOD_CUSTOM_PREFIX_ID=go4g
WITHINGS_CLIENT_ID / SECRET / REDIRECT_URI
WITHINGS_TOKEN_ENCRYPTION_KEY   # openssl rand -base64 32
WITHINGS_WEBHOOK_SECRET         # required in production
OPENAI_API_KEY                   # Vision for food labels (optional)
ALLOWED_DEV_ORIGINS=             # ngrok hostnames for Clerk dev
```

---

## 9. Local development

```bash
npm install
cp .env.example .env.local   # fill in keys
npm run db:migrate
npm run dev                  # port 3010
npm run dev:fresh            # kills 3010 then starts
```

### Mobile testing

```bash
npm run ngrok                # updates .env.local with ngrok URL
npm run dev:fresh
```

---

## 10. Security notes

- **Credential exposure (2026-06-19):** Old `ep-quiet-shadow` password was exposed via hardcoded connection string in `scripts/migrate-user-data.ts` committed to GitHub. Password rotated. Fixed by removing hardcoded URL (now uses `OLD_DATABASE_URL` env var). Migration script is one-time-use only.
- **SQL injection fix (2026-06-19):** `createSuperset` in `lib/training/programs.ts` used `sql.raw()` with user-controlled `exerciseIds`. Fixed with `inArray()` + UUID validation in route.
- Withings tokens encrypted at rest (AES-256-GCM).
- All API routes require `requireUserId()`. Webhook uses `timingSafeEqual`.
- No `dangerouslySetInnerHTML`, `eval()`, or raw SQL anywhere.
- `lib/rate-limit.ts` is in-memory — resets per serverless instance. Adequate for single user, insufficient if app ever scales.

---

## 11. Git state (as of 2026-06-19)

**Recent commits (master):**

| Hash | Description |
|------|-------------|
| `8ab85bf` | Feat: recipe builder with auto-calculated kcal/100g |
| `ec4d27d` | Fix: ESLint errors, SQL injection in createSuperset, unused imports |
| `005f734` | Security: remove hardcoded database credential from migration script |
| `ec79700` | Feat: clickable workout history with session detail view |
| `d598130` | Fix: scroll blocked by drag listeners, add delete from programs list |

**Deploy:** push to `master` → Vercel auto-deploys. Run `npm run db:migrate` if new migrations.

---

## 12. UI conventions

- Norwegian labels throughout
- `page-title` / `card-compact` / `form-grid-2` in `globals.css`
- CSS vars: `--text1/2/3`, `--card/card2`, `--border`, `--accent`, `--bg`, `--red`, `--green`, `--radius-md/sm`
- Swipe pattern: pointer events, `touchAction: "pan-y"`, `willChange: "transform"`, snap/reveal — see `SwipeableSetRow` in `workout-runner.tsx` or `SwipeableMealItem` in `meal-section.tsx`
- DnD: `@dnd-kit`, drag handle is an invisible 32px `absolute inset-y-0 left-0 w-8` strip with `touch-none` — critical to avoid scroll-blocking

---

## 13. Testing

```bash
npm test           # unit tests
npm run typecheck
npm run lint
npm run check      # all of the above + build
```

---

## 14. Handoff commands for a new AI agent

```bash
# Orient
cat project_memory.md

# Verify environment
npm run db:migrate
npm run dev:fresh

# Before pushing
npm run check
```

**Schema changes:** Write migration SQL manually to `db/migrations/00XX_name.sql` + add entry to `db/migrations/meta/_journal.json` (drizzle-kit generate requires TTY). Then `npm run db:migrate`.

**Recipes:** When a recipe is created/modified, `lib/recipes/index.ts` auto-upserts a `food_product` row with `source='custom'`, `externalId='recipe-{id}'`. This makes it searchable in `/api/foods/search` automatically — no special handling needed.

---

## 15. Product principles

- **Private by default** — all queries user-scoped
- **Minimal taps** — mobile-first, no scroll-heavy screens
- **No social** — single-user personal tool
- **Historical accuracy** — meal items snapshot product data at log time
- **Calm UI** — light theme, teal primary (`--color-primary` / `--accent`)
