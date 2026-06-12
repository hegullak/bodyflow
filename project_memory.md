# Project Memory — bodyflow

> **Purpose of this file:** Handoff context for humans and AI agents. Read this first, then `ARCHITECTURE.md`, `DECISIONS.md`, `db/DATABASE.md`, and `DATABASE_STANDARDS.md`.

Last updated: 2026-06-12

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
| Default branch workflow | `sandbox` → `develop` → `master` (no `main`) |

---

## 2. Technology stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Auth | Clerk (`@clerk/nextjs` v7) — middleware in `proxy.ts` |
| Database | Neon Postgres, schema `bodyflow` |
| ORM | Drizzle + `npm run db:migrate` |
| Styling | Tailwind CSS 4, mobile-first, max-width 640px shell |
| Tests | Vitest (`npm test` — 36 tests) |
| Barcode | `@zxing/browser` fallback + native `BarcodeDetector` when available |
| OCR | Tesseract.js (custom food labels); optional OpenAI Vision |
| PWA | `public/sw.js` + `ReminderSync` for web notifications |

---

## 3. App routes & navigation

Bottom nav (`components/layout/bottom-nav.tsx`):

| Path | Purpose |
|------|---------|
| `/dashboard` | Home — weight, calories, trends |
| `/check-in` | Unified daily log: weight + midje/bryst/hofte, diff vs last |
| `/meals` | Meal logging per day, calorie budget |
| `/statistics` | Historical stats |
| `/profile` | Profile, Withings, reminder settings |

**Layout:** `app/(app)/layout.tsx` — no "bodyflow" title in header, only Clerk `UserButton`. Bottom nav fixed.

**Auth:** `/sign-in`, `/sign-up`. Landing `/` is public.

---

## 4. Feature status (current)

### ✅ Built and in use

- **Profile** — sex, height, birth year, activity, goal, daily kcal target, compact mobile layout
- **Check-in** — single form (`components/forms/check-in-form.tsx`): vekt + midje/bryst/hofte, one **Save** button, shows 2 previous entries, diff line after save (green = down, red = up)
- **Meals** — search (local DB → Matvaretabellen → Kassal), EAN barcode (camera + manual), custom food via photo/OCR/AI, calorie budget (Totalt/Brukt/Tilgjengelig), date navigation ←/→
- **Meal types:** Frokost, Lunsj, Mellommåltid, Middag, Kvelds, **Røk på en smell** (`smoke` enum, migration `0009`)
- **Statistics** — period views
- **Withings** — OAuth connect, weight sync to `daily_body_log`, webhook
- **Reminders** — generic engine (`reminder` table), weigh-in UI on Profile, PWA notifications via service worker (`docs/REMINDERS.md`)
- **Food catalog** — `food_product` + `meal_log_item`, Kassal API, Matvaretabellen seed

### ⏳ Backlog / compliance (see `db/DATABASE.md`)

- Soft delete (`deleted_at`) on all user tables
- `audit_log` usage in all mutations
- Encrypt Withings tokens at rest
- Remove legacy `kassal_product_id` on `meal_log_item`
- Clerk **production** keys + prod domain (currently `pk_test_` on prod URL)

---

## 5. Database

- **Docs:** `db/DATABASE.md`, standards: `DATABASE_STANDARDS.md`
- **Migrations:** `db/migrations/` — latest `0009_meal_type_smoke.sql`
- **Migrate:** `npm run db:migrate` (uses `bodyflow_drizzle` migration schema)
- **Seeds:**
  - `npm run db:seed-matvaretabellen` — ~2100 foods
  - `npm run db:seed-measurements` — needs `SEED_USER_ID`

### Core tables (singular names since `0007`)

| Table | Role |
|-------|------|
| `user_profile` | BMI/BMR/TDEE inputs, `daily_calorie_target` |
| `daily_body_log` | Weight + aggregated `calorie_intake` per day |
| `body_measurement` | waist/chest/hip per date |
| `food_product` | Shared catalog (matvaretabellen, kassal, custom) |
| `meal_log_item` | User meal entries (denormalized product snapshot) |
| `reminder` | Scheduled reminders (`weigh_in` first) |
| `withings_connection` | OAuth tokens (encryption TODO) |
| `audit_log` | Change history (write usage TODO) |

**User scoping:** Always `scopeBy(table.userId, userId, …)` from `lib/auth/scope.ts`.

---

## 6. Key lib modules

```
lib/
  actions/          # Server actions (profile, meals, check-in, reminders, daily-log, …)
  queries/          # Read models (dashboard, statistics, check-in)
  foods/            # catalog.ts, barcode-detect.ts, OCR, vision
  kassal/           # Kassal.app API client
  meals/            # constants (meal types/labels)
  reminders/        # schedule.ts, client-scheduler.ts, constants
  withings/         # OAuth, sync, measurements
  calculations/     # BMI, BMR, TDEE
  validation/       # Zod schemas per form
```

**Check-in flow:** `lib/actions/check-in.ts` + `lib/queries/check-in.ts` — merges `daily_body_log` and `body_measurement` by date.

**Meals flow:** `lib/actions/meals.ts` — syncs daily calories from meal totals to `daily_body_log`.

---

## 7. API routes

