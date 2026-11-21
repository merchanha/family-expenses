import type { ZodType, ZodTypeDef } from 'zod';
import {
  authSessionResponseSchema,
  CSRF_HEADER_NAME,
  CSRF_HEADER_VALUE,
  ApiErrorCode,
  type AuthSessionResponse,
} from '@tandem/shared';
import { tokenStorage } from '@/lib/auth/token-storage';

/** Base URL for API calls. Defaults to `/api` (Vite proxies it to :3001 in dev). */
export const API_BASE_URL: string = (import.meta.env.VITE_API_URL as string | undefined) || '/api';

const HOUSEHOLD_REQUIRED: string = ApiErrorCode.HOUSEHOLD_REQUIRED;

/** Error thrown for any non-2xx response (or network/parse failure, status 0). */
export class ApiError extends Error {
  readonly status: number;
  /** Machine-readable code from the API body if provided (`code` or `error`). */
  readonly code?: string;
  /** Parsed JSON body (or raw text) of the error response. */
  readonly body: unknown;

  constructor(status: number, message: string, body?: unknown, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
    this.code = code;
  }
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  /** JSON-serialisable body. Money must be decimal strings, never numbers. */
  body?: unknown;
  /** Query string params; undefined/null values are skipped. */
  query?: Record<string, string | number | boolean | null | undefined>;
  /** Optional Zod schema to validate the response (e.g. from @tandem/shared). */
  schema?: ZodType<unknown, ZodTypeDef, unknown>;
  /** Skip attaching the Bearer token (and the 401 refresh-and-retry). */
  anonymous?: boolean;
}

/** CSRF marker the API requires on cookie-authenticated calls (/auth/refresh, /auth/logout). */
export const CSRF_HEADER = { [CSRF_HEADER_NAME]: CSRF_HEADER_VALUE } as const;

let onSessionExpired: (() => void) | null = null;
let onHouseholdRequired: (() => void) | null = null;

/** Registered by the session provider: a 403 HOUSEHOLD_REQUIRED means "send the user to onboarding". */
export function setHouseholdRequiredHandler(handler: (() => void) | null): void {
  onHouseholdRequired = handler;
}

/**
 * Refresh-token rotation is strict on the API (reusing a rotated token revokes the
 * whole session), so refreshes are serialised across tabs with the Web Locks API
 * where available. A tab that waited for the lock uses the already-rotated cookie.
 */
function withRefreshLock<T>(fn: () => Promise<T>): Promise<T> {
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined;
  return locks ? locks.request('tandem-auth-refresh', fn) : fn();
}

/**
 * Registered by the auth session provider: called when a request gets 401 and
 * the silent refresh also fails (clear session + query cache, go to sign-in).
 */
export function setSessionExpiredHandler(handler: (() => void) | null): void {
  onSessionExpired = handler;
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const base = API_BASE_URL.replace(/\/+$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  let url = `${base}${p}`;
  if (query) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) params.append(k, String(v));
    }
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }
  return url;
}

async function parseBody(res: Response): Promise<unknown> {
  if (res.status === 204) return undefined;
  const text = await res.text();
  if (!text) return undefined;
  const type = res.headers.get('content-type') ?? '';
  if (type.includes('json')) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  return text;
}

function errorMessage(body: unknown, fallback: string): string {
  if (body && typeof body === 'object' && 'message' in body) {
    const m = (body as { message: unknown }).message;
    if (typeof m === 'string') return m;
    // NestJS ValidationPipe returns message: string[]
    if (Array.isArray(m)) return m.join(', ');
  }
  if (typeof body === 'string' && body.trim()) return body;
  return fallback;
}

function errorCode(body: unknown): string | undefined {
  if (body && typeof body === 'object') {
    const b = body as Record<string, unknown>;
    if (typeof b.code === 'string') return b.code;
    if (typeof b.error === 'string') return b.error;
  }
  return undefined;
}

/** Default wait before retrying a throttled refresh when the API gives no readable `Retry-After`. */
export const REFRESH_RETRY_DEFAULT_MS = 5_000;
const REFRESH_RETRY_MAX_MS = 60_000;

/**
 * Outcome of a silent refresh. `throttled` (429) is not a sign-out: the refresh
 * cookie is still valid, so callers keep the session and retry later (FOR-105).
 */
export type RefreshResult =
  | { kind: 'ok'; session: AuthSessionResponse }
  | { kind: 'throttled'; retryAfterMs: number }
  | { kind: 'failed' };

