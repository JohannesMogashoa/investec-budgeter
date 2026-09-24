# Operations

## Operating principles

The workbook is an auditable read-only ingestion boundary. Re-running a window is the normal
recovery action; deleting ledger rows or editing system columns is not. Credentials belong only
in Apps Script User Properties, and logs/run records must contain counts, safe error codes, and
correlation identifiers—not tokens or raw provider payloads.

## Normal refresh

Use `Sync transactions` for an immediate refresh. Use `Refresh balances` when current balance or
account currency is stale. Re-running a window is safe and should not create duplicate rows.

## Live sync

Use `Start live sync` for an opt-in four-hour polling session. Use `View live sync status` to
inspect expiry and trigger state. Use `Stop live sync` before workbook maintenance or schema work.

Live sync may stop itself after expiry or repeated provider failures. Resolve credentials,
permissions, rate limits, or schema errors before restarting it.

## Partial runs

A failed or partial run does not advance the successful checkpoint. Re-run the same action; the
overlap window and deterministic identities make replay safe. Do not delete ledger rows to recover.

## Identity ambiguity

If a pending record cannot be uniquely matched to a later UUID record, the sync leaves existing
rows intact and reports a rejection. Review the run record before making any manual changes.

## Data freshness

Current Cycle is derived from the ledger and account balances. A recent sync with no new rows is
still a successful refresh. Provider posting latency and Apps Script scheduling can make a recent
bank transaction temporarily unavailable.

## Schema and deployment recovery

If setup reports incompatible headers, stop and preserve the workbook copy. Export or duplicate
the workbook before making changes, compare the headers with `docs/data-dictionary.md`, and
resolve the migration as a reviewed code change. Do not manually rename system columns to force
setup to continue.

Deploy only the generated `dist/` bundle. The staging workflow is manually approved and uses a
separate Apps Script project and sandbox credentials. Production deployment requires the read-only
pilot checklist in `docs/deployment.md` and is never performed automatically by CI.

## Credential rotation

Use the credential modal to replace the client ID, client secret, and API key, then clear the
cached access token and run `Test connection`. If a credential may have leaked, revoke it with
Investec first, rotate it, clear the old Apps Script properties, and review recent run records.

## Extension safety

New provider fields must be classified as provider, system, or user-owned before being added to
the schema. New identity algorithms require a new identity version and replay fixtures. New
sync modes must reuse the existing lock, redaction, idempotent repository writes, and run-record
contract; they must not write directly to technical sheets.
