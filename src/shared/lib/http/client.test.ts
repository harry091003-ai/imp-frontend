import { delay, http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { server } from '@/test/server';
import { ERROR_CODES } from '../constants/errorCodes';
import { createHttpClient, type HttpClient } from './client';
import { ApiError } from './errors';

const API = 'http://localhost:5173/api';

function errorBody(status: number, error: string, extra: object = {}) {
  return {
    timestamp: '2026-11-02T10:00:00',
    status,
    error,
    message: `Message for ${error}`,
    path: '/x',
    traceId: 'body-trace',
    ...extra,
  };
}

/** A fake backend with the real rules: valid token required, refresh tokens work once. */
function fakeBackend() {
  const state = {
    validTokens: new Set<string>(),
    refreshCalls: 0,
    cookieVersion: 1,
    reused: false,
  };
  server.use(
    http.post(`${API}/auth/refresh`, async () => {
      state.refreshCalls += 1;
      // The cookie is read when the request arrives. An overlapping refresh sends the same one.
      const sent = state.cookieVersion;
      await delay(5);
      if (sent !== state.cookieVersion) {
        state.reused = true;
        return HttpResponse.json(errorBody(401, ERROR_CODES.REFRESH_TOKEN_REUSED), { status: 401 });
      }
      state.cookieVersion += 1;
      const token = `token-${String(state.cookieVersion)}`;
      state.validTokens.add(token);
      return HttpResponse.json({ userid: 'u1', jwttoken: token });
    }),
    http.get(`${API}/data/:id`, ({ request, params }) => {
      const token = request.headers.get('authorization')?.replace('Bearer ', '') ?? '';
      if (!state.validTokens.has(token)) {
        return HttpResponse.json(errorBody(401, ERROR_CODES.INVALID_TOKEN), { status: 401 });
      }
      return HttpResponse.json({ id: params['id'] });
    }),
  );
  return state;
}

describe('http client', () => {
  let onSessionEnded: ReturnType<typeof vi.fn<(code: string) => void>>;
  let client: HttpClient;

  beforeEach(() => {
    onSessionEnded = vi.fn<(code: string) => void>();
    client = createHttpClient({ onSessionEnded, retryDelayMs: 0 });
  });

  describe('session refresh', () => {
    it('refreshes once when 20 requests expire at the same moment, and all succeed', async () => {
      const backend = fakeBackend();
      client.setAccessToken('expired');

      const results = await Promise.all(
        Array.from({ length: 20 }, (_, i) => client.api.get<{ id: string }>(`/data/${String(i)}`)),
      );

      expect(backend.refreshCalls).toBe(1);
      expect(backend.reused).toBe(false);
      expect(results.map((r) => r.data.id)).toEqual(
        Array.from({ length: 20 }, (_, i) => String(i)),
      );
      expect(onSessionEnded).not.toHaveBeenCalled();
    });

    it('two browser tabs refresh one after the other, so a one-time token is never reused', async () => {
      const backend = fakeBackend();
      // Tabs share the cookie and one lock. Each reads the cookie only once it holds the lock.
      let lockTail: Promise<unknown> = Promise.resolve();
      vi.stubGlobal('navigator', {
        locks: {
          request: (_name: string, task: () => Promise<unknown>) => {
            const run = lockTail.then(task, task);
            lockTail = run.catch(() => undefined);
            return run;
          },
        },
      });
      const tabs = [
        createHttpClient({ onSessionEnded, retryDelayMs: 0 }),
        createHttpClient({ onSessionEnded, retryDelayMs: 0 }),
      ];
      tabs.forEach((tab) => {
        tab.setAccessToken('expired');
      });

      const results = await Promise.allSettled(
        tabs.map((tab, i) => tab.api.get(`/data/${String(i)}`)),
      );

      expect(backend.reused).toBe(false);
      expect(backend.refreshCalls).toBe(2);
      expect(onSessionEnded).not.toHaveBeenCalled();
      expect(results.map((r) => r.status)).toEqual(['fulfilled', 'fulfilled']);
    });

    it('stops when the retry still gets 401, instead of looping', async () => {
      let refreshCalls = 0;
      let dataCalls = 0;
      server.use(
        http.post(`${API}/auth/refresh`, () => {
          refreshCalls += 1;
          return HttpResponse.json({ userid: 'u1', jwttoken: 'new' });
        }),
        http.get(`${API}/data`, () => {
          dataCalls += 1;
          return HttpResponse.json(errorBody(401, ERROR_CODES.INVALID_TOKEN), { status: 401 });
        }),
      );

      await expect(client.api.get('/data')).rejects.toBeInstanceOf(ApiError);

      expect(refreshCalls).toBe(1);
      expect(dataCalls).toBe(2);
    });

    it.each([
      ERROR_CODES.REFRESH_TOKEN_REUSED,
      ERROR_CODES.REFRESH_TOKEN_EXPIRED,
      ERROR_CODES.INVALID_REFRESH_TOKEN,
      ERROR_CODES.ACCOUNT_LOCKED,
    ])('ends the session and clears the token when refresh says %s', async (code) => {
      server.use(
        http.post(`${API}/auth/refresh`, () =>
          HttpResponse.json(errorBody(401, code), { status: 401 }),
        ),
        http.get(`${API}/data`, () =>
          HttpResponse.json(errorBody(401, ERROR_CODES.INVALID_TOKEN), { status: 401 }),
        ),
      );
      client.setAccessToken('expired');

      await expect(client.api.get('/data')).rejects.toMatchObject({ code });

      expect(onSessionEnded).toHaveBeenCalledExactlyOnceWith(code);
      expect(client.getAccessToken()).toBeNull();
    });

    it('keeps the user logged in when refresh fails because the server is down', async () => {
      server.use(
        http.post(`${API}/auth/refresh`, () =>
          HttpResponse.json(errorBody(503, ERROR_CODES.AUTH_SERVICE_UNAVAILABLE), { status: 503 }),
        ),
        http.get(`${API}/data`, () =>
          HttpResponse.json(errorBody(401, ERROR_CODES.INVALID_TOKEN), { status: 401 }),
        ),
      );
      client.setAccessToken('expired');

      await expect(client.api.get('/data')).rejects.toMatchObject({ status: 503 });

      expect(onSessionEnded).not.toHaveBeenCalled();
    });

    it('ends the session on TOKEN_REVOKED without trying to refresh', async () => {
      let refreshCalls = 0;
      server.use(
        http.post(`${API}/auth/refresh`, () => {
          refreshCalls += 1;
          return HttpResponse.json({ userid: 'u1', jwttoken: 'new' });
        }),
        http.get(`${API}/data`, () =>
          HttpResponse.json(errorBody(401, ERROR_CODES.TOKEN_REVOKED), { status: 401 }),
        ),
      );

      await expect(client.api.get('/data')).rejects.toMatchObject({
        code: ERROR_CODES.TOKEN_REVOKED,
      });

      expect(refreshCalls).toBe(0);
      expect(onSessionEnded).toHaveBeenCalledExactlyOnceWith(ERROR_CODES.TOKEN_REVOKED);
    });

    it('does not refresh on a wrong password', async () => {
      let refreshCalls = 0;
      server.use(
        http.post(`${API}/auth/refresh`, () => {
          refreshCalls += 1;
          return HttpResponse.json({});
        }),
        http.post(`${API}/auth/login`, () =>
          HttpResponse.json(errorBody(401, ERROR_CODES.INVALID_CREDENTIALS), { status: 401 }),
        ),
      );

      await expect(client.api.post('/auth/login', {})).rejects.toMatchObject({
        code: ERROR_CODES.INVALID_CREDENTIALS,
      });

      expect(refreshCalls).toBe(0);
      expect(onSessionEnded).not.toHaveBeenCalled();
    });

    it('does not log out when AuthService is unavailable', async () => {
      server.use(
        http.post(`${API}/incidents`, () =>
          HttpResponse.json(errorBody(503, ERROR_CODES.AUTH_SERVICE_UNAVAILABLE), { status: 503 }),
        ),
      );

      await expect(client.api.post('/incidents', {})).rejects.toMatchObject({ status: 503 });

      expect(onSessionEnded).not.toHaveBeenCalled();
    });

    it('treats a refresh answer with no token as a failure, not as logged in', async () => {
      server.use(
        http.post(`${API}/auth/refresh`, () => HttpResponse.json({ userid: 'u1' })),
        http.get(`${API}/data`, () =>
          HttpResponse.json(errorBody(401, ERROR_CODES.INVALID_TOKEN), { status: 401 }),
        ),
      );

      await expect(client.api.get('/data')).rejects.toBeInstanceOf(ApiError);

      expect(client.getAccessToken()).toBeNull();
    });
  });

  describe('retries', () => {
    it('retries a GET after a 503 and succeeds', async () => {
      let calls = 0;
      server.use(
        http.get(`${API}/data`, () => {
          calls += 1;
          return calls === 1
            ? HttpResponse.json(errorBody(503, 'SERVICE_UNAVAILABLE'), { status: 503 })
            : HttpResponse.json({ ok: true });
        }),
      );

      await expect(client.api.get('/data')).resolves.toMatchObject({ data: { ok: true } });
      expect(calls).toBe(2);
    });

    it('gives up on a GET after 3 tries', async () => {
      let calls = 0;
      server.use(
        http.get(`${API}/data`, () => {
          calls += 1;
          return HttpResponse.json(errorBody(503, 'SERVICE_UNAVAILABLE'), { status: 503 });
        }),
      );

      await expect(client.api.get('/data')).rejects.toMatchObject({ status: 503 });
      expect(calls).toBe(3);
    });

    it('never retries a POST on 503, because it could run twice', async () => {
      let calls = 0;
      server.use(
        http.post(`${API}/incidents`, () => {
          calls += 1;
          return HttpResponse.json(errorBody(503, 'SERVICE_UNAVAILABLE'), { status: 503 });
        }),
      );

      await expect(client.api.post('/incidents', {})).rejects.toBeInstanceOf(ApiError);
      expect(calls).toBe(1);
    });

    it('does not retry a 429, and reports how long to wait', async () => {
      let calls = 0;
      server.use(
        http.get(`${API}/data`, () => {
          calls += 1;
          return HttpResponse.json(errorBody(429, 'RATE_LIMIT_EXCEEDED'), {
            status: 429,
            headers: { 'Retry-After': '42' },
          });
        }),
      );

      await expect(client.api.get('/data')).rejects.toMatchObject({
        status: 429,
        retryAfterSeconds: 42,
      });
      expect(calls).toBe(1);
    });
  });

  describe('errors', () => {
    it('keeps the code, message, reference and field errors', async () => {
      server.use(
        http.post(`${API}/incidents`, () =>
          HttpResponse.json(
            errorBody(400, 'VALIDATION_FAILED', {
              fieldErrors: [{ field: 'title', message: 'Title is required', rejectedValue: null }],
            }),
            { status: 400 },
          ),
        ),
      );

      await expect(client.api.post('/incidents', {})).rejects.toMatchObject({
        status: 400,
        code: 'VALIDATION_FAILED',
        message: 'Message for VALIDATION_FAILED',
        traceId: 'body-trace',
        fieldErrors: [{ field: 'title', message: 'Title is required' }],
      });
    });

    it('handles a non-JSON error page and reads the reference from the header', async () => {
      server.use(
        http.post(`${API}/x`, () =>
          HttpResponse.html('<html>Bad gateway</html>', {
            status: 502,
            headers: { 'X-Trace-Id': 'header-trace' },
          }),
        ),
      );

      const error = await client.api.post('/x', {}).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ApiError);
      expect(error).toMatchObject({ status: 502, code: 'UNKNOWN', traceId: 'header-trace' });
      expect((error as ApiError).message).not.toContain('<html>');
    });

    it('reports a dropped connection as a network error', async () => {
      server.use(http.post(`${API}/x`, () => HttpResponse.error()));

      await expect(client.api.post('/x', {})).rejects.toMatchObject({
        status: 0,
        code: 'NETWORK_ERROR',
      });
    });
  });

  describe('request headers', () => {
    it('sends the token and a trace id the gateway accepts', async () => {
      let headers: Headers | undefined;
      server.use(
        http.get(`${API}/data`, ({ request }) => {
          headers = request.headers;
          return HttpResponse.json({});
        }),
      );
      client.setAccessToken('abc');

      await client.api.get('/data');

      expect(headers?.get('authorization')).toBe('Bearer abc');
      expect(headers?.get('x-trace-id')).toMatch(/^[A-Za-z0-9-]{1,64}$/);
    });

    it('sends no Authorization header when logged out', async () => {
      let headers: Headers | undefined;
      server.use(
        http.post(`${API}/auth/login`, ({ request }) => {
          headers = request.headers;
          return HttpResponse.json({});
        }),
      );

      await client.api.post('/auth/login', {});

      expect(headers?.has('authorization')).toBe(false);
    });
  });
});
