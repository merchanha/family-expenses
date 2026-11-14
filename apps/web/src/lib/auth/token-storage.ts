/**
 * Swappable auth token storage.
 *
 * P1 decision (roadmap Decisions #5): the short-lived access JWT lives only in
 * JS memory (this module) and is lost on reload; the refresh token is an
 * httpOnly `tandem_rt` cookie set by the API that JS never sees. On startup
 * and on 401, `refreshSession()` in `lib/api.ts` restores the access token.
 * Never persist tokens in localStorage.
 */
export interface TokenStorage {
  getAccessToken(): string | null;
  setAccessToken(token: string | null): void;
  clear(): void;
  /** Subscribe to token changes (e.g. to update auth UI). Returns an unsubscribe fn. */
  subscribe(listener: (token: string | null) => void): () => void;
}

export function createMemoryTokenStorage(): TokenStorage {
  let accessToken: string | null = null;
  const listeners = new Set<(token: string | null) => void>();
  const emit = () => listeners.forEach((l) => l(accessToken));

  return {
    getAccessToken: () => accessToken,
    setAccessToken(token) {
      accessToken = token;
      emit();
    },
    clear() {
      accessToken = null;
      emit();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

let current: TokenStorage = createMemoryTokenStorage();

/** The active token storage used by the API client. */
export const tokenStorage: TokenStorage = {
  getAccessToken: () => current.getAccessToken(),
  setAccessToken: (t) => current.setAccessToken(t),
  clear: () => current.clear(),
  subscribe: (l) => current.subscribe(l),
};

/** Replace the storage implementation (call once at startup, or in tests). */
export function setTokenStorage(storage: TokenStorage): void {
  current = storage;
}
