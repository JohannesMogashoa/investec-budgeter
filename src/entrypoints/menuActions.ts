import { syncAccounts as runAccountSync } from '../application/syncAccounts';
import { syncBalances as runBalanceSync } from '../application/syncBalances';
import { testConnection as runTestConnection } from '../application/testConnection';
import { TOKEN_CACHE_KEY } from '../investec/authClient';
import { CredentialStore } from '../investec/credentials';
import { setupWorkbook } from '../application/setupWorkbook';
import { AppsScriptClock } from '../platform/appsScriptClock';
import { AppsScriptHasher } from '../platform/appsScriptHasher';
import { AppsScriptIdGenerator } from '../platform/appsScriptIdGenerator';
import { AppsScriptLogger } from '../platform/appsScriptLogger';
import { AppsScriptLockProvider } from '../platform/appsScriptLock';
import { AppsScriptSecretStore } from '../platform/appsScriptSecretStore';
import { AppsScriptSheetGateway } from '../platform/appsScriptSheetGateway';
import { AppsScriptUserCache } from '../platform/appsScriptUserCache';
import { AccountRepository } from '../sheets/accountRepository';
import { SyncRunRepository } from '../sheets/syncRunRepository';
import { createInvestecHttpClient } from './investecRuntime';

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

export function testConnection(): void {
  const result = runTestConnection(createInvestecHttpClient());
  SpreadsheetApp.getUi().alert(
    result.ok
      ? `${result.message} Accounts available: ${result.accountCount ?? 0}.`
      : result.message,
  );
}

export function configureCredentials(): void {
  const output = HtmlService.createHtmlOutputFromFile('credentials').setWidth(420).setHeight(360);
  SpreadsheetApp.getUi().showModalDialog(output, 'Configure Investec credentials');
}

export function saveCredentials(credentials: unknown): void {
  new CredentialStore(new AppsScriptSecretStore()).save(credentials);
  new AppsScriptUserCache().remove(TOKEN_CACHE_KEY);
}

export function clearCredentials(): void {
  const result = SpreadsheetApp.getUi().alert(
    'Clear stored Investec credentials and cached token?',
    SpreadsheetApp.getUi().ButtonSet.YES_NO,
  );
  if (result !== SpreadsheetApp.getUi().Button.YES) return;
  new CredentialStore(new AppsScriptSecretStore()).clear();
  new AppsScriptUserCache().remove(TOKEN_CACHE_KEY);
  SpreadsheetApp.getUi().alert('Investec credentials cleared.');
}

export function clearCachedAccessToken(): void {
  new AppsScriptUserCache().remove(TOKEN_CACHE_KEY);
  SpreadsheetApp.getUi().alert('Cached Investec access token cleared.');
}

export function syncAccounts(): void {
  const gateway = new AppsScriptSheetGateway();
  const result = runAccountSync({
    client: createInvestecHttpClient(),
    accounts: new AccountRepository(gateway),
    runs: new SyncRunRepository(gateway),
    clock: new AppsScriptClock(),
    locks: new AppsScriptLockProvider(),
    hasher: new AppsScriptHasher(),
    ids: new AppsScriptIdGenerator(),
    logger: new AppsScriptLogger(),
    environment: 'sandbox',
  });
  SpreadsheetApp.getUi().alert(
    `Account sync ${result.status.toLowerCase()}. Received: ${result.received}; inserted: ${result.inserted}; updated: ${result.updated}; rejected: ${result.rejected}; inactive: ${result.inactive}.`,
  );
}

export function syncBalances(): void {
  const gateway = new AppsScriptSheetGateway();
  const result = runBalanceSync({
    client: createInvestecHttpClient(),
    accounts: new AccountRepository(gateway),
    runs: new SyncRunRepository(gateway),
    clock: new AppsScriptClock(),
    locks: new AppsScriptLockProvider(),
    ids: new AppsScriptIdGenerator(),
    logger: new AppsScriptLogger(),
    environment: 'sandbox',
  });
  SpreadsheetApp.getUi().alert(
    `Balance sync ${result.status.toLowerCase()}. Accounts: ${result.accountCount}; updated: ${result.updated}; unchanged: ${result.unchanged}; rejected: ${result.rejected}.`,
  );
}

export function syncTransactions(): void {
  notImplemented('Sync transactions');
}
