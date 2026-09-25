# 📋 SPEC-07: Merchant and Category Rules

- **Version:** 1.1.0
- **Status:** `REVIEW`
- **Tracked Issue(s):** #7 — [Phase 3] Implement merchant and category rules
- **Target Branch:** `feat/spec-07-merchant-category-rules`

---

## 🎯 1. Executive Summary & Context

Phase 2 provides a faithful, idempotent transaction ledger. This feature adds an explainable,
user-managed reconciliation layer that can clean merchant display text, classify transactions,
and suggest an optional budget-line allocation without changing the provider record.

The feature must make every automatic result reproducible and auditable. A user correction remains
authoritative when a later sync, rule edit, or rule re-run processes the same transaction.

The governing requirement is GitHub issue #7. Its acceptance criteria are expanded below into
testable contracts and ordered milestones.

---

## 🛑 2. Scope & Boundaries

### 🟩 In-Scope

- A user-managed workbook representation for merchant/category rules.
- Matching against provider description, transaction type, and amount patterns.
- Deterministic rule precedence and conflict detection.
- Assignment of a category and optional budget-item suggestion.
- Lossless merchant display cleanup while retaining `Description Raw` unchanged.
- Rule provenance and audit state for each automatic classification.
- A review state for conflicting or ambiguous matches.
- Preservation of user corrections and provider-owned transaction fields.
- Unit, repository, and integration tests mapped to the acceptance criteria.

### 🟥 Out-of-Scope (Exclusions)

- Changes to Investec authentication, transaction identity, sync windows, or provider DTOs.
- AI/ML classification, external merchant databases, or network calls during matching.
- Automatic creation, deletion, or renaming of user categories or budget items.
- Payments, transfers, write access to Investec, or budget forecasting.
- Rewriting `Description Raw`, `Reference Raw`, or any provider-owned transaction column.
- Applying rules to rows outside the selected workbook or to transactions that do not exist in the
  ledger.
- Unrelated workbook redesigns, legacy-template cleanup, or opportunistic refactoring.

---

## 🛠️ 3. Technical Design & Interface Contracts

### 3.1 Existing ownership boundary

The `Transactions` sheet remains the source ledger. Existing provider-owned columns are immutable
to this feature. Existing user-owned columns remain authoritative:

- `Category`
- `Budget Item ID`
- `Review Status`
- `User Note`
- `Excluded`

Automatic output is represented separately from the user decision. Rules never write automatic
values into `Category` or `Budget Item ID`; they write suggestions to the classification audit
model. The user may manually accept, edit, or ignore those suggestions.

### 3.2 Rule contract

Rules are stored in a user-editable `Rules` sheet. The exact columns, in order, are:

`Rule ID`, `Enabled`, `Priority`, `Description Match`, `Description Match Type`,
`Transaction Type Match`, `Transaction Type Match Type`, `Amount Operator`, `Amount Value`,
`Amount Value 2`, `Merchant Display`, `Category`, `Budget Item ID`.

The rule model is:

```typescript
export type TextMatchKind = 'EXACT' | 'CONTAINS';
export type AmountOperator =
  'EQUALS' | 'GREATER_THAN' | 'GREATER_OR_EQUAL' | 'LESS_THAN' | 'LESS_OR_EQUAL' | 'BETWEEN';

export interface MerchantCategoryRule {
  readonly ruleId: string;
  readonly enabled: boolean;
  readonly priority: number;
  readonly descriptionMatch?: string;
  readonly descriptionMatchType?: TextMatchKind;
  readonly transactionTypeMatch?: string;
  readonly transactionTypeMatchType?: TextMatchKind;
  readonly amountOperator?: AmountOperator;
  readonly amountValue?: number;
  readonly amountValue2?: number;
  readonly merchantDisplay?: string;
  readonly category: string;
  readonly budgetItemId?: string;
}
```

Required contract invariants:

- `ruleId` is non-empty and unique within the workbook.
- An enabled rule has at least one matching predicate and a non-empty category result.
- Enabled priorities are positive integers and unique among enabled rules.
- Text matching supports only `EXACT` and `CONTAINS`, is case-insensitive, and trims comparison
  whitespace. Text patterns are literal strings; regular expressions and spreadsheet wildcards are
  not supported.
- Amount matching uses the signed transaction amount, exact two-decimal values, and the configured
  operator. `BETWEEN` uses inclusive lower and upper bounds and requires `Amount Value 2`.
