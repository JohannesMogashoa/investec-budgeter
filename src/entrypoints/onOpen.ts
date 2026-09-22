/** Adds the Phase 2 menu to the bound spreadsheet. */
export function onOpen(): void {
  SpreadsheetApp.getUi()
    .createMenu('Investec Budgeter')
    .addItem('Test connection', 'testConnection')
    .addSeparator()
    .addItem('Refresh accounts', 'syncAccounts')
    .addItem('Refresh balances', 'syncBalances')
    .addItem('Sync transactions', 'syncTransactions')
    .addToUi();
}
