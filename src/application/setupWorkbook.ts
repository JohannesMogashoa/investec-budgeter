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

function isTemplateSettingsLayout(sheet: SheetPort): boolean {
  const values = sheet.readValues();
  const header = values[2] ?? [];
  return (
    String(values[0]?.[0] ?? '').includes('Investec Budgeter') &&
    String(header[0] ?? '') === 'Setting' &&
    String(header[1] ?? '') === 'Value'
  );
}

function isLegacySettingsLayout(sheet: SheetPort): boolean {
  const values = sheet.readValues();
  const header = values[0] ?? [];
  return (
    String(header[0] ?? '').trim() === 'Key' &&
    header.slice(1).every((value) => String(value ?? '').trim() === '')
  );
}

function migrateTemplateSettings(sheet: SheetPort, schema: SheetSchema): void {
  const values = sheet.readValues();
  const settings = values
    .slice(3)
    .filter((row) => String(row[0] ?? '').trim() !== '')
    .map((row) => [row[0] ?? '', row[1] ?? '', '']);
  sheet.clearValues();
  sheet.writeValues(1, 1, [[...schema.headers]]);
  if (settings.length > 0) sheet.writeValues(2, 1, settings);
}

function migrateLegacySettings(sheet: SheetPort, schema: SheetSchema): void {
  const settings = sheet
    .readValues()
    .slice(1)
    .filter((row) => String(row[0] ?? '').trim() !== '')
    .map((row) => [row[0] ?? '', row[1] ?? '', row[2] ?? '']);
  sheet.clearValues();
  sheet.writeValues(1, 1, [[...schema.headers]]);
  if (settings.length > 0) sheet.writeValues(2, 1, settings);
}

function validateExistingSheet(
  sheet: SheetPort,
  schema: SheetSchema,
  proposedHeader = firstRow(sheet),
): void {
  const actual = proposedHeader;
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
  const migrations: Array<() => void> = [];

  // Preflight every existing sheet before creating or changing anything.
  for (const schema of SCHEMA_MANIFEST) {
    const sheet = gateway.getSheet(schema.name);
    if (sheet) {
      let migrate: (() => void) | undefined;
      if (schema.name === 'Settings' && isTemplateSettingsLayout(sheet)) {
        migrate = () => migrateTemplateSettings(sheet, schema);
      } else if (schema.name === 'Settings' && isLegacySettingsLayout(sheet)) {
        migrate = () => migrateLegacySettings(sheet, schema);
      }
      validateExistingSheet(sheet, schema, migrate ? [...schema.headers] : undefined);
      if (migrate) migrations.push(migrate);
      existing.set(schema.name, sheet);
    }
  }

  // Apply recognized migrations only after all existing sheets pass preflight.
  migrations.forEach((migrate) => migrate());

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
