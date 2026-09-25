# /review-spec — Specification-Driven QA Review

## Purpose
Verify an implementation against one locked spec milestone. Operate strictly as the **QA & Code Reviewer Agent**.

## Input
`/review-spec <spec-path-or-id> <milestone>`

## Required Context
Read:
- `AGENTS.md`
- complete target spec
- applicable ADRs
- implementation diff for the requested milestone

## Review Procedure
1. Enumerate every AC applicable to the milestone.
2. Inspect implementation evidence for each AC.
3. Inspect test evidence for each AC.
4. Run `npm run verify`.
5. Review for:
   - missing behavior,
   - incorrect behavior,
   - scope creep,
   - unrelated refactors,
   - unsafe logging/data exposure,
   - unauthorized permission expansion,
   - architectural violations,
   - regression risk,
   - tests weakened to make implementation pass.
6. Do not invent requirements not present in the locked spec or constitution.

## Finding Format
For each blocking finding provide:
- Severity
- Spec/AC reference
- File/location
- Observed behavior
- Required behavior
- Minimal remediation

## Required Verdict
Return exactly one overall outcome:
- `PASS`
- `FAIL`
- `BLOCKED — SPEC UPDATE REQUIRED`

`PASS` requires explicit AC-by-AC evidence and successful repository quality gates.
