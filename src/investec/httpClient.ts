import type {
  Clock,
  HttpMethod,
  HttpResponse,
  HttpTransport,
  Logger,
  Sleeper,
} from '../platform/ports';
import { AuthClient } from './authClient';
import { classifyHttpStatus, InvestecError } from './errors';

const API_BASE_URL = 'https://openapisandbox.investec.com';
const MAX_ATTEMPTS = 3;
const DEFAULT_BUDGET_MS = 20_000;

export interface HttpClientOptions {
  readonly maxDurationMilliseconds?: number;
}

function retryDelay(response: HttpResponse | undefined, attempt: number): number {
  const retryAfter = response?.headers['Retry-After'] ?? response?.headers['retry-after'];
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1000, 5000);
  }
  return Math.min(250 * 2 ** (attempt - 1) + Math.floor(Math.random() * 100), 2000);
}

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

export class InvestecHttpClient {
  constructor(
    private readonly auth: AuthClient,
    private readonly transport: HttpTransport,
    private readonly clock: Clock,
    private readonly sleeper: Sleeper,
    private readonly logger: Logger,
  ) {}

  get(path: string, options: HttpClientOptions = {}): HttpResponse {
    return this.request('GET', path, options);
  }

  request(method: HttpMethod, path: string, options: HttpClientOptions = {}): HttpResponse {
    if (!path.startsWith('/') || path.includes('://')) {
      throw new InvestecError('BAD_REQUEST', 'Provider path must be relative.');
    }

    const budget = options.maxDurationMilliseconds ?? DEFAULT_BUDGET_MS;
    const startedAt = this.clock.now().getTime();
    let replayedAfter401 = false;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      if (this.clock.now().getTime() - startedAt >= budget) {
        throw new InvestecError(
          'EXECUTION_BUDGET_EXCEEDED',
          'HTTP execution budget was exhausted.',
        );
      }

      const token = this.auth.getAccessToken();
      let response: HttpResponse | undefined;
      let networkFailure = false;
      try {
        response = this.transport.request({
          url: `${API_BASE_URL}${path}`,
          method,
          headers: {
            Authorization: `Bearer ${token.value}`,
            Accept: 'application/json',
          },
        });
      } catch {
        networkFailure = true;
      }

      if (!networkFailure && response?.status === 401 && !replayedAfter401) {
        replayedAfter401 = true;
        this.auth.forceRefresh();
        attempt -= 1;
        continue;
      }

      if (!networkFailure && response && response.status >= 200 && response.status < 300) {
        return response;
      }

      const retryable =
        networkFailure || (response !== undefined && isRetryableStatus(response.status));
      if (!retryable || attempt === MAX_ATTEMPTS) {
        if (networkFailure) {
          throw new InvestecError('NETWORK_ERROR', 'The Investec API could not be reached.');
        }
        const code = classifyHttpStatus(response?.status ?? 0);
        throw new InvestecError(
          code,
          `Investec API request failed (${response?.status ?? 'unknown'}).`,
          retryable,
        );
      }

      const delay = retryDelay(response, attempt);
      this.logger.warn({
        event: 'investec.http_retry',
        fields: { method, path, status: response?.status ?? null, attempt, delay },
      });
      if (this.clock.now().getTime() - startedAt + delay >= budget) {
        throw new InvestecError(
          'EXECUTION_BUDGET_EXCEEDED',
          'HTTP execution budget was exhausted.',
        );
      }
      this.sleeper.sleep(delay);
    }

    throw new InvestecError('PROVIDER_UNAVAILABLE', 'The Investec API was unavailable.', true);
  }
}
