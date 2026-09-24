import type { SheetGateway, SheetValue } from '../platform/ports';
import { getSchema } from './schemaManifest';
import {
  indexBy,
  readStoredRecords,
  requireSheet,
  valuesForRecord,
  type SheetRecord,
} from './repositorySupport';

const schema = getSchema('Settings');

export interface Setting {
  readonly key: string;
  readonly value: string;
  readonly description: string;
}

export class SettingsRepository {
  private readonly sheet;

  constructor(gateway: SheetGateway) {
    this.sheet = requireSheet(gateway, schema);
  }

  get(key: string): string | undefined {
    const row = indexBy(readStoredRecords(this.sheet, schema.headers), 'Key').get(key);
    const value = row?.record.Value;
    return value === null || value === undefined ? undefined : String(value);
  }

  all(): Setting[] {
    return readStoredRecords(this.sheet, schema.headers).map(({ record }) => ({
      key: String(record.Key ?? ''),
      value: String(record.Value ?? ''),
      description: String(record.Description ?? ''),
    }));
  }

  set(key: string, value: string, description?: string): void {
    if (!key.trim()) throw new Error('Setting key cannot be empty.');
    const records = readStoredRecords(this.sheet, schema.headers);
    const existing = indexBy(records, 'Key').get(key);
    const record: SheetRecord = {
      Key: key,
      Value: value,
      Description: description ?? existing?.record.Description ?? '',
    };
    const values: SheetValue[] = valuesForRecord(record, schema.headers);
    if (existing) this.sheet.writeValues(existing.rowNumber, 1, [values]);
    else this.sheet.appendValues([values]);
  }
}
