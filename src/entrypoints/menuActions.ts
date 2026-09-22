function notImplemented(action: string): void {
  SpreadsheetApp.getUi().alert(`${action} is not implemented yet.`);
}

/** Placeholder menu handlers. Application use cases will be wired in later epics. */
export function testConnection(): void {
  notImplemented('Test connection');
}

export function syncAccounts(): void {
  notImplemented('Refresh accounts');
}

export function syncBalances(): void {
  notImplemented('Refresh balances');
}

export function syncTransactions(): void {
  notImplemented('Sync transactions');
}
