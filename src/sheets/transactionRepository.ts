import type { SheetGateway, SheetValue } from '../platform/ports';
import { getSchema } from './schemaManifest';
import {
  indexBy,
  readStoredRecords,
  requireSheet,
  valuesForRecord,
  type SheetRecord,
} from './repositorySupport';

const schema = getSchema('Transactions');
const userOwnedColumns = new Set([
  'Category',
  'Budget Item ID',
  'Review Status',
  'User Note',
  'Excluded',
]);

export type TransactionRecord = SheetRecord & { 'Row Key': string };

export class TransactionRepository {
  private readonly sheet;

  constructor(gateway: SheetGateway) {
    this.sheet = requireSheet(gateway, schema);
  }

  list(): TransactionRecord[] {
    return readStoredRecords(this.sheet, schema.headers).map(
      ({ record }) => record as TransactionRecord,
    );
  }

  upsert(transactions: readonly TransactionRecord[]): void {
    const existing = indexBy(readStoredRecords(this.sheet, schema.headers), 'Row Key');
    for (const transaction of transactions) {
      if (!transaction['Row Key']) throw new Error('Transaction Row Key cannot be empty.');
      const prior = existing.get(transaction['Row Key']);
      const merged = { ...(prior?.record ?? {}), ...transaction };
      for (const column of userOwnedColumns) {
        if (prior) merged[column] = prior.record[column] ?? null;
      }
      const values: SheetValue[] = valuesForRecord(merged, schema.headers);
      if (prior) this.sheet.writeValues(prior.rowNumber, 1, [values]);
      else this.sheet.appendValues([values]);
      existing.set(transaction['Row Key'], {
        rowNumber: prior?.rowNumber ?? this.sheet.getLastRow(),
        values,
        record: merged,
      });
    }
  }
}