- Amount matching does not convert currencies; a rule is evaluated against the transaction's native
  currency.
- A blank optional budget-item result is distinct from an explicitly configured value.
- Invalid patterns, operators, values, and enabled rules are rejected before matching.
- Matching is deterministic for the same rule set and transaction snapshot.
- Rule evaluation uses normalized comparison inputs derived from provider fields but never changes
  the provider fields themselves.

All `Rules` columns are user-owned and editable, with the header row protected by workbook setup.
Rules are read by stable header name; sheet row order has no semantic meaning. A missing `Rules`
sheet is created during forward-only workbook migration without changing existing transaction rows.

### 3.3 Classification and audit contract

```typescript
export type ClassificationOutcome = 'APPLIED' | 'REVIEW_REQUIRED' | 'NO_MATCH';

export interface ClassificationResult {
  readonly transactionRowKey: string;
  readonly ruleSetVersion: string;
  readonly outcome: ClassificationOutcome;
  readonly matchedRuleId?: string;
  readonly candidateRuleIds?: readonly string[];
  readonly suggestedCategory?: string;
  readonly suggestedBudgetItemId?: string;
  readonly merchantDisplay?: string;
  readonly reason?: 'CONFLICTING_RULES' | 'AMBIGUOUS_MATCH' | 'INVALID_RULE_SET';
}
```

Results are stored in a `Classification Audit` sheet with these exact columns:

`Audit Key`, `Transaction Row Key`, `Rule Set Version`, `Evaluated UTC`, `Outcome`,
`Matched Rule ID`, `Candidate Rule IDs`, `Suggested Category`, `Suggested Budget Item ID`,
`Merchant Display`, `Reason`.

The audit sheet is system-owned and append-preserving across rule-set versions. There is at most
one row for a given `Audit Key`, where `Audit Key` is derived from transaction row key and rule-set
version. Re-running an unchanged rule set updates that row rather than appending a duplicate.
`Candidate Rule IDs` is a deterministic, delimiter-safe serialization of sorted candidate IDs.

### 3.4 Merchant display contract

Merchant cleanup operates on a derived display value only. It may normalize text according to the
locked rule syntax, but:

- `Description Raw` remains byte-for-byte/text-for-text unchanged.
- The display value is not used as transaction identity.
- The display value is not included in the provider payload hash.
- A rule edit can change a display value without changing the ledger identity or provider data.

### 3.5 Pure matcher boundary and preservation contract

Milestone 2 matching is a pure operation over an immutable transaction snapshot. The snapshot
must contain the following fields:

```typescript
export interface RuleEvaluationInput {
  readonly transactionRowKey: string;
  readonly descriptionRaw: string;
  readonly transactionType: string;
  readonly amount: number;
  readonly currency: string;
  readonly identityVersion: string;
  readonly providerPayloadHash: string;
}
```

The matcher receives the rule-set version supplied by the caller and returns a
`ClassificationResult`. It must copy `transactionRowKey` into the result, use `descriptionRaw`,
`transactionType`, and signed native-currency `amount` as comparison inputs, and never mutate or
rewrite the input snapshot. `currency`, `identityVersion`, and `providerPayloadHash` are
preservation sentinels, not matching predicates. Any workbook application must write only the
derived classification/audit result and must verify that those sentinel values and
`Description Raw` remain unchanged; only `transactionRowKey` is copied into the
`ClassificationResult`.

The exact predicate composition, duplicate-priority policy, rule-set-version derivation, audit-key
derivation, candidate serialization, and transaction amount precision policy remain unresolved;
see Section 3.6. No implementation may choose a value for those items until the corresponding
decision is recorded.

### 3.6 Open decisions requiring developer/product clarification

The following findings were traced against the existing requirements and ADRs. No authoritative
source resolves them, so they remain explicit blockers for returning this specification to
`LOCKED`.

#### D1 — Predicate composition

The rule contract defines independent description, transaction-type, and amount predicates, but
does not state whether multiple configured predicates are combined with logical AND or logical OR.
AC-2.1 and the matcher contract are blocked until the product/developer chooses the composition
policy. The choice must also define how a rule with only one configured predicate behaves and how
blank optional predicates are ignored.

#### D2 — Priority conflict policy

The existing invariant and validation behavior require enabled priorities to be unique, while the
precedence and AC-2.3 requirements require equal-priority matches to produce `REVIEW_REQUIRED`.
ADR-004 repeats both concepts without resolving the conflict. The product/developer must choose
one of these policies:

