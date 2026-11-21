import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api, CSRF_HEADER, setHouseholdRequiredHandler, setSessionExpiredHandler, tryRefreshSession } from '@/lib/api';
import { tokenStorage } from '@/lib/auth/token-storage';
import { SessionContext, type SessionContextValue, type SessionState } from '@/lib/auth/session-context';

/**
 * Owns the auth session (never the Query cache — apps/web/CLAUDE.md §6/§12).
 * Bootstrap: silent POST /auth/refresh with the httpOnly cookie; its response
 * carries the user and household summary.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<SessionState>({ status: 'loading' });
  const bootstrapped = useRef(false);

  const endSession = useCallback(() => {
    tokenStorage.clear();
    queryClient.clear();
    setState({ status: 'anonymous' });
  }, [queryClient]);

  useEffect(() => {
    // A 401 that survives refresh-and-retry ends the session; RequireAuth then
    // redirects to /sign-in?redirect=<current location>.
    setSessionExpiredHandler(endSession);
    // Membership ended server-side (or never existed): drop household data; RequireAuth → onboarding.
    setHouseholdRequiredHandler(() => {
      queryClient.clear();
      setState((prev) => (prev.status === 'authenticated' ? { ...prev, household: null } : prev));
    });
    return () => {
      setSessionExpiredHandler(null);
      setHouseholdRequiredHandler(null);
    };
  }, [endSession, queryClient]);

  useEffect(() => {
    if (bootstrapped.current) return; // StrictMode re-runs effects; bootstrap once.
    bootstrapped.current = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const bootstrap = () => {
      void tryRefreshSession().then((result) => {
        if (result.kind === 'throttled') {
          // 429 is not a sign-out (FOR-105): stay on the splash and try again later.
          timer = setTimeout(bootstrap, result.retryAfterMs);
          return;
        }
        setState(
          result.kind === 'ok'
            ? { status: 'authenticated', user: result.session.user, household: result.session.household }
            : { status: 'anonymous' },
        );
      });
    };
    bootstrap();
    return () => clearTimeout(timer);
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({
      state,
      startSession(session) {
        tokenStorage.setAccessToken(session.accessToken);
        setState({ status: 'authenticated', user: session.user, household: session.household });
      },
      updateSession(current) {
        setState({ status: 'authenticated', user: current.user, household: current.household });
      },
      async signOut() {
        try {
          // Revokes the refresh token and clears the httpOnly cookie.
          await api.post('/auth/logout', undefined, { anonymous: true, credentials: 'include', headers: CSRF_HEADER });
        } catch {
          // Best effort: the local session ends either way.
        } finally {
          endSession();
        }
      },
    }),
    [state, endSession],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
