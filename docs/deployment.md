# Deployment and Release Operations

Read [Merge Protocol](merge-protocol.md) for the complete branch and pull-request procedure.

## Local verification

Run `npm ci` followed by `npm run verify`. The command checks formatting, lint, strict TypeScript,
unit tests, the Apps Script build, and bundle safety. The generated `dist/` directory is ignored
and must never be committed.

## Branch promotion model

The repository uses three long-lived branches:

- `development` is the playground for features, fixes, and contributor work.
- `staging` is the integration branch and deploys to a disposable Apps Script workbook using
  Investec sandbox credentials.
- `master` is the production release branch. Only a pull request whose source is the repository's
  `staging` branch may target it; a successful merge triggers the production release workflow.

Direct pushes to `staging` and `master` are blocked by rulesets. Contributors should open pull
requests into `development`, then promote tested work from `development` to `staging`, and finally
promote `staging` to `master`. A pull request targeting `staging` must come from `development`.

## Staging deployment

Staging is a disposable container-bound Apps Script project using Investec sandbox credentials.
The GitHub Actions **Staging Apps Script deployment** workflow runs after pushes to the protected
`staging` branch and can also be run manually when a reason is supplied. It requires the protected
`staging` environment.

Configure these GitHub environment secrets:

| Secret              | Purpose                                                    |
| ------------------- | ---------------------------------------------------------- |
| `STAGING_SCRIPT_ID` | Apps Script project ID for the disposable staging workbook |
| `CLASPRC_JSON`      | Clasp OAuth credential JSON for the deployment identity    |

The workflow creates `.clasp.json` only inside the runner, builds from the selected commit, and
pushes only `dist/`. It does not receive Investec credentials and cannot deploy production.
After deployment, run setup, connection, account, balance, and transaction checks in the staging
workbook and attach the result to the acceptance report.

## Production pilot gate

Production is automatically deployed after a permitted `staging` → `master` merge and the
production workflow's `verify` check passes. Configure the protected `production` environment's
reviewer gate according to the release decision. Use a copied workbook, a
read-only production API key with only account, balance, and transaction permissions, one selected
account, and a short historical window. Compare dates, signs, pending/posted behavior, balances,
duplicate-looking transactions, and repeated-sync results against Investec Online before widening
the window.

Do not enable production by changing a workflow secret or editing the sandbox environment name.
Production configuration and the release decision remain separately reviewed even though the
deployment job is triggered automatically by a merge to `master`.

## Rollback

Stop live sync, preserve the failing workbook and Sync Runs sheet, and redeploy the last known-good
bundle to staging first. For a partial sync, rerun the same window after resolving the classified
error; deterministic identity and the overlap window make replay safe. Never use a destructive
sheet reset as the first recovery step.

## Release evidence

Retain the workflow run URL, commit SHA, bundle artifact, staging deployment evidence, and the
completed acceptance report. Redact workbook IDs, credentials, account identifiers, and provider
payloads before sharing evidence outside the owner’s trusted access boundary.
