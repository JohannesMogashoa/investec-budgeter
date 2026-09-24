# ADR-003: Near-Real-Time Transaction Sync

- **Status:** Accepted for Epic F
- **Date:** 2026-09-24

## Decision

Use manual sync plus opt-in adaptive polling. Live sync is disabled by default, runs for a
four-hour session, and targets a five-minute interval for selected active accounts. A managed
Apps Script time-driven trigger performs the same locked, idempotent sync as the manual menu
action.

The main transactions endpoint is requested with `includePending=true`. Pending records and posted
records share one ledger and are reconciled through UUID-first identity with the fallback and alias
rules in ADR-002.

Current-cycle metrics are a protected, reproducible projection of the Transactions and Accounts
sheets. They do not infer categories or rewrite user-owned transaction fields.

## Rationale and limits

Polling gives the owner useful current-cycle feedback without requiring a backend or webhook
consumer. Apps Script trigger timing is best effort, and Investec posting latency is outside the
application's control. The UI must therefore expose the last successful sync time and must never
claim that data is live to the second.

Live mode pauses or expires after repeated provider failures, throttling, invalid credentials, or
the configured session end. It must never create duplicate triggers or overlap sync runs.

## Extension path

If provider webhooks become available, they can request an immediate bounded sync without changing
the ledger or identity model. If transaction volume or freshness requirements exceed Apps Script
limits, move the orchestrator behind a durable backend while retaining the DTO, identity, payload
hash, and workbook contract.
