# bodyflow — Database Documentation

Complies with [DATABASE_STANDARDS.md](../DATABASE_STANDARDS.md) (project-master-template v1.1.0).

## Engine and tooling

| Item | Choice |
|------|--------|
| Engine | PostgreSQL (Neon serverless) |
| App schema | `bodyflow` (isolated from sibling apps on shared Neon project) |
| ORM | Drizzle |
| Migrations | `db/migrations/` via `npm run db:migrate` |
| User identity | Clerk `user_id` (text) — no local `user` table; auth is external |

## Entity relationship sketch

```text
user_profile (1 per Clerk user)
 ├── daily_body_log (weight/calories per day)
 ├── body_measurement (chest/waist/hip per date)
 ├── meal_log_item (food entries per meal slot per day)
 │    └── food_product (shared catalog: matvaretabellen, kassal, custom)
 ├── reminder (generic scheduled reminders; first type: weigh_in)
 └── withings_connection (OAuth tokens — sensitive)

audit_log (cross-cutting change history)
```

## Ownership model

All health and meal data is scoped by `user_id` (Clerk). Application code must filter every query with `scopeBy` / `eq(userId, …)`.

`food_product` is a **shared reference catalog** (not user-owned). `meal_log_item` snapshots nutrition at log time.

## Denormalized fields (documented)

| Table | Field | Reason |
|-------|-------|--------|
| `meal_log_item` | `product_name`, `brand`, `ean`, `kcal_per_100g`, `calories_kcal` | Preserves historical values if `food_product` changes (§15.3–15.4) |
| `meal_log_item` | `kassal_product_id` | Legacy provider id; prefer `food_product_id`. Scheduled for removal. |
| `daily_body_log` | `calorie_intake` | Aggregated from meals; convenience for dashboard |

## External data sources

| Provider | `food_product.source` | Identifier column |
|----------|----------------------|-------------------|
| Matvaretabellen | `matvaretabellen` | `external_id` (= `foodId`) |
| Kassal.app | `kassal` | `external_id` (= product id) |
| User scan (photo/OCR/AI) | `custom` | `external_id` = `{FOOD_CUSTOM_PREFIX_ID}-{uuid}` |

Unique constraint: `(source, external_id)` — matches standard `unique(source_provider, source_external_id)` pattern (§14).

## Sensitive data

| Table | Columns | Notes |
|-------|---------|-------|
| `user_profile` | `notes`, health fields | Personal health data |
| `daily_body_log`, `body_measurement` | weights, notes | Personal health data |
| `withings_connection` | `access_token`, `refresh_token` | **Deviation:** stored for OAuth refresh; must move to encrypted/secret storage (§10.3) |

## Delete behaviour

| Relationship | ON DELETE |
|--------------|-----------|
| `meal_log_item.food_product_id` → `food_product.id` | `SET NULL` (snapshot columns retain history) |

User-owned rows: hard delete today; `deleted_at` soft delete planned (§9.3).

## Indexes (non-obvious)

| Index | Reason |
|-------|--------|
| `daily_body_log (user_id, log_date)` | Dashboard + check-in by date |
| `meal_log_item (user_id, log_date, meal_type)` | Meals page grouped by slot |
| `food_product (source, external_id)` | Import deduplication |
| `audit_log (entity_type, entity_id)` | Entity history lookup |

## Compliance status

| Standard | Status |
|----------|--------|
| Singular table names | ✅ migration `0007` |
| UUID primary keys | ✅ |
| Foreign keys | ✅ `meal_log_item` → `food_product` |
| Audit log table | ✅ `audit_log` |
| Timestamps (`created_at`, `updated_at`) | ✅ business tables |
| Soft delete (`deleted_at`) | ⏳ planned (✅ on `reminder`) |
| Withings token encryption | ⏳ planned — documented deviation |
| `source_provider` column naming on `food_product` | ⏳ `source` enum retained; semantic equivalent |

## Seeds

```bash
npm run db:seed-matvaretabellen   # Matvaretabellen reference foods
npm run db:seed-measurements      # Historical measurements (SEED_USER_ID)
```
