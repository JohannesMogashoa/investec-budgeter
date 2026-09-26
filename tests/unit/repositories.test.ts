import { beforeEach, describe, expect, it } from 'vitest';
import { setupWorkbook } from '../../src/application/setupWorkbook';
import { AccountRepository } from '../../src/sheets/accountRepository';
import { SettingsRepository } from '../../src/sheets/settingsRepository';
import { SyncRunRepository } from '../../src/sheets/syncRunRepository';
import { SyncStateRepository } from '../../src/sheets/syncStateRepository';
import { TransactionRepository } from '../../src/sheets/transactionRepository';
import { FakeSheetGateway } from '../fakes/platform';

describe('sheet repositories', () => {
  const gateway = new FakeSheetGateway();

  beforeEach(() => {
    gateway.sheets.clear();
    setupWorkbook(gateway);
  });

  it('reads and updates settings by key without duplicating rows', () => {
    const repository = new SettingsRepository(gateway);

    repository.set('Overlap Days', '14', 'Replay overlap window.');
    repository.set('Overlap Days', '21');

    expect(repository.get('Overlap Days')).toBe('21');
    expect(repository.all()).toEqual([
      { key: 'Overlap Days', value: '21', description: 'Replay overlap window.' },
    ]);
  });

  it('upserts accounts while preserving user-owned selection', () => {
    const repository = new AccountRepository(gateway);
    repository.upsert([
      {
        'Account Key': 'sandbox:account-1',
        'Provider Account ID': 'account-1',
        'Account Name': 'Everyday',
        'Is Selected': true,
      },
    ]);

    repository.upsert([
      {
        'Account Key': 'sandbox:account-1',
        'Provider Account ID': 'account-1',
        'Account Name': 'Everyday Account',
        'Is Active': true,
      },
    ]);

    expect(repository.list()).toEqual([
      expect.objectContaining({
        'Account Name': 'Everyday Account',
        'Is Selected': true,
        'Is Active': true,
      }),
    ]);
  });

  it('upserts transactions without overwriting user-owned fields', () => {
    const repository = new TransactionRepository(gateway);
    repository.upsert([
      {
        'Row Key': 'v1:transaction-1',
        Amount: -125.5,
        'Description Raw': 'GROCERY STORE',
        Category: 'Food',
        'User Note': 'Check receipt',
      },
    ]);

    repository.upsert([
      {
        'Row Key': 'v1:transaction-1',
        Amount: -130.5,
        'Description Raw': 'GROCERY STORE UPDATED',
        Category: 'Should not replace user data',
      },
    ]);

    expect(repository.list()).toEqual([
      expect.objectContaining({
        Amount: -130.5,
        'Description Raw': 'GROCERY STORE UPDATED',
        Category: 'Food',
        'User Note': 'Check receipt',
      }),
    ]);
  });

  it('stores checkpoint fields as non-secret system state', () => {
    const repository = new SyncStateRepository(gateway);
    repository.save({
      lastSuccessfulWindowEnd: '2026-01-31',
      lastSuccessfulRunId: 'run-1',
      identityVersion: 'v1',
    });

    expect(repository.get()).toEqual({
      lastSuccessfulWindowEnd: '2026-01-31',
      lastSuccessfulRunId: 'run-1',
      identityVersion: 'v1',
      schemaVersion: '1.2.0',
    });
  });

  it('appends and updates sync run records by run id', () => {
    const repository = new SyncRunRepository(gateway);
    repository.append({ 'Run ID': 'run-1', Status: 'RUNNING' });
    repository.update('run-1', { Status: 'SUCCEEDED', Inserted: 3 });

    expect(repository.list()).toEqual([
      expect.objectContaining({ 'Run ID': 'run-1', Status: 'SUCCEEDED', Inserted: 3 }),
    ]);
  });
});
