# /fix-review — Fix QA Findings Without Scope Expansion

## Purpose
Address findings from a failed `/review-spec` cycle. Operate as the **Software Engineer Agent**.

## Input
`/fix-review <spec-path-or-id> <milestone> <review-findings>`

## Rules
1. Read `AGENTS.md`, the locked spec, and all supplied review findings.
2. Fix only valid findings that are supported by the spec/constitution.
3. Do not use review findings to introduce new product requirements.
4. If a finding requires undefined behavior, stop and return `SPEC UPDATE REQUIRED`.
5. Preserve the existing feature branch.
6. Add regression tests for corrected defects where applicable.
7. Run focused tests, then `npm run verify`.
8. Do not perform unrelated cleanup or refactoring.

## Output
Map each finding to:
- Resolution
- Files changed
- Test evidence
- Applicable AC

Then report verification results and whether the work is ready for `/review-spec` again.
