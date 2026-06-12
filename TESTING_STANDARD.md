# Testing Standard

## Goal

Every project must have a practical, reliable and maintainable testing strategy.

Tests are not optional decoration.

Tests are part of the definition of done.

No feature is too small to be tested if it contains logic, state, validation, user impact, security impact or integration behavior.

## Core principles

* All tests must be green before deployment.
* New functionality should include tests.
* Bug fixes should include regression tests.
* Business logic should be tested before UI polish.
* Tests should verify behavior, not implementation details.
* Tests should be readable and maintainable.
* Tests should be deterministic.
* Test failures must be investigated, not ignored.
* Do not disable tests to make CI pass.
* Do not reduce coverage without explicit justification.

## Required test types

Each project should use the test types that fit its stack.

### Unit tests

Required for:

* business logic
* domain logic
* calculations
* validation
* parsing
* formatting
* mapping
* permissions logic
* recommendation logic
* date/time logic
* error handling logic

Unit tests should be fast, isolated and easy to understand.

### Component tests

Required for UI components that contain meaningful behavior.

Examples:

* renders expected states
* handles loading states
* handles empty states
* handles error states
* responds to user interaction
* shows important information

Avoid testing pure visual styling unless it affects behavior or accessibility.

### Integration tests

Use when multiple parts work together.

Examples:

* storage + domain logic
* API client + parser
* form validation + submit behavior
* import flow
* authentication flow
* sync flow

### End-to-end tests

Use when the project has critical user journeys that cannot be trusted through unit/component tests alone.

E2E is not required for every MVP, but should be considered for mature or production-critical apps.

Examples:

* onboarding
* login
* create/edit/delete important data
* payment flow
* export/import
* core daily/weekly workflow

## Coverage requirements

Coverage is a safety signal, not the goal itself.

Minimum baseline:

* Global coverage: 70%
* Critical business/domain logic: 85%+
* Security-relevant logic: 90%+
* Bug-fix regression tests: required where practical

Coverage may be lower temporarily only if:

* documented in the PR
* justified
* tracked as follow-up work

Do not chase 100% coverage with low-value tests.

Do not write meaningless tests only to satisfy coverage.

## Definition of done

A feature is not done until:

* tests are added or updated
* existing tests pass
* lint passes
* typecheck passes
* formatting passes
* relevant edge cases are covered
* error states are considered
* security/privacy impact is considered
* CI is green

## What must always be tested

Always test:

* new domain logic
* date and time handling
* data parsing
* input validation
* permission decisions
* recommendation logic
* filtering and sorting
* calculations
* persistence/storage behavior
* error handling
* fallbacks
* bug fixes

For apps like echohome / echofamily, this includes:

* Family Brief generation
* recommendation generation
* risk/headsup generation
* chore logic
* calendar parsing
* meal planning rules
* budget calculations
* weather-window logic
* holiday/weekend logic

## What usually does not need heavy testing

Avoid over-testing:

* static layout-only components
* simple wrappers with no logic
* purely decorative UI
* generated boilerplate
* framework behavior
* third-party library internals

Smoke tests may be enough for simple UI components.

## Test quality rules

Good tests should be:

* clear
* focused
* deterministic
* independent
* fast
* named by behavior
* easy to debug

Prefer:

```ts
it("marks the brief as high pressure when there are multiple evening activities", () => {
  // ...
});
```

Avoid:

```ts
it("works", () => {
  // ...
});
```

## Test data

Use realistic but safe test data.

Do not use real personal data in tests.

Avoid:

* real names unless fictionalized
* real addresses
* real calendar details
* real financial data
* secrets or tokens

Use factories/builders where helpful.

Example:

```ts
const activity = createActivity({
  type: "football",
  day: "Thursday",
});
```

## Mocking rules

Mock external systems.

Examples:

* network calls
* calendar APIs
* weather APIs
* payment APIs
* file systems where needed
* time/date where needed

Do not over-mock internal logic.

Prefer testing real domain functions with controlled input.

## Date and time testing

Date/time logic must use fixed test dates.

Avoid tests that depend on the current date unless explicitly controlled.

Use fake timers or injected clocks where practical.

Bad:

```ts
new Date()
```

Better:

```ts
const today = new Date("2026-06-11T08:00:00Z");
```

## Error-path testing

Important failures must be tested.

Examples:

* invalid input
* missing data
* failed storage read
* failed API response
* empty result
* permission denied
* malformed parsed data

Error handling should be safe and user-friendly.

## Accessibility testing

For UI projects, test important accessibility behavior where practical.

Examples:

* important buttons have accessible labels
* core information is readable by assistive technology
* disabled states behave correctly
* forms expose validation errors

## CI requirements

CI must run on pull requests and pushes to protected branches.

Minimum CI checks:

* install dependencies
* lint
* format check
* typecheck
* unit tests
* coverage report

Deployment must not happen unless CI is green.

## Pull request testing checklist

Every PR should answer:

* [ ] What tests were added or updated?
* [ ] What existing tests were affected?
* [ ] Are all tests green?
* [ ] Does coverage meet the standard?
* [ ] Are edge cases tested?
* [ ] Are error paths tested?
* [ ] Is date/time behavior deterministic?
* [ ] Are privacy/security-sensitive paths tested?
* [ ] Was manual testing performed if UI changed?

## Manual testing

Manual testing does not replace automated testing.

Manual testing is useful for:

* visual checks
* device-specific behavior
* animations
* navigation feel
* accessibility review
* first-run experience

Document manual testing in PRs when relevant.

## Test failure policy

Failing tests must not be ignored.

Do not:

* skip failing tests without explanation
* delete tests because they fail
* lower coverage thresholds silently
* mark broken behavior as expected without review

Skipped tests must include a reason and a follow-up issue if the skip is temporary.

## AI-generated code

AI-generated code must follow the same testing standard.

AI must not:

* remove tests to pass CI
* disable coverage
* mock away the behavior being tested
* write meaningless coverage-only tests
* ignore failing tests

AI-generated features should include tests in the same change.

## Project-specific notes

Each project may add stack-specific testing details below.

Examples:

### React Native / Expo

Recommended tools:

* Jest
* React Native Testing Library
* jest-expo
* test utilities for providers/navigation
* fake timers for date/time logic

### Next.js / React

Recommended tools:

* Jest or Vitest
* React Testing Library
* Playwright for important E2E flows when mature

### Node/API

Recommended tools:

* Jest or Vitest
* Supertest or equivalent for API routes
* schema validation tests

Keep the testing strategy practical, strict and maintainable.
