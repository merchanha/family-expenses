import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { tokenStorage } from '@/lib/auth/token-storage';
import { currentHousehold, sessionResponse } from '@/test/fixtures';
import { jsonResponse, mockApi, renderRoute } from '@/test/render';

const health = () => jsonResponse({ status: 'ok', db: 'up', timestamp: '2026-11-14T12:00:00.000Z' });
const unauthorized = () => jsonResponse({ statusCode: 401, message: 'Unauthorized', error: 'UNAUTHENTICATED' }, 401);

describe('route guards + session bootstrap', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    tokenStorage.clear();
  });

  it('sends anonymous users from the shell to sign-in with a redirect back', async () => {
    mockApi({ 'POST /api/auth/refresh': unauthorized });
    const { router } = renderRoute('/settings?tab=x');
    expect(await screen.findByRole('heading', { name: 'Welcome back to Tandem' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/sign-in');
    expect(new URLSearchParams(router.state.location.search).get('redirect')).toBe('/settings?tab=x');
    expect(screen.queryByRole('navigation', { name: 'Main' })).not.toBeInTheDocument();
  });

  it('restores the session on reload from the refresh cookie (no stored token)', async () => {
    const fetchMock = mockApi({
      'POST /api/auth/refresh': () => jsonResponse(sessionResponse({ accessToken: 'restored' })),
      'GET /api/households/me': () => jsonResponse(currentHousehold()),
      'GET /api/health': health,
    });
    renderRoute('/dashboard');
    expect(screen.getByText('Opening your Shared Space…')).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
    expect(tokenStorage.getAccessToken()).toBe('restored');
    const [, init] = fetchMock.mock.calls.find(([url]) => url === '/api/auth/refresh')!;
    expect(init).toMatchObject({ method: 'POST', credentials: 'include' });
    expect(new Headers(init!.headers).get('X-Requested-With')).toBe('tandem');
  });

  it('redirects signed-in users away from public auth pages to the dashboard', async () => {
    mockApi({
      'POST /api/auth/refresh': () => jsonResponse(sessionResponse()),
      'GET /api/households/me': () => jsonResponse(currentHousehold()),
      'GET /api/health': health,
    });
    const { router } = renderRoute('/sign-in');
    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard'));
  });

  it('honours a safe redirect param and ignores external ones', async () => {
    mockApi({
      'POST /api/auth/refresh': () => jsonResponse(sessionResponse()),
      'GET /api/households/me': () => jsonResponse(currentHousehold()),
    });
    const first = renderRoute('/create-account?redirect=%2Fsettings');
    await waitFor(() => expect(first.router.state.location.pathname).toBe('/settings'));
    first.unmount();

    const second = renderRoute('/sign-in?redirect=%2F%2Fevil.example.com');
    await waitFor(() => expect(second.router.state.location.pathname).toBe('/dashboard'));
  });

  it('sends a signed-in user without a household to onboarding, and onboarding creates one', async () => {
    const created = currentHousehold({ members: [currentHousehold().members[0]!] });
    mockApi({
      'POST /api/auth/refresh': () => jsonResponse(sessionResponse({ household: null })),
      'POST /api/households': () => jsonResponse(created, 201),
      'GET /api/households/me': () => jsonResponse(created),
      'GET /api/health': health,
    });
    const { router } = renderRoute('/dashboard');
    expect(await screen.findByRole('heading', { name: 'Welcome, Alex' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/onboarding');

    await userEvent.type(screen.getByLabelText('Shared Space name'), 'Alex & Maya');
    await userEvent.click(screen.getByRole('button', { name: 'Create Shared Space' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard'));
  });

  it('ends the session when a request 401s and refresh fails: clears token and goes to sign-in', async () => {
    let refreshes = 0;
    mockApi({
      'POST /api/auth/refresh': () => (refreshes++ === 0 ? jsonResponse(sessionResponse()) : unauthorized()),
      'GET /api/households/me': unauthorized,
      'GET /api/health': health,
    });
    const { router } = renderRoute('/settings');
    await waitFor(() => expect(router.state.location.pathname).toBe('/sign-in'));
    expect(tokenStorage.getAccessToken()).toBeNull();
    expect(new URLSearchParams(router.state.location.search).get('redirect')).toBe('/settings');
  });

  it('signs out from Settings: calls logout with the CSRF header and returns to sign-in', async () => {
    const fetchMock = mockApi({
      'POST /api/auth/refresh': () => jsonResponse(sessionResponse()),
      'GET /api/households/me': () => jsonResponse(currentHousehold()),
      'POST /api/auth/logout': () => new Response(null, { status: 204 }),
    });
    const { router } = renderRoute('/settings');
    await userEvent.click(await screen.findByRole('button', { name: 'Sign out' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/sign-in'));
    const [, init] = fetchMock.mock.calls.find(([url]) => url === '/api/auth/logout')!;
    expect(init).toMatchObject({ credentials: 'include' });
    expect(new Headers(init!.headers).get('X-Requested-With')).toBe('tandem');
    expect(tokenStorage.getAccessToken()).toBeNull();
  });

  it('sends the user to onboarding when the API answers 403 HOUSEHOLD_REQUIRED', async () => {
    mockApi({
      'POST /api/auth/refresh': () => jsonResponse(sessionResponse()),
      'GET /api/households/me': () =>
        jsonResponse({ statusCode: 403, message: 'Household required', error: 'HOUSEHOLD_REQUIRED' }, 403),
      'GET /api/health': health,
    });
    const { router } = renderRoute('/settings');
    await waitFor(() => expect(router.state.location.pathname).toBe('/onboarding'));
  });
});
