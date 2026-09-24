# Setup and Live Sync

1. Run `Set up / migrate workbook`.
2. Configure sandbox credentials through the credential modal. Credentials are stored only in
   Apps Script properties.
3. Run `Test connection`.
4. Run `Refresh accounts` and mark the desired account(s) as selected.
5. Run `Refresh balances`; transaction sync requires a validated account currency.
6. Set `Initial Import Start Date`, `Cycle Mode`, and `Cycle Start Day` in the Settings sheet if
   the defaults are not suitable.
7. Run `Sync transactions` for an immediate import.
8. Use `Start live sync` when current-cycle freshness is important. It targets five-minute polling
   for four hours and can be stopped at any time.

Live sync is best-effort. The workbook displays the last successful provider sync rather than
claiming second-level real-time data.
