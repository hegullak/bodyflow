# Security Standard

## Goal

Every project must be built with practical security from the start.

The goal is not enterprise overkill, but a sensible baseline that protects users, data, credentials and the codebase.

Security should be simple, visible and hard to accidentally bypass.

## Core principles

* Privacy first
* Least privilegeAI_DEVELOPMENT_STANDARD.md
* Secure defaults
* No secrets in source code
* Validate all input
* Log safely
* Keep dependencies updated
* Prefer simple architecture over clever security theatre
* Document security-relevant decisions in `DECISIONS.md`

## Data classification

Before storing, logging or sending data, classify it.

### Public data

Examples:

* app name
* public documentation
* non-sensitive UI labels

Low risk.

### Internal project data

Examples:

* feature flags
* technical configuration
* non-secret environment names

Do not expose unnecessarily.

### Personal data

Examples:

* names
* birthdays
* email addresses
* calendar events
* family relations
* notes
* tasks
* schedules

Handle carefully.

### Sensitive data

Examples:

* access tokens
* API keys
* passwords
* session identifiers
* private notes
* health information
* financial information
* precise location
* children’s personal information

Must be protected. Should not appear in logs, analytics, crash reports or screenshots unless explicitly safe.

## Secrets and environment variables

Never commit:

* API keys
* tokens
* passwords
* private keys
* service account files
* database URLs
* production credentials

Required:

* use `.env` for local secrets
* commit `.env.example`
* add `.env*` to `.gitignore`, except `.env.example`
* rotate any secret that may have been exposed
* do not paste secrets into AI tools

## Input validation

Validate all external or user-controlled input.

Examples:

* forms
* imported files
* calendar data
* API responses
* webhook payloads
* parsed AI output
* local storage reads

Recommended:

* use schema validation, for example Zod
* fail safely
* show helpful user-facing errors
* log only safe metadata

## Logging security

Logs must never include:

* passwords
* tokens
* API keys
* session IDs
* full user content
* private notes
* full calendar descriptions
* children’s personal details
* financial details
* precise location data

Prefer:

```ts
logger.info("Import", "Imported calendar events", {
  eventCount,
});
```

Avoid:

```ts
logger.info("Import", "Imported calendar events", {
  events,
});
```

## Authentication and authorization

If authentication is used:

* use a trusted provider when practical
* do not build custom auth unless necessary
* protect all private routes/screens
* verify access on the server for backend projects
* never trust only the client for authorization
* keep user data scoped to the correct user/household/project

For local-first apps:

* protect local data if it is sensitive
* use encrypted storage where appropriate
* avoid syncing private data unless the sync model is understood

## Dependencies

Required:

* use Dependabot or equivalent
* review new dependencies before adding them
* prefer well-maintained libraries
* avoid abandoned packages
* avoid large dependencies for tiny tasks
* remove unused dependencies

Before adding a dependency, ask:

1. Is this really needed?
2. Is it maintained?
3. Does it handle sensitive data?
4. Does it add network calls?
5. Does it affect app permissions?

## Mobile app security

For React Native / Expo apps:

* request only necessary permissions
* explain permissions clearly
* avoid storing secrets in the app bundle
* avoid logging sensitive local data
* use secure storage for tokens
* use encrypted SQLite/storage when storing sensitive personal data
* test behavior when permissions are denied
* avoid unnecessary background access

## Web app security

For web apps:

* validate input on the server
* escape output where relevant
* protect against XSS
* protect against CSRF where relevant
* use secure cookies
* use HTTPS
* avoid exposing server-only environment variables to the client
* apply proper access control to API routes
* never trust client-side checks alone

## AI-related security

AI-generated code must not:

* disable security checks
* remove validation
* reduce test coverage
* expose secrets
* bypass authentication
* log sensitive data
* silently add external services
* introduce broad permissions without explanation

AI-generated output that becomes app data should be treated as untrusted until validated.

Examples:

* parsed calendar events
* generated summaries
* extracted tasks
* imported contacts
* recommendation data

## Privacy rules

For apps handling personal or family data:

* collect the minimum data needed
* keep data local where practical
* explain what is stored
* avoid unnecessary cloud sync
* avoid analytics by default
* avoid third-party SDKs unless clearly justified
* make deletion/export possible when relevant

Special care is required for children’s data.

## Error handling

Errors should:

* fail safely
* preserve the original error for debugging
* avoid exposing internals to users
* avoid leaking sensitive data in logs
* provide enough safe context for troubleshooting

Bad:

```ts
throw new Error(`Failed for user ${email} with token ${token}`);
```

Better:

```ts
logger.error("Auth", "Failed to refresh session", {
  reason: "refresh_failed",
});
```

## Pull request security checklist

Every PR should consider:

* [ ] Does this introduce new data storage?
* [ ] Does this introduce new permissions?
* [ ] Does this introduce a new dependency?
* [ ] Does this handle personal or sensitive data?
* [ ] Is input validated?
* [ ] Are errors handled safely?
* [ ] Are logs safe?
* [ ] Are secrets avoided?
* [ ] Are tests added for security-relevant logic?
* [ ] Is a `DECISIONS.md` entry needed?

## Incident response

If a secret or sensitive data is exposed:

1. Stop using the exposed credential
2. Rotate the secret immediately
3. Remove it from the codebase
4. Check git history
5. Document what happened
6. Add a prevention step

Do not just delete the line and continue.

## Project-specific notes

Each project may add its own security notes below.

Examples:

* echofamily / echohome: family schedules, children’s data, household routines, budget notes
* echoflow: personal planning, people data, reminders
* echonote: audio files, transcripts, summaries, uploads, generated notes

Keep security practical, visible and proportional to the risk.
