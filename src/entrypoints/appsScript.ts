import { onOpen } from './onOpen';
import {
  clearCachedAccessToken,
  clearCredentials,
  configureCredentials,
  saveCredentials,
  setupWorkbookSheets,
  syncAccounts,
  syncBalances,
  syncTransactions,
  classifyTransactions,
  startLiveSync,
  stopLiveSync,
  viewLiveSyncStatus,
  runScheduledTransactionSync,
  testConnection,
} from './menuActions';

/** Expose Apps Script handlers as global functions in the bundled runtime. */
Object.assign(globalThis, {
  onOpen,
  configureCredentials,
  saveCredentials,
  clearCredentials,
  clearCachedAccessToken,
  setupWorkbookSheets,
  testConnection,
  syncAccounts,
  syncBalances,
  syncTransactions,
  classifyTransactions,
  startLiveSync,
  stopLiveSync,
  viewLiveSyncStatus,
  runScheduledTransactionSync,
});

export {
  onOpen,
  configureCredentials,
  saveCredentials,
  clearCredentials,
  clearCachedAccessToken,
  setupWorkbookSheets,
  testConnection,
  syncAccounts,
  syncBalances,
  syncTransactions,
  startLiveSync,
  stopLiveSync,
  viewLiveSyncStatus,
  runScheduledTransactionSync,
};