let refreshInFlight: Promise<RefreshResult> | null = null;

/**
 * Retry delay in seconds, clamped to 1–60 s. The API's throttler names the header per bucket
 * (`Retry-After-refresh`), with plain `Retry-After` as a fallback; both are CORS-exposed.
 */
function retryAfterMs(res: Response): number {
  for (const name of ['retry-after-refresh', 'retry-after']) {
    const seconds = Number(res.headers.get(name));
    if (Number.isFinite(seconds) && seconds > 0) return Math.min(Math.max(seconds * 1000, 1000), REFRESH_RETRY_MAX_MS);
  }
  return REFRESH_RETRY_DEFAULT_MS;
}

/**
 * Exchange the httpOnly refresh cookie (`tandem_rt`) for a new session
 * (access token + user + household summary). Concurrent callers share one
 * request, so the rotated cookie is used only once. Stores the access token on
 * success. Never throws.
 */
export function tryRefreshSession(): Promise<RefreshResult> {
  if (!refreshInFlight) {
    refreshInFlight = withRefreshLock(async (): Promise<RefreshResult> => {
      try {
        const res = await fetch(buildUrl('/auth/refresh'), {
          method: 'POST',
          credentials: 'include',
          headers: { Accept: 'application/json', ...CSRF_HEADER },
        });
        if (res.status === 429) return { kind: 'throttled', retryAfterMs: retryAfterMs(res) };
        if (!res.ok) return { kind: 'failed' };
        const parsed = authSessionResponseSchema.safeParse(await parseBody(res));
        if (!parsed.success) return { kind: 'failed' };
        tokenStorage.setAccessToken(parsed.data.accessToken);
        return { kind: 'ok', session: parsed.data };
      } catch {
        return { kind: 'failed' };
      }
    }).finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

/** `tryRefreshSession()` reduced to the session, or `null` when it did not succeed. */
export async function refreshSession(): Promise<AuthSessionResponse | null> {
  const result = await tryRefreshSession();
  return result.kind === 'ok' ? result.session : null;
}

/**
 * Typed fetch wrapper. Returns the parsed JSON body; throws `ApiError` on
 * non-2xx responses, network failures (status 0) or schema mismatches.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, query, schema, anonymous, headers, ...init } = options;

  const send = async (): Promise<Response> => {
    const h = new Headers(headers);
    h.set('Accept', 'application/json');
    if (body !== undefined) h.set('Content-Type', 'application/json');
    if (!anonymous) {
      const token = tokenStorage.getAccessToken();
      if (token) h.set('Authorization', `Bearer ${token}`);
    }
    try {
      return await fetch(buildUrl(path, query), {
        ...init,
        headers: h,
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    } catch (err) {
      throw new ApiError(0, err instanceof Error ? err.message : 'Network error');
    }
  };

  let res = await send();
  if (res.status === 401 && !anonymous) {
    // Access token missing/expired: refresh once via the cookie, then retry once.
    const refresh = await tryRefreshSession();
    if (refresh.kind === 'throttled') {
      // Refresh rate-limited: the session is still valid, so don't sign out. The caller sees a
      // 429 (queries can retry); the next request refreshes again.
      throw new ApiError(429, 'Too many requests. Try again in a moment.');
    }
    if (refresh.kind === 'ok') {
      res = await send();
    }
    if (res.status === 401) {
      tokenStorage.clear();
      onSessionExpired?.();
    }
  }

  const data = await parseBody(res);
  if (!res.ok) {
    if (res.status === 403 && errorCode(data) === HOUSEHOLD_REQUIRED) onHouseholdRequired?.();
    throw new ApiError(res.status, errorMessage(data, res.statusText || `HTTP ${res.status}`), data, errorCode(data));
  }

  if (schema) {
    const parsed = schema.safeParse(data);
    if (!parsed.success) {
      throw new ApiError(res.status, 'Unexpected response shape from API', data, 'INVALID_RESPONSE');
    }
    return parsed.data as T;
  }
  return data as T;
}

export const api = {
  get: <T>(path: string, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...opts, method: 'GET' }),
  post: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...opts, method: 'POST', body }),
  put: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...opts, method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...opts, method: 'PATCH', body }),
  delete: <T>(path: string, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiRequest<T>(path, { ...opts, method: 'DELETE' }),
};
