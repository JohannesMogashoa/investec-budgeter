# Repository Agent Skills

Reusable Codex workflows live under `.agents/skills/`.

Each skill is a directory containing a `SKILL.md` with YAML frontmatter describing when Codex should use it.

## Available Skills

- `create-spec` — requirement/task → specification
- `refine-spec` — REVIEW/DRAFT spec → implementation-ready spec
- `implement-spec` — implement one LOCKED milestone
- `review-spec` — AC-driven QA/code review
- `fix-review` — address valid QA findings
- `investigate` — read-only technical investigation
- `explain-project` — contributor-oriented repository explanation

## Invocation

Do not expect these to appear as `/create-spec` style CLI commands. Ask naturally or explicitly name the skill:

```text
Use the create-spec skill for task INV-17.
Use the implement-spec skill for milestone 2 of SPEC-INV-17.
Investigate the transaction synchronization flow.
```

The skill descriptions allow Codex to select the correct workflow automatically when the intent is clear.
