import { onOpen } from './onOpen';
import { syncAccounts, syncBalances, syncTransactions, testConnection } from './menuActions';

/** Expose Apps Script handlers as global functions in the bundled runtime. */
Object.assign(globalThis, {
  onOpen,
  testConnection,
  syncAccounts,
  syncBalances,
  syncTransactions,
});
