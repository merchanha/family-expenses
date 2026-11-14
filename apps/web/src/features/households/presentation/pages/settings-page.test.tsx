import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CurrentHouseholdResponse } from '@tandem/shared';
import { tokenStorage } from '@/lib/auth/token-storage';
import { currentHousehold, currentUser, member, sessionResponse } from '@/test/fixtures';
import { jsonResponse, mockApi, renderRoute, requestBody } from '@/test/render';

function settingsApi(household: CurrentHouseholdResponse, extra: Parameters<typeof mockApi>[0] = {}) {
  return mockApi({
    'POST /api/auth/refresh': () => jsonResponse(sessionResponse()),
    'GET /api/households/me': () => jsonResponse(household),
    ...extra,
  });
}

describe('SettingsPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    tokenStorage.clear();
  });

  it('updates the default split, sending only changed fields, and refreshes the indicator', async () => {
    const updated = currentHousehold({ household: { ...currentHousehold().household, defaultSplitPartner1Percent: 60 } });
    const fetchMock = settingsApi(currentHousehold(), { 'PATCH /api/households/me': () => jsonResponse(updated) });
    renderRoute('/settings');

    const split = await screen.findByLabelText(/Default split — Alex Morgan share/);
    expect(screen.getAllByText('50/50').length).toBeGreaterThan(0);
    await userEvent.clear(split);
    await userEvent.type(split, '60');
    expect(screen.getByText(/60\/40: Maya Lopez covers 40%/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Save Shared Space' }));

    expect(await screen.findByText('Shared Space settings saved.')).toBeInTheDocument();
    expect(requestBody(fetchMock, 'PATCH /api/households/me')).toEqual({ defaultSplitPartner1Percent: 60 });
    const sidebar = screen.getAllByRole('region', { name: 'Household members' })[0]!;
    expect(within(sidebar).getByText('60/40')).toBeInTheDocument();
  });

  it('rejects a split outside 1–99 without calling the API', async () => {
    const fetchMock = settingsApi(currentHousehold());
    renderRoute('/settings');
    const split = await screen.findByLabelText(/Default split/);
    await userEvent.clear(split);
    await userEvent.type(split, '100');
    await userEvent.click(screen.getByRole('button', { name: 'Save Shared Space' }));
    expect(await screen.findByText(/less than or equal to 99/)).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([, i]) => i?.method === 'PATCH')).toBe(false);
  });

  it('lets the owner invite a partner and shows the share link', async () => {
    const solo = currentHousehold({ members: [member()] });
    const fetchMock = settingsApi(solo, {
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
    });
    renderRoute('/settings');
    await userEvent.type(await screen.findByLabelText("Partner's email"), 'maya@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Invite partner' }));
    expect(await screen.findByLabelText('Invite link')).toHaveValue('http://localhost:5173/join?token=abc');
    expect(requestBody(fetchMock, 'POST /api/households/me/invites')).toEqual({ email: 'maya@example.com' });
  });

  it('shows the pending invite and explains self-invites', async () => {
    const pending = currentHousehold({
      members: [member()],
      invites: [
        {
          id: 'i1',
          email: 'maya@example.com',
          status: 'PENDING',
          invitedById: 'u1',
          expiresAt: '2026-11-21T12:00:00.000Z',
          createdAt: '2026-11-14T12:00:00.000Z',
        },
      ],
    });
    settingsApi(pending, {
      'POST /api/households/me/invites': () =>
        jsonResponse({ statusCode: 422, message: 'You cannot invite yourself', error: 'CANNOT_INVITE_SELF' }, 422),
    });
    renderRoute('/settings');
    expect(await screen.findByText(/Invitation pending for/)).toHaveTextContent('maya@example.com');
    await userEvent.type(screen.getByLabelText("Partner's email"), 'alex@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Send new invitation' }));
    expect(await screen.findByText("Use your partner's email, not yours.")).toBeInTheDocument();
  });

  it('lets the owner cancel a pending invite', async () => {
    let invites = [
      {
        id: 'i1',
        email: 'maya@example.com',
        status: 'PENDING' as const,
        invitedById: 'u1',
        expiresAt: '2026-11-21T12:00:00.000Z',
        createdAt: '2026-11-14T12:00:00.000Z',
      },
    ];
    const fetchMock = mockApi({
      'POST /api/auth/refresh': () => jsonResponse(sessionResponse()),
      'GET /api/households/me': () => jsonResponse(currentHousehold({ members: [member()], invites })),
      'DELETE /api/households/me/invites/i1': () => {
        invites = [];
        return new Response(null, { status: 204 });
      },
    });
    renderRoute('/settings');
    await userEvent.click(await screen.findByRole('button', { name: 'Cancel invitation' }));
    await waitFor(() => expect(screen.queryByText(/Invitation pending for/)).not.toBeInTheDocument());
    expect(fetchMock.mock.calls.some(([url, i]) => url === '/api/households/me/invites/i1' && i?.method === 'DELETE')).toBe(true);
  });

  it('hides the invite form when the household is full', async () => {
    settingsApi(currentHousehold());
    renderRoute('/settings');
    expect(await screen.findByRole('heading', { name: 'Household members' })).toBeInTheDocument();
    expect(screen.queryByLabelText("Partner's email")).not.toBeInTheDocument();
  });

  it('updates the profile name', async () => {
    const fetchMock = settingsApi(currentHousehold(), {
      'PATCH /api/auth/me': () =>
        jsonResponse(currentUser({ user: { ...currentUser().user, name: 'Alexandra Morgan' } })),
    });
    renderRoute('/settings');
    const name = await screen.findByLabelText('Full name');
    await userEvent.clear(name);
    await userEvent.type(name, 'Alexandra Morgan');
    await userEvent.click(screen.getByRole('button', { name: 'Save profile' }));
    expect(await screen.findByText('Profile saved.')).toBeInTheDocument();
    expect(requestBody(fetchMock, 'PATCH /api/auth/me')).toEqual({ name: 'Alexandra Morgan' });
  });

  it('shows an error with retry when the household cannot load', async () => {
    let calls = 0;
    mockApi({
      'POST /api/auth/refresh': () => jsonResponse(sessionResponse()),
      'GET /api/households/me': () =>
        calls++ === 0 ? jsonResponse({ statusCode: 500, message: 'boom' }, 500) : jsonResponse(currentHousehold()),
    });
    renderRoute('/settings');
    const alert = await screen.findByText("Couldn't load your Shared Space.");
    await userEvent.click(within(alert).getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('heading', { name: 'Household members' })).toBeInTheDocument();
  });
});
