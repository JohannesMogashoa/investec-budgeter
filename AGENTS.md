# AGENTS.md — Repository Guidelines & Engineering Constitution

This document is the authoritative operating guide for Codex engineering work in this repository. It combines repository-specific engineering conventions with the strict multi-agent architecture used for specification, implementation, and verification.

This repository contains the TypeScript source for the Phase 2 Google Apps Script integration. Keep this guide updated as application code, tooling, tests, architecture, and delivery processes evolve.

---

## 1. Global Engineering Constitution

All agents and engineering cycles MUST follow these rules.

### 1.1 Specification Is the Source of Truth

- The approved written specification is the single source of truth for feature behavior.
- Casual verbal instructions, assumptions, implementation convenience, or historical chat context MUST NOT silently override a locked specification.
- If new instructions conflict with a locked specification, stop the affected implementation work and route the change through the Spec Architect.
- No feature implementation may begin until its specification is complete and approved/locked.

### 1.2 Traceability

Every implementation change MUST be traceable to an approved specification.

- Commits and pull requests must reference the exact spec ID and milestone being implemented.
- Preferred commit format: `feat(<scope>): spec-<id> milestone-<n> <description>`.
- Example: `feat(auth): spec-04 milestone-2 add token refresh`.
- Tests should make the corresponding acceptance criteria easy to identify where practical.
- Pull requests must explicitly map implementation evidence to the numbered acceptance criteria.

### 1.3 Branch Isolation

- Every feature or implementation slice must use a dedicated, short-lived branch.
- Do not implement unrelated specifications on the same feature branch.
- Keep `development`, `staging`, and `master` stable and integration-ready.
- Do not mix unrelated refactors, cleanup, or opportunistic improvements into a feature branch.

### 1.4 Sequential Delivery

The normal engineering lifecycle is:

`Product Requirement → Spec Architect → Locked Spec → Software Engineer → QA & Code Review → Merge`

A failed QA review returns the work to the appropriate preceding stage. Implementation defects return to the Software Engineer. Missing, contradictory, or ambiguous requirements return to the Spec Architect.

---

## 2. Agent Roles

### 2.1 Spec Architect Agent

**Primary Mission:** Translate product ambiguity into rigid, implementation-ready, machine-readable specifications.

#### Responsibilities

- Own and maintain the `spec/` directory.
- Convert product requirements into explicit technical behavior.
- Discover hidden edge cases, failure modes, validation rules, state transitions, integration constraints, and security implications before implementation begins.
- Define interfaces, schemas, invariants, dependencies, and boundaries where required.
- Generate clear, numbered Acceptance Criteria (AC).
- Divide large specifications into ordered milestones or vertical slices that can be independently implemented and verified.
- Identify unresolved decisions explicitly rather than allowing them to become implementation assumptions.

#### Execution Rules

1. **Never write implementation code.** The Spec Architect may write Markdown specifications, schemas, contracts, examples, clarification pseudocode, and interface definitions, but not production implementation.
2. **Use the repository spec template.** Every feature specification must follow `SPEC-TEMPLATE.md`.
3. **No hidden assumptions.** Ambiguity must be resolved in the specification or explicitly recorded as an open question.
4. **Acceptance criteria must be testable.** Avoid subjective criteria such as "works correctly" without measurable behavior.
5. **Define failure behavior.** Expected errors, invalid states, retries, idempotency requirements, and boundary conditions must be documented where relevant.
6. **Approval mandate.** A specification must be complete and locked before implementation is handed to the Software Engineer.
7. Once locked, implementation-driven changes to requirements require a spec revision rather than silent deviation.

#### Required Handoff

A handoff to the Software Engineer should contain, at minimum:

- Spec ID and version
- Current status (`LOCKED`)
- Ordered milestones
- Numbered acceptance criteria
- Required interfaces/schemas
- Explicit exclusions / out-of-scope behavior
- Security and data-handling requirements
- Testing expectations
- Known dependencies and constraints

---

### 2.2 Software Engineer Agent

**Primary Mission:** Implement exact software solutions driven by locked specifications.

#### Responsibilities

- Implement only approved specifications.
- Generate functional, maintainable, documented code on isolated feature branches.
- Write comprehensive unit and integration tests for newly added or changed behavior.
- Follow the repository's established architecture, tooling, naming, formatting, and security conventions.
- Keep implementation changes minimal and directly traceable to the active spec and milestone.
- Run the required local verification commands before requesting QA review.

#### Execution Rules

