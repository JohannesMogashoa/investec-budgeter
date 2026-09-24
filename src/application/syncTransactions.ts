import type { Clock, Hasher, IdGenerator, LockProvider, Logger } from '../platform/ports';
import { AccountRepository, type AccountRecord } from '../sheets/accountRepository';
import { SettingsRepository } from '../sheets/settingsRepository';
import { SyncRunRepository } from '../sheets/syncRunRepository';
import { SyncStateRepository } from '../sheets/syncStateRepository';
import { TransactionRepository } from '../sheets/transactionRepository';
import { InvestecError } from '../investec/errors';
import {
  normalizeTransactionsResponse,
  TRANSACTION_IDENTITY_VERSION,
} from '../investec/transactionNormalizer';
import { getTransactions } from '../investec/transactionsClient';
import { InvestecHttpClient } from '../investec/httpClient';
import { updateCurrentCycle } from './currentCycle';
import type { SheetGateway } from '../platform/ports';
import type { SheetRecord } from '../sheets/repositorySupport';

export interface TransactionSyncDependencies {
  readonly client: InvestecHttpClient;
  readonly gateway: SheetGateway;
  readonly accounts: AccountRepository;
  readonly transactions: TransactionRepository;
  readonly settings: SettingsRepository;
  readonly state: SyncStateRepository;
  readonly runs: SyncRunRepository;
  readonly clock: Clock;
  readonly locks: LockProvider;
  readonly hasher: Hasher;
  readonly ids: IdGenerator;
  readonly logger: Logger;
  readonly environment: 'sandbox';
  readonly origin?: 'MANUAL' | 'LIVE';
}

export interface TransactionSyncResult {
  readonly status: 'SUCCEEDED' | 'PARTIAL' | 'FAILED' | 'SKIPPED_LOCKED';
  readonly runId?: string;
  readonly accountCount: number;
  readonly pages: number;
  readonly received: number;
  readonly inserted: number;
  readonly updated: number;
  readonly unchanged: number;
  readonly rejected: number;
  readonly promotions: number;
}

function selected(accounts: readonly AccountRecord[]): AccountRecord[] {
  return accounts.filter(
    (account) =>
      account['Is Active'] === true &&
      (account['Is Selected'] === true || account['Is Selected'] === 'TRUE'),
  );
}

function today(clock: Clock): string {
  return clock.now().toISOString().slice(0, 10);
}

function subtractDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() - days);
  return value.toISOString().slice(0, 10);
}

function errorCode(error: unknown): string {
  return error instanceof InvestecError ? error.code : 'UNKNOWN';
}

function duplicateConflict(rows: readonly SheetRecord[]): boolean {
  const seen = new Map<string, unknown>();
  for (const row of rows) {
    const key = String(row['Row Key'] ?? '');
    const hash = row['Provider Payload Hash'];
    const prior = seen.get(key);
    if (prior !== undefined && prior !== hash) return true;
    seen.set(key, hash);
  }
  return false;
}

