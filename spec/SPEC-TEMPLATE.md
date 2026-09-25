# 📋 SPEC-[ID]: [Feature Title]

- **Version:** 1.0.0
- **Status:** `DRAFT` | `REVIEW` | `LOCKED`
- **Tracked Issue(s):** #
- **Target Branch:** `feat/spec-[id]-[feature-slug]`

---

## 🎯 1. Executive Summary & Context

Provide a brief, high-level summary of the product goal. Explain the technical problem this feature addresses and define its explicit business value.

---

## 🛑 2. Scope & Boundaries

To prevent scope creep and ensure deterministic implementation loops, explicit architectural boundaries must be stated before work begins.

### 🟩 In-Scope

- [Feature / Component 1]
- [Feature / Component 2]

### 🟥 Out-of-Scope (Exclusions)

- Unrelated refactors or adjacent cleanup side-quests.
- Speculative abstractions for future needs.
- [Explicitly name any feature variants or future enhancements not handled in this loop].

---

## 🛠️ 3. Technical Design & Interface Contracts

The Spec Architect must explicitly define all schemas, module boundaries, type interfaces, and data constraints here.

### 3.1 Data Schemas & TypeScript Interfaces

```typescript
// Define explicit structural schemas here.
export interface MyFeatureContract {
  id: string;
  status: 'pending' | 'success' | 'failed';
}
```

### 3.2 State Transitions & Invariants

- **Initial State:** [Describe entry state]
- **Valid Transitions:** [State A] ➔ [State B]
- **System Invariants:** [Conditions that must always remain true during execution]

---

## ⚡ 4. Failure Modes & Error Behavior

Expected exceptions, validation rules, and boundary configurations must be explicitly defined. Guesswork is strictly prohibited.

- **Validation Rules:** [e.g., Reject payloads where `id` is empty]
- **Expected Errors:** [e.g., Throw `NetworkException` if target endpoint timeouts]
- **Idempotency & Retries:** [e.g., Deduplicate actions via UUID; retry maximum of 3 times]

---

## 🔒 5. Security & Sensitive Data Rules

This repository implements strict financial integrations. Compliance with the following rules is mandatory.

- **Data Exposure:** Sensitive data parameters (credentials, keys, PII) must never be logged or committed.
- **Permissions Check:** External API permission scopes used for this feature must match the absolute minimum required permissions.

---

## 📈 6. Implementation Milestones (Vertical Slices)

Features must be written and delivered sequentially in small, testable milestones.

### 📍 Milestone 1: [Milestone Title]

- **Focus:** [e.g., Core data layer and schema parsing]
- **Target Commit Scope:** `feat(scope): spec-[id] milestone-1 [desc]`

### 📍 Milestone 2: [Milestone Title]

- **Focus:** [e.g., API integration and client interface hooks]
- **Target Commit Scope:** `feat(scope): spec-[id] milestone-2 [desc]`

---

## ✅ 7. Numbered Acceptance Criteria (AC)

Every item below evaluates to a binary **Pass** or **Fail**. Broad or subjective phrases such as "works correctly" are forbidden.

### Milestone 1 Criteria

- **AC-1.1:** Given [Condition], when [Action], then [Expected Quantitative Result].
- **AC-1.2:** [Next clear, testable criteria fragment].

### Milestone 2 Criteria

- **AC-2.1:** Given [Condition], when [Action], then [Expected Quantitative Result].
- **AC-2.2:** [Next clear, testable criteria fragment].

---

## 🧪 8. Testing Verification Checklist

Before submitting a Pull Request for QA review, the Software Engineer must run the required local verification script and compile evidence matching the rules below.

- **Required Verification Suite:** `npm run verify` must execute with zero lint errors, type check errors, or test failures.
- **Coverage Scope:** Unit and integration coverage must map cleanly back to numbered acceptance criteria (AC-1.1, AC-1.2, etc.).
