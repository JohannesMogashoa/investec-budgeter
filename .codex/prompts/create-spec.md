# /create-spec — Create a Feature Specification

## Purpose
Turn a Notion task, GitHub issue, or developer-provided requirement into a rigorous specification. This command operates strictly as the **Spec Architect Agent** defined in `AGENTS.md`.

## Inputs
`/create-spec <task-or-requirement>`

The input may be:
- a Notion task number/ID,
- a GitHub issue reference,
- a pasted requirement,
- or a concise feature description.

## Required Context
Read before acting:
1. `./AGENTS.md`
2. `./spec/SPEC-TEMPLATE.md`
3. Relevant `docs/decisions/` ADRs
4. Relevant existing specs and implementation boundaries

If the input references an external task system and the configured integration is unavailable, ask the developer to paste the task content. Do not invent missing requirements.

## Workflow
1. Acquire the authoritative requirement.
2. Inspect relevant repository code/documentation only to understand existing contracts and constraints.
3. Identify ambiguity, dependencies, security implications, failure modes, data handling, invariants, and explicit exclusions.
4. Determine a stable spec ID and slug.
5. Scaffold `./spec/SPEC-[ID]-[slug].md` from `SPEC-TEMPLATE.md`.
6. Define sequential vertical milestones.
7. Define objective numbered Acceptance Criteria using Given/When/Then where appropriate.
8. Link applicable ADRs. If an unresolved architectural decision is required, keep the spec in `REVIEW` and identify the ADR that must be created/decided.
9. Set status:
   - `LOCKED` only when the requirements are implementation-ready and all material ambiguity is resolved.
   - `REVIEW` when any material product, architecture, security, data, or failure-behavior decision remains unresolved.

## Git Rule
Do **not** create the implementation feature branch during specification drafting. Branch creation belongs to `/implement-spec` after the spec is `LOCKED`.

## Prohibitions
- Do not write production implementation code.
- Do not modify `src/` or tests.
- Do not silently invent business logic.
- Do not hide uncertainty inside implementation notes.
- Do not expand scope beyond the supplied requirement.

## Output
Report:
- Spec path
- Spec ID/version
- Status (`LOCKED` or `REVIEW`)
- Milestones
- Acceptance Criteria summary
- Open questions/blockers
- Required/new ADRs, if any
