# Architecture Decisions

## ADR-0001: Stack and bootstrap

Date: 2026-06-12
Status: Accepted

### Context

bodyflow needs a private, mobile-first health tracking MVP with authentication, Postgres storage, and testable calculation utilities.

### Decision

- Next.js 16 App Router with TypeScript
- Clerk for authentication
- Neon Postgres with Drizzle ORM in a dedicated `bodyflow` Postgres schema
- Tailwind CSS 4 for styling (calm, light, mobile-first)
- Vitest for unit tests on calculation utilities
- Server actions for profile and daily log forms

### Rationale

Matches the user's recommended stack and conventions from sibling projects (echonote, remindifier) while keeping the first vertical slice small.

### Consequences

- Requires Clerk and Neon environment variables before running against a real database
- Clerk application: `app_3F1YgZupaC522xCiwUnzuAqMFsn` (bodyflow-only users, not shared with other apps)
- History views and measurements UI are deferred to follow-up issues

## ADR-0002: Git branch strategy

Date: 2026-06-12
Status: Accepted

### Context

The project needs separate environments for experimentation, integration, and production.

### Decision

- `sandbox` — active development (default working branch)
- `develop` — integration / pre-production
- `master` — production releases
- No `main` branch

### Consequences

- Feature work lands on `sandbox` first, then promotes to `develop` and `master`

## ADR-0003: Withings API integration

Date: 2026-06-12 (updated 2026-06-12 after security audit)
Status: Accepted — **implemented**

### Context

Users with Withings smart scales should be able to sync weight automatically instead of manual entry only.

### Decision

Use the **Withings Public API** (no contract required):

- OAuth 2.0 web flow (`user.info`, `user.metrics` scopes; weight via measurement type `1`)
- **Encrypt `access_token` and `refresh_token` at rest** in `withings_connection` using AES-256-GCM (`lib/withings/token-crypto.ts`, `wte1:` prefix)
- Require `WITHINGS_TOKEN_ENCRYPTION_KEY` (32-byte base64 or hex) when Withings is enabled
- **Decrypt tokens only server-side**, immediately before Withings API calls; never send tokens to client components
- On token refresh, **always persist the rotated `refresh_token`** from Withings, re-encrypted before storage
- Webhook + pull pattern: subscribe to `appli=1` (body metrics), fetch via `measure/getmeas` on notification
- Map Withings weight (kg) into `daily_body_log` with `weight_source = 'withings'`
- Manual weight entries are not overwritten by Withings sync

### Implementation (current)

| Area | Status |
|------|--------|
| OAuth connect / callback / disconnect | ✅ Production — redirect URI must match Withings Developer Portal exactly |
| Token encryption at rest | ✅ `encryptWithingsToken` / `decryptWithingsToken` |
| Server-only decrypt before API | ✅ `lib/withings/sync.ts`, `lib/withings/connection-secrets.ts` |
| Client boundary | ✅ `WithingsConnectionPublic` — `{ connected, lastSyncAt }` only |
| Logging safety | ✅ No token values in logs or error messages |
| Plaintext migration | ✅ Idempotent `npm run withings:encrypt-tokens` |
| Prod verification | ✅ Reconnect confirmed full OAuth → encrypt → decrypt → API path |
| Webhook authenticity (#21) | ✅ Secret path token (`/webhook/{WITHINGS_WEBHOOK_SECRET}`); Public API has no HMAC on callbacks |
| OAuth state hardening (#22) | ✅ `WITHINGS_STATE_SECRET` required when `NODE_ENV=production` |
| Refresh-token race mitigation (#23) | ✅ In-flight dedup + optimistic `token_expires_at` update + 601/503 recovery re-read |

### Rationale

Documented in [Withings API reference for AI agents](https://developer.withings.com/llms.md). Public API fits personal-use scale sync without cellular/contract solutions. Application-layer encryption limits exposure if the database is read without the encryption key.

### Alternatives considered

- Manual import only — rejected for ongoing sync UX
- SDK embed — requires contract; overkill for web app
- Plaintext token storage — rejected; replaced by AES-256-GCM at rest

### Consequences

- Table: `withings_connection` (singular; one row per Clerk user, unique `withings_user_id`)
- Routes: `/api/integrations/withings/connect`, `callback`, `disconnect`, `webhook` (callback + webhook public in `proxy.ts`)
- Env vars:
  - `WITHINGS_CLIENT_ID`, `WITHINGS_CLIENT_SECRET`, `WITHINGS_REDIRECT_URI`
  - `WITHINGS_TOKEN_ENCRYPTION_KEY` (required when Withings enabled; generate with `openssl rand -base64 32`)
  - Optional: `WITHINGS_STATE_SECRET`, `WITHINGS_OAUTH_MODE`
  - `WITHINGS_WEBHOOK_SECRET` (required for public prod webhook URLs; embedded in subscribed callback path)
  - `WITHINGS_STATE_SECRET` (required in production for OAuth CSRF state signing)
- Sync triggers: dashboard, check-in, webhook, post-connect callback
- Withings callback URL in Developer Portal must match `WITHINGS_REDIRECT_URI` exactly (prod: `https://bodyflow.echonote.no/api/integrations/withings/callback`)

### Follow-up security tasks

| Issue | Task | Status |
|-------|------|--------|
| #21 | Verify Withings webhook authenticity (secret path; Withings Public API does not sign callbacks) | ✅ Done |
| #22 | Harden OAuth state handling for production (`WITHINGS_STATE_SECRET` required) | ✅ Done |
| #23 | Prevent Withings refresh-token race conditions (dedup + optimistic DB update) | ✅ Done |
