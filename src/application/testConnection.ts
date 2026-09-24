import { InvestecHttpClient } from '../investec/httpClient';
import { InvestecError } from '../investec/errors';

export interface ConnectionResult {
  readonly ok: boolean;
  readonly accountCount?: number;
  readonly errorCode?: string;
  readonly message: string;
}

function accountCount(body: string): number {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new InvestecError('RESPONSE_INVALID', 'Investec returned an invalid accounts response.');
  }
  if (!parsed || typeof parsed !== 'object') {
    throw new InvestecError('RESPONSE_INVALID', 'Investec returned an invalid accounts response.');
  }
  const data = (parsed as { data?: unknown }).data;
  if (!Array.isArray(data)) {
    throw new InvestecError('RESPONSE_INVALID', 'Investec returned an invalid accounts response.');
  }
  return data.length;
}

export function testConnection(client: InvestecHttpClient): ConnectionResult {
  try {
    const response = client.get('/za/pb/v1/accounts');
    return {
      ok: true,
      accountCount: accountCount(response.body),
      message: 'Investec sandbox connection succeeded.',
    };
  } catch (error) {
    if (error instanceof InvestecError) {
      return { ok: false, errorCode: error.code, message: userMessage(error.code) };
    }
    return { ok: false, errorCode: 'UNKNOWN', message: 'Investec connection failed safely.' };
  }
}

function userMessage(code: string): string {
  switch (code) {
    case 'CREDENTIALS_NOT_CONFIGURED':
      return 'Configure Investec sandbox credentials first.';
    case 'INVALID_CLIENT':
    case 'INVALID_API_KEY':
    case 'INVALID_SCOPE':
      return 'Investec credentials or API-key permissions were rejected.';
    case 'FORBIDDEN':
      return 'The API key does not have permission to read accounts.';
    case 'UNAUTHORIZED':
      return 'Investec authentication was rejected.';
    case 'RATE_LIMITED':
      return 'Investec temporarily rate-limited the request. Try again later.';
    case 'NETWORK_ERROR':
    case 'TOKEN_ENDPOINT_UNAVAILABLE':
    case 'PROVIDER_UNAVAILABLE':
      return 'Investec could not be reached. Try again later.';
    default:
      return 'Investec connection failed safely.';
  }
}
