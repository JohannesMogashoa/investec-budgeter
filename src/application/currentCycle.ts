import type { Clock } from '../platform/ports';
import { AccountRepository } from '../sheets/accountRepository';
import { TransactionRepository } from '../sheets/transactionRepository';
import { SettingsRepository } from '../sheets/settingsRepository';
import { SyncStateRepository } from '../sheets/syncStateRepository';
import type { SheetGateway, SheetValue } from '../platform/ports';
import { getSchema } from '../sheets/schemaManifest';

const schema = getSchema('Current Cycle');

function dateInZone(now: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function cycleStart(today: string, settings: SettingsRepository): string {
  const mode = settings.get('Cycle Mode') ?? 'CALENDAR_MONTH';
  if (mode !== 'CONFIGURED_DAY') return `${today.slice(0, 7)}-01`;
  const day = Math.min(Math.max(Number(settings.get('Cycle Start Day') ?? '1'), 1), 28);
  const current = new Date(`${today}T00:00:00Z`);
  if (Number(today.slice(-2)) < day) current.setUTCMonth(current.getUTCMonth() - 1);
  current.setUTCDate(day);
  return current.toISOString().slice(0, 10);
}

function cycleEnd(start: string, settings: SettingsRepository): string {
  const mode = settings.get('Cycle Mode') ?? 'CALENDAR_MONTH';
  const value = new Date(`${start}T00:00:00Z`);
  if (mode === 'CONFIGURED_DAY') value.setUTCMonth(value.getUTCMonth() + 1);
  else value.setUTCMonth(value.getUTCMonth() + 1, 1);
  value.setUTCDate(value.getUTCDate() - 1);
  return value.toISOString().slice(0, 10);
}

export function updateCurrentCycle(gateway: SheetGateway, clock: Clock, environment: string): void {
  const sheet = gateway.getSheet(schema.name);
  if (!sheet) throw new Error('Current Cycle sheet is missing. Run workbook setup first.');
  const settings = new SettingsRepository(gateway);
  const state = new SyncStateRepository(gateway).get();
  const accounts = new AccountRepository(gateway).list();
  const transactions = new TransactionRepository(gateway).list();
  const timeZone = settings.get('Cycle Time Zone') ?? gateway.getTimeZone();
  const today = dateInZone(clock.now(), timeZone);
  const start = cycleStart(today, settings);
  const end = cycleEnd(start, settings);
  const included = transactions.filter(
    (row) =>
      row.Environment === environment &&
      typeof row['Transaction Date'] === 'string' &&
      row['Transaction Date'] >= start &&
      row['Transaction Date'] <= end &&
      row.Excluded !== true &&
      row.Excluded !== 'TRUE',
  );
  const posted = included.filter((row) => row.Status !== 'PENDING');
  const pending = included.filter((row) => row.Status === 'PENDING');
  const sum = (rows: typeof included): number =>
    rows.reduce((total, row) => total + (typeof row.Amount === 'number' ? row.Amount : 0), 0);
  const outflow = (rows: typeof included): number =>
    rows.reduce(
      (total, row) => total + (typeof row.Amount === 'number' && row.Amount < 0 ? -row.Amount : 0),
      0,
    );
  const inflow = (rows: typeof included): number =>
    rows.reduce(
      (total, row) => total + (typeof row.Amount === 'number' && row.Amount > 0 ? row.Amount : 0),
      0,
    );
  const selected = accounts.filter(
    (row) =>
      row['Is Active'] === true && (row['Is Selected'] === true || row['Is Selected'] === 'TRUE'),
  );
  const currentBalance = selected.reduce(
    (total, row) =>
      total + (typeof row['Current Balance'] === 'number' ? row['Current Balance'] : 0),
    0,
  );
  const availableBalance = selected.reduce(
    (total, row) =>
      total + (typeof row['Available Balance'] === 'number' ? row['Available Balance'] : 0),
    0,
  );
  const daysElapsed = Math.max(
    1,
    Math.floor((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000) +
      1,
  );
  const daysInCycle = Math.max(
    1,
    Math.floor((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000) +
      1,
  );
  const metrics: Array<[string, SheetValue]> = [
    ['Environment', environment],
    ['Cycle Start', start],
    ['Cycle End', end],
    ['Days Elapsed', daysElapsed],
    ['Days Remaining', Math.max(0, daysInCycle - daysElapsed)],
    ['Transaction Count', included.length],
    ['Posted Inflows', inflow(posted)],
    ['Posted Outflows', outflow(posted)],
    ['Pending Inflows', inflow(pending)],
    ['Pending Outflows', outflow(pending)],
    ['Net Movement', sum(posted)],
    ['Average Daily Outflow', outflow(posted) / daysElapsed],
    ['Projected Cycle Outflow', (outflow(posted) / daysElapsed) * daysInCycle],
    ['Current Balance', currentBalance],
    ['Available Balance', availableBalance],
    ['Snapshot UTC', clock.now().toISOString()],
    ['Last Successful Sync UTC', state.lastSuccessfulSyncUtc ?? ''],
  ];
  const values = metrics.map(([metric, value]) => [metric, value, clock.now().toISOString()]);
  if (sheet.getLastRow() < values.length + 1) {
    sheet.writeValues(2, 1, values);
  } else {
    sheet.writeValues(2, 1, values);
  }
}
