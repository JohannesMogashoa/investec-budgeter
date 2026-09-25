---
name: pre-push-code-review
description: Perform a strict final code review of the current branch immediately before its final push to GitHub. Use for a pre-push review, final code review, final sanity check, readiness review, or verification before pushing completed implementation. Review-only by default; never push, merge, or silently modify code.
---

# Pre-Push Code Review

Operate as the **QA & Code Reviewer Agent** defined in `AGENTS.md`.

This is the final local quality gate before a GitHub push. Determine whether the current branch is safe, complete, specification-compliant, and ready to push.

## 1. Boundaries

By default this skill is **read-only**.

Do not modify production code or tests, rewrite specifications, perform unrelated refactors, commit, push, merge, or suppress failures. If defects exist, report them for the Software Engineer Agent to fix.

## 2. Establish Context

Before reviewing:

1. Read `AGENTS.md`.
2. Identify the current branch and intended base branch.
3. Inspect `git status`.
4. Determine the complete diff being reviewed, including relevant uncommitted changes.
5. Locate and read the applicable `spec/SPEC-*.md`.
6. Confirm the spec is `LOCKED`.
7. Read relevant ADRs in `docs/decisions/` and relevant architecture/operations docs.
8. Identify the milestone(s) represented by the change.

Never guess the applicable specification. If required traceability cannot be established, return `BLOCKED — SPEC TRACEABILITY REQUIRED`.

## 3. Git Safety

Run at minimum:

```bash
git status --short
git branch --show-current
git diff --check
git diff --stat
git log --oneline --decorate -n 15
```

Inspect committed and uncommitted changes that affect the final pushed state.

Check for generated/build artifacts, `.env` files, credentials/tokens, sensitive financial data, debug output, temporary code, commented-out implementation, merge markers, unexpected binaries, and unrelated changes.

Never print discovered secrets. Report only their file/location and category.

## 4. Specification & Scope

For every applicable Acceptance Criterion:

1. identify the AC;
2. identify implementation evidence;
3. identify test evidence;
4. assign `PASS`, `FAIL`, or `NOT VERIFIED`.

Verify milestone scope, exclusions, contracts/schemas, invariants, failure behavior, retry/idempotency rules, permissions, and that no undocumented product behavior was introduced.

If material behavior is undefined or contradictory, return `BLOCKED — SPEC UPDATE REQUIRED`.

## 5. Code Quality

Review changed code for concrete correctness and maintainability risks, including:

- incorrect control flow or boundary handling;
- null/undefined problems;
- incorrect async/error handling;
- race conditions where relevant;
- duplicate processing;
- non-idempotent retries;
- unsafe type assertions;
- accidental API contract changes;
- backward-compatibility regressions;
- dead/unreachable code;
- excessive coupling or duplicated logic that creates correctness risk.

Do not reject code merely because another implementation style is possible.

## 6. Financial & Security Review

Explicitly inspect for:

- committed credentials or secrets in fixtures;
- sensitive values in logs/errors;
- unnecessary account identifier persistence;
- unsafe token handling;
- excessive API permissions;
- production financial data in tests;
- unbounded retries;
- duplicate transaction creation;
- unsafe partial-sync behavior;
- failure paths that could incorrectly mark financial work complete.

Material credential exposure, financial-data exposure, or integrity risk is blocking.

## 7. Test Review

Verify that tests map to ACs and cover happy paths, material failures, and important boundaries. Ensure assertions are meaningful, mocks/fixtures do not conceal incorrect behavior, tests were not weakened without justification, and corrected defects have regression coverage where appropriate.

## 8. Required Verification

Run from the repository root:

```bash
npm run verify
```

Run focused tests where useful.

A `PASS` requires successful repository verification. Never claim a command passed unless it actually ran successfully.

If tooling/environment prevents verification, return `BLOCKED — VERIFICATION ENVIRONMENT` and report the failing command and reason.

## 9. GitHub Context

When `gh` and network access are available, run:

```bash
gh auth status
gh repo view
```

Use `gh` as needed to confirm authoritative issue/PR or remote-branch context. **Do not push.**

If GitHub is unavailable but local review evidence is sufficient, state that remote verification was unavailable. Do not replace authoritative private repository information with public-web assumptions.

## 10. Findings

Report actionable findings first, ordered by severity:

### [BLOCKER|HIGH|MEDIUM|LOW] — Short title

- **Spec/AC:** `AC-x.y` or `N/A`
- **Location:** `path/to/file.ts:line`
- **Problem:** Concrete observed behavior.
- **Risk:** Why it matters.
- **Required change:** Smallest correction required.
- **Evidence:** Supporting code path, diff, test, or command output.

Avoid speculative or cosmetic findings.

## 11. Acceptance Criteria Matrix

| Acceptance Criterion | Implementation | Test Evidence | Result |
|---|---|---|---|
| AC-x.y | file/symbol | test/file | PASS/FAIL/NOT VERIFIED |

Include every applicable AC.

## 12. Verdict

Finish with exactly one:

- `PASS — READY TO PUSH`
- `FAIL — NOT READY TO PUSH`
- `BLOCKED — SPEC UPDATE REQUIRED`
- `BLOCKED — VERIFICATION ENVIRONMENT`
- `BLOCKED — SPEC TRACEABILITY REQUIRED`

`PASS — READY TO PUSH` requires no blocking findings, all applicable ACs passing, compliant scope, successful security/data checks, successful `npm run verify`, and no unresolved repository-state problem.

## 13. Final Summary

Report:

- Branch reviewed
- Base branch
- Spec and milestone
- Files changed
- ACs passed / total
- Verification result
- Blocking findings count
- Non-blocking findings count
- GitHub connectivity status
- Recommended next action

If the verdict is `PASS — READY TO PUSH`, state that the branch is ready for the developer's final push.

**Never perform the push unless the developer separately and explicitly requests it.**
