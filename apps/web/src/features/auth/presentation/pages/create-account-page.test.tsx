import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { tokenStorage } from '@/lib/auth/token-storage';
import { currentHousehold, member, sessionResponse } from '@/test/fixtures';
import { jsonResponse, mockApi, renderRoute, requestBody } from '@/test/render';

const anonymous = () => jsonResponse({ statusCode: 401, message: 'Unauthorized' }, 401);
const soloHousehold = currentHousehold({ members: [member()] });

async function fillAccount() {
  await userEvent.type(await screen.findByLabelText('Full Name'), 'Alex Morgan');
  await userEvent.type(screen.getByLabelText('Email Address'), 'alex@example.com');
  await userEvent.type(screen.getByLabelText('Password'), 'long-enough-pw');
}

describe('CreateAccountPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    tokenStorage.clear();
  });

  it('validates required fields, password length and partner email', async () => {
    mockApi({ 'POST /api/auth/refresh': anonymous });
    renderRoute('/create-account');
    await userEvent.type(await screen.findByLabelText('Password'), 'short');
    await userEvent.type(screen.getByLabelText("Partner's Email"), 'not-an-email');
    await userEvent.click(screen.getByRole('button', { name: 'Create Account' }));
    // Full name and Shared Space name are both required.
    expect(await screen.findAllByText('Name is required')).toHaveLength(2);
    expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
    expect(screen.getAllByText('Enter a valid email')).toHaveLength(2);
  });

  it('registers, creates the Shared Space, invites the partner, then lands on the dashboard', async () => {
    const fetchMock = mockApi({
      'POST /api/auth/refresh': anonymous,
      'POST /api/auth/register': () => jsonResponse(sessionResponse({ household: null, accessToken: 'new' }), 201),
      'POST /api/households': () => jsonResponse(soloHousehold, 201),
      'POST /api/households/me/invites': () =>
        jsonResponse(
          {
            invite: {
              id: 'i1',
              email: 'maya@example.com',
              status: 'PENDING',
              invitedById: 'u1',
              expiresAt: '2026-11-21T12:00:00.000Z',
              createdAt: '2026-11-14T12:00:00.000Z',
            },
            inviteUrl: 'http://localhost:5173/join?token=abc',
          },
          201,
        ),
      'GET /api/households/me': () => jsonResponse(soloHousehold),
      'GET /api/health': () => jsonResponse({ status: 'ok', db: 'up', timestamp: '2026-11-14T12:00:00.000Z' }),
    });
    const { router } = renderRoute('/create-account');
    await fillAccount();
    await userEvent.type(screen.getByLabelText('Shared Space name'), 'Alex & Maya');
    await userEvent.type(screen.getByLabelText("Partner's Email"), 'maya@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Create Account' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard'));
    expect(requestBody(fetchMock, 'POST /api/auth/register')).toEqual({
      name: 'Alex Morgan',
      email: 'alex@example.com',
      password: 'long-enough-pw',
    });
    expect(requestBody(fetchMock, 'POST /api/households')).toEqual({ name: 'Alex & Maya' });
    expect(requestBody(fetchMock, 'POST /api/households/me/invites')).toEqual({ email: 'maya@example.com' });
    // The household call is authenticated with the fresh access token.
    const [, init] = fetchMock.mock.calls.find(([url, i]) => url === '/api/households' && i?.method === 'POST')!;
    expect(new Headers(init!.headers).get('Authorization')).toBe('Bearer new');
  });

  it('skips the invite when no partner email is given', async () => {
    const fetchMock = mockApi({
      'POST /api/auth/refresh': anonymous,
      'POST /api/auth/register': () => jsonResponse(sessionResponse({ household: null }), 201),
      'POST /api/households': () => jsonResponse(soloHousehold, 201),
      'GET /api/households/me': () => jsonResponse(soloHousehold),
      'GET /api/health': () => jsonResponse({ status: 'ok', db: 'up', timestamp: '2026-11-14T12:00:00.000Z' }),
    });
    const { router } = renderRoute('/create-account');
    await fillAccount();
    await userEvent.type(screen.getByLabelText('Shared Space name'), 'Home');
    await userEvent.click(screen.getByRole('button', { name: 'Create Account' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard'));
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/households/me/invites')).toBe(false);
  });

  it('shows "email already exists" on the email field for 409', async () => {
    mockApi({
      'POST /api/auth/refresh': anonymous,
      'POST /api/auth/register': () =>
        jsonResponse({ statusCode: 409, message: 'Email already registered', error: 'EMAIL_TAKEN' }, 409),
    });
    renderRoute('/create-account');
    await fillAccount();
    await userEvent.type(screen.getByLabelText('Shared Space name'), 'Home');
    await userEvent.click(screen.getByRole('button', { name: 'Create Account' }));
    expect(await screen.findByText(/An account with this email already exists/)).toBeInTheDocument();
    expect(screen.getByLabelText('Email Address')).toHaveAttribute('aria-invalid', 'true');
  });

  it('maps 400 validation issues onto fields', async () => {
    mockApi({
      'POST /api/auth/refresh': anonymous,
      'POST /api/auth/register': () =>
        jsonResponse(
          { statusCode: 400, message: 'Validation failed', issues: [{ path: 'password', message: 'Password is too common' }] },
          400,
        ),
    });
    renderRoute('/create-account');
    await fillAccount();
    await userEvent.type(screen.getByLabelText('Shared Space name'), 'Home');
    await userEvent.click(screen.getByRole('button', { name: 'Create Account' }));
    expect(await screen.findByText('Password is too common')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('with an invite token: shows who invited you and accepts the invite instead of creating a space', async () => {
    const joined = currentHousehold({ me: { userId: 'u2', partnerSlot: 'PARTNER_2', role: 'MEMBER' } });
    const fetchMock = mockApi({
      'POST /api/auth/refresh': anonymous,
      'GET /api/invites/tok123': () =>
        jsonResponse({
          householdName: 'Alex & Maya',
          invitedByName: 'Alex Morgan',
          email: 'maya@example.com',
          status: 'PENDING',
          expiresAt: '2026-11-21T12:00:00.000Z',
        }),
      'POST /api/auth/register': () => jsonResponse(sessionResponse({ household: null }), 201),
      'POST /api/invites/accept': () => jsonResponse(joined),
      'GET /api/households/me': () => jsonResponse(joined),
      'GET /api/health': () => jsonResponse({ status: 'ok', db: 'up', timestamp: '2026-11-14T12:00:00.000Z' }),
    });
    const { router } = renderRoute('/create-account?invite=tok123');
    expect(await screen.findByText(/Alex Morgan invited you to/)).toBeInTheDocument();
    expect(screen.queryByLabelText('Shared Space name')).not.toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Full Name'), 'Maya Lopez');
    await userEvent.type(screen.getByLabelText('Email Address'), 'maya@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'long-enough-pw');
    await userEvent.click(screen.getByRole('button', { name: 'Create Account & Join' }));

    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard'));
    expect(requestBody(fetchMock, 'POST /api/invites/accept')).toEqual({ token: 'tok123' });
    expect(fetchMock.mock.calls.some(([url, i]) => url === '/api/households' && i?.method === 'POST')).toBe(false);
  });
});
