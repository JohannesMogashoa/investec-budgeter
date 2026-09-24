import type { SheetGateway } from '../platform/ports';
import { getSchema } from './schemaManifest';
import {
  indexBy,
  readStoredRecords,
  requireSheet,
  valuesForRecord,
  type SheetRecord,
} from './repositorySupport';

const schema = getSchema('System');

export interface SyncCheckpoint {
  readonly lastSuccessfulWindowEnd?: string;
  readonly lastSuccessfulSyncUtc?: string;
  readonly lastContinuationToken?: string;
  readonly lastSuccessfulRunId?: string;
  readonly schemaVersion?: string;
  readonly identityVersion?: string;
  readonly liveSyncUntilUtc?: string;
  readonly liveSyncEnabled?: string;
}

const stateKeys: Record<keyof SyncCheckpoint, string> = {
  lastSuccessfulWindowEnd: 'Last Successful Window End',
  lastSuccessfulSyncUtc: 'Last Successful Sync UTC',
  lastContinuationToken: 'Last Continuation Token',
  lastSuccessfulRunId: 'Last Successful Run ID',
  schemaVersion: 'Schema Version',
  identityVersion: 'Identity Version',
  liveSyncUntilUtc: 'Live Sync Until UTC',
  liveSyncEnabled: 'Live Sync Enabled',
};

export class SyncStateRepository {
  private readonly sheet;

  constructor(gateway: SheetGateway) {
    this.sheet = requireSheet(gateway, schema);
  }

  get(): SyncCheckpoint {
    const rows = indexBy(readStoredRecords(this.sheet, schema.headers), 'Key');
    const result: Record<string, string> = {};
    for (const [property, key] of Object.entries(stateKeys)) {
      const value = rows.get(key)?.record.Value;
      if (value !== null && value !== undefined && value !== '') result[property] = String(value);
    }
    return result as SyncCheckpoint;
  }

  save(checkpoint: SyncCheckpoint): void {
    const rows = indexBy(readStoredRecords(this.sheet, schema.headers), 'Key');
    for (const [property, key] of Object.entries(stateKeys)) {
      const value = checkpoint[property as keyof SyncCheckpoint];
      if (value === undefined) continue;
      const prior = rows.get(key);
      const record: SheetRecord = { Key: key, Value: value };
      const values = valuesForRecord(record, schema.headers);
      if (prior) this.sheet.writeValues(prior.rowNumber, 1, [values]);
      else this.sheet.appendValues([values]);
    }
  }
}
