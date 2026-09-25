# Automated Feature Workflow Setup

## 1. Copy the package additions into the repository

Merge, do not blindly overwrite project-specific files. The key additions are:

- `.agents/skills/feature-workflow/`
- `.agents/skills/spec-readiness-review/`
- `.agents/skills/pre-push-code-review/`
- `.workflow/`
- `scripts/workflow-*.mjs`
- `.codex/hooks/pre_tool_use_policy.py`
- `.githooks/pre-push`
- `.github/workflows/feature-workflow-gate.yml`
- `.codex/config.toml` hook/network settings

## 2. Install local wiring

```bash
node scripts/install-feature-workflow.mjs
```

This safely adds missing workflow npm scripts, adds `.workflow/local/` to `.gitignore`, and configures `core.hooksPath=.githooks`.

## 3. Restart Codex

Start Codex from the repository root so it reloads `AGENTS.md`, skills, project configuration, and hooks.

## 4. Verify tooling

```bash
gh auth status
gh api user
npm run workflow:status -- SPEC-07
```

## 5. Normal usage

```text
Use the feature-workflow skill for issue #7 and take it as far as possible.
```

When a human decision is genuinely required, answer the decision and say `Continue SPEC-07.`

When the workflow reaches `PASS — READY TO PUSH`, pushing remains a separate explicit action.
