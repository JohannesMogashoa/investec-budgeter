import { setupWorkbook } from '../application/setupWorkbook';
import { AppsScriptSheetGateway } from '../platform/appsScriptSheetGateway';

function notImplemented(action: string): void {
  SpreadsheetApp.getUi().alert(`${action} is not implemented yet.`);
}

export function setupWorkbookSheets(): void {
  try {
    const result = setupWorkbook(new AppsScriptSheetGateway());
    SpreadsheetApp.getUi().alert(
      `Workbook ready (schema ${result.schemaVersion}). Created: ${result.createdSheets.length}; updated: ${result.updatedSheets.length}.`,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown workbook setup error.';
    SpreadsheetApp.getUi().alert(`Workbook setup stopped safely: ${message}`);
  }
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
