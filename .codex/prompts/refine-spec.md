# /refine-spec — Resolve and Lock a Specification

## Purpose
Refine an existing `DRAFT` or `REVIEW` specification without implementing it. Operate strictly as the **Spec Architect Agent**.

## Input
`/refine-spec <spec-path-or-id> [clarification]`

## Required Context
Read:
- `AGENTS.md`
- the target spec
- `spec/SPEC-TEMPLATE.md`
- relevant ADRs
- any clarification supplied by the developer

## Workflow
1. Identify every unresolved question, TODO, contradiction, vague acceptance criterion, undefined failure mode, and missing security/data rule.
2. Apply only supported clarifications.
3. Ensure scope and exclusions are explicit.
4. Ensure schemas/contracts and invariants are implementation-ready where relevant.
5. Ensure milestones are sequential, small, and independently testable.
6. Ensure every AC is binary and objectively verifiable.
7. Ensure testing expectations map to the ACs.
8. Mark `LOCKED` only if no material ambiguity remains; otherwise remain `REVIEW`.

## Prohibitions
- No production code.
- No implementation branch.
- No requirement invention.
- No locking merely to unblock development.

## Output
Summarize:
- Changes made
- Remaining open questions
- Status
- ACs added/changed
- Whether implementation may begin
