# Operations

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
