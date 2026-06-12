# AI Development Standard

## Goal

AI is a development assistant.

AI is not an architect, product owner, security reviewer or final decision maker.

Humans remain responsible for all code, architecture, security and product decisions.

AI should increase productivity without reducing quality.

## Core principles

* AI assists, humans decide.
* Generated code is reviewed code.
* Simplicity over complexity.
* Readability over cleverness.
* Security over convenience.
* Correctness over speed.
* Working software over theoretical perfection.

## Approved use cases

AI may be used for:

* code generation
* refactoring
* documentation
* unit tests
* component scaffolding
* code review suggestions
* debugging assistance
* architecture discussions
* SQL generation
* migration generation
* boilerplate creation
* README generation
* release notes
* issue generation
* backlog refinement

AI should be treated as a junior-to-mid level contributor unless proven otherwise.

## Human responsibilities

Humans remain responsible for:

* architecture decisions
* security decisions
* privacy decisions
* dependency approval
* production deployments
* business logic validation
* final code review
* data handling decisions

Responsibility cannot be delegated to AI.

## Required review

AI-generated code must be reviewed before acceptance.

Review should verify:

* correctness
* readability
* maintainability
* performance
* security
* testability
* alignment with project standards

Passing compilation is not sufficient.

Passing tests is not sufficient.

Working code is not automatically good code.

## Things AI must never do

AI must not:

* disable tests
* remove linting
* suppress errors
* bypass security checks
* reduce validation
* remove type safety
* weaken authentication
* weaken authorization
* commit secrets
* expose private data
* introduce undocumented dependencies
* silently change architecture

If AI proposes such changes, they must be explicitly reviewed and justified.

## Testing requirements

AI-generated features should include appropriate tests.

At minimum:

* business logic tests
* validation tests
* error-path tests where practical

AI must not reduce existing test coverage without explanation.

## Security requirements

AI-generated code must:

* validate input
* handle errors safely
* avoid logging sensitive data
* follow project security standards
* avoid unnecessary permissions
* avoid unsafe dependency additions

Security-relevant changes require human review.

## Dependency policy

AI may recommend dependencies.

AI may not automatically justify them.

Before adding a dependency, answer:

1. Why is it needed?
2. Is it maintained?
3. Is there a simpler alternative?
4. Does it increase attack surface?
5. Does it duplicate existing functionality?

Prefer fewer dependencies.

## Architecture policy

AI should respect:

* ARCHITECTURE.md
* QUALITY_STANDARD.md
* SECURITY.md
* DECISIONS.md

AI should not invent new architecture patterns without justification.

Prefer consistency with the existing codebase.

Consistency is usually more valuable than theoretical improvement.

## Documentation requirements

When implementing significant changes, AI should explain:

* what changed
* why it changed
* risks
* alternatives considered
* follow-up work

Complex code without explanation is discouraged.

## Logging requirements

AI-generated code should:

* use the project logger
* avoid random console statements
* follow LOGGING_STANDARD.md
* avoid sensitive data in logs

## Refactoring policy

AI may refactor code when:

* readability improves
* maintainability improves
* duplication decreases

AI should avoid refactoring solely for stylistic reasons.

Working code should not be rewritten without a clear benefit.

## Performance policy

AI should:

* identify obvious inefficiencies
* avoid premature optimization
* measure before major optimization work

Readability is generally preferred over micro-optimizations.

## Hallucination policy

AI can be wrong.

Assume:

* API details may be incorrect
* framework behavior may be outdated
* package versions may be outdated
* generated examples may be incomplete

Verify important claims.

Especially verify:

* authentication
* security
* payments
* infrastructure
* deployment
* legal requirements

## Project memory

Before major work, AI should read:

* project_memory.md
* DECISIONS.md
* ARCHITECTURE.md
* QUALITY_STANDARD.md

Existing project decisions take precedence over AI preferences.

## Pull request expectations

AI-assisted PRs should be able to answer:

* What changed?
* Why?
* How was it tested?
* What are the risks?
* Does it affect security?
* Does it affect privacy?
* Does it introduce dependencies?
* Does it require a decision record?

## Escalation rule

If AI encounters ambiguity regarding:

* security
* privacy
* architecture
* destructive operations
* data loss

AI should ask for clarification rather than guessing.

## Final rule

The goal is not to maximize generated code.

The goal is to maximize maintainable, secure and understandable software.

Good software is preferred over fast software generation.
