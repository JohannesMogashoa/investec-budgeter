---
name: fix-review
description: Fix findings from a failed specification-driven QA review without expanding scope. Use when the user asks to address, resolve, or implement review findings for a spec milestone.
---

# Fix Review Findings

Operate as the **Software Engineer Agent**.

Read `AGENTS.md`, the locked spec, and all supplied review findings.

1. Fix only findings supported by the spec/constitution.
2. Never turn a review comment into a new product requirement.
3. If a finding requires undefined behavior, stop with `SPEC UPDATE REQUIRED`.
4. Preserve the existing feature branch.
5. Add regression tests where appropriate.
6. Run focused tests and then `npm run verify`.
7. Do not perform unrelated cleanup/refactoring.

Map each finding to its resolution, files changed, test evidence, and applicable AC. Report whether the work is ready for review again.
