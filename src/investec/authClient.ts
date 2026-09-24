import type {
  Cache,
  Clock,
  HttpRequest,
  HttpTransport,
  LockProvider,
  Logger,
} from '../platform/ports';
import { AppsScriptBase64Encoder, type Base64Encoder } from './base64';
import { CredentialStore } from './credentials';
import { InvestecError } from './errors';

export const TOKEN_CACHE_KEY = 'investec.sandbox.access-token.v1';
const TOKEN_ENDPOINT = 'https://openapisandbox.investec.com/identity/v2/oauth2/token';
const EXPIRY_SKEW_SECONDS = 60;

interface CachedToken {
  readonly accessToken: string;
  readonly expiresAt: number;
}

export interface AccessToken {
  readonly value: string;
  readonly expiresAt: Date;
}

function parseCachedToken(serialized: string | undefined, now: Date): CachedToken | undefined {
  if (!serialized) return undefined;
  try {
    const parsed = JSON.parse(serialized) as Partial<CachedToken>;
    if (
      typeof parsed.accessToken !== 'string' ||
      parsed.accessToken === '' ||
      typeof parsed.expiresAt !== 'number' ||
      parsed.expiresAt <= now.getTime() + EXPIRY_SKEW_SECONDS * 1000
    ) {
      return undefined;
    }
    return parsed as CachedToken;
  } catch {
    return undefined;
  }
}

function oauthErrorCode(body: string): 'INVALID_CLIENT' | 'INVALID_API_KEY' | 'INVALID_SCOPE' {
  try {
    const parsed = JSON.parse(body) as { error?: unknown };
    if (parsed.error === 'invalid_client') return 'INVALID_CLIENT';
    if (parsed.error === 'invalid_scope') return 'INVALID_SCOPE';
  } catch {
    // The response body is intentionally not exposed.
  }
  return 'INVALID_API_KEY';
}

export class AuthClient {
  constructor(
    private readonly credentials: CredentialStore,
    private readonly transport: HttpTransport,
    private readonly cache: Cache,
    private readonly clock: Clock,
    private readonly locks: LockProvider,
    private readonly logger: Logger,
    private readonly base64: Base64Encoder = new AppsScriptBase64Encoder(),
  ) {}

  getAccessToken(): AccessToken {
    const cached = parseCachedToken(this.cache.get(TOKEN_CACHE_KEY), this.clock.now());
    if (cached) return { value: cached.accessToken, expiresAt: new Date(cached.expiresAt) };

    const lock = this.locks.get('investec-token-refresh');
    if (!lock.tryAcquire(5000)) {
      throw new InvestecError('TOKEN_REFRESH_LOCKED', 'Token refresh is already in progress.');
    }

    try {
      const afterLock = parseCachedToken(this.cache.get(TOKEN_CACHE_KEY), this.clock.now());
      if (afterLock)
        return { value: afterLock.accessToken, expiresAt: new Date(afterLock.expiresAt) };
      return this.acquireToken();
    } finally {
      lock.release();
    }
  }

  invalidateCachedToken(): void {
    this.cache.remove(TOKEN_CACHE_KEY);
  }

  forceRefresh(): AccessToken {
    this.invalidateCachedToken();
    return this.getAccessToken();
  }

  private acquireToken(): AccessToken {
    let response;
    try {
      const credentials = this.credentials.get();
      const request: HttpRequest = {
        url: TOKEN_ENDPOINT,
        method: 'POST',
        headers: {
          Authorization: `Basic ${this.base64.encode(`${credentials.clientId}:${credentials.clientSecret}`)}`,
          'x-api-key': credentials.apiKey,
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'grant_type=client_credentials',
      };
      response = this.transport.request(request);
    } catch {
      throw new InvestecError(
        'TOKEN_ENDPOINT_UNAVAILABLE',
        'The Investec token service could not be reached.',
        true,
      );
    }

    if (response.status < 200 || response.status >= 300) {
      const code =
        response.status === 401 ? oauthErrorCode(response.body) : 'TOKEN_ENDPOINT_UNAVAILABLE';
      throw new InvestecError(
        code,
        'Investec authentication was rejected.',
        code === 'TOKEN_ENDPOINT_UNAVAILABLE',
      );
    }

    let parsed: { access_token?: unknown; token_type?: unknown; expires_in?: unknown };
    try {
      parsed = JSON.parse(response.body) as typeof parsed;
    } catch {
      throw new InvestecError(
        'TOKEN_RESPONSE_INVALID',
        'Investec returned an invalid token response.',
      );
    }

    if (
      typeof parsed.access_token !== 'string' ||
      parsed.access_token === '' ||
      typeof parsed.token_type !== 'string' ||
      parsed.token_type.toLowerCase() !== 'bearer' ||
      typeof parsed.expires_in !== 'number' ||
      !Number.isFinite(parsed.expires_in) ||
      parsed.expires_in <= 0
    ) {
      throw new InvestecError(
        'TOKEN_RESPONSE_INVALID',
        'Investec returned an invalid token response.',
      );
    }

    const now = this.clock.now();
    const expiresAt = now.getTime() + parsed.expires_in * 1000;
    const ttlSeconds = Math.floor(parsed.expires_in - EXPIRY_SKEW_SECONDS);
    if (ttlSeconds > 0) {
      this.cache.put(
        TOKEN_CACHE_KEY,
        JSON.stringify({ accessToken: parsed.access_token, expiresAt }),
        ttlSeconds,
      );
    }
    this.logger.info({ event: 'investec.token_acquired' });
    return { value: parsed.access_token, expiresAt: new Date(expiresAt) };
  }
}
