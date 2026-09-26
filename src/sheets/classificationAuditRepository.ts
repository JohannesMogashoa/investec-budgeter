import type { SheetGateway, SheetValue } from '../platform/ports';
import { getSchema } from './schemaManifest';
import {
  indexBy,
  readStoredRecords,
  requireSheet,
  valuesForRecord,
  type SheetRecord,
} from './repositorySupport';

const schema = getSchema('Classification Audit');

export type ClassificationAuditRecord = SheetRecord & {
  'Audit Key': string;
  'Transaction Row Key': string;
  'Rule Set Version': string;
  Outcome: string;
};

export class ClassificationAuditRepository {
  private readonly sheet;

  constructor(gateway: SheetGateway) {
    this.sheet = requireSheet(gateway, schema);
  }

  list(): ClassificationAuditRecord[] {
    return readStoredRecords(this.sheet, schema.headers).map(
      ({ record }) => record as ClassificationAuditRecord,
    );
  }

  upsert(records: readonly ClassificationAuditRecord[]): void {
    const existing = indexBy(readStoredRecords(this.sheet, schema.headers), 'Audit Key');
    for (const record of records) {
      if (!record['Audit Key']) throw new Error('Classification audit key cannot be empty.');
      const values: SheetValue[] = valuesForRecord(record, schema.headers);
      const prior = existing.get(record['Audit Key']);
      if (prior) this.sheet.writeValues(prior.rowNumber, 1, [values]);
      else this.sheet.appendValues([values]);
    }
  }
}
