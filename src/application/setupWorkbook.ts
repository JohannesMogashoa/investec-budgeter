import type { SheetGateway, SheetPort } from '../platform/ports';
import {
  SCHEMA_MANIFEST,
  WORKBOOK_SCHEMA_VERSION,
  type SheetSchema,
} from '../sheets/schemaManifest';

export class IncompatibleWorkbookError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IncompatibleWorkbookError';
  }
}

function firstRow(sheet: SheetPort): string[] {
  return (sheet.readValues()[0] ?? []).map((value) => String(value ?? '').trim());
}

function validateExistingSheet(sheet: SheetPort, schema: SheetSchema): void {
  const actual = firstRow(sheet);
  if (actual.length === 0) return;

  const expected = [...schema.headers];
  const matches =
    actual.length === expected.length && actual.every((value, index) => value === expected[index]);
  const appendOnlyMigration =
    actual.length < expected.length && actual.every((value, index) => value === expected[index]);
  if (!matches && !appendOnlyMigration) {
    throw new IncompatibleWorkbookError(
      `Sheet "${schema.name}" has incompatible headers. Expected: ${expected.join(' | ')}`,
    );
  }
}

export interface SetupResult {
  readonly createdSheets: readonly string[];
  readonly updatedSheets: readonly string[];
  readonly schemaVersion: string;
}

/** Creates or safely migrates the technical workbook sheets. */
export function setupWorkbook(gateway: SheetGateway): SetupResult {
  const existing = new Map<string, SheetPort>();

  // Preflight every existing sheet before creating or changing anything.
  for (const schema of SCHEMA_MANIFEST) {
    const sheet = gateway.getSheet(schema.name);
    if (sheet) {
      validateExistingSheet(sheet, schema);
      existing.set(schema.name, sheet);
    }
  }

  const createdSheets: string[] = [];
  const updatedSheets: string[] = [];
  for (const schema of SCHEMA_MANIFEST) {
    const sheet = existing.get(schema.name) ?? gateway.createSheet(schema.name);
    if (!existing.has(schema.name)) {
      createdSheets.push(schema.name);
      sheet.writeValues(1, 1, [[...schema.headers]]);
    } else if (sheet.getLastRow() === 0) {
      sheet.writeValues(1, 1, [[...schema.headers]]);
    } else if (sheet.getLastColumn() < schema.headers.length) {
      sheet.writeValues(1, 1, [[...schema.headers]]);
    }

    sheet.applySetup(schema.setup);
    updatedSheets.push(schema.name);
  }

  const system = gateway.getSheet('System');
  if (!system) throw new Error('System sheet was not created');
  const values = system.readValues();
  const versionRow = values.findIndex((row) => String(row[0] ?? '') === 'Schema Version');
  if (versionRow === -1) {
    system.appendValues([['Schema Version', WORKBOOK_SCHEMA_VERSION]]);
  } else {
    system.writeValues(versionRow + 1, 2, [[WORKBOOK_SCHEMA_VERSION]]);
  }

  return { createdSheets, updatedSheets, schemaVersion: WORKBOOK_SCHEMA_VERSION };
}
