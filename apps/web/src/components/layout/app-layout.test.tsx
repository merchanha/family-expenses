import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NAV_ITEMS } from '@/app/nav';
import { tokenStorage } from '@/lib/auth/token-storage';
import { currentHousehold, member, sessionResponse } from '@/test/fixtures';
import { jsonResponse, mockApi, renderRoute } from '@/test/render';

const health = () => jsonResponse({ status: 'ok', db: 'up', timestamp: new Date().toISOString() });

function signedIn(household = currentHousehold()) {
  return mockApi({
    'POST /api/auth/refresh': () => jsonResponse(sessionResponse()),
    'GET /api/households/me': () => jsonResponse(household),
    'GET /api/health': health,
  });
}

describe('App shell', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    tokenStorage.clear();
  });

  it('renders every sidebar nav item with its route', async () => {
    signedIn();
    renderRoute('/dashboard');
    const nav = await screen.findByRole('navigation', { name: 'Main' });
    for (const item of NAV_ITEMS) {
      expect(within(nav).getByRole('link', { name: new RegExp(item.label) })).toHaveAttribute('href', item.to);
    }
  });

  it('shows the Shared Space name and both members with partner labels and the default split', async () => {
    signedIn(
      currentHousehold({
        household: { ...currentHousehold().household, defaultSplitPartner1Percent: 60 },
      }),
    );
    renderRoute('/dashboard');
    const members = (await screen.findAllByRole('region', { name: 'Household members' }))[0]!;
    expect(within(members).getByText('Alex Morgan')).toBeInTheDocument();
    expect(within(members).getByText('(you)')).toBeInTheDocument();
    expect(within(members).getByText('Maya Lopez')).toBeInTheDocument();
    expect(within(members).getByText('Partner 1')).toBeInTheDocument();
    expect(within(members).getByText('Partner 2')).toBeInTheDocument();
    expect(within(members).getByText('60/40')).toBeInTheDocument();
    expect(screen.getAllByText('Alex & Maya').length).toBeGreaterThan(0);
  });

  it('wires the partner filter to real member names and the URL', async () => {
    signedIn(
      currentHousehold({
        members: [member({ displayName: 'Alex' }), currentHousehold().members[1]!],
      }),
    );
    const { router } = renderRoute('/transactions');
    expect(await screen.findByRole('heading', { level: 1, name: 'Transactions' })).toBeInTheDocument();
    const filter = await screen.findByRole('group', { name: 'Partner filter' });
    expect(within(filter).getByRole('button', { name: 'All Shared' })).toHaveAttribute('aria-pressed', 'true');
    const maya = within(filter).getByRole('button', { name: 'Maya Lopez' });
    expect(within(filter).getByRole('button', { name: 'Alex' })).toBeInTheDocument();

    await userEvent.click(maya);
    expect(maya).toHaveAttribute('aria-pressed', 'true');
    expect(router.state.location.search).toBe('?partner=PARTNER_2');
  });

  it('hides the partner filter and split until the partner joins, and offers an invite', async () => {
    signedIn(
      currentHousehold({
        members: [member()],
        invites: [],
      }),
    );
    renderRoute('/dashboard');
    const members = (await screen.findAllByRole('region', { name: 'Household members' }))[0]!;
    expect(within(members).getByRole('link', { name: 'Invite your partner' })).toHaveAttribute('href', '/settings');
    expect(within(members).queryByText('50/50')).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Partner filter' })).not.toBeInTheDocument();
    expect(screen.queryByText('Partner 2')).not.toBeInTheDocument();
  });

  it('redirects / to /dashboard', async () => {
    signedIn();
    renderRoute('/');
    expect(await screen.findByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
  });
});
