# Deployment and Release Operations

## Local verification

Run `npm ci` followed by `npm run verify`. The command checks formatting, lint, strict TypeScript,
unit tests, the Apps Script build, and bundle safety. The generated `dist/` directory is ignored
and must never be committed.

## Staging deployment

Staging is a disposable container-bound Apps Script project using Investec sandbox credentials.
The GitHub Actions **Staging Apps Script deployment** workflow is manually triggered and requires
the protected `staging` environment.

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

Production requires explicit approval after sandbox acceptance. Use a copied workbook, a
read-only production API key with only account, balance, and transaction permissions, one selected
account, and a short historical window. Compare dates, signs, pending/posted behavior, balances,
duplicate-looking transactions, and repeated-sync results against Investec Online before widening
the window.

Do not enable production by changing a workflow secret or editing the sandbox environment name.
Production requires a separately reviewed configuration and deployment action.

## Rollback

Stop live sync, preserve the failing workbook and Sync Runs sheet, and redeploy the last known-good
bundle to staging first. For a partial sync, rerun the same window after resolving the classified
error; deterministic identity and the overlap window make replay safe. Never use a destructive
sheet reset as the first recovery step.

## Release evidence

Retain the workflow run URL, commit SHA, bundle artifact, staging deployment evidence, and the
completed acceptance report. Redact workbook IDs, credentials, account identifiers, and provider
payloads before sharing evidence outside the owner’s trusted access boundary.