- permit duplicate enabled priorities and route equal-priority eligible matches to review; or
- reject duplicate enabled priorities and define a different valid-rule conflict condition.

AC-2.3 and the priority validation requirements remain blocked until this choice is recorded.

#### D3 — Rule Set Version derivation

The classification contract requires a deterministic `ruleSetVersion`, but no existing ADR or
contract defines its canonical input fields, ordering, normalization, hash/encoding, or treatment
of disabled rules. The product/developer must approve the derivation before AC-3.1 and AC-3.4 can
be objectively implemented.

#### D4 — Audit Key derivation

The audit contract says that `Audit Key` is derived from transaction row key and rule-set version,
but does not define the exact serialization, delimiter/escaping, or hash/encoding. The
product/developer must approve the derivation before idempotent audit behavior in AC-3.4 can be
verified.

#### D5 — Candidate Rule IDs serialization

The contract requires deterministic, delimiter-safe serialization of sorted candidate IDs, but
does not define the delimiter, escaping/encoding, empty-value representation, or round-trip
behavior. The product/developer must approve this representation before audit provenance in AC-3.1
and AC-3.3 can be verified.

#### D6 — Transaction amount precision

The current contract validates configured rule values to two decimal places, but does not state
what happens when a provider transaction amount has more than two decimal places. ADR-002 defines
minor-unit conversion for identity, not classification matching. The product/developer must
choose whether matching rejects, rounds, truncates, or otherwise normalizes such transaction
amounts. AC-2.5 remains blocked until this policy is recorded.

### 3.7 State transitions and invariants

- **Initial state:** A transaction has no rule result, or has an existing user correction.
- **Valid transitions:** `NO_MATCH → APPLIED`, `NO_MATCH → REVIEW_REQUIRED`,
  `APPLIED → APPLIED`, `APPLIED → REVIEW_REQUIRED`, and `APPLIED → NO_MATCH` after a rule-set
  change, subject to preserving user-owned corrections.
- **User authority:** A non-empty user category/budget-item correction is never replaced by an
  automatic result. Automatic values are suggestions in the audit sheet only.
- **Provider immutability:** Rule evaluation never changes provider-owned transaction columns,
  `Row Key`, `Identity Version`, or `Provider Payload Hash`.
- **Determinism:** Equal transaction inputs plus equal enabled rules yield equal outcome, result,
  and provenance.
- **Review safety:** More than one equally eligible rule, invalid rule configuration, or an
  unresolved precedence tie cannot silently select a winner.

---

## ⚡ 4. Failure Modes & Error Behavior

- **Validation rules:** Reject empty rule IDs, duplicate rule IDs, empty categories, unsupported
  text match kinds, unsupported amount operators, non-finite values, values with more than two
  decimal places, invalid `BETWEEN` bounds, rules with no predicates, and non-positive or duplicate
  enabled priorities.
- **Invalid rule set:** Do not apply partially parsed rules. Keep the prior valid result, mark the
  run as a safe configuration failure, and expose a redacted review reason.
- **Conflicting matches:** If precedence cannot produce one unambiguous winner, emit
  `REVIEW_REQUIRED` with the candidate rule IDs in an auditable, non-sensitive form. Do not choose
  based on sheet row order, import time, or object iteration order.
- **No match:** Leave the user-owned fields unchanged and record `NO_MATCH` if the feature’s audit
  model requires an explicit outcome.
- **Rule removal/disablement:** Re-evaluate affected transactions. Clear active suggestions by
  recording a new `NO_MATCH` result for the new rule-set version, while retaining prior audit rows.
  Never erase user corrections or provider data.
- **Idempotency:** Re-running the same transaction and rule snapshot produces no duplicate rule
  rows, duplicate audit rows, or provider changes.
- **Concurrency:** Rule application must use the repository’s existing workbook write boundary and
  must not overlap a transaction sync in a way that can lose user edits.

---

## 🔒 5. Security & Sensitive Data Rules

- Rule text and merchant descriptions may contain sensitive financial context; do not log raw
  descriptions, references, account identifiers, or complete transaction payloads.
- Logs may include run IDs, rule IDs, counts, outcome codes, and safe hashes where required for
  diagnosis.
- Rules execute locally within the existing Apps Script workbook boundary; no external matching
  service or new API permission is allowed.
- Rule patterns must not be evaluated as spreadsheet formulas. All persisted and displayed text must
  use the repository’s literal-text/formula-injection protections.

---

## 📈 6. Implementation Milestones (Vertical Slices)

