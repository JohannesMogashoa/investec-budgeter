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

export interface AccountUpsertResult {
  readonly inserted: number;
  readonly updated: number;
  readonly unchanged: number;
}

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

  upsert(accounts: readonly AccountRecord[]): AccountUpsertResult {
    const existing = indexBy(readStoredRecords(this.sheet, schema.headers), 'Account Key');
    let inserted = 0;
    let updated = 0;
    let unchanged = 0;
    for (const account of accounts) {
      if (!account['Account Key']) throw new Error('Account Key cannot be empty.');
      const prior = existing.get(account['Account Key']);
      const merged: SheetRecord = {
        ...(prior?.record ?? {}),
        ...account,
        ...(prior
          ? { 'First Seen UTC': prior.record['First Seen UTC'] ?? null }
          : { 'Is Selected': account['Is Selected'] ?? false }),
      };
      for (const column of userOwnedColumns) {
        if (prior) merged[column] = prior.record[column] ?? null;
      }
      const values: SheetValue[] = valuesForRecord(merged, schema.headers);
      if (prior) {
        const changed = prior.values.some((value, index) => value !== values[index]);
        if (changed) {
          this.sheet.writeValues(prior.rowNumber, 1, [values]);
          updated += 1;
        } else {
          unchanged += 1;
        }
      } else {
        this.sheet.appendValues([values]);
        inserted += 1;
      }
      existing.set(account['Account Key'], {
        rowNumber: prior?.rowNumber ?? this.sheet.getLastRow(),
        values,
        record: merged,
      });
    }
    return { inserted, updated, unchanged };
  }

  markInactiveExcept(activeAccountKeys: ReadonlySet<string>): number {
    const records = readStoredRecords(this.sheet, schema.headers);
    let changed = 0;
    for (const stored of records) {
      if (activeAccountKeys.has(String(stored.record['Account Key'] ?? ''))) continue;
      if (stored.record['Is Active'] === false) continue;
      const values = valuesForRecord({ ...stored.record, 'Is Active': false }, schema.headers);
      this.sheet.writeValues(stored.rowNumber, 1, [values]);
      changed += 1;
    }
    return changed;
  }

  patchByAccountKey(accountKey: string, changes: Readonly<SheetRecord>): boolean {
    const prior = indexBy(readStoredRecords(this.sheet, schema.headers), 'Account Key').get(
      accountKey,
    );
    if (!prior) throw new Error(`Account "${accountKey}" was not found.`);
    const values = valuesForRecord({ ...prior.record, ...changes }, schema.headers);
    if (prior.values.every((value, index) => value === values[index])) return false;
    this.sheet.writeValues(prior.rowNumber, 1, [values]);
    return true;
  }
}
