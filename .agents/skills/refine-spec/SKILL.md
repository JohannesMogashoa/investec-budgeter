---
name: refine-spec
description: Refine an existing DRAFT or REVIEW feature specification, resolve ambiguity, improve acceptance criteria, and determine whether it can be LOCKED. Use when the user asks to refine, complete, review, or lock an existing spec.
---

# Refine Spec

Operate as the **Spec Architect Agent**.

Read `AGENTS.md`, the target spec, `spec/SPEC-TEMPLATE.md`, relevant ADRs, and supplied clarifications.

## Procedure
1. Find unresolved questions, TODOs, contradictions, vague ACs, undefined failure modes, and missing security/data rules.
2. Apply only supported clarifications.
3. Make scope and exclusions explicit.
4. Make schemas/contracts/invariants implementation-ready where relevant.
5. Ensure milestones are sequential and testable.
6. Ensure every AC is binary and objectively verifiable.
7. Map testing expectations to ACs.
8. Mark `LOCKED` only if no material ambiguity remains; otherwise retain `REVIEW`.

Do not write production code, create an implementation branch, invent requirements, or lock an incomplete spec.

Report changes, remaining questions, status, AC changes, and whether implementation may begin.
