import type { Hasher } from '../platform/ports';
import { InvestecError } from './errors';
import type { TransactionRecord } from '../sheets/transactionRepository';

export const TRANSACTION_IDENTITY_VERSION = 'v1';
export const TRANSACTION_FALLBACK_IDENTITY_VERSION = 'v1-fallback';

export interface NormalizedTransactionBatch {
  readonly transactions: readonly TransactionRecord[];
  readonly rejected: number;
  readonly received: number;
}

function asObject(value: unknown, message: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(message);
  return value as Record<string, unknown>;
}

function optionalString(value: unknown, field: string, maxLength: number): string | null {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string' || value.length > maxLength) {
    throw new Error(`${field} must be a string of at most ${maxLength} characters.`);
  }
  return value;
}

function requiredString(value: unknown, field: string, maxLength: number): string {
  const result = optionalString(value, field, maxLength);
  if (!result) throw new Error(`${field} is required.`);
  return result;
}

function dateOnly(value: unknown, field: string): string | null {
  const result = optionalString(value, field, 10);
  if (result === null) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result)) throw new Error(`${field} must be YYYY-MM-DD.`);
  const parsed = new Date(`${result}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== result) {
    throw new Error(`${field} is not a valid date.`);
  }
  return result;
}

function amount(value: unknown): { readonly signed: number; readonly minorUnits: number } {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    Math.abs(value) > 9_999_999_999_999.99
  ) {
    throw new Error('amount must be a finite monetary number.');
  }
  const minorUnits = Math.round(Math.abs(value) * 100);
  if (Math.abs(Math.abs(value) * 100 - minorUnits) > 0.000001) {
    throw new Error('amount must use at most two decimal places.');
  }
  return { signed: minorUnits / 100, minorUnits };
}

function canonical(value: readonly unknown[]): string {
  return JSON.stringify(value);
}

export function normalizeTransactionsResponse(
  body: string,
  environment: string,
  accountKey: string,
  expectedProviderAccountId: string,
  currency: string,
  now: Date,
  hasher: Hasher,
): NormalizedTransactionBatch {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new InvestecError('RESPONSE_INVALID', 'Investec returned invalid transaction JSON.');
  }
  const envelope = asObject(parsed, 'Investec transaction response must be an object.');
  const data = asObject(envelope.data, 'Investec transaction response data must be an object.');
  if (!Array.isArray(data.transactions)) {
    throw new InvestecError('RESPONSE_INVALID', 'Investec transactions must be an array.');
  }
  if (!/^[A-Z]{3}$/.test(currency)) {
    throw new InvestecError('RESPONSE_INVALID', 'Transaction currency is unavailable or invalid.');
  }

  const transactions: TransactionRecord[] = [];
  let rejected = 0;
  for (const item of data.transactions) {
    try {
      const dto = asObject(item, 'Transaction item must be an object.');
      const providerAccountId = requiredString(dto.accountId, 'accountId', 40);
      if (providerAccountId !== expectedProviderAccountId) {
        throw new InvestecError(
          'RESPONSE_INVALID',
          'Transaction account does not match the request.',
        );
      }
      const direction = requiredString(dto.type, 'type', 6);
      if (direction !== 'CREDIT' && direction !== 'DEBIT') throw new Error('type is invalid.');
      const rawAmount = amount(dto.amount);
      const signedAmount = direction === 'DEBIT' ? -rawAmount.signed : rawAmount.signed;
      const transactionDate =
        dateOnly(dto.transactionDate, 'transactionDate') ??
        dateOnly(dto.postingDate, 'postingDate') ??
        dateOnly(dto.valueDate, 'valueDate');
      if (!transactionDate) throw new Error('transactionDate or postingDate is required.');
      const postingDate = dateOnly(dto.postingDate, 'postingDate');
      const valueDate = dateOnly(dto.valueDate, 'valueDate');
      const actionDate = dateOnly(dto.actionDate, 'actionDate');
      const providerTransactionId = optionalString(dto.uuid, 'uuid', 200);
      const transactionType = optionalString(dto.transactionType, 'transactionType', 40);
      const status = optionalString(dto.status, 'status', 8);
      if (status !== null && status !== 'POSTED' && status !== 'PENDING') {
        throw new Error('status is invalid.');
      }
      const description = optionalString(dto.description, 'description', 40);
      const runningBalance =
        dto.runningBalance === undefined || dto.runningBalance === null
          ? null
          : amount(dto.runningBalance).signed;
      const postedOrder =
        dto.postedOrder === undefined || dto.postedOrder === null
          ? null
          : typeof dto.postedOrder === 'number' && Number.isFinite(dto.postedOrder)
            ? dto.postedOrder
            : (() => {
                throw new Error('postedOrder is invalid.');
              })();
      const identityParts = providerTransactionId
        ? [TRANSACTION_IDENTITY_VERSION, environment, providerAccountId, providerTransactionId]
        : [
            TRANSACTION_FALLBACK_IDENTITY_VERSION,
            environment,
            providerAccountId,
            transactionDate,
            rawAmount.minorUnits,
            currency,
            transactionType,
            direction,
            description,
          ];
      const rowKey = hasher.sha256(canonical(identityParts));
      const payloadHash = hasher.sha256(
        canonical([
          providerAccountId,
          providerTransactionId,
          direction,
          transactionType,
          status,
          description,
          transactionDate,
          postingDate,
          valueDate,
          actionDate,
          signedAmount,
          currency,
          runningBalance,
          postedOrder,
        ]),
      );
      transactions.push({
        'Row Key': rowKey,
        'Identity Alias': null,
        Environment: environment,
        'Account Key': accountKey,
        'Provider Account ID': providerAccountId,
        'Provider Transaction ID': providerTransactionId,
        'Transaction Type': transactionType,
        Status: status,
        'Transaction Date': transactionDate,
        'Posting Date': postingDate,
        'Value Date': valueDate,
        'Description Raw': description,
        'Reference Raw': null,
        Amount: signedAmount,
        Currency: currency,
        'Running Balance': runningBalance,
        'Posted Order': postedOrder,
        'Provider Payload Hash': payloadHash,
        'Identity Version': providerTransactionId
          ? TRANSACTION_IDENTITY_VERSION
          : TRANSACTION_FALLBACK_IDENTITY_VERSION,
        'First Imported UTC': now.toISOString(),
        'Last Seen UTC': now.toISOString(),
        'Last Changed UTC': now.toISOString(),
      });
    } catch (error) {
      if (error instanceof InvestecError) throw error;
      rejected += 1;
    }
  }
  return { transactions, rejected, received: data.transactions.length };
}
