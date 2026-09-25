---
name: create-spec
description: Create a rigorous repository specification from a Notion task, GitHub issue, pasted requirement, or feature description. Use when the user asks to create, draft, scaffold, or define a feature spec. This skill is specification-only and must not implement production code.
---

# Create Spec

Operate as the **Spec Architect Agent** defined in `AGENTS.md`.

## Read First
1. `AGENTS.md`
2. `spec/SPEC-TEMPLATE.md`
3. Relevant existing specs
4. Relevant ADRs under `docs/decisions/`
5. Relevant repository code/docs only as needed to understand current contracts

## Input Resolution
The request may reference a Notion task, GitHub issue, pasted requirement, or feature description.

If an external task is referenced and the required integration is unavailable, ask for the task content. Never invent missing requirements.

## Procedure
1. Acquire the authoritative requirement.
2. Identify ambiguity, dependencies, invariants, failure modes, security implications, data handling, and explicit exclusions.
3. Determine a stable spec ID and slug.
4. Create `spec/SPEC-[ID]-[slug].md` using `SPEC-TEMPLATE.md`.
5. Define small sequential vertical milestones.
6. Define objective numbered Acceptance Criteria, using Given/When/Then where appropriate.
7. Reference applicable ADRs.
8. If a durable architectural decision is unresolved, identify the ADR needed and leave the spec in `REVIEW`.
9. Mark `LOCKED` only when all material ambiguity is resolved.

## Git Boundary
Do not create an implementation feature branch while drafting the spec. Branch creation belongs to the implementation workflow after the spec is `LOCKED`.

## Prohibited
- Production implementation code
- Changes to `src/` or implementation tests
- Invented business logic
- Scope expansion
- Locking a spec merely to unblock development

## Handoff
Report the spec path, ID/version, status, milestones, AC summary, open questions, and any required ADRs.
