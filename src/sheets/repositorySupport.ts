import type { SheetGateway, SheetPort, SheetValue } from '../platform/ports';
import type { SheetSchema } from './schemaManifest';

export type SheetRecord = Record<string, SheetValue>;

export interface StoredSheetRecord {
  readonly rowNumber: number;
  readonly values: SheetValue[];
  readonly record: SheetRecord;
}

export function requireSheet(gateway: SheetGateway, schema: SheetSchema): SheetPort {
  const sheet = gateway.getSheet(schema.name);
  if (!sheet) {
    throw new Error(`Technical sheet "${schema.name}" is missing. Run workbook setup first.`);
  }

  const headers = sheet.readValues()[0] ?? [];
  const matches =
    headers.length === schema.headers.length &&
    schema.headers.every((header, index) => String(headers[index] ?? '').trim() === header);
  if (!matches) {
    throw new Error(`Technical sheet "${schema.name}" has incompatible headers.`);
  }
  return sheet;
}

export function readStoredRecords(
  sheet: SheetPort,
  headers: readonly string[],
): StoredSheetRecord[] {
  return sheet
    .readValues()
    .slice(1)
    .map((row, offset) => {
      const values = headers.map((_, index) => {
        const value = row[index] ?? null;
        return typeof value === 'string' && /^'[=+@-]/.test(value) ? value.slice(1) : value;
      });
      const record = Object.fromEntries(
        headers.map((header, index) => [header, values[index]]),
      ) as SheetRecord;
      return { rowNumber: offset + 2, values, record };
    })
    .filter(({ values }) => values.some((value) => value !== null && value !== ''));
}

export function valuesForRecord(
  record: Readonly<SheetRecord>,
  headers: readonly string[],
): SheetValue[] {
  return headers.map((header) => {
    const value = record[header] ?? null;
    if (typeof value === 'string' && /^[=+@-]/.test(value)) return `'${value}`;
    return value;
  });
}

export function indexBy(
  records: readonly StoredSheetRecord[],
  key: string,
): Map<string, StoredSheetRecord> {
  const result = new Map<string, StoredSheetRecord>();
  for (const stored of records) {
    const value = stored.record[key];
    if (typeof value === 'string' && value !== '') result.set(value, stored);
  }
  return result;
}
