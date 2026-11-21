import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { tokenStorage } from '@/lib/auth/token-storage';
import { currentMonth, shiftMonth, toMonthParam } from '@/lib/month';
import { category, currentHousehold, sessionResponse, transaction } from '@/test/fixtures';
import { jsonResponse, mockApi, renderRoute, requestUrls } from '@/test/render';

const list = (items: unknown[], nextCursor: string | null = null) => () => jsonResponse({ items, nextCursor });

function api(overrides: Parameters<typeof mockApi>[0] = {}) {
  return mockApi({
    'POST /api/auth/refresh': () => jsonResponse(sessionResponse()),
    'GET /api/households/me': () => jsonResponse(currentHousehold()),
    'GET /api/categories': () =>
      jsonResponse({ items: [category(), category({ id: 'c2', name: 'Salary', type: 'INCOME', icon: 'payments' })] }),
    'GET /api/transactions': list([transaction()]),
    ...overrides,
  });
}

describe('TransactionsPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    tokenStorage.clear();
  });

  it('lists the month’s transactions with paid-by chip, category and signed ARS amount', async () => {
    const fetchMock = api();
    renderRoute('/transactions');
    const listEl = await screen.findByRole('list', { name: /Transactions in/ });
    const row = within(listEl).getByRole('button', { name: 'Edit Supermarket' });
    expect(row).toHaveTextContent('Paid by: Maya Lopez');
    expect(row).toHaveTextContent('Groceries & Food');
    expect(row.textContent?.replace(/\s/g, ' ')).toContain('−$ 1.234,50');

    const now = currentMonth();
    const url = requestUrls(fetchMock, 'GET /api/transactions')[0]!;
    expect(url.searchParams.get('year')).toBe(String(now.year));
    expect(url.searchParams.get('month')).toBe(String(now.month));
    expect(url.searchParams.has('partner')).toBe(false);
  });

  it('sends month, partner, search and type filters to the API from the URL', async () => {
    const fetchMock = api();
    const prev = shiftMonth(currentMonth(), -1);
    const { router } = renderRoute(`/transactions?month=${toMonthParam(prev)}&partner=PARTNER_1`);
    await screen.findByRole('list', { name: /Transactions in/ });

    await userEvent.type(screen.getByRole('searchbox', { name: 'Search transactions' }), 'super');
    await userEvent.click(within(screen.getByRole('group', { name: 'Transaction type' })).getByRole('button', { name: 'Expenses' }));

    await waitFor(() => {
      const last = requestUrls(fetchMock, 'GET /api/transactions').at(-1)!;
      expect(last.searchParams.get('q')).toBe('super');
      expect(last.searchParams.get('type')).toBe('EXPENSE');
      expect(last.searchParams.get('partner')).toBe('PARTNER_1');
      expect(last.searchParams.get('month')).toBe(String(prev.month));
    });
    expect(router.state.location.search).toContain('q=super');
    expect(router.state.location.search).toContain('type=EXPENSE');
  });

  it('month picker moves to the previous month and back', async () => {
    const fetchMock = api();
    const { router } = renderRoute('/transactions');
    await screen.findByRole('list', { name: /Transactions in/ });
    await userEvent.click(screen.getByRole('button', { name: 'Previous month' }));
    const prev = shiftMonth(currentMonth(), -1);
    expect(router.state.location.search).toBe(`?month=${toMonthParam(prev)}`);
    await waitFor(() =>
      expect(requestUrls(fetchMock, 'GET /api/transactions').at(-1)!.searchParams.get('month')).toBe(String(prev.month)),
    );
    await userEvent.click(screen.getByRole('button', { name: /Back to this month/ }));
    expect(router.state.location.search).toBe('');
  });

  it('distinguishes "no data yet" from "no results for these filters"', async () => {
    api({ 'GET /api/transactions': list([]) });
    const { unmount } = renderRoute('/transactions');
    expect(await screen.findByText(/^No transactions in/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add expense' })).toBeInTheDocument();
    unmount();

    renderRoute('/transactions?q=zzz');
    expect(await screen.findByText('No results for these filters')).toBeInTheDocument();
  });

  it('shows an error with retry when the list fails', async () => {
    let calls = 0;
    api({
      'GET /api/transactions': () =>
        ++calls === 1 ? jsonResponse({ statusCode: 500, message: 'boom' }, 500) : jsonResponse({ items: [], nextCursor: null }),
    });
    renderRoute('/transactions');
    expect(await screen.findByText("Couldn't load transactions")).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText(/^No transactions in/)).toBeInTheDocument();
  });

  it('loads the next page with the cursor', async () => {
    const fetchMock = api({
      'GET /api/transactions': () => {
        const calls = requestUrls(fetchMock, 'GET /api/transactions');
        const cursor = calls.at(-1)?.searchParams.get('cursor');
        return cursor
          ? jsonResponse({ items: [transaction({ id: 't2', description: 'Rent' })], nextCursor: null })
          : jsonResponse({ items: [transaction()], nextCursor: 'cur-2' });
      },
    });
    renderRoute('/transactions');
    await userEvent.click(await screen.findByRole('button', { name: 'Load more' }));
    expect(await screen.findByRole('button', { name: 'Edit Rent' })).toBeInTheDocument();
    expect(requestUrls(fetchMock, 'GET /api/transactions').at(-1)!.searchParams.get('cursor')).toBe('cur-2');
  });
});
