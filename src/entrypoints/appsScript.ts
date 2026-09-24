import { onOpen } from './onOpen';
import {
  setupWorkbookSheets,
  syncAccounts,
  syncBalances,
  syncTransactions,
  testConnection,
} from './menuActions';

/** Expose Apps Script handlers as global functions in the bundled runtime. */
Object.assign(globalThis, {
  onOpen,
  setupWorkbookSheets,
  testConnection,
  syncAccounts,
  syncBalances,
  syncTransactions,
});
