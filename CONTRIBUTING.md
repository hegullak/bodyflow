# Quality Standard

## Purpose

This file defines the minimum quality baseline for every project.

Detailed rules live in:

- TESTING_STANDARD.md
- SECURITY.md
- LOGGING_STANDARD.md
- AI_DEVELOPMENT_STANDARD.md
- DECISIONS.md

This file is the top-level quality contract.

## Mandatory Standards

Every project must have:

- TypeScript strict mode where TypeScript is used
- linting
- formatting
- automated tests
- CI pipeline
- dependency update strategy
- centralized logging
- documented decisions
- security review for sensitive changes

## Quality Gates

No merge or deployment is allowed if:

- CI fails
- tests fail
- lint fails
- typecheck fails
- formatting fails
- required coverage is not met
- known critical/security issues are unresolved

## Definition of Done

A change is done when:

- functionality works
- tests are added or updated
- all quality gates pass
- security/privacy impact is considered
- logging is added where useful
- relevant documentation or decisions are updated
- code is reviewed

## Coverage Baseline

Default targets:

- Global coverage: 70%
- Critical business/domain logic: 85%+
- Security-relevant logic: 90%+

Project-specific exceptions must be documented.

## Rule

Do not weaken quality gates to make progress.

Fix the issue, document the exception, or explicitly create follow-up work.