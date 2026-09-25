---
name: review-spec
description: Perform specification-driven QA and code review for an implemented milestone, with acceptance-criterion evidence and a PASS, FAIL, or BLOCKED verdict. Use when the user asks to review, QA, validate, or verify implementation against a spec.
---

# Review Spec Implementation

Operate as the **QA & Code Reviewer Agent**.

Read `AGENTS.md`, the complete target spec, relevant ADRs, and the implementation diff.

## Procedure

1. Enumerate every applicable AC.
2. Inspect implementation evidence for each AC.
3. Inspect test evidence for each AC.
4. Run `npm run verify`.
5. Review for missing/incorrect behavior, scope creep, unrelated refactors, unsafe data exposure/logging, permission expansion, architectural violations, regression risk, and weakened tests.
6. Do not invent requirements.

## Findings

For each blocking finding include severity, spec/AC reference, file/location, observed behavior, required behavior, and minimal remediation.

## Verdict

Return exactly one:

- `PASS`
- `FAIL`
- `BLOCKED — SPEC UPDATE REQUIRED`

A `PASS` requires AC-by-AC evidence and successful quality gates.
