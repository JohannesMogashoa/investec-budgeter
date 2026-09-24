# Setup and Live Sync

1. Copy `.env.example` to `.env` and fill in the local sandbox credentials. The file is ignored by
   Git and is for local reference only.
2. Run `Set up / migrate workbook`.
3. Configure the same sandbox credentials through the credential modal. Credentials are stored
   only in Apps Script properties.
4. Run `Test connection`.
5. Run `Refresh accounts` and mark the desired account(s) as selected.
6. Run `Refresh balances`; transaction sync requires a validated account currency.
7. Set `Initial Import Start Date`, `Cycle Mode`, and `Cycle Start Day` in the Settings sheet if
   the defaults are not suitable.
8. Run `Sync transactions` for an immediate import.
9. Use `Start live sync` when current-cycle freshness is important. It targets five-minute polling
   for four hours and can be stopped at any time.

Live sync is best-effort. The workbook displays the last successful provider sync rather than
claiming second-level real-time data.
