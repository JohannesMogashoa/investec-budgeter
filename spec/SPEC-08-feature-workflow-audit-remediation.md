# 📋 SPEC-08: Feature Workflow Audit Remediation

- **Version:** 1.0.0
- **Status:** `LOCKED`
- **Tracked Issue(s):** Audit remediation requested by repository owner
- **Target Branch:** `feat/spec-08-feature-workflow-audit-remediation`

---

## 🎯 1. Executive Summary & Context

Correct the confirmed lifecycle-enforcement defects identified by the local automated feature-workflow audit. The remediation must make workflow state fail closed, preserve evidence traceability, align deployment triggers with the declared path policy, and restore the repository verification gate.

---

## 🛑 2. Scope & Boundaries

### 🟩 In-Scope

- Strict validation of readiness, milestone, and pre-push evidence records.
- Blocking implementation and pre-push workflow actions when no feature specification is resolvable.
- Requiring valid readiness evidence before implementation workflow actions.
- Applying the declared deployment path policy to staging and production workflows.
- Updating the path policy to name the repository's actual deployment workflow files.
- Fixing workflow-tool lint and formatting failures without weakening quality gates.
- Adding regression tests for the confirmed bypasses and state transitions.

### 🟥 Out-of-Scope (Exclusions)

- Production application behavior under `src/`.
- Deployment execution, GitHub configuration changes, branch-protection rules, or pushes.
- Changes to the unresolved account-identifier finding until data provenance is confirmed.
- New product behavior, new deployment environments, or workflow redesign beyond these corrections.

---

## 🛠️ 3. Technical Design & Interface Contracts

### 3.1 Evidence Contract

Every accepted evidence record must contain the expected evidence `type`, `specId`, current spec hash, `verdict: PASS`, reviewed commit, and the required milestone number for milestone evidence. Invalid, mismatched, or malformed records are stale and cannot advance state.

### 3.2 State Transitions & Invariants

- A code-bearing workflow action cannot proceed without one resolvable active spec.
- A `REVIEW` or `DRAFT` spec cannot advance to implementation.
- A `LOCKED` spec cannot advance to implementation without valid readiness PASS evidence.
- Milestone N cannot be accepted before every declared prior milestone has valid PASS evidence.
- Pre-push PASS is valid only for the exact current clean `HEAD`, current spec hash, and complete milestone evidence.
- Deployment jobs run only for deployment paths declared by `.workflow/path-policy.json`.

---

## ⚡ 4. Failure Modes & Error Behavior

- Missing, malformed, mismatched, or forged evidence is treated as pending and produces a non-zero blocking result for pre-push operations.
- A branch without a resolvable spec fails closed for `ci` and pre-push workflow checks when the check is invoked for feature work.
- Verification failures remain blocking; no quality gate may be weakened or skipped.
- Manual staging dispatch remains available only for the intended staging deployment ref and must still use deployment paths/verification.

---

## 🔒 5. Security & Sensitive Data Rules

No credentials, tokens, or financial payloads may be added to source, fixtures, logs, or workflow evidence. Existing uncertain financial examples are out of scope for this remediation.

---

## 📈 6. Implementation Milestones (Vertical Slices)

### 📍 Milestone 1: Deterministic evidence and lifecycle gates

- **Focus:** Harden evidence validation, fail closed for no-spec workflow checks, require readiness before implementation workflow actions, and add regression coverage.
- **Target Commit Scope:** `fix(workflow): spec-08 milestone-1 enforce lifecycle evidence`

### 📍 Milestone 2: Deployment policy and repository verification

- **Focus:** Align deployment workflow paths with the central policy and fix workflow-tool lint/format errors without weakening checks.
- **Target Commit Scope:** `fix(workflow): spec-08 milestone-2 align deployment gates`

---

## ✅ 7. Numbered Acceptance Criteria (AC)

### Milestone 1 Criteria

- **AC-1.1:** Given a milestone evidence file with the wrong type, spec ID, milestone number, verdict, hash, or commit field, when workflow status is evaluated, then that milestone is reported pending and pre-push is not ready.
- **AC-1.2:** Given a branch or CI invocation with no resolvable feature spec, when `workflow-check.mjs ci` or `workflow-check.mjs prepush` is run for feature work, then it exits non-zero with an actionable blocking message.
- **AC-1.3:** Given a `LOCKED` spec without valid readiness PASS evidence, when implementation workflow preconditions are evaluated, then implementation is blocked and readiness is the next action.
- **AC-1.4:** Given valid readiness, milestone, and pre-push evidence, when the evidence or current spec/HEAD is altered, then the stale state is rejected.

### Milestone 2 Criteria

- **AC-2.1:** Given a change outside the deployment path set, when a push targets `staging` or `master`, then the corresponding deployment workflow does not trigger automatically.
- **AC-2.2:** Given a deployment workflow file change, when path policy is evaluated, then the actual `staging.yml` and `production.yml` workflow files are covered by the declared deployment policy.
- **AC-2.3:** Given the repository workflow tooling, when `npm run verify` runs, then formatting, lint, typecheck, tests, build, and bundle validation all execute without failure caused by the workflow remediation files.

---

## 🧪 8. Testing Verification Checklist

- Temporary isolated repositories must cover review-state blocking, missing readiness, milestone ordering, evidence forgery, spec invalidation, HEAD invalidation, and no-spec branch blocking.
- Workflow YAML must parse locally.
- `npm run verify` must pass.
- No deployment command or push may be executed.