### 📍 Milestone 1: Rule storage, validation, and workbook contract

- **Focus:** Define the rule schema, migration/protection behavior, repository interface, validation
  errors, and sanitized fixtures.
- **Target Commit Scope:** `feat(rules): spec-07 milestone-1 add merchant rule contract`
- **Exit condition:** A valid rule set can be read deterministically; invalid rules are rejected
  without changing transactions.

### 📍 Milestone 2: Deterministic matcher and lossless merchant cleanup

- **Focus:** Implement pure matching/precedence logic and derived merchant display behavior.
- **Target Commit Scope:** `feat(rules): spec-07 milestone-2 match merchant category rules`
- **Exit condition:** Matching, ties, no-match cases, amount boundaries, and raw-description
  preservation are covered by tests.

### 📍 Milestone 3: Classification application, provenance, and review

- **Focus:** Apply results to the workbook while preserving user authority, recording rule IDs, and
  routing ambiguity to review.
- **Target Commit Scope:** `feat(rules): spec-07 milestone-3 apply auditable classifications`
- **Exit condition:** Repeated application is idempotent; provider fields and user corrections are
  unchanged; every automatic result is explainable.

---

## ✅ 7. Numbered Acceptance Criteria (AC)

### Milestone 1 Criteria

- **AC-1.1:** Given a rule with valid predicates and outputs, when it is persisted and read back,
  then all logical fields, enabled state, and precedence are preserved exactly.
- **AC-1.2:** Given duplicate IDs, empty categories, rules with no predicates, or malformed pattern
  syntax, when the rule set is validated, then the invalid rule set is rejected and no transaction
  row is changed.
- **AC-1.3:** Given a workbook migration, when the new rule/classification schema is installed,
  then existing transaction rows and all existing user-owned values remain unchanged.

### Milestone 2 Criteria

- **AC-2.1 [BLOCKED — D1]:** Given a transaction snapshot and enabled rules with description,
  transaction-type, and/or amount predicates, when evaluated under the resolved predicate
  composition policy, then the result includes the configured category and optional budget-item
  suggestion without changing any provider-owned transaction field.
- **AC-2.2:** Given the same transaction and rule set evaluated twice, when the evaluations complete,
  then the outcome, result, and selected rule ID are identical.
- **AC-2.3 [BLOCKED — D2]:** Given two or more eligible matches, when no single winner is
  established by the resolved precedence and conflict policy, then the result is
  `REVIEW_REQUIRED` and no winner is applied.
- **AC-2.4:** Given a `RuleEvaluationInput` containing `Description Raw`, `Row Key`, `Identity
Version`, and `Provider Payload Hash`, when a merchant cleanup rule produces a display value,
  then the derived merchant value reflects the rule, the input snapshot remains unchanged, and
  the result preserves the row key while the provider identity/hash sentinels remain unchanged in
  the input snapshot.
- **AC-2.5 [BLOCKED — D6]:** Given amount values at, below, and above each configured boundary,
  when evaluated under the resolved transaction amount precision policy, then matching follows the
  documented inclusive/exclusive amount semantics.

### Milestone 3 Criteria

- **AC-3.1 [BLOCKED — D3, D5]:** Given an automatic classification, when it is written, then the
  producing `ruleId`, classification outcome, resolved rule-set version, and deterministic
  candidate serialization are retained for audit.
- **AC-3.2:** Given a non-empty user category, budget-item value, note, exclusion, or review decision,
  when classification is re-run or provider data is refreshed, then the user-owned value remains
  unchanged.
- **AC-3.3:** Given conflicting or ambiguous matches, when classification runs, then the transaction
  is routed to review with no silent automatic winner.
- **AC-3.4 [BLOCKED — D3, D4]:** Given a previously classified transaction, when the same resolved
  rule snapshot is applied again, then the derived audit key addresses the existing audit row and
  no duplicate audit record or duplicate transaction row is created.
- **AC-3.5:** Given any classification run, when it completes, then provider-owned fields including
  `Description Raw`, `Reference Raw`, amount, dates, status, identity, and payload hash are equal
  before and after the run.
- **AC-3.6:** Given a disabled or deleted rule, when the rule set is applied, then provider data and
  user corrections remain intact and the handling of any prior automatic result follows the locked
  rule-retirement policy.

---

## 🧪 8. Testing Verification Checklist

- **Required Verification Suite:** `npm run verify` must pass with zero lint, typecheck, format,
  build, or test failures.
