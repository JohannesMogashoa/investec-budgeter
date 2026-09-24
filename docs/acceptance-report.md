# Phase 2 Sandbox Acceptance Report

Copy this template for each acceptance run. Use a clean workbook copy and sanitized evidence only.

## Run metadata

| Field                   | Value   |
| ----------------------- | ------- |
| Date/time UTC           |         |
| Commit SHA              |         |
| Schema version          |         |
| Environment             | Sandbox |
| Workbook copy/reference |         |
| Operator                |         |
| Workflow/run URL        |         |

## Evidence matrix

| Scenario                                          | Result              | Evidence/run IDs | Notes |
| ------------------------------------------------- | ------------------- | ---------------- | ----- |
| Setup preserves existing budget tabs              | ☐ Pass ☐ Fail       |                  |       |
| Credential setup and connection test              | ☐ Pass ☐ Fail       |                  |       |
| Account and balance refresh                       | ☐ Pass ☐ Fail       |                  |       |
| Initial transaction import                        | ☐ Pass ☐ Fail       |                  |       |
| Repeated import creates no duplicates             | ☐ Pass ☐ Fail       |                  |       |
| Provider mutation updates existing row            | ☐ Pass ☐ Fail       |                  |       |
| Pending-to-posted promotion                       | ☐ Pass ☐ Fail ☐ N/A |                  |       |
| Duplicate-looking legitimate rows remain distinct | ☐ Pass ☐ Fail       |                  |       |
| User-owned fields are preserved                   | ☐ Pass ☐ Fail       |                  |       |
| Failure replay is safe                            | ☐ Pass ☐ Fail       |                  |       |
| Concurrent sync is serialized/skipped             | ☐ Pass ☐ Fail       |                  |       |
| Malformed data is rejected                        | ☐ Pass ☐ Fail       |                  |       |
| Formula-like text remains literal                 | ☐ Pass ☐ Fail       |                  |       |
| Live sync lifecycle and expiry                    | ☐ Pass ☐ Fail ☐ N/A |                  |       |
| Logs and sheets contain no secrets                | ☐ Pass ☐ Fail       |                  |       |

## Validation commands

```text
npm ci
npm run verify
```

## Exceptions and follow-up

Record only classified errors, safe counts, and remediation owners. Do not paste tokens, account
numbers, authorization headers, or raw transaction payloads into this report.

## Approval

| Decision                    | Name/date | Notes |
| --------------------------- | --------- | ----- |
| Sandbox acceptance complete |           |       |
| Production pilot approved   |           |       |
