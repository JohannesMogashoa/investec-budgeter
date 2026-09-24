# Investec Private Bank API Contract

**Source:** [`docs/sa-pb-account-information.json`](./sa-pb-account-information.json)
**OpenAPI version:** 3.0.0
**Document version:** 1.0.1
**Phase 2 environment:** Sandbox only

The checked-in OpenAPI document is the authoritative local contract for account, balance, and
transaction request/response shapes. It includes both servers:

| Environment | Base URL                              | Phase 2 status   |
| ----------- | ------------------------------------- | ---------------- |
| Sandbox     | `https://openapisandbox.investec.com` | Enabled          |
| Production  | `https://openapi.investec.com`        | Disabled in code |

## Authentication

Investec uses OAuth 2.0 client credentials. The token request is:

```text
POST {baseUrl}/identity/v2/oauth2/token
Authorization: Basic base64(client_id:client_secret)
x-api-key: <api key>
Accept: application/json
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
```

The API returns a short-lived Bearer token. Account calls use only:

```text
Authorization: Bearer <access token>
```

The API key must have only the Phase 2 scopes:

- `accounts`
- `balances`
- `transactions`

Do not enable transfers, beneficiary payments, documents, or other write/read capabilities for
this project.

Local sandbox credentials belong in the ignored `.env` file using the keys in `.env.example`.
The Apps Script runtime does not load `.env`; enter those values through the credential modal so
they are stored in Apps Script User Properties. Never commit credentials, tokens, or raw provider
payloads.

## Account endpoint

```text
GET /za/pb/v1/accounts
Authorization: Bearer <access token>
```

The successful response envelope is:

```json
{
  "data": {
    "accounts": [
      {
        "accountId": "opaque-id",
        "accountNumber": "account-number",
        "accountName": "display name",
        "referenceName": "owner reference",
        "productName": "Private Bank Account",
        "kycCompliant": true,
        "profileId": "profile-id",
        "profileName": "profile name"
      }
    ]
  },
  "links": { "self": "..." },
  "meta": { "totalPages": 1 }
}
```

The implementation maps `productName` to the workbook’s `Account Type` column. `accountNumber`
is masked to the final four digits before writing. Profile and KYC fields are validated but not
stored because they are outside the Phase 2 workbook contract.

The OpenAPI schema requires account fields and allows account IDs up to 40 characters. The
balance path parameter declares a 30-character maximum, which is inconsistent with the account
schema; the implementation accepts opaque IDs returned by the account endpoint and the live
sandbox must be checked before any production enablement.

## Balance endpoint

```text
GET /za/pb/v1/accounts/{accountId}/balance
Authorization: Bearer <access token>
```

The successful response requires:

- `accountId`
- `currentBalance`
- `availableBalance`
- `budgetBalance`
- `straightBalance`
- `cashBalance`
- `currency` matching `^[A-Z]{3}$`

Phase 2 stores only `currentBalance`, `availableBalance`, and `currency`. The other balance
components are validated but intentionally not added to the workbook schema. A missing or
invalid required balance field causes that account’s refresh to fail without overwriting its
previous values.

## Transaction implications for Epic F

The OpenAPI document defines:

```text
GET /za/pb/v1/accounts/{accountId}/transactions
```

with optional `fromDate`, `toDate`, `transactionType`, and `includePending` query parameters.
Epic F requests `includePending=true` so the current cycle can show pending activity. Filtering is
based on `postingDate` where available. The response envelope is `data.transactions`, with
pagination metadata in `meta.totalPages`.

The transaction DTO fields are `accountId`, `type`, `transactionType`, `status`, `description`,
`cardNumber`, `postedOrder`, `postingDate`, `valueDate`, `actionDate`, `transactionDate`,
`amount`, `runningBalance`, and optional `uuid`. The API does not provide transaction currency;
the implementation takes the validated currency from the selected account's balance record and
does not persist `cardNumber`.

The API examples return positive numeric amounts for both debit and credit records. The ledger
normalizes `DEBIT` to a negative amount and `CREDIT` to a positive amount. The provider `uuid`
is the preferred stable identity; records without it use the versioned fallback identity defined
in ADR-002.

The document also defines a separate pending-transactions endpoint. Epic F does not call it in
v1 because the main endpoint's `includePending=true` path provides a single reconciliation stream.
If pending records lack UUIDs and later become posted UUID records, the sync promotes a uniquely
matched fallback row and retains the former identity as an alias. Ambiguous matches fail closed.

The product is near-real-time adjacent, not real-time guaranteed: manual sync is always available
and opt-in live sync polls the selected accounts approximately every five minutes while active.
Provider posting latency, Apps Script scheduling, quotas, and rate limits can delay visibility.

## Error contract

The documented account and balance endpoints expose at least:

- `400` bad request;
- `401` unauthorized;
- `403` forbidden/scope failure;
- `429` rate limit;
- `500` provider failure.

The HTTP client retries only transient failures, performs one 401 token replay, and never logs
response bodies or authorization material.

## Configuration and verification status

The local OpenAPI document resolves the previously open account and balance shape questions.
Live sandbox verification is still required for credentials, actual response optionality, rate
limits, and any differences between sandbox and production.
