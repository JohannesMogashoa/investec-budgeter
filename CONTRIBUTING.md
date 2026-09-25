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

## Automated Feature Workflow

For normal feature work, contributors should use the `feature-workflow` skill rather than manually remembering each specialist step.

Example:

```text
Use the feature-workflow skill for GitHub issue #7 and take it as far as possible.
```

The orchestrator handles spec creation/refinement, readiness review, sequential milestone implementation and QA, fixes/re-review, and the final pre-push review. It pauses only for genuine human decisions, unavailable authoritative requirements, environment blockers, or explicit push authorization.

### Install the repository gates

After copying the workflow files into the repository, run once:

```bash
node scripts/install-feature-workflow.mjs
```

Then restart Codex from the repository root.

Useful diagnostics:

```bash
npm run workflow:status -- SPEC-07
npm run workflow:prepush -- SPEC-07
```

Do not bypass a failed workflow gate. Follow the `NEXT ACTION` reported by the checker.
