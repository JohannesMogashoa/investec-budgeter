export type InvestecErrorCode =
  | 'CREDENTIALS_NOT_CONFIGURED'
  | 'INVALID_CLIENT'
  | 'INVALID_API_KEY'
  | 'INVALID_SCOPE'
  | 'TOKEN_RESPONSE_INVALID'
  | 'TOKEN_ENDPOINT_UNAVAILABLE'
  | 'TOKEN_REFRESH_LOCKED'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'BAD_REQUEST'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'PROVIDER_UNAVAILABLE'
  | 'NETWORK_ERROR'
  | 'RESPONSE_INVALID'
  | 'EXECUTION_BUDGET_EXCEEDED'
  | 'PRODUCTION_DISABLED';

export class InvestecError extends Error {
  constructor(
    readonly code: InvestecErrorCode,
    message: string,
    readonly retryable = false,
  ) {
    super(message);
    this.name = 'InvestecError';
  }
}

export function classifyHttpStatus(status: number): InvestecErrorCode {
  if (status === 400 || status === 422) return 'BAD_REQUEST';
  if (status === 401) return 'UNAUTHORIZED';
  if (status === 403) return 'FORBIDDEN';
  if (status === 404) return 'NOT_FOUND';
  if (status === 429) return 'RATE_LIMITED';
  if (status === 408 || status >= 500) return 'PROVIDER_UNAVAILABLE';
  return 'RESPONSE_INVALID';
}
