# Codex Project Configuration

This directory contains repository-shared Codex configuration.

## `config.toml`
Contains safe project-level Codex/MCP configuration only.

It does **not** register custom slash commands.

## Reusable Workflows
Repository workflows are implemented as Codex skills under:

`.agents/skills/<skill-name>/SKILL.md`

Examples of natural invocation:

```text
Create a spec for INV-17.
Use the create-spec skill for INV-17.

Implement milestone 1 of SPEC-INV-17.
Use the review-spec skill to review milestone 1 of SPEC-INV-17.

Investigate why transaction deduplication is failing.
```

Codex should select an applicable skill from its description. Explicitly naming the skill is useful when you want deterministic workflow selection.

## Built-in Slash Commands
Slash commands exposed directly by Codex CLI are product-provided commands. Do not assume that adding Markdown files to this repository creates new `/command` entries.

## Secrets
Never commit credentials here. Contributor-specific credentials and machine-specific MCP setup belong in environment variables or user-level Codex configuration.
