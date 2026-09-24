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

export interface TransactionUpsertResult {
  readonly inserted: number;
  readonly updated: number;
  readonly unchanged: number;
  readonly promotions: number;
}

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

  upsert(transactions: readonly TransactionRecord[]): TransactionUpsertResult {
    const stored = readStoredRecords(this.sheet, schema.headers);
    const existing = indexBy(stored, 'Row Key');
    const aliases = indexBy(stored, 'Identity Alias');
    const providerIds = indexBy(stored, 'Provider Transaction ID');
    let inserted = 0;
    let updated = 0;
    let unchanged = 0;
    let promotions = 0;
    for (const transaction of transactions) {
      if (!transaction['Row Key']) throw new Error('Transaction Row Key cannot be empty.');
      const prior =
        existing.get(transaction['Row Key']) ??
        (transaction['Identity Alias']
          ? aliases.get(String(transaction['Identity Alias']))
          : undefined) ??
        (transaction['Provider Transaction ID']
          ? providerIds.get(String(transaction['Provider Transaction ID']))
          : undefined) ??
        stored.find(
          ({ record }) =>
            !record['Provider Transaction ID'] &&
            record['Provider Account ID'] === transaction['Provider Account ID'] &&
            record['Transaction Date'] === transaction['Transaction Date'] &&
            record.Amount === transaction.Amount &&
            record['Transaction Type'] === transaction['Transaction Type'] &&
            record['Description Raw'] === transaction['Description Raw'],
        );
      const promoting = Boolean(prior && prior.record['Row Key'] !== transaction['Row Key']);
      const merged: SheetRecord = {
        ...(prior?.record ?? {}),
        ...transaction,
        ...(promoting ? { 'Identity Alias': prior?.record['Row Key'] ?? null } : {}),
      };
      for (const column of userOwnedColumns) {
        if (prior) merged[column] = prior.record[column] ?? null;
      }
      if (prior && prior.record['First Imported UTC']) {
        merged['First Imported UTC'] = prior.record['First Imported UTC'];
      }
      const values: SheetValue[] = valuesForRecord(merged, schema.headers);
      if (prior) {
        const payloadChanged =
          prior.record['Provider Payload Hash'] !== merged['Provider Payload Hash'];
        const changed = prior.values.some((value, index) => value !== values[index]);
        if (changed) this.sheet.writeValues(prior.rowNumber, 1, [values]);
        if (payloadChanged || promoting) updated += 1;
        else unchanged += 1;
        if (promoting) promotions += 1;
      } else {
        this.sheet.appendValues([values]);
        inserted += 1;
      }
      existing.set(transaction['Row Key'], {
        rowNumber: prior?.rowNumber ?? this.sheet.getLastRow(),
        values,
        record: merged,
      });
      if (merged['Identity Alias']) {
        aliases.set(String(merged['Identity Alias']), {
          rowNumber: prior?.rowNumber ?? this.sheet.getLastRow(),
          values,
          record: merged,
        });
      }
      if (merged['Provider Transaction ID']) {
        providerIds.set(String(merged['Provider Transaction ID']), {
          rowNumber: prior?.rowNumber ?? this.sheet.getLastRow(),
          values,
          record: merged,
        });
      }
    }
    return { inserted, updated, unchanged, promotions };
  }
}
