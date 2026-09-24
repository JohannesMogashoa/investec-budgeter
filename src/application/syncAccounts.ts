import type { Clock, Hasher, IdGenerator, LockProvider, Logger } from '../platform/ports';
import { AccountRepository } from '../sheets/accountRepository';
import { SyncRunRepository } from '../sheets/syncRunRepository';
import { normalizeAccountsResponse } from '../investec/accountNormalizer';
import { InvestecError } from '../investec/errors';
import { InvestecHttpClient } from '../investec/httpClient';

export interface AccountSyncDependencies {
  readonly client: InvestecHttpClient;
  readonly accounts: AccountRepository;
  readonly runs: SyncRunRepository;
  readonly clock: Clock;
  readonly locks: LockProvider;
  readonly hasher: Hasher;
  readonly ids: IdGenerator;
  readonly logger: Logger;
  readonly environment: 'sandbox';
}

export interface AccountSyncResult {
  readonly status: 'SUCCEEDED' | 'PARTIAL' | 'FAILED' | 'SKIPPED_LOCKED';
  readonly runId?: string;
  readonly received: number;
  readonly inserted: number;
  readonly updated: number;
  readonly unchanged: number;
  readonly rejected: number;
  readonly inactive: number;
}

function errorCode(error: unknown): string {
  return error instanceof InvestecError ? error.code : 'UNKNOWN';
}

export function syncAccounts(dependencies: AccountSyncDependencies): AccountSyncResult {
  const lock = dependencies.locks.get('investec-bank-sync');
  if (!lock.tryAcquire(5000)) {
    return {
      status: 'SKIPPED_LOCKED',
      received: 0,
      inserted: 0,
      updated: 0,
      unchanged: 0,
      rejected: 0,
      inactive: 0,
    };
  }

  const runId = dependencies.ids.uuid();
  const started = dependencies.clock.now();
  dependencies.runs.append({
    'Run ID': runId,
    'Started UTC': started.toISOString(),
    Environment: dependencies.environment,
    'Requested Action': 'SYNC_ACCOUNTS',
    Status: 'RUNNING',
    'Last Completed Stage': 'STARTED',
  });

  try {
    const response = dependencies.client.get('/za/pb/v1/accounts');
    const normalized = normalizeAccountsResponse(
      response.body,
      dependencies.environment,
      dependencies.clock.now(),
      dependencies.hasher,
    );
    const writeResult = dependencies.accounts.upsert(normalized.accounts);
    const activeKeys = new Set(normalized.accounts.map((account) => account['Account Key']));
    const inactive =
      normalized.rejected === 0 ? dependencies.accounts.markInactiveExcept(activeKeys) : 0;
    const status = normalized.rejected > 0 ? 'PARTIAL' : 'SUCCEEDED';
    dependencies.runs.update(runId, {
      'Finished UTC': dependencies.clock.now().toISOString(),
      'Account Count': normalized.accounts.length,
      'Records Received': normalized.received,
      Inserted: writeResult.inserted,
      Updated: writeResult.updated + inactive,
      Unchanged: writeResult.unchanged,
      Rejected: normalized.rejected,
      Status: status,
      'Last Completed Stage': 'ACCOUNTS_WRITTEN',
    });
    return {
      status,
      runId,
      received: normalized.received,
      inserted: writeResult.inserted,
      updated: writeResult.updated,
      unchanged: writeResult.unchanged,
      rejected: normalized.rejected,
      inactive,
    };
  } catch (error) {
    const code = errorCode(error);
    dependencies.logger.error({ event: 'investec.account_sync_failed', fields: { runId, code } });
    dependencies.runs.update(runId, {
      'Finished UTC': dependencies.clock.now().toISOString(),
      Status: 'FAILED',
      'Last Completed Stage': 'FAILED',
      'Error Code': code,
      'Error Message': 'Account synchronization failed safely.',
    });
    return {
      status: 'FAILED',
      runId,
      received: 0,
      inserted: 0,
      updated: 0,
      unchanged: 0,
      rejected: 0,
      inactive: 0,
    };
  } finally {
    lock.release();
  }
}
