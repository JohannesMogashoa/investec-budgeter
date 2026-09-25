# /implement-spec — Implement a Locked Spec Milestone

## Purpose
Implement exactly one approved milestone from a `LOCKED` specification. Operate strictly as the **Software Engineer Agent**.

## Input
`/implement-spec <spec-path-or-id> <milestone>`

## Preconditions
1. Read `AGENTS.md`.
2. Read the complete target spec.
3. Confirm `Status: LOCKED`.
4. Read relevant ADRs and repository documentation.
5. Confirm the requested milestone exists and preceding required milestones are satisfied.

If any precondition fails, stop. Do not guess.

## Branching
Before implementation:
- Confirm the current working tree is safe.
- Use the target branch declared by the spec where present, otherwise use `feat/spec-[id]-[slug]`.
- Never overwrite unrelated uncommitted developer work.
- Do not create a second implementation branch if already on the correct branch.

## Implementation
1. Restate the milestone's applicable ACs.
2. Inspect only the repository areas needed for those ACs.
3. Implement the minimum code required.
4. Add/update unit and integration tests required by the spec.
5. Do not implement later milestones.
6. Do not perform unrelated refactors.
7. Preserve security and sensitive-data boundaries.
8. Run focused tests during development.
9. Run `npm run verify` before handoff.

## Stop Conditions
Stop and request a spec update if:
- behavior is undefined,
- an AC contradicts another requirement,
- an architectural decision is missing,
- required permission/data handling is undefined,
- implementation requires scope not authorized by the spec.

## Handoff
Report:
- Branch
- Spec + milestone
- ACs implemented
- Files changed
- Tests added/updated
- Verification commands/results
- Deviations: must be `None` unless explicitly approved by the spec
