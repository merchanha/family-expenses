import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { tokenStorage } from '@/lib/auth/token-storage';
import { currentHousehold, sessionResponse } from '@/test/fixtures';
import { jsonResponse, mockApi, renderRoute, requestBody } from '@/test/render';

const preview = (status = 'PENDING') => () =>
  jsonResponse({
    householdName: 'Alex & Maya',
    invitedByName: 'Alex Morgan',
    email: 'maya@example.com',
    status,
    expiresAt: '2026-11-21T12:00:00.000Z',
  });

describe('JoinHouseholdPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    tokenStorage.clear();
  });

  it('offers create-account or sign-in to anonymous visitors, keeping the token', async () => {
    mockApi({
      'POST /api/auth/refresh': () => jsonResponse({ statusCode: 401, message: 'Unauthorized' }, 401),
      'GET /api/invites/abc': preview(),
    });
    renderRoute('/join?token=abc');
    expect(await screen.findByText(/Alex Morgan invited maya@example.com/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create account & join' })).toHaveAttribute('href', '/create-account?invite=abc');
    expect(screen.getByRole('link', { name: 'I already have an account' })).toHaveAttribute(
      'href',
      `/sign-in?redirect=${encodeURIComponent('/join?token=abc')}`,
    );
  });

  it('lets a signed-in user without a household accept and go to the dashboard', async () => {
    const joined = currentHousehold({ me: { userId: 'u2', partnerSlot: 'PARTNER_2', role: 'MEMBER' } });
    const fetchMock = mockApi({
      'POST /api/auth/refresh': () => jsonResponse(sessionResponse({ household: null })),
      'GET /api/invites/abc': preview(),
      'POST /api/invites/accept': () => jsonResponse(joined),
      'GET /api/households/me': () => jsonResponse(joined),
      'GET /api/health': () => jsonResponse({ status: 'ok', db: 'up', timestamp: '2026-11-14T12:00:00.000Z' }),
    });
    const { router } = renderRoute('/join?token=abc');
    await userEvent.click(await screen.findByRole('button', { name: 'Join Alex & Maya' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/dashboard'));
    expect(requestBody(fetchMock, 'POST /api/invites/accept')).toEqual({ token: 'abc' });
  });

  it('explains an email mismatch', async () => {
    mockApi({
      'POST /api/auth/refresh': () => jsonResponse(sessionResponse({ household: null })),
      'GET /api/invites/abc': preview(),
      'POST /api/invites/accept': () =>
        jsonResponse({ statusCode: 403, message: 'Wrong email', error: 'INVITE_EMAIL_MISMATCH' }, 403),
    });
    renderRoute('/join?token=abc');
    await userEvent.click(await screen.findByRole('button', { name: 'Join Alex & Maya' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('This invitation was sent to maya@example.com');
  });

  it('shows an expired invite as unusable', async () => {
    mockApi({
      'POST /api/auth/refresh': () => jsonResponse({ statusCode: 401, message: 'Unauthorized' }, 401),
      'GET /api/invites/abc': preview('EXPIRED'),
    });
    renderRoute('/join?token=abc');
    expect(await screen.findByRole('alert')).toHaveTextContent('invalid or has expired');
  });
});
