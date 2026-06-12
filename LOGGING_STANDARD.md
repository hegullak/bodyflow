# Logging Standard

## Goal

Every project must have a sensible logging strategy for development, debugging and future production readiness.

Logs should help developers understand:

* what happened
* where it happened
* which feature or module triggered it
* whether it was informational, a warning, an error or debug-only
* relevant context needed to diagnose the issue

Logging must be useful without polluting the codebase with random console statements.

## Requirements

Each project should have a small centralized logging utility, for example:

```text
src/lib/logger.ts
```

or another location that fits the project structure.

The logger should support these levels:

* `debug`
* `info`
* `warn`
* `error`

## Logging rules

Use logging intentionally.

### debug

Use for developer-only troubleshooting.

Examples:

* mock data loaded
* calculation input/output
* feature flag decisions
* local state transitions
* temporary diagnostic information during development

Debug logging should be easy to disable or filter later.

### info

Use for meaningful application events.

Examples:

* app initialized
* main screen opened
* domain object generated
* local data initialized
* weekly plan recalculated
* mock data seed completed

### warn

Use when something is unexpected but not fatal.

Examples:

* missing optional data
* invalid date skipped
* empty recommendation list
* fallback UI used
* recoverable parsing issue

### error

Use when something failed.

Examples:

* failed to read local storage
* failed to parse data
* failed to generate domain output
* unexpected exception in app logic
* failed integration call

Errors should include useful context and preserve the original error object when possible.

## Important constraints

* Do not scatter raw `console.log` calls around the codebase.
* Prefer the centralized logger.
* Do not log secrets, tokens, passwords, API keys or credentials.
* Do not log personal sensitive data or full user-generated content.
* Avoid noisy logs on every render.
* Avoid logging inside hot render paths unless guarded.
* Keep logs readable in local development output.
* Keep the implementation simple.
* Do not introduce a heavy external logging platform by default.
* Do not add Sentry, Datadog, LogRocket or similar unless there is a clear need and it is documented in `DECISIONS.md`.

## Suggested format

Each log entry should include:

* timestamp if practical
* level
* module/source
* message
* optional metadata object

Example usage:

```ts
logger.info("FamilyBrief", "Generated weekly brief", {
  weekStart,
  recommendationCount,
  riskCount,
});
```

Example output:

```text
[2026-06-11T08:42:10.122Z] INFO FamilyBrief: Generated weekly brief {"weekStart":"2026-06-15","recommendationCount":4,"riskCount":2}
```

## Environment behavior

For local development:

* `debug` should be visible
* `info`, `warn` and `error` should be visible
* logs should be readable in the terminal/output logs

For production or preview builds:

* `debug` should be disabled or filtered unless explicitly enabled
* `info` may be reduced if noisy
* `warn` and `error` should remain visible or be sent to the chosen monitoring tool

The logger should be structured so production filtering can be added later.

## Privacy and security

Logs must never contain:

* passwords
* tokens
* API keys
* session identifiers
* private keys
* full personal messages
* sensitive personal data
* payment details
* full calendar descriptions if they may contain private information

Prefer safe metadata:

```ts
logger.info("CalendarSync", "Imported calendar events", {
  eventCount,
  source: "local-calendar",
});
```

Avoid unsafe metadata:

```ts
logger.info("CalendarSync", "Imported events", {
  events,
});
```

## Where logging should usually be added

Add logging to:

* app startup / initialization
* data loading
* domain generation logic
* recommendation generation
* risk / heads-up generation
* parsing
* date handling
* storage operations
* integration calls
* fallback behavior
* unexpected empty states

Do not add logging to:

* every render
* every button press unless meaningful
* purely visual components
* tight loops
* sensitive data flows without redaction

## Tests

Add lightweight tests for the logger if formatting, filtering or metadata handling exists.

Also add tests for domain logic that logs warnings or errors for invalid input.

Logging should not make tests brittle.

Prefer asserting behavior rather than exact log text unless the logger itself is being tested.

## Code review expectation

When logging is added or changed, the PR should be able to answer:

1. Where does the logger live?
2. How is it used?
3. What levels exist?
4. What meaningful events are logged?
5. Could any log contain sensitive data?
6. Are logs too noisy?
7. Is production behavior safe?
8. Is an external logging service being introduced? If yes, is it documented in `DECISIONS.md`?

## Project-specific notes

Each project may add its own logging examples below this section.

Examples:

* echofamily: Family Brief generation, household planning, recommendations, weather-window logic
* echoflow: personal brief generation, people data, reminders, local-first storage
* echonote: transcription lifecycle, summary generation, upload status, export generation

Keep logging small, useful, typed and consistent with the project quality standard.
