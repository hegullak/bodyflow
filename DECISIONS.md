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

## ADR-0003: Withings API integration (planned)

Date: 2026-06-12
Status: Proposed

### Context

Users with Withings smart scales should be able to sync weight automatically instead of manual entry only.

### Decision

Use the **Withings Public API** (no contract required):

- OAuth 2.0 web flow (`user.metrics` scope minimum for weight)
- Store encrypted refresh tokens server-side, scoped per Clerk user
- Webhook + pull pattern: subscribe to `appli=1` (body metrics), fetch via `measure/getmeas` on notification
- Map Withings measurement type `1` (weight, kg) into `daily_body_logs` with source metadata
- Token refresh every ~3 hours; persist rotated refresh tokens

### Rationale

Documented in [Withings API reference for AI agents](https://developer.withings.com/llms.md). Public API fits personal-use scale sync without cellular/contract solutions.

### Alternatives

- Manual import only (current MVP)
- SDK embed (requires contract; overkill for web app)

### Consequences

- New tables: `withings_connections` (tokens, userid, last sync)
- New routes: OAuth callback, webhook handler (public in `proxy.ts`)
- Env vars: `WITHINGS_CLIENT_ID`, `WITHINGS_CLIENT_SECRET`, `WITHINGS_REDIRECT_URI`
- Follow-up: implement on `sandbox` after MVP history slice
