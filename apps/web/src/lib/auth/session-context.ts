import { createContext, useContext } from 'react';
import type { AuthSessionResponse, AuthUser, CurrentUserResponse, SessionHousehold } from '@tandem/shared';

export type SessionState =
  | { status: 'loading' }
  | { status: 'anonymous' }
  | { status: 'authenticated'; user: AuthUser; household: SessionHousehold | null };

export interface SessionContextValue {
  state: SessionState;
  /** After sign-in / register: keep the access token in memory and mark the session authenticated. */
  startSession(session: AuthSessionResponse): void;
  /** Replace user + household summary (after PATCH /auth/me, creating or joining a household). */
  updateSession(current: CurrentUserResponse): void;
  signOut(): Promise<void>;
}

export const SessionContext = createContext<SessionContextValue | null>(null);

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used inside <SessionProvider>');
  return ctx;
}

export type AuthenticatedSession = Extract<SessionState, { status: 'authenticated' }>;

/** The signed-in session; only call below <RequireAuth> / <RequireNoHousehold>. */
export function useAuthenticatedSession(): AuthenticatedSession {
  const { state } = useSession();
  if (state.status !== 'authenticated') throw new Error('useAuthenticatedSession requires a signed-in user');
  return state;
}
