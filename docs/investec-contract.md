# Investec Contract Baseline

**Status:** Phase 2 discovery baseline; live sandbox verification remains required before production use.
**Environment:** Sandbox only. Credentials and real account data must never be committed.

## Confirmed public contract

The official Investec developer documentation describes OAuth 2.0 client credentials with a
`client_id`, `client_secret`, and `x-api-key`. The token request uses Basic authentication,
`application/x-www-form-urlencoded`, and `grant_type=client_credentials`:

```text
POST https://openapisandbox.investec.com/identity/v2/oauth2/token
Authorization: Basic <base64(client_id:client_secret)>
x-api-key: <api-key>
Accept: application/json
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials
```

The documented access token is a bearer token with a roughly 30-minute lifetime. Private Bank
access is configured through an API key whose permissions include account identity, balances,
and transactions. Phase 2 requests read permissions only.

The expected Private Bank route family is:

```text
GET /za/pb/v1/accounts
GET /za/pb/v1/accounts/{accountId}/balance
GET /za/pb/v1/accounts/{accountId}/transactions
```

These route assumptions are a starting point, not an implementation contract. See the open-items
table before adding DTOs or request code.

## Live sandbox items to verify

| Area             | Must capture                                                        | Current status                                                         |
| ---------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Base URLs        | Sandbox and production hosts                                        | Sandbox host confirmed; production host recorded only in official docs |
| Token response   | `access_token`, `token_type`, `expires_in`, `scope`, error envelope | Shape shown publicly; capture a sanitized response                     |
| Account response | IDs, names, masked number, type, currency, pagination               | Needs sandbox capture                                                  |
| Balance response | Current vs available balance, currency, timestamp                   | Needs sandbox capture                                                  |
| Transactions     | Field names, nullability, amount sign, dates, status, posted order  | Needs sandbox capture                                                  |
| Pagination       | Page/cursor fields, limits, ordering, empty-page behavior           | Needs sandbox capture                                                  |
| Errors/limits    | 400/401/403/429/5xx bodies and rate-limit headers                   | Needs sandbox capture                                                  |
| Identity         | Stable transaction ID and pending-to-posted behavior                | Needs replay fixture                                                   |

Do not use public credentials shown in documentation. Obtain credentials through the owner's
Investec Developer sandbox connection and store them only in Apps Script properties.

## Authentication implementation boundary

Epic D stores one sandbox credential bundle in the executing user's Apps Script User Properties.
Access tokens are stored only in the executing user's short-lived User Cache and are never written
to cells, logs, source control, or UI responses. The credential modal submits only to server-side
Apps Script functions, uses the default HTML iframe sandbox, and does not load external scripts.

The application is sandbox-only until a later phase explicitly enables production. The API key
must be created with account identity, balance, and transaction permissions only; transfer,
payment, card, statement, and tax permissions are not required by Phase 2.

## Sources

- [Investec Individuals & Private Business](https://developer.investec.com/individuals)
- [Investec Authorisation API](https://developer.investec.com/api-reference/SA%20Open%20API%20-%20Authorization)
