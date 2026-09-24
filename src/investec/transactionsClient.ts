import { InvestecHttpClient } from './httpClient';
import { InvestecError } from './errors';

export interface TransactionWindow {
  readonly fromDate: string;
  readonly toDate: string;
}

export interface TransactionPage {
  readonly body: string;
  readonly totalPages: number;
}

function totalPages(body: string): number {
  try {
    const parsed = JSON.parse(body) as { meta?: { totalPages?: unknown } };
    const value = parsed.meta?.totalPages;
    if (value === undefined) return 1;
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
      throw new Error('Invalid totalPages.');
    }
    return value;
  } catch (error) {
    if (error instanceof InvestecError) throw error;
    throw new InvestecError(
      'RESPONSE_INVALID',
      'Investec transaction pagination metadata is invalid.',
    );
  }
}

export function getTransactions(
  client: InvestecHttpClient,
  providerAccountId: string,
  window: TransactionWindow,
): TransactionPage {
  const query = new URLSearchParams({
    fromDate: window.fromDate,
    toDate: window.toDate,
    includePending: 'true',
  });
  const response = client.get(
    `/za/pb/v1/accounts/${encodeURIComponent(providerAccountId)}/transactions?${query.toString()}`,
  );
  const pages = totalPages(response.body);
  if (pages > 1) {
    throw new InvestecError(
      'RESPONSE_INVALID',
      'Investec returned multiple transaction pages without a documented continuation parameter.',
    );
  }
  return { body: response.body, totalPages: pages };
}
