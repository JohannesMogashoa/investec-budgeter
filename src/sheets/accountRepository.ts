import type { SheetGateway, SheetValue } from '../platform/ports';
import { getSchema } from './schemaManifest';
import {
  indexBy,
  readStoredRecords,
  requireSheet,
  valuesForRecord,
  type SheetRecord,
} from './repositorySupport';

const schema = getSchema('Accounts');
const userOwnedColumns = new Set(['Is Selected']);

export type AccountRecord = SheetRecord & {
  'Account Key': string;
  'Provider Account ID': string;
};

export class AccountRepository {
  private readonly sheet;

  constructor(gateway: SheetGateway) {
    this.sheet = requireSheet(gateway, schema);
  }

  list(): AccountRecord[] {
    return readStoredRecords(this.sheet, schema.headers).map(
      ({ record }) => record as AccountRecord,
    );
  }

  upsert(accounts: readonly AccountRecord[]): void {
    const existing = indexBy(readStoredRecords(this.sheet, schema.headers), 'Account Key');
    for (const account of accounts) {
      if (!account['Account Key']) throw new Error('Account Key cannot be empty.');
      const prior = existing.get(account['Account Key']);
      const merged = { ...(prior?.record ?? {}), ...account };
      for (const column of userOwnedColumns) {
        if (prior) merged[column] = prior.record[column] ?? null;
      }
      const values: SheetValue[] = valuesForRecord(merged, schema.headers);
      if (prior) this.sheet.writeValues(prior.rowNumber, 1, [values]);
      else this.sheet.appendValues([values]);
      existing.set(account['Account Key'], {
        rowNumber: prior?.rowNumber ?? this.sheet.getLastRow(),
        values,
        record: merged,
      });
    }
  }
}
