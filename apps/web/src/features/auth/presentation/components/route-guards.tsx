import { Navigate, Outlet, useLocation, useSearchParams } from 'react-router-dom';
import { useSession } from '@/lib/auth/session-context';
import { safeRedirect } from '@/features/auth/application/redirect-target';
import { SessionSplash } from '@/features/auth/presentation/components/session-splash';

export const ONBOARDING_PATH = '/onboarding';
export const JOIN_PATH = '/join';

/** Protects the app shell: anonymous → sign-in (with redirect), no household → onboarding. */
export function RequireAuth() {
  const { state } = useSession();
  const location = useLocation();
  if (state.status === 'loading') return <SessionSplash />;
  if (state.status === 'anonymous') {
    const redirect = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/sign-in?redirect=${encodeURIComponent(redirect)}`} replace />;
  }
  if (!state.household) return <Navigate to={ONBOARDING_PATH} replace />;
  return <Outlet />;
}

/** Public auth pages: signed-in users go to their redirect target (or the dashboard). */
export function PublicOnly() {
  const { state } = useSession();
  const [params] = useSearchParams();
  if (state.status === 'loading') return <SessionSplash />;
  if (state.status === 'authenticated') {
    const target = safeRedirect(params.get('redirect'));
    // Without a Shared Space only the invite page (to join one) or onboarding make sense.
    if (!state.household && !target.startsWith(JOIN_PATH)) return <Navigate to={ONBOARDING_PATH} replace />;
    return <Navigate to={target} replace />;
  }
  return <Outlet />;
}

/** Onboarding: signed in but without a Shared Space yet. */
export function RequireNoHousehold() {
  const { state } = useSession();
  const location = useLocation();
  if (state.status === 'loading') return <SessionSplash />;
  if (state.status === 'anonymous') {
    return <Navigate to={`/sign-in?redirect=${encodeURIComponent(location.pathname + location.search)}`} replace />;
  }
  if (state.household) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}
