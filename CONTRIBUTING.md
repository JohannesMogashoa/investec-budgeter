# Contributing

This repository uses specification-driven development.

## Before You Change Code

Read:

1. `AGENTS.md`
2. The applicable file in `spec/`
3. Relevant ADRs in `docs/decisions/`
4. Relevant operational/architecture documentation

Do not implement a feature without a `LOCKED` specification.

## Normal Workflow

```text
Create/refine spec using the repository skills
    ↓
human/spec review
    ↓
LOCKED spec
    ↓
implement-spec skill for one milestone
    ↓
review-spec skill
    ↓
PASS → pull request
FAIL → fix-review skill → review again
```

These are **skills, not custom slash commands**. Example prompts:

```text
Use the create-spec skill for INV-17.
Implement milestone 1 of SPEC-INV-17.
Review milestone 1 of SPEC-INV-17 against its acceptance criteria.
```

## Branches

Use short-lived feature branches. The spec's target branch is authoritative. Default convention:

`feat/spec-[id]-[feature-slug]`

## Commits

Prefer:

`<type>(<scope>): spec-<id> milestone-<n> <description>`

Keep unrelated changes separate.

## Verification

Run from the repository root:

```bash
npm install
npm test
npm run typecheck
npm run lint
npm run build:check
npm run format:check
npm run verify
```

`npm run verify` is the pre-review quality gate.

## Pull Requests

A PR must identify:

- spec ID,
- milestone,
- acceptance criteria implemented,
- tests/evidence,
- verification results,
- related issue/task.

Do not mix speculative refactors or unrelated cleanup into feature PRs.

## Security

Never commit:

- Investec credentials,
- API keys/tokens,
- bank data,
- generated secrets,
- `.env` files,
- sensitive API payloads.

Use safe placeholders and environment variables.

## Codex

Repository-level Codex configuration lives in `.codex/config.toml`. Shared reusable workflows live as Codex skills in `.agents/skills/`.

Machine-specific configuration and credentials should remain outside the repository, normally in user-level Codex configuration.
