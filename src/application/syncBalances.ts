import type { Clock, IdGenerator, LockProvider, Logger } from '../platform/ports';
import { AccountRepository, type AccountRecord } from '../sheets/accountRepository';
import { SyncRunRepository } from '../sheets/syncRunRepository';
import { normalizeBalanceResponse } from '../investec/accountNormalizer';
import { InvestecError } from '../investec/errors';
import { InvestecHttpClient } from '../investec/httpClient';

export interface BalanceSyncDependencies {
  readonly client: InvestecHttpClient;
  readonly accounts: AccountRepository;
  readonly runs: SyncRunRepository;
  readonly clock: Clock;
  readonly locks: LockProvider;
  readonly ids: IdGenerator;
  readonly logger: Logger;
  readonly environment: 'sandbox';
}

export interface BalanceSyncResult {
  readonly status: 'SUCCEEDED' | 'PARTIAL' | 'FAILED' | 'SKIPPED_LOCKED';
  readonly runId?: string;
  readonly accountCount: number;
  readonly updated: number;
  readonly unchanged: number;
  readonly rejected: number;
}

function selectedActiveAccounts(accounts: readonly AccountRecord[]): AccountRecord[] {
  return accounts.filter(
    (account) =>
      account['Is Active'] === true &&
      (account['Is Selected'] === true || account['Is Selected'] === 'TRUE'),
  );
}

function errorCode(error: unknown): string {
  return error instanceof InvestecError ? error.code : 'UNKNOWN';
}

export function syncBalances(dependencies: BalanceSyncDependencies): BalanceSyncResult {
  const lock = dependencies.locks.get('investec-bank-sync');
  if (!lock.tryAcquire(5000)) {
    return { status: 'SKIPPED_LOCKED', accountCount: 0, updated: 0, unchanged: 0, rejected: 0 };
  }

  const runId = dependencies.ids.uuid();
  dependencies.runs.append({
    'Run ID': runId,
    'Started UTC': dependencies.clock.now().toISOString(),
    Environment: dependencies.environment,
    'Requested Action': 'SYNC_BALANCES',
    Status: 'RUNNING',
    'Last Completed Stage': 'STARTED',
  });

  let updated = 0;
  let unchanged = 0;
  let rejected = 0;

  try {
    const candidates = selectedActiveAccounts(dependencies.accounts.list());
    for (const account of candidates) {
      try {
        const response = dependencies.client.get(
          `/za/pb/v1/accounts/${encodeURIComponent(account['Provider Account ID'])}/balance`,
        );
        const balance = normalizeBalanceResponse(
          response.body,
          dependencies.clock.now(),
          account['Provider Account ID'],
        );
        const changes = {
          'Current Balance': balance.currentBalance,
          'Available Balance': balance.availableBalance,
          Currency: balance.currency,
          'Balance As Of UTC': balance.balanceAsOfUtc,
        };
        if (dependencies.accounts.patchByAccountKey(account['Account Key'], changes)) updated += 1;
        else unchanged += 1;
      } catch (error) {
        rejected += 1;
        dependencies.logger.warn({
          event: 'investec.balance_refresh_failed',
          fields: { accountKeyHash: account['Account Key'], code: errorCode(error) },
        });
      }
    }

    const status = rejected === 0 ? 'SUCCEEDED' : 'PARTIAL';
    dependencies.runs.update(runId, {
      'Finished UTC': dependencies.clock.now().toISOString(),
      'Account Count': candidates.length,
      'Records Received': candidates.length - rejected,
      Updated: updated,
      Unchanged: unchanged,
      Rejected: rejected,
      Status: status,
      'Last Completed Stage': 'BALANCES_WRITTEN',
    });
    return { status, runId, accountCount: candidates.length, updated, unchanged, rejected };
  } catch (error) {
    const code = errorCode(error);
    dependencies.logger.error({ event: 'investec.balance_sync_failed', fields: { runId, code } });
    dependencies.runs.update(runId, {
      'Finished UTC': dependencies.clock.now().toISOString(),
      Status: 'FAILED',
      'Last Completed Stage': 'FAILED',
      'Error Code': code,
      'Error Message': 'Balance synchronization failed safely.',
    });
    return { status: 'FAILED', runId, accountCount: 0, updated, unchanged, rejected };
  } finally {
    lock.release();
  }
}