| Route | Purpose |
|-------|---------|
| `/api/foods/search` | Product search (local + external) |
| `/api/foods/ean/[ean]` | EAN lookup |
| `/api/foods/extract` | Label OCR / vision |
| `/api/foods/config` | Client config (prefix id, vision flag) |
| `/api/kassal/products` | Kassal proxy |
| `/api/reminders` | Reminder settings for client scheduler |
| `/api/integrations/withings/*` | OAuth, webhook, disconnect |

---

## 8. Environment variables

See `.env.example`. Critical:

```env
DATABASE_URL=                    # Neon pooled URL
NEXT_PUBLIC_CLERK_* / CLERK_SECRET_KEY
NEXT_PUBLIC_APP_URL=             # https://bodyflow.echonote.no in prod
KASSAL_API_KEY=
FOOD_CUSTOM_PREFIX_ID=go4g
WITHINGS_CLIENT_ID / SECRET / REDIRECT_URI
# Optional:
OPENAI_API_KEY                   # Vision for food labels
ALLOWED_DEV_ORIGINS=             # ngrok hostnames for Clerk dev
```

**Production checklist:**

1. All envs in Vercel
2. `npm run db:migrate` against prod Neon (same `DATABASE_URL` as Vercel)
3. Clerk Dashboard → Domains: add `https://bodyflow.echonote.no`
4. Withings redirect URI → prod URL callback
5. Deploy from `master` after merge

---

## 9. Local development

```bash
npm install
cp .env.example .env.local   # fill in keys
npm run db:migrate
npm run dev                  # port 3010
# or if port busy:
npm run dev:fresh            # kills 3010 then starts
```

### Mobile testing (camera, PWA, notifications)

```bash
npm run ngrok                # updates .env.local with ngrok URL
npm run dev:fresh
```

- Add ngrok URL in Clerk **development** domains
- On iPhone: open ngrok URL → Add to Home Screen for PWA
- **Barcode camera:** must tap strekkode tab (user gesture) — `getUserMedia` called in `product-picker.tsx` `activateScanMode()`, not in passive `useEffect` (iOS requirement)
- Uses ZXing when `BarcodeDetector` unavailable (desktop Chrome, iOS)

### Common issues

| Problem | Fix |
|---------|-----|
| `EADDRINUSE :::3010` | `npm run dev:fresh` |
| Clerk origin error | Add URL to Clerk Domains + `ALLOWED_DEV_ORIGINS` |
| `daily_body_logs does not exist` on Vercel | Deploy latest code (singular table names) + run migrations |
| Hydration warnings on desktop | Chrome extensions (`__gcruniqueid`) — `ClientOnly` wrappers on forms |
| Port 3010 held by Cursor background | Kill process or `dev:fresh` |

---

## 10. UI conventions

- Norwegian labels in meals/check-in; some English remnants in profile ("Save", "Daily kcal")
- `page-title` / `card-compact` / `form-grid-2` in `globals.css`
- Forms: server actions + `useActionState`, Zod validation
- Client-only forms where browser extensions break hydration (`components/client-only.tsx`)

---

## 11. Git state (as of 2026-06-12)

**Last pushed commit:** `9f7f285` — meals, reminders, check-in, DB standards (on `sandbox`, `develop`, `master`)

**Uncommitted local work** (not yet pushed):

- Unified check-in form + diff display
- Meal type `smoke` + migration `0009`
- Meals date nav (←/→), removed subtitles/header branding
- ZXing barcode fallback + camera UX (icon tabs, auto-start on gesture)
- `dev:fresh`, `kill-port.ps1`, `barcode-detect.ts`
- Product picker UI refactor

**Before prod deploy:** commit, push, run `db:migrate` on Neon prod, verify Vercel redeploy.

---

## 12. Testing

```bash
npm test           # unit tests
npm run typecheck
npm run lint
npm run check      # all of the above + build
```

Tests in `__tests__/` — kassal nutrition, food label parse, reminders schedule, withings measurements, import parser.

---

## 13. Related docs (read order)

1. `project_memory.md` (this file)
2. `DECISIONS.md` — ADRs (stack, branches, Withings)
3. `db/DATABASE.md` — schema, compliance status
4. `DATABASE_STANDARDS.md` — full DB rules (from project-master-template)
5. `docs/REMINDERS.md` — reminder engine + PWA limitations
6. `AI_DEVELOPMENT_STANDARD.md` — coding rules for agents

---

## 14. Product principles (do not violate)

- **Private by default** — all queries user-scoped
- **Minimal taps** — mobile-first, no scroll-heavy screens where possible
- **No social** — single-user personal tool
- **Historical accuracy** — meal items snapshot product data at log time
- **Calm UI** — light theme, teal primary (`--color-primary`)

---

## 15. Handoff commands for a new AI agent

```bash
# Orient
cat project_memory.md db/DATABASE.md DECISIONS.md

# Verify environment
npm run db:migrate
npm run dev:fresh

# Before PR
npm run check
```

When changing schema: `npm run db:generate` → review SQL → `npm run db:migrate` → update `db/DATABASE.md`.

When adding meal types: extend `meal_type` enum in schema + migration + `lib/meals/constants.ts` + `lib/validation/meal-item.ts` + `getMealsGroupedByType`.

When touching camera/barcode: read `lib/foods/barcode-detect.ts` and `components/meals/product-picker.tsx` (iOS user-gesture requirement).