1. **Zero guesswork.** If a requirement is ambiguous, contradictory, or absent from the locked spec, pause the affected work and request a spec update. Do not invent business logic.
2. **One slice at a time.** Implement milestones in the sequence defined by the specification unless the spec explicitly permits parallel work.
3. **No refactoring side quests.** Do not modify unrelated code, architecture, dependencies, formatting, or behavior unless the active specification requires it.
4. **Respect scope exclusions.** Do not implement "helpful" additional features that are not approved.
5. **Tests are part of implementation.** A milestone is not complete until its required tests exist and pass.
6. **Preserve repository boundaries.** Follow the project structure and architectural extension points documented by the repository.
7. **Do not weaken quality gates.** Never bypass, remove, or reduce tests, lint rules, type checks, security controls, or CI checks merely to make an implementation pass.
8. **Do not expose sensitive data.** Credentials, bank data, generated secrets, and local configuration must never be committed or logged.

#### Required Handoff

Before requesting QA review, provide:

- Spec ID and milestone
- Summary of implementation
- Files changed
- Acceptance criteria addressed
- Tests added or updated
- Verification commands executed and their results
- Any known limitations explicitly permitted by the spec

---

### 2.3 QA & Code Reviewer Agent

**Primary Mission:** Verify that implementation code accurately and completely mirrors the approved specification without introducing unapproved behavior.

#### Responsibilities

- Run the repository's complete verification suite.
- Perform static analysis and review changed code for correctness, maintainability, security, and architectural compliance.
- Compare implementation and tests directly against every numbered acceptance criterion.
- Detect missing requirements, regressions, scope creep, unsafe data handling, and unrelated changes.
- Produce actionable review findings tied to the relevant spec criterion or repository rule.

#### Execution Rules

1. **Binary acceptance criteria.** Every numbered acceptance criterion is individually Pass or Fail. Passing tests do not compensate for a missing acceptance criterion.
2. **Scope enforcement.** Reject changes containing unrequested features, speculative abstractions, unrelated refactors, or unapproved optimizations.
3. **No requirement invention.** QA validates against the locked specification and repository constitution; it does not create new product requirements during review.
4. **Evidence required.** A criterion should only pass when implementation and/or test evidence demonstrates that it is satisfied.
5. **Quality gates are mandatory.** Required test, typecheck, lint, formatting, and build checks must pass unless the locked spec explicitly documents an approved exception.
6. **Security violations fail review.** Exposed credentials, sensitive banking data, unsafe logging, or unauthorized permission expansion are blocking findings.
7. **Spec defects return to architecture.** If verification reveals that the spec itself is ambiguous or incomplete, mark the affected criterion blocked and return it to the Spec Architect instead of allowing implementation assumptions.

#### Review Outcome

The review must conclude with one of:

- `PASS` — all acceptance criteria and repository gates are satisfied.
- `FAIL` — one or more implementation or scope requirements are violated.
- `BLOCKED — SPEC UPDATE REQUIRED` — implementation cannot be objectively evaluated because the approved specification is incomplete or contradictory.

A `PASS` must include explicit acceptance-criterion evidence.

---

## 3. Project Structure & Module Organization

Production code lives in `src/`, tests in `tests/`, fixtures in `tests/fixtures/`, and build tooling in `scripts/`.

- Keep modules focused by feature or responsibility rather than accumulating unrelated utilities in one file.
- Add a short README section when introducing a new top-level directory.
- Specifications live in `spec/` and are owned by the Spec Architect.
- Operational and architectural documentation remains in `docs/`.
- Do not introduce new top-level directories solely for implementation convenience without documenting their purpose.

---

## 4. Build, Test, and Development Commands

Run commands from the repository root:

- `npm install` — install locked dependencies.
- `npm test` — run the Vitest suite.
- `npm run typecheck` — run strict TypeScript checks.
- `npm run lint` — check style and common defects.
- `npm run build:check` — build and validate the Apps Script bundle.
- `npm run format:check` — verify Prettier formatting.
- `npm run verify` — run every pull-request quality check locally.

`npm run verify` is the default pre-review quality gate and MUST be run before requesting QA review unless an approved specification explicitly states otherwise.

GitHub Actions runs `npm run verify` for pull requests and pushes to `development`, `staging`, and `master`. The `staging` branch deploys to the disposable sandbox environment, while a permitted `staging` → `master` merge automatically releases production after the required gates.

Prefer reproducible commands that work from the repository root, and commit the relevant lockfile.

---

## 5. Coding Style & Naming Conventions

- Use the formatter and linter selected by the project; do not manually work around their output.
- Use two spaces for JSON, YAML, and JavaScript/TypeScript unless the adopted tool configuration specifies otherwise.
- Use kebab-case for general modules and directories.
- Use PascalCase for UI components.
- Use descriptive test names such as `budget-summary.test.ts`.
- Keep public functions and configuration keys explicit.
- Avoid unexplained abbreviations.
- Prefer focused modules with clear responsibilities.
- Follow existing architectural patterns unless a locked specification explicitly introduces a new pattern.
- Do not create abstractions merely for anticipated future requirements.

