import { describe, expect, it } from 'vitest';
import { IncompatibleWorkbookError, setupWorkbook } from '../../src/application/setupWorkbook';
import { SCHEMA_MANIFEST, WORKBOOK_SCHEMA_VERSION } from '../../src/sheets/schemaManifest';
import { FakeSheet, FakeSheetGateway } from '../fakes/platform';

describe('setupWorkbook', () => {
  it('creates all manifest sheets, headers, formatting, and schema version', () => {
    const gateway = new FakeSheetGateway();

    const result = setupWorkbook(gateway);

    expect(result.createdSheets).toEqual(SCHEMA_MANIFEST.map((schema) => schema.name));
    expect(result.schemaVersion).toBe(WORKBOOK_SCHEMA_VERSION);
    for (const schema of SCHEMA_MANIFEST) {
      const sheet = gateway.getSheet(schema.name) as FakeSheet;
      expect(sheet.readValues()[0]).toEqual(schema.headers);
      expect(sheet.setup?.frozenRows).toBe(1);
    }
    expect(gateway.getSheet('System')?.readValues()).toContainEqual([
      'Schema Version',
      WORKBOOK_SCHEMA_VERSION,
    ]);
  });

  it('creates the rules and classification audit contracts without transaction data', () => {
    const gateway = new FakeSheetGateway();

    setupWorkbook(gateway);

    expect(gateway.getSheet('Rules')?.readValues()[0]).toEqual([
      'Rule ID',
      'Enabled',
      'Priority',
      'Description Match',
      'Description Match Type',
      'Transaction Type Match',
      'Transaction Type Match Type',
      'Amount Operator',
      'Amount Value',
      'Amount Value 2',
      'Merchant Display',
      'Category',
      'Budget Item ID',
    ]);
    expect(gateway.getSheet('Classification Audit')?.readValues()[0]).toEqual([
      'Audit Key',
      'Transaction Row Key',
      'Rule Set Version',
      'Evaluated UTC',
      'Outcome',
      'Matched Rule ID',
      'Candidate Rule IDs',
      'Suggested Category',
      'Suggested Budget Item ID',
      'Merchant Display',
      'Reason',
    ]);
    expect((gateway.getSheet('Rules') as FakeSheet).setup?.protectHeader).toBe(true);
    expect(gateway.getSheet('Transactions')?.readValues()).toHaveLength(1);
  });

  it('is repeatable and does not replace existing rows', () => {
    const gateway = new FakeSheetGateway();
    setupWorkbook(gateway);
    gateway.getSheet('Settings')?.appendValues([['Overlap Days', '14', 'Default overlap.']]);

    const result = setupWorkbook(gateway);

    expect(result.createdSheets).toEqual([]);
    expect(gateway.getSheet('Settings')?.readValues()).toContainEqual([
      'Overlap Days',
      '14',
      'Default overlap.',
    ]);
  });

  it('fails before changing the workbook when an existing header is incompatible', () => {
    const gateway = new FakeSheetGateway();
    gateway.createSheet('Accounts').writeValues(1, 1, [['Account Number', 'Balance']]);

    expect(() => setupWorkbook(gateway)).toThrow(IncompatibleWorkbookError);
    expect(gateway.getSheet('Settings')).toBeUndefined();
    expect(gateway.getSheet('Accounts')?.readValues()).toEqual([['Account Number', 'Balance']]);
  });

  it('accepts an existing empty technical sheet', () => {
    const gateway = new FakeSheetGateway();
    gateway.createSheet('Transactions');

    setupWorkbook(gateway);

    expect(gateway.getSheet('Transactions')?.readValues()[0]).toEqual(
      SCHEMA_MANIFEST.find((schema) => schema.name === 'Transactions')?.headers,
    );
  });

  it('migrates the imported budget template settings layout', () => {
    const gateway = new FakeSheetGateway();
    gateway
      .createSheet('Settings')
      .writeValues(1, 1, [
        ['Investec Budgeter — Settings'],
        [],
        ['Setting', 'Value', '', 'Validation Lists'],
        ['ActivePeriod', '2026-09', '', 'Income'],
        ['DefaultCurrency', 'ZAR', '', 'Obligation'],
      ]);

    setupWorkbook(gateway);

    expect(gateway.getSheet('Settings')?.readValues()).toEqual([
      ['Key', 'Value', 'Description'],
      ['ActivePeriod', '2026-09', ''],
      ['DefaultCurrency', 'ZAR', ''],
    ]);
  });

  it('migrates the compact legacy settings layout', () => {
    const gateway = new FakeSheetGateway();
    gateway
      .createSheet('Settings')
      .writeValues(1, 1, [
        ['Key'],
        ['ActivePeriod', 46266],
        ['DefaultCurrency', 'ZAR'],
        ['Source / reference'],
        ['Current tracker', 'Spending Tracker 2026'],
      ]);

    setupWorkbook(gateway);

    expect(gateway.getSheet('Settings')?.readValues()).toEqual([
      ['Key', 'Value', 'Description'],
      ['ActivePeriod', 46266, ''],
      ['DefaultCurrency', 'ZAR', ''],
      ['Source / reference', '', ''],
      ['Current tracker', 'Spending Tracker 2026', ''],
    ]);
  });

  it('archives and rebuilds the known V1.3 Transactions layout', () => {
    const gateway = new FakeSheetGateway();
    const legacyRows = [
      ['Transactions — Canonical Ledger'],
      [],
      [
        'TransactionId',
        'ProviderTransactionKey',
        'AccountId',
        'TransactionDate',
        'PostingDate',
        'Description',
        'Direction',
        'Amount',
        'SignedCashAmount',
        'Currency',
        'RunningBalance',
        'TransactionType',
        'PostedOrder',
        'ImportState',
        'MatchingState',
        'CategoryId',
        'AllocatedAmount',
        'UnallocatedAmount',
      ],
      ['demo-1', 'provider-1', 'account-1', '2026-09-01', '2026-09-01', 'demo row'],
    ];
    const sheet = gateway.createSheet('Transactions');
    sheet.writeValues(1, 1, legacyRows);

    const result = setupWorkbook(gateway);

    expect(result.archivedSheets).toEqual(['_Archive_Transactions_V1_3']);
    expect(gateway.getSheet('_Archive_Transactions_V1_3')?.readValues()).toEqual(legacyRows);
    expect(sheet.readValues()[0]).toEqual(
      SCHEMA_MANIFEST.find((schema) => schema.name === 'Transactions')?.headers,
    );
    expect(sheet.readValues()).toHaveLength(1);
    expect(setupWorkbook(gateway).archivedSheets).toEqual([]);
  });

  it('uses a unique archive name when the preferred archive already exists', () => {
    const gateway = new FakeSheetGateway();
    gateway.createSheet('_Archive_Transactions_V1_3');
    gateway
      .createSheet('Transactions')
      .writeValues(1, 1, [
        ['Transactions — Canonical Ledger'],
        [],
        [
          'TransactionId',
          'ProviderTransactionKey',
          'AccountId',
          'TransactionDate',
          'PostingDate',
          'Description',
          'Direction',
          'Amount',
          'SignedCashAmount',
          'Currency',
          'RunningBalance',
          'TransactionType',
          'PostedOrder',
          'ImportState',
          'MatchingState',
          'CategoryId',
          'AllocatedAmount',
          'UnallocatedAmount',
        ],
        ['demo-1'],
      ]);

    const result = setupWorkbook(gateway);

    expect(result.archivedSheets).toEqual(['_Archive_Transactions_V1_3_2']);
    expect(gateway.getSheet('_Archive_Transactions_V1_3_2')?.readValues()[3]?.[0]).toBe('demo-1');
  });

  it('refuses an unrecognized transaction layout', () => {
    const gateway = new FakeSheetGateway();
    gateway
      .createSheet('Transactions')
      .writeValues(1, 1, [
        ['Transactions — Canonical Ledger'],
        [],
        ['TransactionId', 'Unexpected Header'],
      ]);

    expect(() => setupWorkbook(gateway)).toThrow(IncompatibleWorkbookError);
    expect(gateway.getSheet('_Archive_Transactions_V1_3')).toBeUndefined();
  });

  it('preflights every sheet before archiving a recognized legacy Transactions tab', () => {
    const gateway = new FakeSheetGateway();
    gateway
      .createSheet('Transactions')
      .writeValues(1, 1, [
        ['Transactions — Canonical Ledger'],
        [],
        [
          'TransactionId',
          'ProviderTransactionKey',
          'AccountId',
          'TransactionDate',
          'PostingDate',
          'Description',
          'Direction',
          'Amount',
          'SignedCashAmount',
          'Currency',
          'RunningBalance',
          'TransactionType',
          'PostedOrder',
          'ImportState',
          'MatchingState',
          'CategoryId',
          'AllocatedAmount',
          'UnallocatedAmount',
        ],
      ]);
    gateway.createSheet('Accounts').writeValues(1, 1, [['Old Account', 'Old Balance']]);

    expect(() => setupWorkbook(gateway)).toThrow(IncompatibleWorkbookError);
    expect(gateway.getSheet('_Archive_Transactions_V1_3')).toBeUndefined();
    expect(gateway.getSheet('Transactions')?.readValues()[0]?.[0]).toBe(
      'Transactions — Canonical Ledger',
    );
  });
});
