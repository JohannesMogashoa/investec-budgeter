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
/create-spec
    ↓
human/spec review
    ↓
/refine-spec (when needed)
    ↓
LOCKED spec
    ↓
/implement-spec <spec> <milestone>
    ↓
/review-spec <spec> <milestone>
    ↓
PASS → pull request
FAIL → /fix-review → review again
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
Repository-level Codex configuration lives in `.codex/config.toml`. Shared reusable workflows live in `.codex/prompts/`.

Machine-specific configuration and credentials should remain outside the repository, normally in user-level Codex configuration.