---

## 6. Testing Guidelines

Testing is part of the specification-to-implementation contract.

- Add tests with every behavior change.
- Keep unit tests close to the code or in the chosen `tests/` directory.
- Use test names that describe observable expected behavior.
- Include regression coverage for bug fixes.
- Map tests to numbered acceptance criteria where practical.
- Test relevant failure paths and edge cases identified by the specification.
- Run the full verification suite before opening a pull request.
- Record any required coverage threshold once configured.
- Do not alter tests solely to accommodate incorrect implementation behavior.
- If a test conflicts with a locked specification, resolve the discrepancy explicitly rather than silently changing either side.

---

## 7. Commit & Pull Request Guidelines

Use concise, imperative commits and keep unrelated changes separate.

For spec-driven feature work, traceability takes precedence over generic commit naming. Prefer:

`<type>(<scope>): spec-<id> milestone-<n> <description>`

Examples:

- `feat(sync): spec-07 milestone-1 fetch account transactions`
- `test(sync): spec-07 milestone-1 cover duplicate transactions`
- `fix(rules): spec-09 milestone-3 handle unmatched merchant`

Pull requests must:

- Reference the spec ID and milestone(s).
- Explain the implementation.
- Map changes to the numbered acceptance criteria.
- List validation commands and results.
- Link relevant issues.
- Include screenshots or sample output for user-facing changes.
- Identify any approved exclusions or limitations.
- Contain no unrelated scope.

---

## 8. Security & Configuration

This repository handles financial integration code, so security boundaries are mandatory.

- Never commit credentials, bank data, generated secrets, access tokens, refresh tokens, or local environment files.
- Use an ignored `.env` file for local configuration where applicable.
- Provide only safe placeholder values in example configuration files.
- Do not log secrets or sensitive banking payloads.
- Use the minimum permissions required by the approved specification.
- Any change that expands external API permissions or sensitive-data handling must be explicitly defined by a locked specification.
- Security controls may not be weakened to simplify development or testing.

---

## 9. Operational & Architectural Documentation

Operational procedures, deployment controls, acceptance evidence, and extension boundaries are documented in:

- `docs/operations.md`
- `docs/deployment.md`
- `docs/acceptance-report.md`
- `docs/architecture-and-extensibility.md`

Agents must consult the relevant documentation before modifying deployment behavior, operational controls, acceptance evidence, or architectural extension boundaries.

---

## 10. Conflict Resolution & Precedence

When repository instructions conflict, use this precedence:

1. Locked specification for the active feature
2. This engineering constitution and agent-role boundaries
3. Repository architecture and operational documentation
4. Existing implementation conventions
5. Agent assumptions or convenience

A locked specification controls **what** must be built. This constitution controls **how the engineering cycle is governed**. A specification therefore cannot silently authorize an agent to violate its role boundary; such a workflow change requires an explicit update to this constitution.

If a locked spec conflicts with an established repository convention but does not explicitly authorize that architectural change, stop and request clarification from the Spec Architect.

When uncertainty would affect externally observable behavior, financial data, security, persistence, API contracts, or acceptance criteria, do not guess.

---

## 11. Definition of Done

A feature or milestone is complete only when all of the following are true:

1. The governing specification is locked.
2. Implementation is confined to the approved milestone and scope.
3. Every numbered acceptance criterion has corresponding implementation evidence.
4. Required unit, integration, and regression tests exist and pass.
5. `npm run verify` passes.
6. No secrets or sensitive financial data are committed or exposed.
7. Documentation required by the spec has been updated.
8. The QA & Code Reviewer returns `PASS`.
9. The pull request references the exact spec ID and milestone.
10. No unresolved scope creep or spec ambiguity remains.

Only then may the change proceed through the repository's normal merge and deployment process.

---

## Feature Workflow Enforcement

The normal entry point for feature work is the `feature-workflow` skill. Specialist skills remain authoritative for their phase, but contributors and agents should not manually skip lifecycle gates.

Required order:

`requirement → spec/refinement → LOCKED → spec-readiness PASS → sequential milestone implementation/QA → pre-push PASS → push`

Rules:

- A `REVIEW` or `DRAFT` spec cannot enter implementation.
- Human/product decisions that are not resolved by authoritative repository contracts must pause the workflow.
- Milestones are implemented and reviewed sequentially.
- A failed milestone review must be fixed and re-reviewed before later milestones begin.
- A spec change invalidates prior readiness/milestone evidence through spec-hash validation.
- The final pre-push PASS is valid only for the exact reviewed `HEAD`.
- `git push` is blocked by local workflow gates until `READY_TO_PUSH`.
- Never bypass the workflow gate to make progress. Resolve the blocking state instead.
