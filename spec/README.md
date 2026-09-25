# Specification System

`spec/` is the durable source of truth for feature behavior.

## Canonical Template
All feature specifications are created from `SPEC-TEMPLATE.md`.

## Naming
Use:

`SPEC-[ID]-[feature-slug].md`

Example:

`SPEC-INV-17-transaction-sync.md`

## Specification Status
Specifications use only these requirement-maturity states:

- `DRAFT` — early specification work.
- `REVIEW` — materially defined but unresolved decisions remain.
- `LOCKED` — implementation-ready; material ambiguity has been resolved.

Implementation progress does **not** belong in the spec status. Track implementation state in GitHub/Notion.

## Lifecycle

```text
Requirement
    ↓
DRAFT
    ↓
REVIEW
    ↓
LOCKED
    ↓
Implementation branch
    ↓
QA review
    ↓
Merge
```

A locked spec may be revised, but the revision must be explicit. Never silently change a locked requirement to match an implementation.

## Ownership
The Spec Architect owns specifications. The Software Engineer consumes locked specifications. QA verifies implementation against them.

## Architecture Decisions
Specs describe **what must be built**. Architectural decisions explaining **why a durable technical choice was made** belong in `docs/decisions/` as ADRs.

## Archive
Move superseded specs to `spec/archive/` only when their historical context is no longer required in the active spec set. Preserve traceability to issues/PRs.
