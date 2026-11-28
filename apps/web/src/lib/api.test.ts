import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { healthResponseSchema } from '@tandem/shared';
import {
  api,
  ApiError,
  REFRESH_RETRY_DEFAULT_MS,
  refreshSession,
  setHouseholdRequiredHandler,
  setSessionExpiredHandler,
  tryRefreshSession,
} from '@/lib/api';
import { tokenStorage } from '@/lib/auth/token-storage';
import { jsonResponse } from '@/test/render';
import { sessionResponse } from '@/test/fixtures';

describe('api client', () => {
  const fetchMock = vi.fn<typeof fetch>();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    tokenStorage.clear();
    setSessionExpiredHandler(null);
    setHouseholdRequiredHandler(null);
  });

  it('prefixes /api, sends JSON and attaches the Bearer token', async () => {
    tokenStorage.setAccessToken('abc123');
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: '1' }, 201));

    const res = await api.post<{ id: string }>('/transactions', { amount: '1234.50' }, { query: { a: 1, b: undefined } });

    expect(res).toEqual({ id: '1' });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('/api/transactions?a=1');
    const headers = new Headers(init!.headers);
    expect(headers.get('Authorization')).toBe('Bearer abc123');
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(init!.body).toBe('{"amount":"1234.50"}');
  });

  it('omits Authorization when no token or anonymous', async () => {
    fetchMock.mockImplementation(async () => jsonResponse({}));
    await api.get('/x');
    expect(new Headers(fetchMock.mock.calls[0]![1]!.headers).has('Authorization')).toBe(false);
    tokenStorage.setAccessToken('t');
    await api.get('/x', { anonymous: true });
    expect(new Headers(fetchMock.mock.calls[1]![1]!.headers).has('Authorization')).toBe(false);
  });

  it('throws ApiError with status, message and code from a JSON error body', async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ statusCode: 400, message: ['amount must be a string', 'type is required'], error: 'Bad Request' }, 400),
    );
    const err = await api.get('/bad').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({
      status: 400,
      message: 'amount must be a string, type is required',
      code: 'Bad Request',
    });
    expect((err as ApiError).body).toMatchObject({ statusCode: 400 });
  });

  it('falls back to statusText for non-JSON errors', async () => {
    fetchMock.mockResolvedValueOnce(new Response('', { status: 500, statusText: 'Internal Server Error' }));
    await expect(api.get('/boom')).rejects.toMatchObject({ status: 500, message: 'Internal Server Error' });
  });

  it('wraps network failures as ApiError with status 0', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(api.get('/x')).rejects.toMatchObject({ name: 'ApiError', status: 0, message: 'Failed to fetch' });
  });

  it('validates responses against a Zod schema', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ status: 'ok', db: 'maybe', timestamp: 'now' }));
    await expect(api.get('/health', { schema: healthResponseSchema })).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
    });
  });

  it('returns undefined for 204 No Content', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    await expect(api.delete('/x/1')).resolves.toBeUndefined();
  });

  describe('401 refresh-and-retry', () => {
    it('treats a refresh response that breaks the contract as a failed refresh', async () => {
      fetchMock.mockResolvedValueOnce(jsonResponse({ accessToken: 'only-a-token' }));
      await expect(refreshSession()).resolves.toBeNull();
      expect(tokenStorage.getAccessToken()).toBeNull();
    });

    it('refreshes once with the cookie + CSRF header and retries with the new token', async () => {
      tokenStorage.setAccessToken('expired');
      fetchMock
        .mockResolvedValueOnce(jsonResponse({ statusCode: 401, message: 'Unauthorized' }, 401))
        .mockResolvedValueOnce(jsonResponse(sessionResponse({ accessToken: 'fresh' })))
        .mockResolvedValueOnce(jsonResponse({ ok: true }));

      await expect(api.get('/households/me')).resolves.toEqual({ ok: true });

      expect(fetchMock).toHaveBeenCalledTimes(3);
      const [refreshUrl, refreshInit] = fetchMock.mock.calls[1]!;
      expect(refreshUrl).toBe('/api/auth/refresh');
      expect(refreshInit).toMatchObject({ method: 'POST', credentials: 'include' });
      expect(new Headers(refreshInit!.headers).get('X-Requested-With')).toBe('tandem');
      expect(new Headers(fetchMock.mock.calls[2]![1]!.headers).get('Authorization')).toBe('Bearer fresh');
      expect(tokenStorage.getAccessToken()).toBe('fresh');
    });

    it('clears the session and calls the expiry handler when refresh fails', async () => {
      const expired = vi.fn();
      setSessionExpiredHandler(expired);
      tokenStorage.setAccessToken('expired');
      fetchMock
        .mockResolvedValueOnce(jsonResponse({ statusCode: 401, message: 'Unauthorized' }, 401))
        .mockResolvedValueOnce(jsonResponse({ statusCode: 401, message: 'Unauthorized' }, 401));

      await expect(api.get('/households/me')).rejects.toMatchObject({ status: 401 });
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(tokenStorage.getAccessToken()).toBeNull();
      expect(expired).toHaveBeenCalledTimes(1);
    });

    it('retries only once: a second 401 after a successful refresh ends the session', async () => {
      const expired = vi.fn();
      setSessionExpiredHandler(expired);
      fetchMock
        .mockResolvedValueOnce(jsonResponse({}, 401))
        .mockResolvedValueOnce(jsonResponse(sessionResponse({ accessToken: 'fresh' })))
        .mockResolvedValueOnce(jsonResponse({}, 401));

      await expect(api.get('/x')).rejects.toMatchObject({ status: 401 });
      expect(fetchMock).toHaveBeenCalledTimes(3);
      expect(expired).toHaveBeenCalledTimes(1);
    });

    it('does not refresh for anonymous requests (e.g. bad sign-in credentials)', async () => {
      const expired = vi.fn();
      setSessionExpiredHandler(expired);
      fetchMock.mockResolvedValueOnce(jsonResponse({ statusCode: 401, message: 'Invalid email or password' }, 401));
      await expect(api.post('/auth/login', {}, { anonymous: true })).rejects.toMatchObject({ status: 401 });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(expired).not.toHaveBeenCalled();
    });

    it('does not end the session when the refresh is throttled (429)', async () => {
      const expired = vi.fn();
      setSessionExpiredHandler(expired);
      tokenStorage.setAccessToken('expired');
      fetchMock
        .mockResolvedValueOnce(jsonResponse({ statusCode: 401, message: 'Unauthorized' }, 401))
        .mockResolvedValueOnce(jsonResponse({ statusCode: 429, message: 'Too Many Requests' }, 429));

      await expect(api.get('/households/me')).rejects.toMatchObject({ status: 429 });
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(expired).not.toHaveBeenCalled();
    });

    it('reports a throttled refresh with the Retry-After delay (default when unreadable)', async () => {
      fetchMock.mockResolvedValueOnce(
        new Response(null, { status: 429, headers: { 'Retry-After': '3' } }),
      );
      await expect(tryRefreshSession()).resolves.toEqual({ kind: 'throttled', retryAfterMs: 3000 });
      fetchMock.mockResolvedValueOnce(
        new Response(null, { status: 429, headers: { 'Retry-After-refresh': '7', 'Retry-After': '3' } }),
      );
      await expect(tryRefreshSession()).resolves.toEqual({ kind: 'throttled', retryAfterMs: 7000 });
      fetchMock.mockResolvedValueOnce(new Response(null, { status: 429 }));
      await expect(tryRefreshSession()).resolves.toEqual({ kind: 'throttled', retryAfterMs: REFRESH_RETRY_DEFAULT_MS });
    });

    it('shares one refresh request between concurrent callers', async () => {
      let resolve!: (r: Response) => void;
      fetchMock.mockReturnValueOnce(new Promise<Response>((r) => (resolve = r)));
      const a = refreshSession();
      const b = refreshSession();
      resolve(jsonResponse(sessionResponse({ accessToken: 'shared' })));
      const [ra, rb] = await Promise.all([a, b]);
      expect(ra?.accessToken).toBe('shared');
      expect(rb).toBe(ra);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  it('calls the household-required handler on 403 HOUSEHOLD_REQUIRED', async () => {
    const required = vi.fn();
    setHouseholdRequiredHandler(required);
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ statusCode: 403, message: 'Household required', error: 'HOUSEHOLD_REQUIRED' }, 403),
    );
    await expect(api.get('/households/me')).rejects.toMatchObject({ status: 403, code: 'HOUSEHOLD_REQUIRED' });
    expect(required).toHaveBeenCalledTimes(1);
  });

  it('does not treat other 403s as household-required', async () => {
    const required = vi.fn();
    setHouseholdRequiredHandler(required);
    fetchMock.mockResolvedValueOnce(jsonResponse({ statusCode: 403, message: 'Owner only', error: 'OWNER_ONLY' }, 403));
    await expect(api.post('/households/me/invites', {})).rejects.toMatchObject({ status: 403 });
    expect(required).not.toHaveBeenCalled();
  });
});
