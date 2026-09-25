# 📋 SPEC-07: Merchant and Category Rules

- **Version:** 1.0.0
- **Status:** `LOCKED`
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

### 3.5 State transitions and invariants

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

- **AC-2.1:** Given a transaction and enabled rules matching description, transaction type, or
  amount predicates, when evaluated, then the result includes the configured category and optional
  budget-item suggestion without changing any provider-owned transaction field.
- **AC-2.2:** Given the same transaction and rule set evaluated twice, when the evaluations complete,
  then the outcome, result, and selected rule ID are identical.
- **AC-2.3:** Given two or more eligible matches, when no single winner is established by the
  documented precedence contract, then the result is `REVIEW_REQUIRED` and no winner is applied.
- **AC-2.4:** Given a merchant cleanup rule, when the display value is produced, then the derived
  merchant value reflects the rule while `Description Raw` remains unchanged and the row identity
  and provider payload hash remain unchanged.
- **AC-2.5:** Given amount values at, below, and above each configured boundary, when evaluated,
  then matching follows the documented inclusive/exclusive amount semantics.

### Milestone 3 Criteria

- **AC-3.1:** Given an automatic classification, when it is written, then the producing `ruleId`
  and classification outcome are retained for audit.
- **AC-3.2:** Given a non-empty user category, budget-item value, note, exclusion, or review decision,
  when classification is re-run or provider data is refreshed, then the user-owned value remains
  unchanged.
- **AC-3.3:** Given conflicting or ambiguous matches, when classification runs, then the transaction
  is routed to review with no silent automatic winner.
- **AC-3.4:** Given a previously classified transaction, when the same rule snapshot is applied
  again, then no duplicate audit record or duplicate transaction row is created.
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
  precedence, tie detection, deterministic serialization, and merchant cleanup.
- **Repository coverage:** Rule persistence, schema migration, formula-injection safety, audit
  provenance, idempotent re-application, and preservation of user-owned fields.
- **Regression coverage:** Re-sync/provider updates preserve user corrections and never rewrite raw
  provider descriptions.
- **Acceptance mapping:** Tests must identify the applicable criteria (`AC-1.x`, `AC-2.x`, or
  `AC-3.x`) in names or nearby comments.

---

## 🔍 9. Resolved Design Decisions

- Rules are user-managed in the `Rules` sheet; row order is not meaningful.
- Text predicates use case-insensitive literal `EXACT` or `CONTAINS` matching after trimming.
- Amount predicates use signed native-currency values with exact two-decimal validation and
  inclusive `BETWEEN` bounds.
- Lower unique numeric priority wins. Equal priorities produce `REVIEW_REQUIRED`.
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
