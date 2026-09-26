# Data Dictionary

## Transactions

Provider and system columns are maintained by synchronization. User columns are never overwritten
by provider refreshes.

| Column                  | Ownership | Meaning                                                                              |
| ----------------------- | --------- | ------------------------------------------------------------------------------------ |
| Row Key                 | system    | Versioned deterministic identity used for upsert.                                    |
| Identity Alias          | system    | Former key retained during pending-to-posted promotion.                              |
| Environment             | system    | Sandbox or production namespace.                                                     |
| Account Key             | system    | Hashed internal account reference.                                                   |
| Provider Account ID     | provider  | Opaque Investec account ID.                                                          |
| Provider Transaction ID | provider  | Investec `uuid`, when supplied.                                                      |
| Transaction Type        | provider  | Provider transaction type.                                                           |
| Status                  | provider  | `POSTED` or `PENDING`, when supplied.                                                |
| Transaction Date        | provider  | Economic/provider transaction date.                                                  |
| Posting Date            | provider  | Date the entry affects the account books.                                            |
| Value Date              | provider  | Provider value/availability date.                                                    |
| Description Raw         | provider  | Provider description preserved as text.                                              |
| Reference Raw           | provider  | Reserved for a future provider reference field.                                      |
| Amount                  | provider  | Signed amount: debit negative, credit positive.                                      |
| Currency                | provider  | Taken from the validated account balance because the transaction DTO omits currency. |
| Running Balance         | provider  | Provider-reported balance, not used for identity.                                    |
| Posted Order            | provider  | Provider ordering value; zero is valid.                                              |
| Provider Payload Hash   | system    | Hash of canonical provider-owned fields.                                             |
| Identity Version        | system    | Identity algorithm used for the row.                                                 |
| First Imported UTC      | system    | Immutable first-observation timestamp.                                               |
| Last Seen UTC           | system    | Most recent successful overlapping observation.                                      |
| Last Changed UTC        | system    | Most recent provider-payload change.                                                 |
| Sync Run ID             | system    | Run responsible for the latest row observation.                                      |
| Category                | user      | Future categorisation value.                                                         |
| Budget Item ID          | user      | Future budget reconciliation reference.                                              |
| Review Status           | user      | Future review workflow state.                                                        |
| User Note               | user      | Owner-maintained note.                                                               |
| Excluded                | user      | Owner-maintained exclusion flag.                                                     |

## Current Cycle

This protected sheet is a derived read model. It may be regenerated at any time from the ledger.
It contains cycle boundaries, freshness, posted/pending inflows and outflows, net movement,
average/projected outflow, balances, and transaction count. It does not become a second source of
truth.

## Rules

The `Rules` sheet is user-owned configuration. Row order has no meaning; enabled priorities must
be unique. Rules use literal, case-insensitive `EXACT` or `CONTAINS` text matching and signed
native-currency amount predicates. Automatic results are suggestions and do not overwrite
user-owned transaction fields.

## Classification Audit

The `Classification Audit` sheet is system-owned and currently contains the reserved schema for the
Milestone 3 application slice. The current implementation does not write audit rows. Once that
milestone is implemented, it will store the latest idempotent result for each transaction and
rule-set version while retaining prior versions for auditability; it will never replace the raw
provider description.
