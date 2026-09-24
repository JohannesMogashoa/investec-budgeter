import { describe, expect, it } from 'vitest';
import { testConnection } from '../../src/application/testConnection';
import { AuthClient } from '../../src/investec/authClient';
import { CredentialStore } from '../../src/investec/credentials';
import { InvestecHttpClient } from '../../src/investec/httpClient';
import { redactFields } from '../../src/investec/redaction';
import {
  FakeCache,
  FakeClock,
  FakeHttpTransport,
  FakeLockProvider,
  FakeLogger,
  FakeSecretStore,
  FakeSleeper,
} from '../fakes/platform';

class FakeBase64 {
  encode(): string {
    return 'encoded-basic';
  }
}

function token(value: string, expiresIn = 1800) {
  return {
    status: 200,
    headers: {},
    body: JSON.stringify({ access_token: value, token_type: 'Bearer', expires_in: expiresIn }),
  };
}

function createAuth(transport: FakeHttpTransport, cache = new FakeCache()) {
  const secrets = new FakeSecretStore();
  new CredentialStore(secrets).save({
    clientId: 'client-id',
    clientSecret: 'client-secret',
    apiKey: 'api-key',
  });
  return {
    auth: new AuthClient(
      new CredentialStore(secrets),
      transport,
      cache,
      new FakeClock(),
      new FakeLockProvider(),
      new FakeLogger(),
      new FakeBase64(),
    ),
    cache,
  };
}

describe('Investec authentication and HTTP', () => {
  it('requests a bearer token using Basic auth and the API key', () => {
    const transport = new FakeHttpTransport();
    transport.response = token('access-token');
    const { auth } = createAuth(transport);

    expect(auth.getAccessToken().value).toBe('access-token');
    expect(transport.requests[0]).toMatchObject({
      method: 'POST',
      body: 'grant_type=client_credentials',
      headers: {
        Authorization: 'Basic encoded-basic',
        'x-api-key': 'api-key',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
  });

  it('reuses a safely valid user-cache token', () => {
    const transport = new FakeHttpTransport();
    transport.response = token('cached-token');
    const { auth } = createAuth(transport);

    auth.getAccessToken();
    auth.getAccessToken();

    expect(transport.requests).toHaveLength(1);
  });

  it('does not send the API key on bearer API requests', () => {
    const transport = new FakeHttpTransport();
    transport.responses.push(token('access-token'), {
      status: 200,
      headers: {},
      body: '{"data":[]}',
    });
    const { auth } = createAuth(transport);
    const http = new InvestecHttpClient(
      auth,
      transport,
      new FakeClock(),
      new FakeSleeper(),
      new FakeLogger(),
    );

    http.get('/za/pb/v1/accounts');

    expect(transport.requests[1].headers).toEqual({
      Authorization: 'Bearer access-token',
      Accept: 'application/json',
    });
  });

  it('classifies invalid client responses without exposing the response body', () => {
    const transport = new FakeHttpTransport();
    transport.response = {
      status: 401,
      headers: {},
      body: '{"error":"invalid_client","error_description":"client-secret-value"}',
    };
    const { auth } = createAuth(transport);

    expect(() => auth.getAccessToken()).toThrowError('Investec authentication was rejected.');
    try {
      auth.getAccessToken();
    } catch (error) {
      expect(error).toMatchObject({ code: 'INVALID_CLIENT' });
      expect(String(error)).not.toContain('client-secret-value');
    }
  });

  it('refreshes exactly once after an authenticated request receives 401', () => {
    const transport = new FakeHttpTransport();
    transport.responses.push(
      token('first-token'),
      { status: 401, headers: {}, body: '{"error":"invalid_token"}' },
      token('second-token'),
      { status: 200, headers: {}, body: '{"data":[]}' },
    );
    const { auth } = createAuth(transport);
    const http = new InvestecHttpClient(
      auth,
      transport,
      new FakeClock(),
      new FakeSleeper(),
      new FakeLogger(),
    );

    const response = http.get('/za/pb/v1/accounts');

    expect(response.status).toBe(200);
    expect(transport.requests.filter(({ method }) => method === 'POST')).toHaveLength(2);
    expect(transport.requests.filter(({ method }) => method === 'GET')).toHaveLength(2);
  });

  it('retries transient failures and honors a bounded retry delay', () => {
    const transport = new FakeHttpTransport();
    transport.responses.push(
      token('access-token'),
      { status: 503, headers: {}, body: 'unavailable' },
      { status: 200, headers: {}, body: '{"data":[]}' },
    );
    const { auth } = createAuth(transport);
    const sleeper = new FakeSleeper();
    const http = new InvestecHttpClient(
      auth,
      transport,
      new FakeClock(),
      sleeper,
      new FakeLogger(),
    );

    expect(http.get('/za/pb/v1/accounts').status).toBe(200);
    expect(sleeper.delays).toHaveLength(1);
  });

  it('validates the read-only test connection without writing a sheet', () => {
    const transport = new FakeHttpTransport();
    transport.responses.push(token('access-token'), {
      status: 200,
      headers: {},
      body: JSON.stringify({ data: { accounts: [{ accountId: 'account-1' }] } }),
    });
    const { auth } = createAuth(transport);
    const result = testConnection(
      new InvestecHttpClient(auth, transport, new FakeClock(), new FakeSleeper(), new FakeLogger()),
    );

    expect(result).toEqual({
      ok: true,
      accountCount: 1,
      message: 'Investec sandbox connection succeeded.',
    });
  });

  it('redacts sensitive fields and authorization values', () => {
    expect(
      redactFields({ authorization: 'Bearer secret-token', message: 'secret-token failed' }, [
        'secret-token',
      ]),
    ).toEqual({ authorization: '[REDACTED]', message: '[REDACTED] failed' });
  });
});
