import { describe, expect, it } from 'vitest';
import { setupWorkbook } from '../../src/application/setupWorkbook';
import { syncAccounts } from '../../src/application/syncAccounts';
import { syncBalances } from '../../src/application/syncBalances';
import { AuthClient } from '../../src/investec/authClient';
import {
  normalizeAccountsResponse,
  normalizeBalanceResponse,
} from '../../src/investec/accountNormalizer';
import { CredentialStore } from '../../src/investec/credentials';
import { InvestecHttpClient } from '../../src/investec/httpClient';
import { AccountRepository } from '../../src/sheets/accountRepository';
import { SyncRunRepository } from '../../src/sheets/syncRunRepository';
import type { Hasher, IdGenerator } from '../../src/platform/ports';
import {
  FakeClock,
  FakeHttpTransport,
  FakeLockProvider,
  FakeLogger,
  FakeSecretStore,
  FakeSleeper,
  FakeSheetGateway,
} from '../fakes/platform';

class FakeHasher implements Hasher {
  sha256(value: string): string {
    return `hash:${value}`;
  }
}

class FakeIds implements IdGenerator {
  private counter = 0;

  uuid(): string {
    this.counter += 1;
    return `run-${this.counter}`;
  }
}

function createClient(transport: FakeHttpTransport): InvestecHttpClient {
  const secrets = new FakeSecretStore();
  new CredentialStore(secrets).save({ clientId: 'client', clientSecret: 'secret', apiKey: 'key' });
  const auth = new AuthClient(
    new CredentialStore(secrets),
    transport,
    new MapCache(),
    new FakeClock(),
    new FakeLockProvider(),
    new FakeLogger(),
    { encode: () => 'basic' },
  );
  return new InvestecHttpClient(
    auth,
    transport,
    new FakeClock(),
    new FakeSleeper(),
    new FakeLogger(),
  );
}

class MapCache {
  private readonly values = new Map<string, string>();

  get(key: string): string | undefined {
    return this.values.get(key);
  }

  put(key: string, value: string): void {
    this.values.set(key, value);
  }

  remove(key: string): void {
    this.values.delete(key);
  }
}

const tokenResponse = {
  status: 200,
  headers: {},
  body: JSON.stringify({ access_token: 'token', token_type: 'Bearer', expires_in: 1800 }),
};

function accountDto(accountId: string, overrides: Record<string, unknown> = {}) {
  return {
    accountId,
    accountNumber: '1234567890',
    accountName: 'Synthetic Account',
    referenceName: 'Synthetic Reference',
    productName: 'Private Bank Account',
    kycCompliant: true,
    profileId: 'profile-1',
    profileName: 'Synthetic Profile',
    ...overrides,
  };
}

