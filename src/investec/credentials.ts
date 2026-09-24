import type { SecretStore } from '../platform/ports';
import { InvestecError } from './errors';

export const SANDBOX_CREDENTIALS_KEY = 'investec.sandbox.credentials.v1';

export interface InvestecCredentials {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly apiKey: string;
}

function validateValue(name: string, value: unknown): asserts value is string {
  if (typeof value !== 'string' || value.trim() === '' || value.length > 4096) {
    throw new InvestecError('CREDENTIALS_NOT_CONFIGURED', `${name} is missing or invalid.`);
  }
}

export function validateCredentials(input: unknown): InvestecCredentials {
  if (!input || typeof input !== 'object') {
    throw new InvestecError(
      'CREDENTIALS_NOT_CONFIGURED',
      'Investec credentials are not configured.',
    );
  }
  const value = input as Record<string, unknown>;
  validateValue('Client ID', value.clientId);
  validateValue('Client secret', value.clientSecret);
  validateValue('API key', value.apiKey);
  return {
    clientId: value.clientId,
    clientSecret: value.clientSecret,
    apiKey: value.apiKey,
  };
}

export class CredentialStore {
  constructor(private readonly secrets: SecretStore) {}

  get(): InvestecCredentials {
    const serialized = this.secrets.get(SANDBOX_CREDENTIALS_KEY);
    if (!serialized) {
      throw new InvestecError(
        'CREDENTIALS_NOT_CONFIGURED',
        'Investec credentials are not configured.',
      );
    }
    try {
      return validateCredentials(JSON.parse(serialized));
    } catch (error) {
      if (error instanceof InvestecError) throw error;
      throw new InvestecError(
        'CREDENTIALS_NOT_CONFIGURED',
        'Stored Investec credentials are invalid.',
      );
    }
  }

  save(input: unknown): void {
    const credentials = validateCredentials(input);
    this.secrets.set(SANDBOX_CREDENTIALS_KEY, JSON.stringify(credentials));
  }

  clear(): void {
    this.secrets.delete(SANDBOX_CREDENTIALS_KEY);
  }
}
