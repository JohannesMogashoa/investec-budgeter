# GitHub Actions Path Policy

Workflows in this repository must be path-scoped. A workflow should run only when files capable of affecting that workflow have changed.

## Validation workflow

`feature-workflow-gate.yml` runs only when application source, tests, build/verification scripts, workflow-state tooling, package metadata, or relevant TypeScript/test/lint configuration changes.

Changes limited to documentation, specifications, agent skills, or contributor guidance do **not** run the application verification workflow.

## Deployment workflows

Staging and production deployment workflows should use the deployment path set from `.workflow/path-policy.json`.

For a staging deployment:

```yaml
on:
  push:
    branches:
      - staging
    paths:
      - 'src/**'
      - 'scripts/**'
      - 'package.json'
      - 'package-lock.json'
      - 'tsconfig*.json'
      - 'appsscript.json'
      - '.clasp.json'
      - 'clasp*.json'
      - '.github/workflows/deploy-*.yml'
```

For production, use the same `paths` list on the `master` branch.

A change only to `tests/**`, `spec/**`, `docs/**`, `.agents/**`, or ordinary Markdown must not deploy.

## Important branch-protection note

GitHub keeps a workflow check in `Pending` when a workflow is skipped by path filtering and that exact workflow is configured as a required status check. Do not configure a strictly path-filtered workflow as a globally required check unless your repository rules account for skipped runs. If a globally required check is necessary, use a separate lightweight always-present check and keep expensive verification/deployment jobs path-conditional.

## Updating paths

Whenever the deployable artifact gains a new input directory or config file, update:

1. the relevant workflow `paths` list; and
2. `.workflow/path-policy.json`.

Do not broaden deployment triggers to `**` just to solve a missing-path issue.
