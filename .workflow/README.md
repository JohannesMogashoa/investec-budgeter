# Feature Workflow Evidence

The feature workflow is specification-driven. This directory contains configuration only.

Runtime evidence is written under `.workflow/local/` and is intentionally gitignored. Evidence is not a second source of product truth: the workflow checker validates it against the current specification hash and Git commit.

Evidence types:

- `readiness.json` — records a successful adversarial spec-readiness review for the current spec content.
- `milestone-N.json` — records QA PASS for milestone N and the commit that was reviewed.
- `prepush.json` — records the final pre-push PASS for the exact current `HEAD`.

If the specification changes, readiness and milestone evidence automatically becomes stale because the spec hash changes. If `HEAD` changes after the final pre-push review, pre-push evidence becomes stale.