- **Unit coverage:** Rule validation, exact/contains matching, amount boundaries,
  precedence, tie detection, matcher snapshot preservation, deterministic serialization, and
  merchant cleanup. Tests must cover the resolved policies for D1, D2, and D6 before the related
  acceptance criteria are unblocked.
- **Repository coverage:** Rule persistence, schema migration, formula-injection safety, audit
  provenance, idempotent re-application, and preservation of user-owned fields.
- **Regression coverage:** Re-sync/provider updates preserve user corrections and never rewrite raw
  provider descriptions.
- **Acceptance mapping:** Tests must identify the applicable criteria (`AC-1.x`, `AC-2.x`, or
  `AC-3.x`) in names or nearby comments. Tests for rule-set versions, audit keys, and candidate
  serialization must use the resolved D3-D5 algorithms before AC-3.1, AC-3.3, and AC-3.4 are
  unblocked.

---

## 🔍 9. Resolved Design Decisions

- Rules are user-managed in the `Rules` sheet; row order is not meaningful.
- Text predicates use case-insensitive literal `EXACT` or `CONTAINS` matching after trimming.
- Amount predicates use signed native-currency values with exact two-decimal validation and
  inclusive `BETWEEN` bounds.
- Lower numeric priority wins; the duplicate-priority conflict policy is unresolved under D2.
- Automatic category and budget-item values are suggestions in `Classification Audit`; existing
  user-owned transaction fields remain authoritative.
- Classification audit history is retained by rule-set version, with one idempotent row per
  transaction/rule-set pair.
- Disabled or deleted rules produce a new `NO_MATCH` result after re-evaluation; previous audit
  versions remain available.
- Merchant cleanup is rule-driven only. Without a matching cleanup rule, the display fallback is
  exactly `Description Raw`.

---

## 🧭 10. Applicable Repository Decisions

- **ADR-001 — Phase 2 Runtime Boundary:** Keep the feature inside the container-bound Apps Script
  and existing Sheets repository boundary; do not add external permissions or a backend path.
- **ADR-002 — Transaction Identity v1:** Classification and merchant display values must not alter
  identity inputs, aliases, or the provider payload hash.
- **ADR-003 — Near-Real-Time Transaction Sync:** Manual/live sync remains the ingestion path; rule
  evaluation must preserve its locking, idempotency, and current-cycle projection boundaries.
- **ADR-004 — Merchant and Category Rule Storage:** Rules and classification audit data remain
  inside the workbook while user decisions remain separate from automatic suggestions.

---

## 🧭 11. Refinement Disposition — Version 1.1.0

| Review finding                                      | Existing authoritative basis                                                                          | Disposition                                                                                    |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| AC-2.3 conflicts with unique enabled priorities     | Rule invariant and validation requirements; ADR-004 precedence decision; AC-2.3 review requirement    | Not resolved. Requires D2 developer/product clarification.                                     |
| Predicate composition undefined                     | Rule schema and matching scope define predicates but do not define composition                        | Not resolved. Requires D1 developer/product clarification.                                     |
| Matcher input/output contract undefined             | `ClassificationResult`, provider immutability, ADR-002 identity rules, and ADR-004 ownership boundary | Resolved by the pure `RuleEvaluationInput` and `ClassificationResult` boundary in Section 3.5. |
| Row identity and payload hash propagation undefined | ADR-002 and the provider immutability invariant require preservation                                  | Resolved by making identity/hash preservation sentinels explicit in Section 3.5 and AC-2.4.    |
| Rule Set Version derivation undefined               | Classification contract requires the field but no derivation authority exists                         | Not resolved. Requires D3 developer/product clarification.                                     |
| Audit Key derivation undefined                      | Audit contract only states the source fields, not canonical encoding                                  | Not resolved. Requires D4 developer/product clarification.                                     |
| Candidate Rule IDs serialization undefined          | Audit contract requires deterministic delimiter-safe output but gives no encoding                     | Not resolved. Requires D5 developer/product clarification.                                     |
| Amount precision beyond two decimals undefined      | Two-decimal rule validation exists; ADR-002 only defines identity precision                           | Not resolved. Requires D6 developer/product clarification.                                     |

The specification remains `REVIEW`. Implementation may not begin for acceptance criteria marked
`BLOCKED` until the corresponding decision is recorded. D2-D5 may require a new ADR because they
affect precedence or persisted classification/audit data contracts; no new ADR is created while
the underlying product decisions remain unresolved.
