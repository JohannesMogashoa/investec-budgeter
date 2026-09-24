import type { Hasher } from '../platform/ports';
import { InvestecError } from './errors';
import type { AccountRecord } from '../sheets/accountRepository';

export interface NormalizedAccountBatch {
  readonly accounts: readonly AccountRecord[];
  readonly rejected: number;
  readonly received: number;
}

export interface NormalizedBalance {
  readonly currentBalance: number;
  readonly availableBalance: number;
  readonly currency: string;
  readonly balanceAsOfUtc: string;
}

function optionalString(value: unknown, field: string): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') throw new Error(`${field} must be a string.`);
  const normalized = value.trim();
  return normalized === '' ? null : normalized;
}

function requiredString(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== 'string' || value.trim() === '' || value.length > maxLength) {
    throw new Error(`${field} is required and must be at most ${maxLength} characters.`);
  }
  return value.trim();
}

function requiredCurrency(value: unknown): string {
  if (typeof value !== 'string' || !/^[A-Z]{3}$/.test(value)) {
    throw new Error('currency must be an uppercase ISO 4217 code.');
  }
  return value;
}

function maskAccountNumber(value: unknown): string | null {
  const raw = optionalString(value, 'accountNumber');
  if (raw === null) return null;
  const digits = raw.replace(/\D/g, '');
  return digits.length >= 4 ? `********${digits.slice(-4)}` : null;
}

function decimalString(value: unknown, field: string): string {
  if (typeof value !== 'string' && typeof value !== 'number') {
    throw new Error(`${field} must be a decimal.`);
  }
  const normalized = String(value).trim();
  if (!/^-?(?:0|[1-9]\d*)(?:\.\d+)?$/.test(normalized)) {
    throw new Error(`${field} is not a valid decimal.`);
  }
  const numeric = Number(normalized);
  if (!Number.isFinite(numeric) || Math.abs(numeric) > Number.MAX_SAFE_INTEGER) {
    throw new Error(`${field} is outside the safe spreadsheet range.`);
  }
  const significantDigits = normalized.replace(/[-.0]/g, '').length;
  if (significantDigits > 15) throw new Error(`${field} has too many significant digits.`);
  return normalized;
}

function decimalNumber(value: unknown, field: string): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`${field} must be a finite JSON number.`);
  }
  return decimalString(String(value), field);
}

function decimalToSheetValue(value: string): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) throw new Error('Balance is not a finite number.');
  return numeric;
}

function asObject(value: unknown, message: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(message);
  return value as Record<string, unknown>;
}

export function normalizeAccountsResponse(
  body: string,
  environment: string,
  now: Date,
  hasher: Hasher,
): NormalizedAccountBatch {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new InvestecError('RESPONSE_INVALID', 'Investec returned invalid account JSON.');
  }
  const envelope = asObject(parsed, 'Investec account response must be an object.');
  const data = asObject(envelope.data, 'Investec account response data must be an object.');
  if (!Array.isArray(data.accounts)) {
    throw new InvestecError(
      'RESPONSE_INVALID',
      'Investec account response accounts must be an array.',
    );
  }

  const seenProviderIds = new Set<string>();
  const accounts: AccountRecord[] = [];
  let rejected = 0;
  for (const item of data.accounts) {
    try {
      const dto = asObject(item, 'Account item must be an object.');
      const providerAccountId = requiredString(dto.accountId, 'accountId', 40);
      if (seenProviderIds.has(providerAccountId)) {
        throw new InvestecError('RESPONSE_INVALID', 'Duplicate accountId in account response.');
      }
      seenProviderIds.add(providerAccountId);
      const accountKey = hasher.sha256(`${environment}|${providerAccountId}`);
      const accountNumber = requiredString(dto.accountNumber, 'accountNumber', 40);
      requiredString(dto.referenceName, 'referenceName', 70);
      requiredString(dto.profileId, 'profileId', 70);
      requiredString(dto.profileName, 'profileName', 70);
      if (typeof dto.kycCompliant !== 'boolean') throw new Error('kycCompliant is required.');
      accounts.push({
        'Account Key': accountKey,
        'Provider Account ID': providerAccountId,
        'Account Name': requiredString(dto.accountName, 'accountName', 70),
        'Account Type': requiredString(dto.productName, 'productName', 70),
        'Account Number Masked': maskAccountNumber(accountNumber),
        Currency: null,
        'Is Active': true,
        'First Seen UTC': now.toISOString(),
        'Last Seen UTC': now.toISOString(),
        'Is Selected': false,
      });
    } catch (error) {
      if (error instanceof InvestecError && error.code === 'RESPONSE_INVALID') throw error;
      rejected += 1;
    }
  }
  return { accounts, rejected, received: data.accounts.length };
}

export function normalizeBalanceResponse(
  body: string,
  now: Date,
  expectedProviderAccountId: string,
): NormalizedBalance {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new InvestecError('RESPONSE_INVALID', 'Investec returned invalid balance JSON.');
  }
  const envelope = asObject(parsed, 'Investec balance response must be an object.');
  const data = asObject(envelope.data, 'Investec balance response data must be an object.');
  const returnedAccountId = requiredString(data.accountId, 'accountId', 40);
  if (returnedAccountId !== expectedProviderAccountId) {
    throw new InvestecError(
      'RESPONSE_INVALID',
      'Balance response account does not match the request.',
    );
  }
  const currentDecimal = decimalNumber(data.currentBalance, 'currentBalance');
  const availableDecimal = decimalNumber(data.availableBalance, 'availableBalance');
  decimalNumber(data.budgetBalance, 'budgetBalance');
  decimalNumber(data.straightBalance, 'straightBalance');
  decimalNumber(data.cashBalance, 'cashBalance');
  let normalizedCurrency: string;
  try {
    normalizedCurrency = requiredCurrency(data.currency);
  } catch {
    throw new InvestecError('RESPONSE_INVALID', 'Balance currency is invalid.');
  }

  return {
    currentBalance: decimalToSheetValue(currentDecimal),
    availableBalance: decimalToSheetValue(availableDecimal),
    currency: normalizedCurrency,
    balanceAsOfUtc: now.toISOString(),
  };
}
