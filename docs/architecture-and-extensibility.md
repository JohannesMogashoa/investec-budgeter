# Architecture and Extensibility Guide

## Boundary map

`src/entrypoints` contains Apps Script globals and menu wiring. `src/application` coordinates
use cases and failure handling. `src/investec` owns provider authentication, HTTP contracts, DTO
validation, normalization, and identity. `src/sheets` owns the workbook schema and repositories.
`src/platform` adapts Apps Script services through ports defined in `platform/ports.ts`.

Provider and Apps Script details must not leak into domain/application decisions. This boundary
allows the orchestrator, normalizers, identity rules, and workbook contract to move behind a
durable backend later, as described by ADR-001.

## Adding a provider field

1. Confirm the field in the provider contract or a sanitized fixture.
2. Decide whether it is provider-owned, system-owned, or user-owned.
3. Add normalization and negative validation tests.
4. Update the schema manifest and data dictionary if it is persisted.
5. Preserve literal text handling and redaction rules.
6. Add migration and acceptance evidence when the workbook shape changes.

Provider fields must never overwrite user-owned columns during upsert.

## Adding an identity or reconciliation rule

Identity is versioned and deterministic. A new algorithm must:

- use a new identity version;
- define canonical serialization and null handling;
- include collision and duplicate-looking fixtures;
- cover pending-to-posted, reversal, refund, and repeated-reference scenarios;
- retain aliases where promotion is supported; and
- document rollback/replay behavior in an ADR.

Never use row position, retrieval time, running balance, or mutable display text as an unreviewed
identity component.

## Adding a sync mode

New manual, scheduled, or webhook-triggered modes must call the existing application use case and
provide an explicit run origin. They must reuse the lock, overlap window, bounded paging, redacted
logging, Sync Runs record, and checkpoint semantics. A future webhook adapter should request a
bounded sync rather than write directly to `Transactions`.

## Adding a backend runtime

Move orchestration behind a durable service when multi-user access, unattended operation, volume,
or Apps Script quotas exceed the single-owner boundary. Retain the DTO mapping, identity version,
payload hash, repository contract, ownership rules, and workbook projection so the migration does
not reinterpret historical rows.

## Compatibility checklist

Every extensibility change must update the relevant contract fixture, unit/contract tests, data
dictionary, ADR or migration note, setup/operations documentation, and acceptance report. Keep
production disabled until the sandbox replay suite and the read-only pilot gate both pass.
