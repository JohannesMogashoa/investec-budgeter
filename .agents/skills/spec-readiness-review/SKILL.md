---
name: spec-readiness-review
description: Perform a read-only adversarial implementation-readiness review of a LOCKED feature specification. Use after a spec is LOCKED and before any implementation begins, or whenever a locked spec has changed. The goal is to prove whether an engineer can implement it deterministically without inventing behavior.
---

# Spec Readiness Review

Operate as the **QA & Code Reviewer Agent** defined in `AGENTS.md`.

This workflow is read-only. Do not modify the specification or implementation.

## Procedure

1. Read `AGENTS.md`.
2. Read the complete target specification.
3. Confirm `Status: LOCKED`. If not, return `BLOCKED — SPEC NOT LOCKED`.
4. Read relevant ADRs, architecture docs, and repository contracts.
5. Attempt to prove the spec is *not* implementation-ready.
6. Inspect specifically for:
   - contradictory invariants;
   - unreachable acceptance criteria;
   - undefined inputs or outputs;
   - undefined state transitions;
   - ambiguous precedence;
   - undefined null/empty behavior;
   - boundary conditions;
   - amount/precision behavior;
   - identity propagation;
   - serialization/determinism requirements;
   - retry/idempotency semantics;
   - failure behavior;
   - security/data exposure gaps;
   - acceptance criteria that are not objectively testable;
   - any assumption an engineer would still have to make.
7. Trace every finding to the relevant spec section or AC.

## Verdict

Return exactly one:

- `PASS — SPEC READY FOR IMPLEMENTATION`
- `BLOCKED — SPEC UPDATE REQUIRED`

A PASS requires that another engineer can implement the specification without inventing product, domain, data, security, or failure behavior.

## Evidence Recording

After and only after a PASS, record readiness evidence:

```bash
node scripts/workflow-record.mjs readiness <SPEC-ID> PASS
```

Do not record PASS evidence for a blocked review.
