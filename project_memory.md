# Project Memory

## Project Overview

Project Name: bodyflow

Status: MVP vertical slice

Owner: hegullak

Repository: https://github.com/hegullak/bodyflow

Branches: `sandbox` (active dev), `develop` (integration), `master` (production). No `main` branch.

Primary Purpose:

Private personal tracking of body weight, measurements, calorie intake, and derived metrics (BMI, BMR, TDEE, deficits/surpluses).

## Product Vision

A calm personal cockpit for quick on-the-fly logging and overview — not a meal database, macro tracker, or social fitness app.

## Current Scope

### In Scope (slice 1)

* Authenticated app shell
* User profile for calculations
* Daily weight/calorie log
* Dashboard cards and simple weight trend
* Calculation utilities with tests
* Database schema for profiles, logs, measurements

### Planned integrations

* **Withings Public API** — OAuth 2.0 weight sync from smart scales (see DECISIONS.md ADR-0002)
* Reference: https://developer.withings.com/llms.md

### Out of Scope (MVP)

* Meal database, macros, barcode scanning
* Exercise tracking
* Social features
* Full history CRUD UI (next slice)
* Measurement entry UI (next slice)
* Historical data import

## Core Principles

* Private by default
* Minimal data entry
* Fast mobile use
* Secure handling of personal health data
* Server-side data access with user scoping

## Technology Stack

* Next.js 16, React 19, TypeScript
* Clerk authentication
* Neon Postgres + Drizzle ORM
* Tailwind CSS 4
* Vitest

## Project Structure

```
app/                 # Next.js routes
components/          # UI and forms
db/                  # schema, migrations, client
lib/                 # auth, actions, calculations, queries
__tests__/           # unit tests
```
