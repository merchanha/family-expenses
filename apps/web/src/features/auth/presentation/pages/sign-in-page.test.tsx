import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { tokenStorage } from '@/lib/auth/token-storage';
import { currentHousehold, sessionResponse } from '@/test/fixtures';
import { jsonResponse, mockApi, renderRoute, requestBody } from '@/test/render';

const anonymous = () => jsonResponse({ statusCode: 401, message: 'Unauthorized' }, 401);

describe('SignInPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    tokenStorage.clear();
  });

  it('validates fields before calling the API', async () => {
    const fetchMock = mockApi({ 'POST /api/auth/refresh': anonymous });
    renderRoute('/sign-in');
    await userEvent.click(await screen.findByRole('button', { name: 'Sign In to Household' }));
    expect(await screen.findByText('Enter a valid email')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();
    expect(screen.getByLabelText('Household Email')).toHaveAttribute('aria-invalid', 'true');
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/auth/login')).toBe(false);
  });

  it('signs in, keeps the token in memory and goes to the redirect target', async () => {
    const fetchMock = mockApi({
      'POST /api/auth/refresh': anonymous,
      'POST /api/auth/login': () => jsonResponse(sessionResponse({ accessToken: 'tok' })),
      'GET /api/households/me': () => jsonResponse(currentHousehold()),
    });
    const { router } = renderRoute('/sign-in?redirect=%2Fsettings');
    await userEvent.type(await screen.findByLabelText('Household Email'), ' Alex@Example.com ');
    await userEvent.type(screen.getByLabelText('Password'), 'secret-password');
    await userEvent.click(screen.getByRole('button', { name: 'Sign In to Household' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/settings'));
    expect(requestBody(fetchMock, 'POST /api/auth/login')).toEqual({ email: 'alex@example.com', password: 'secret-password' });
    const [, init] = fetchMock.mock.calls.find(([url]) => url === '/api/auth/login')!;
    expect(init).toMatchObject({ credentials: 'include' });
    expect(tokenStorage.getAccessToken()).toBe('tok');
    expect(window.localStorage.length).toBe(0);
  });

  it('shows a clear error on invalid credentials and clears the password', async () => {
    mockApi({
      'POST /api/auth/refresh': anonymous,
      'POST /api/auth/login': () =>
        jsonResponse({ statusCode: 401, message: 'Invalid email or password', error: 'INVALID_CREDENTIALS' }, 401),
    });
    renderRoute('/sign-in');
    await userEvent.type(await screen.findByLabelText('Household Email'), 'alex@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong-password');
    await userEvent.click(screen.getByRole('button', { name: 'Sign In to Household' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Email or password is incorrect.');
    expect(screen.getByLabelText('Password')).toHaveValue('');
  });

  it('shows a network error message when the API is unreachable', async () => {
    mockApi({
      'POST /api/auth/refresh': anonymous,
      'POST /api/auth/login': () => Promise.reject(new TypeError('Failed to fetch')),
    });
    renderRoute('/sign-in');
    await userEvent.type(await screen.findByLabelText('Household Email'), 'alex@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'whatever1');
    await userEvent.click(screen.getByRole('button', { name: 'Sign In to Household' }));
    expect(await screen.findByRole('alert')).toHaveTextContent("Can't reach Tandem right now");
  });

  it('links to reset password and create account', async () => {
    mockApi({ 'POST /api/auth/refresh': anonymous });
    renderRoute('/sign-in');
    expect(await screen.findByRole('link', { name: 'Forgot password?' })).toHaveAttribute('href', '/reset-password');
    expect(screen.getByRole('link', { name: 'Create Account' })).toHaveAttribute('href', '/create-account');
  });
});
