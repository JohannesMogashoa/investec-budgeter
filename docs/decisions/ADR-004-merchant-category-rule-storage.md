# ADR-004: Merchant and Category Rule Storage

- **Status:** Accepted
- **Date:** 2026-09-25
- **Decision Owners:** Spec Architect / Software Engineer / QA Reviewer
- **Related Specs:** SPEC-07
- **Supersedes:** N/A

## Context

Phase 3 needs deterministic, explainable merchant and category classification while the Phase 2
Transactions sheet remains a faithful provider ledger. The existing transaction fields `Category`,
`Budget Item ID`, and `Review Status` are user-owned and must not be overwritten by synchronization
or automatic classification.

## Decision Drivers

- Preserve provider and user-owned data boundaries.
- Keep rules editable by the workbook owner without external services.
- Make outcomes reproducible and auditable across rule changes.
- Retain compatibility with the Apps Script and Sheets runtime boundary.

## Options Considered

### Option A — Write automatic values into transaction user fields

**Description:** Populate `Category` and `Budget Item ID` directly when they are blank.

**Advantages**

- Minimal additional schema.

**Drawbacks**

- Cannot reliably distinguish automatic values from user corrections.
- Risks violating the user-owned field contract during re-evaluation.

### Option B — Separate rules and classification audit sheets

**Description:** Store editable rules in `Rules` and automatic results in an append-preserving
`Classification Audit` sheet. User-owned transaction fields remain the final decision surface.

**Advantages**

- Preserves user authority and provider immutability.
- Records producing rule IDs and rule-set versions.
- Supports deterministic re-evaluation and historical comparison.

**Drawbacks**

- Adds workbook schema and migration work.
- Requires a later user workflow to accept suggestions explicitly.

## Decision

Choose Option B. The `Rules` sheet is user-owned and editable; its header row is protected and its
rows are validated before use. The `Classification Audit` sheet is system-owned and preserves one
idempotent result per transaction row key and rule-set version. Automatic category and budget-item
values are suggestions only. The existing user-owned transaction fields remain authoritative and
are never overwritten by rule evaluation or transaction synchronization.

Rule matching is local and deterministic. Text predicates use case-insensitive literal exact or
contains matching after trimming. Amount predicates use signed native-currency values with exact
two-decimal validation. Lower unique numeric priority wins; equal priorities require review.

## Consequences

### Positive

- Raw provider descriptions, identities, payload hashes, and user corrections remain stable.
- Every automatic result can be traced to a rule and rule-set version.
- Rule changes can be replayed without duplicate audit rows.

### Negative / Trade-offs

- Workbook setup and migration must add two sheets.
- A separate user action is required to turn a suggestion into a final category or budget item.

### Risks

- Large audit history may increase workbook size over time.
- User edits to malformed rules must be surfaced clearly without partially applying the rule set.

## Security & Data Impact

Rules and audit results remain inside the existing workbook boundary. Raw descriptions, references,
account identifiers, and complete financial payloads must not be logged. All text writes use the
existing literal-text protections against spreadsheet formula injection.

## Operational Impact

Workbook setup performs a forward-only migration. Re-evaluation is idempotent by transaction row
key plus rule-set version. Disabling or deleting a rule creates a new `NO_MATCH` result while prior
audit versions remain retained.

## Validation

Implementation must verify schema migration, deterministic rule reads, validation failures,
formula-injection safety, audit idempotency, and preservation of provider and user-owned fields.

## Revisit Conditions

- A future product requirement needs automatic values to become the transaction source of truth.
- Workbook size or audit history requires a durable backend.
- Multi-user access or external rule sharing is introduced.
