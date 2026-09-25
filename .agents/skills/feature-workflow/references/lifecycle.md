# Feature Lifecycle

```text
REQUIREMENT
    ↓
SPEC_DRAFT_OR_REVIEW
    ↓
DECISION_REQUIRED ── human decision ──┐
    ↑                                 │
    └─────────────────────────────────┘
    ↓
SPEC_LOCKED
    ↓
READINESS_REVIEW
    ├── BLOCKED → SPEC_DRAFT_OR_REVIEW
    └── PASS
          ↓
IMPLEMENT_M1 → QA_M1 ── FAIL → FIX_M1 → QA_M1
                    └── PASS
                          ↓
IMPLEMENT_M2 → QA_M2 → ...
                          ↓
ALL_MILESTONES_PASS
          ↓
PRE_PUSH_REVIEW
    ├── FAIL → FIX/REVIEW
    └── PASS
          ↓
READY_TO_PUSH
```

## Evidence Rules

- Specification text is authoritative for feature behavior.
- ADRs are authoritative for accepted architectural decisions.
- Git is authoritative for implementation history.
- Tests and `npm run verify` are executable evidence.
- `.workflow/local` contains disposable review attestations that are validated against the current spec hash and Git commit.

The evidence directory must never be treated as product truth.
