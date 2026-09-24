import type { SheetColumnFormat, SheetSetup } from '../platform/ports';

export const WORKBOOK_SCHEMA_VERSION = '1.0.0';

export type ColumnOwnership = 'provider' | 'system' | 'user';

export interface SchemaColumn extends SheetColumnFormat {
  readonly name: string;
  readonly ownership: ColumnOwnership;
  readonly description: string;
}

export interface SheetSchema {
  readonly name: string;
  readonly headers: readonly string[];
  readonly columns: readonly SchemaColumn[];
  readonly setup: SheetSetup;
}

const column = (
  name: string,
  ownership: ColumnOwnership,
  description: string,
  options: SheetColumnFormat = {},
): SchemaColumn => ({
  name,
  ownership,
  description,
  protected: ownership !== 'user',
  numberFormat: options.numberFormat ?? '@',
  ...options,
});

const sheet = (
  name: string,
  columns: readonly SchemaColumn[],
  options: Partial<SheetSetup> = {},
): SheetSchema => ({
  name,
  headers: columns.map(({ name: header }) => header),
  columns,
  setup: {
    frozenRows: 1,
    headerBackground: '#1f4e78',
    headerFontColor: '#ffffff',
    columns,
    ...options,
  },
});

export const SCHEMA_MANIFEST: readonly SheetSchema[] = [
  sheet('Settings', [
    column('Key', 'system', 'Stable configuration key.'),
    column('Value', 'user', 'Human-editable non-secret configuration value.'),
    column('Description', 'system', 'Explanation of the setting.'),
  ]),
  sheet('Accounts', [
    column('Account Key', 'system', 'Stable internal account key.'),
    column('Provider Account ID', 'provider', 'Opaque provider account identifier.'),
    column('Account Name', 'provider', 'Provider display label.'),
    column('Account Type', 'provider', 'Provider account type or code.'),
    column('Account Number Masked', 'system', 'Masked account number; last four digits only.'),
    column('Currency', 'provider', 'Provider-reported currency.'),
    column('Current Balance', 'provider', 'Current account balance.', { numberFormat: '#,##0.00' }),
    column('Available Balance', 'provider', 'Available account balance.', {
      numberFormat: '#,##0.00',
    }),
    column('Balance As Of UTC', 'system', 'Balance retrieval timestamp.', { numberFormat: '@' }),
    column('Is Selected', 'user', 'Whether this account is included in transaction sync.'),
    column('Is Active', 'system', 'Whether the account is currently returned by the provider.'),
    column('First Seen UTC', 'system', 'First discovery timestamp.', { numberFormat: '@' }),
    column('Last Seen UTC', 'system', 'Most recent discovery timestamp.', { numberFormat: '@' }),
  ]),
  sheet('Transactions', [
    column('Row Key', 'system', 'Versioned deterministic upsert key.'),
    column('Environment', 'system', 'Sandbox or production environment.'),
    column('Account Key', 'system', 'Internal account reference.'),
    column('Provider Account ID', 'provider', 'Opaque provider account identifier.'),
    column(
      'Provider Transaction ID',
      'provider',
      'Stable provider transaction identifier when available.',
    ),
    column('Transaction Type', 'provider', 'Provider transaction type or code.'),
    column('Status', 'provider', 'Provider transaction status.'),
    column('Transaction Date', 'provider', 'Economic or event date.', {
      numberFormat: 'yyyy-mm-dd',
    }),
    column('Posting Date', 'provider', 'Bank posting date.', { numberFormat: 'yyyy-mm-dd' }),
    column('Value Date', 'provider', 'Provider value date.', { numberFormat: 'yyyy-mm-dd' }),
    column('Description Raw', 'provider', 'Exact provider description.'),
    column('Reference Raw', 'provider', 'Exact provider reference.'),
    column('Amount', 'provider', 'Signed provider amount.', { numberFormat: '#,##0.00' }),
    column('Currency', 'provider', 'Provider-reported currency.'),
    column('Running Balance', 'provider', 'Provider-reported running balance.', {
      numberFormat: '#,##0.00',
    }),
    column('Posted Order', 'provider', 'Provider ordering value; preserve zero.'),
    column('Provider Payload Hash', 'system', 'Hash of canonical provider-owned fields.'),
    column('Identity Version', 'system', 'Identity algorithm version.'),
    column('First Imported UTC', 'system', 'Immutable first-import timestamp.', {
      numberFormat: '@',
    }),
    column('Last Seen UTC', 'system', 'Most recent overlapping fetch timestamp.', {
      numberFormat: '@',
    }),
    column('Last Changed UTC', 'system', 'Last provider-payload change timestamp.', {
      numberFormat: '@',
    }),
    column('Sync Run ID', 'system', 'Most recent sync run identifier.'),
    column('Category', 'user', 'Reserved for future categorisation.'),
    column('Budget Item ID', 'user', 'Reserved for future budget reconciliation.'),
    column('Review Status', 'user', 'Reserved for future review workflow.'),
    column('User Note', 'user', 'User-maintained note.'),
    column('Excluded', 'user', 'User-maintained exclusion flag.'),
  ]),
  sheet('Sync Runs', [
    column('Run ID', 'system', 'Unique sync run identifier.'),
    column('Started UTC', 'system', 'Run start timestamp.', { numberFormat: '@' }),
    column('Finished UTC', 'system', 'Run completion timestamp.', { numberFormat: '@' }),
    column('Environment', 'system', 'Sandbox or production environment.'),
    column('Requested Action', 'system', 'Menu or application action.'),
    column('Account Count', 'system', 'Number of accounts involved.'),
    column('Window Start', 'system', 'Requested transaction window start.', {
      numberFormat: 'yyyy-mm-dd',
    }),
    column('Window End', 'system', 'Requested transaction window end.', {
      numberFormat: 'yyyy-mm-dd',
    }),
    column('Pages Requested', 'system', 'Number of provider pages requested.'),
    column('Records Received', 'system', 'Number of provider records received.'),
    column('Inserted', 'system', 'Rows inserted.'),
    column('Updated', 'system', 'Rows updated.'),
    column('Unchanged', 'system', 'Rows whose payload did not change.'),
    column('Rejected', 'system', 'Provider records rejected.'),
    column('Status', 'system', 'RUNNING, SUCCEEDED, PARTIAL, FAILED, or SKIPPED_LOCKED.'),
    column('Last Completed Stage', 'system', 'Most recent completed stage.'),
    column('Error Code', 'system', 'Redacted classified error code.'),
    column('Error Message', 'system', 'Redacted operational message.'),
    column('Correlation ID', 'system', 'Safe provider correlation/request identifier.'),
  ]),
  sheet(
    'System',
    [
      column('Key', 'system', 'Technical metadata key.'),
      column('Value', 'system', 'Technical metadata value.'),
    ],
    { hidden: true },
  ),
];

export function getSchema(name: string): SheetSchema {
  const schema = SCHEMA_MANIFEST.find((candidate) => candidate.name === name);
  if (!schema) {
    throw new Error(`Unknown technical sheet: ${name}`);
  }
  return schema;
}
