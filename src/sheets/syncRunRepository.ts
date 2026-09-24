import type { SheetGateway, SheetValue } from '../platform/ports';
import { getSchema } from './schemaManifest';
import {
  indexBy,
  readStoredRecords,
  requireSheet,
  valuesForRecord,
  type SheetRecord,
} from './repositorySupport';

const schema = getSchema('Sync Runs');

export type SyncRunRecord = SheetRecord & {
  'Run ID': string;
  Status: string;
};

export class SyncRunRepository {
  private readonly sheet;

  constructor(gateway: SheetGateway) {
    this.sheet = requireSheet(gateway, schema);
  }

  list(): SyncRunRecord[] {
    return readStoredRecords(this.sheet, schema.headers).map(
      ({ record }) => record as SyncRunRecord,
    );
  }

  append(run: SyncRunRecord): void {
    if (!run['Run ID']) throw new Error('Sync Run ID cannot be empty.');
    this.sheet.appendValues([valuesForRecord(run, schema.headers)]);
  }

  update(runId: string, changes: Readonly<SheetRecord>): void {
    const prior = indexBy(readStoredRecords(this.sheet, schema.headers), 'Run ID').get(runId);
    if (!prior) throw new Error(`Sync run "${runId}" was not found.`);
    const values: SheetValue[] = valuesForRecord({ ...prior.record, ...changes }, schema.headers);
    this.sheet.writeValues(prior.rowNumber, 1, [values]);
  }
}
