# Codex Project Configuration

This directory contains repository-shared Codex configuration and reusable engineering workflows.

## Files

- `config.toml` — safe, shared project-level Codex/MCP configuration.
- `prompts/create-spec.md` — create a specification.
- `prompts/refine-spec.md` — resolve and lock a specification.
- `prompts/implement-spec.md` — implement one locked milestone.
- `prompts/review-spec.md` — perform AC-driven QA.
- `prompts/fix-review.md` — fix review findings without scope expansion.
- `prompts/investigate.md` — read-only investigation.
- `prompts/explain.md` — contributor-oriented explanation.

`AGENTS.md` remains the governing engineering constitution.

## Secrets
Do not put credentials in this directory. Shared MCP definitions must use safe authentication mechanisms/environment variables. Machine-specific integrations belong in user-level Codex configuration where possible.
