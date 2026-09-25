import { syncAccounts as runAccountSync } from '../application/syncAccounts';
import { syncBalances as runBalanceSync } from '../application/syncBalances';
import { syncTransactions as runTransactionSync } from '../application/syncTransactions';
import {
  getLiveSyncStatus,
  startLiveSync as enableLiveSync,
  stopLiveSync as disableLiveSync,
  liveSyncIsActive,
} from '../application/liveSync';
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
import { AppsScriptTriggerManager } from '../platform/appsScriptTriggerManager';
import { AccountRepository } from '../sheets/accountRepository';
import { SettingsRepository } from '../sheets/settingsRepository';
import { SyncStateRepository } from '../sheets/syncStateRepository';
import { SyncRunRepository } from '../sheets/syncRunRepository';
import { TransactionRepository } from '../sheets/transactionRepository';
import { createInvestecHttpClient } from './investecRuntime';

export function setupWorkbookSheets(): void {
  try {
    const result = setupWorkbook(new AppsScriptSheetGateway());
    const archived = result.archivedSheets.length
      ? ` Legacy Transactions archived: ${result.archivedSheets.join(', ')}; review before removing.`
      : '';
    SpreadsheetApp.getUi().alert(
      `Workbook ready (schema ${result.schemaVersion}). Created: ${result.createdSheets.length}; updated: ${result.updatedSheets.length}.${archived}`,
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
  const result = runTransactionSync(createTransactionDependencies('MANUAL'));
  SpreadsheetApp.getUi().alert(
    `Transaction sync ${result.status.toLowerCase()}. Received: ${result.received}; inserted: ${result.inserted}; updated: ${result.updated}; unchanged: ${result.unchanged}; rejected: ${result.rejected}; promotions: ${result.promotions}.`,
  );
}

function createTransactionDependencies(origin: 'MANUAL' | 'LIVE') {
  const gateway = new AppsScriptSheetGateway();
  return {
    client: createInvestecHttpClient(),
    gateway,
    accounts: new AccountRepository(gateway),
    transactions: new TransactionRepository(gateway),
    settings: new SettingsRepository(gateway),
    state: new SyncStateRepository(gateway),
    runs: new SyncRunRepository(gateway),
    clock: new AppsScriptClock(),
    locks: new AppsScriptLockProvider(),
    hasher: new AppsScriptHasher(),
    ids: new AppsScriptIdGenerator(),
    logger: new AppsScriptLogger(),
    environment: 'sandbox' as const,
    origin,
  };
}

export function startLiveSync(): void {
  const gateway = new AppsScriptSheetGateway();
  const clock = new AppsScriptClock();
  const state = new SyncStateRepository(gateway);
  const result = enableLiveSync(
    new SettingsRepository(gateway),
    state,
    new AppsScriptTriggerManager(),
    clock,
  );
  const sync = runTransactionSync(createTransactionDependencies('LIVE'));
  SpreadsheetApp.getUi().alert(
    `Live sync enabled until ${result.untilUtc}. Initial sync: ${sync.status.toLowerCase()}, received ${sync.received}.`,
  );
}

export function stopLiveSync(): void {
  const gateway = new AppsScriptSheetGateway();
  const result = disableLiveSync(new SyncStateRepository(gateway), new AppsScriptTriggerManager());
  SpreadsheetApp.getUi().alert(`Live sync ${result.enabled ? 'enabled' : 'stopped'}.`);
}

export function viewLiveSyncStatus(): void {
  const gateway = new AppsScriptSheetGateway();
  const status = getLiveSyncStatus(
    new SyncStateRepository(gateway),
    new AppsScriptTriggerManager(),
    new AppsScriptClock(),
  );
  SpreadsheetApp.getUi().alert(
    status.enabled
      ? `Live sync is active until ${status.untilUtc}. Trigger installed: ${status.triggerInstalled}.`
      : `Live sync is inactive. Trigger installed: ${status.triggerInstalled}.`,
  );
}

export function runScheduledTransactionSync(): void {
  const gateway = new AppsScriptSheetGateway();
  const clock = new AppsScriptClock();
  const state = new SyncStateRepository(gateway);
  const triggers = new AppsScriptTriggerManager();
  if (!liveSyncIsActive(state, triggers, clock)) return;
  runTransactionSync(createTransactionDependencies('LIVE'));
}
