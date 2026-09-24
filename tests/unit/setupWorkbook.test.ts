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
});
