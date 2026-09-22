# ADR-001: Phase 2 Runtime Boundary

- **Status:** Accepted
- **Date:** 2026-09-22

## Decision

Phase 2 runs as a container-bound Google Apps Script, authored as modular TypeScript, bundled
with esbuild, and deployed with `clasp`. The initial deployment supports one owner and one
Google Sheet. Investec access is read-only and sandbox-first.

The code is divided into platform ports, provider adapters, application use cases, domain
models, and Sheets repositories. Apps Script-specific services stay behind the platform ports
so a later backend migration can preserve the workbook contract.

## Why

The workbook is already the user interface, Apps Script provides the required spreadsheet,
cache, lock, property, and HTTP services, and this keeps the initial validation inexpensive.

## Constraints and migration triggers

This boundary is not a multi-user security model or a durable database. Move authentication and
ingestion behind a .NET/backend service with managed secrets when any of these becomes true:

- more than one owner or external customer needs access;
- unattended, high-volume, or long-running sync is required;
- Apps Script quotas or execution limits threaten reliable replay; or
- payment/write capabilities are introduced.

The Phase 2 code must not add payment, transfer, beneficiary, or production automation paths.
