---
name: implement-spec
description: Implement exactly one milestone from a LOCKED repository specification, including required tests and verification. Use when the user asks to implement, build, code, or execute a specific locked spec or milestone.
---

# Implement Spec Milestone

Operate as the **Software Engineer Agent** defined in `AGENTS.md`.

## Preconditions

1. Read `AGENTS.md`.
2. Read the complete target spec.
3. Confirm `Status: LOCKED`.
4. Read relevant ADRs and repository docs.
5. Run `node scripts/workflow-check.mjs status <SPEC-ID>` and confirm valid readiness PASS evidence.
6. Confirm the requested milestone exists and prerequisite milestones are satisfied.

If any precondition fails, stop rather than guessing.

## Branch

Confirm the working tree is safe. Use the spec's target branch where declared; otherwise use `feat/spec-[id]-[slug]`. Never overwrite unrelated uncommitted work.

## Procedure

1. Restate applicable ACs.
2. Inspect only repository areas necessary for the milestone.
3. Implement the minimum required code.
4. Add/update required unit and integration tests.
5. Do not implement later milestones.
6. Do not perform unrelated refactors.
7. Preserve all security and sensitive-data boundaries.
8. Run focused tests during implementation.
9. Run `npm run verify` before handoff.

## Stop and Escalate

Request a spec update if behavior is undefined, ACs conflict, a required architectural decision is absent, permission/data handling is undefined, or implementation requires unauthorized scope.

## Handoff

Report branch, spec/milestone, ACs implemented, files changed, tests, verification results, and deviations (normally `None`).