describe('account and balance synchronization', () => {
  it('normalizes account identity and masks account numbers', () => {
    const result = normalizeAccountsResponse(
      JSON.stringify({
        data: {
          accounts: [accountDto('account-1', { accountName: 'Everyday' })],
        },
      }),
      'sandbox',
      new Date('2026-01-01T00:00:00.000Z'),
      new FakeHasher(),
    );

    expect(result.accounts[0]).toMatchObject({
      'Account Key': 'hash:sandbox|account-1',
      'Account Number Masked': '********7890',
      Currency: null,
      'Is Active': true,
    });
  });

  it('rejects malformed account records but keeps valid records countable', () => {
    const result = normalizeAccountsResponse(
      JSON.stringify({
        data: { accounts: [accountDto('valid'), accountDto('invalid', { accountId: 42 })] },
      }),
      'sandbox',
      new Date('2026-01-01T00:00:00.000Z'),
      new FakeHasher(),
    );

    expect(result.received).toBe(2);
    expect(result.rejected).toBe(1);
    expect(result.accounts).toHaveLength(1);
  });

  it('fails closed on duplicate provider account ids', () => {
    expect(() =>
      normalizeAccountsResponse(
        JSON.stringify({ data: { accounts: [accountDto('same'), accountDto('same')] } }),
        'sandbox',
        new Date('2026-01-01T00:00:00.000Z'),
        new FakeHasher(),
      ),
    ).toThrow('Duplicate accountId');
  });

  it('normalizes a balance without inferring available balance', () => {
    expect(
      normalizeBalanceResponse(
        JSON.stringify({
          data: {
            accountId: 'account-1',
            currentBalance: 100.25,
            availableBalance: 90.25,
            budgetBalance: 0,
            straightBalance: 0,
            cashBalance: 100.25,
            currency: 'ZAR',
          },
        }),
        new Date('2026-01-01T00:00:00.000Z'),
        'account-1',
      ),
    ).toEqual({
      currentBalance: 100.25,
      availableBalance: 90.25,
      currency: 'ZAR',
      balanceAsOfUtc: '2026-01-01T00:00:00.000Z',
    });
  });

  it('marks missing accounts inactive only after a complete discovery', () => {
    const gateway = new FakeSheetGateway();
    setupWorkbook(gateway);
    const accounts = new AccountRepository(gateway);
    accounts.upsert([
      { 'Account Key': 'hash:sandbox|old', 'Provider Account ID': 'old', 'Is Active': true },
    ]);
    const transport = new FakeHttpTransport();
    transport.responses.push(tokenResponse, {
      status: 200,
      headers: {},
      body: JSON.stringify({ data: { accounts: [accountDto('new')] } }),
    });
    const clock = new FakeClock();
    const result = syncAccounts({
      client: createClient(transport),
      accounts,
      runs: new SyncRunRepository(gateway),
      clock,
      locks: new FakeLockProvider(),
      hasher: new FakeHasher(),
      ids: new FakeIds(),
      logger: new FakeLogger(),
      environment: 'sandbox',
    });

    expect(result.status).toBe('SUCCEEDED');
    expect(accounts.list()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ 'Provider Account ID': 'old', 'Is Active': false }),
        expect.objectContaining({ 'Provider Account ID': 'new', 'Is Active': true }),
      ]),
    );
  });

  it('does not mark accounts inactive when discovery is partial', () => {
    const gateway = new FakeSheetGateway();
    setupWorkbook(gateway);
    const accounts = new AccountRepository(gateway);
    accounts.upsert([
      { 'Account Key': 'hash:sandbox|old', 'Provider Account ID': 'old', 'Is Active': true },
    ]);
    const transport = new FakeHttpTransport();
    transport.responses.push(tokenResponse, {
      status: 200,
      headers: {},
      body: JSON.stringify({
        data: { accounts: [accountDto('new'), accountDto('invalid', { accountId: 12 })] },
      }),
    });
    const result = syncAccounts({
      client: createClient(transport),
      accounts,
      runs: new SyncRunRepository(gateway),
      clock: new FakeClock(),
      locks: new FakeLockProvider(),
      hasher: new FakeHasher(),
      ids: new FakeIds(),
      logger: new FakeLogger(),
      environment: 'sandbox',
    });

    expect(result.status).toBe('PARTIAL');
    expect(accounts.list()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ 'Provider Account ID': 'old', 'Is Active': true }),
      ]),
    );
  });

  it('preserves a failed account balance while updating successful selected accounts', () => {
    const gateway = new FakeSheetGateway();
    setupWorkbook(gateway);
    const accounts = new AccountRepository(gateway);
    accounts.upsert([
      {
        'Account Key': 'hash:sandbox|one',
        'Provider Account ID': 'one',
        'Is Active': true,
        'Is Selected': true,
        'Current Balance': 10,
        'Available Balance': 9,
        Currency: 'ZAR',
      },
      {
        'Account Key': 'hash:sandbox|two',
        'Provider Account ID': 'two',
        'Is Active': true,
        'Is Selected': true,
        'Current Balance': 20,
        'Available Balance': 19,
        Currency: 'ZAR',
      },
    ]);
    const transport = new FakeHttpTransport();
    transport.responses.push(
      tokenResponse,
      {
        status: 200,
        headers: {},
        body: JSON.stringify({
          data: {
            accountId: 'one',
            currentBalance: 11,
            availableBalance: 10,
            budgetBalance: 0,
            straightBalance: 0,
            cashBalance: 11,
            currency: 'ZAR',
          },
        }),
      },
      { status: 403, headers: {}, body: 'forbidden' },
    );
    const result = syncBalances({
      client: createClient(transport),
      accounts,
      runs: new SyncRunRepository(gateway),
      clock: new FakeClock(),
      locks: new FakeLockProvider(),
      ids: new FakeIds(),
      logger: new FakeLogger(),
      environment: 'sandbox',
    });

    expect(result).toMatchObject({ status: 'PARTIAL', updated: 1, rejected: 1 });
    expect(accounts.list()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ 'Provider Account ID': 'one', 'Current Balance': 11 }),
        expect.objectContaining({
          'Provider Account ID': 'two',
          'Current Balance': 20,
          'Available Balance': 19,
        }),
      ]),
    );
  });
});
