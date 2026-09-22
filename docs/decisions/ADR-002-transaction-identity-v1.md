# ADR-002: Transaction Identity v1

- **Status:** Accepted provisionally pending sandbox replay
- **Date:** 2026-09-22

## Decision

Use a versioned identity key. If Investec documents and sandbox replay proves a stable provider
transaction ID, use:

```text
sha256(JSON.stringify(["v1", environment, providerAccountId, providerTransactionId]))
```

Until that evidence exists, use the fallback fingerprint:

```text
sha256(JSON.stringify([
  "v1-fallback",
  environment,
  providerAccountId,
  transactionDate,
  amountMinorUnits,
  currency,
  transactionType,
  referenceRaw
]))
```

Serialization is compact JSON with array order fixed as shown, `null` for absent optional
values, UTF-8 input, and lowercase hexadecimal SHA-256 output. Amounts are parsed as exact
decimal values and converted to signed minor units before serialization. Raw reference text is
preserved; it is not trimmed for identity.

## Safety rules

- Do not use spreadsheet row number, import time, running balance, or retrieval timestamp.
- Do not include mutable descriptions or settlement-only fields in the fallback key.
- Store `identityVersion` with every row.
- If the same key appears twice in one fetch with conflicting provider data, fail closed and
  record a contract error rather than merging records.
- If the fallback lacks enough distinguishing material, retain the sanitized fixture and stop
  that batch for review.

## Evidence required before implementation

Replay fixtures must cover duplicate-looking purchases, pending-to-posted changes, reversals,
refunds, transfers, fees, and repeated references. If the fallback collides with legitimate
transactions, introduce a new identity version; never silently add spreadsheet row order.