export function syncTransactions(dependencies: TransactionSyncDependencies): TransactionSyncResult {
  const lock = dependencies.locks.get('investec-bank-sync');
  const empty = {
    accountCount: 0,
    pages: 0,
    received: 0,
    inserted: 0,
    updated: 0,
    unchanged: 0,
    rejected: 0,
    promotions: 0,
  };
  if (!lock.tryAcquire(5000)) return { status: 'SKIPPED_LOCKED', ...empty };

  const runId = dependencies.ids.uuid();
  const started = dependencies.clock.now();
  dependencies.runs.append({
    'Run ID': runId,
    'Started UTC': started.toISOString(),
    Environment: dependencies.environment,
    'Requested Action':
      dependencies.origin === 'LIVE' ? 'SYNC_TRANSACTIONS_LIVE' : 'SYNC_TRANSACTIONS',
    Status: 'RUNNING',
    'Last Completed Stage': 'STARTED',
  });

  const accounts = selected(dependencies.accounts.list());
  const end = today(dependencies.clock);
  const overlap = Math.min(
    Math.max(Number(dependencies.settings.get('Overlap Days') ?? '14'), 1),
    90,
  );
  const liveOverlap = Math.min(
    Math.max(Number(dependencies.settings.get('Live Overlap Days') ?? '3'), 1),
    overlap,
  );
  const days = dependencies.origin === 'LIVE' ? liveOverlap : overlap;
  const state = dependencies.state.get();
  const initial = dependencies.settings.get('Initial Import Start Date') ?? subtractDays(end, 30);
  const fromDate = subtractDays(state.lastSuccessfulWindowEnd ?? initial, days);
  const counters = { ...empty, accountCount: accounts.length };
  let failedAccounts = 0;

  try {
    for (const account of accounts) {
      try {
        const currency = typeof account.Currency === 'string' ? account.Currency : '';
        if (!currency)
          throw new InvestecError('RESPONSE_INVALID', 'Refresh balances before transaction sync.');
        const page = getTransactions(dependencies.client, account['Provider Account ID'], {
          fromDate,
          toDate: end,
        });
        counters.pages += page.totalPages;
        const normalized = normalizeTransactionsResponse(
          page.body,
          dependencies.environment,
          account['Account Key'],
          account['Provider Account ID'],
          currency,
          dependencies.clock.now(),
          dependencies.hasher,
        );
        counters.received += normalized.received;
        counters.rejected += normalized.rejected;
        if (duplicateConflict(normalized.transactions)) {
          throw new InvestecError(
            'RESPONSE_INVALID',
            'Conflicting duplicate transaction identities returned.',
          );
        }
        const result = dependencies.transactions.upsert(normalized.transactions);
        counters.inserted += result.inserted;
        counters.updated += result.updated;
        counters.unchanged += result.unchanged;
        counters.promotions += result.promotions;
      } catch (error) {
        failedAccounts += 1;
        counters.rejected += 1;
        dependencies.logger.warn({
          event: 'investec.transaction_account_failed',
          fields: { runId, accountKeyHash: account['Account Key'], code: errorCode(error) },
        });
      }
    }
    const successful = failedAccounts === 0 && counters.rejected === 0;
    const status = successful ? 'SUCCEEDED' : 'PARTIAL';
    if (successful) {
      dependencies.state.save({
        lastSuccessfulWindowEnd: end,
        lastSuccessfulSyncUtc: dependencies.clock.now().toISOString(),
        lastSuccessfulRunId: runId,
        identityVersion: TRANSACTION_IDENTITY_VERSION,
      });
      updateCurrentCycle(dependencies.gateway, dependencies.clock, dependencies.environment);
    }
    dependencies.runs.update(runId, {
      'Finished UTC': dependencies.clock.now().toISOString(),
      'Account Count': accounts.length,
      'Window Start': fromDate,
      'Window End': end,
      'Pages Requested': counters.pages,
      'Records Received': counters.received,
      Inserted: counters.inserted,
      Updated: counters.updated,
      Unchanged: counters.unchanged,
      Rejected: counters.rejected,
      Status: status,
      'Last Completed Stage': successful ? 'TRANSACTIONS_WRITTEN' : 'PARTIAL',
    });
    return { status, runId, ...counters };
  } catch (error) {
    const code = errorCode(error);
    dependencies.logger.error({
      event: 'investec.transaction_sync_failed',
      fields: { runId, code },
    });
    dependencies.runs.update(runId, {
      'Finished UTC': dependencies.clock.now().toISOString(),
      Status: 'FAILED',
      'Last Completed Stage': 'FAILED',
      'Error Code': code,
      'Error Message': 'Transaction synchronization failed safely.',
    });
    return { status: 'FAILED', runId, ...counters };
  } finally {
    lock.release();
  }
}
