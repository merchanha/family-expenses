import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { tokenStorage } from '@/lib/auth/token-storage';
import { currentHousehold, financialProgress, sessionResponse } from '@/test/fixtures';
import { jsonResponse, mockApi, renderRoute, requestUrls } from '@/test/render';

const KEY = 'GET /api/financial-progress/comparison';

function api(overrides: Parameters<typeof mockApi>[0] = {}) {
  return mockApi({
    'POST /api/auth/refresh': () => jsonResponse(sessionResponse()),
    'GET /api/households/me': () => jsonResponse(currentHousehold()),
    [KEY]: () => jsonResponse(financialProgress()),
    ...overrides,
  });
}

const flat = (el: HTMLElement) => el.textContent?.replace(/\s/g, ' ');

describe('FinancialProgressPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    tokenStorage.clear();
  });

  it('shows the 4 KPIs for equivalent periods with labelled changes', async () => {
    api();
    renderRoute('/progress?month=2026-11');
    expect((await screen.findAllByText(/Nov 1–21 vs Oct 1–21/)).length).toBeGreaterThan(0);

    const spending = screen.getByRole('region', { name: 'Total spending' });
    expect(flat(spending)).toContain('$ 5.120,00');
    expect(flat(spending)).toContain('vs $ 5.530,00 (Oct 1–21)');
    // A spending decrease is good news: down arrow text + positive color.
    const spendingChange = within(spending).getByText('−7,41 %').parentElement!;
    expect(spendingChange).toHaveTextContent('Down');
    expect(spendingChange).toHaveClass('text-positive-text');

    expect(within(screen.getByRole('region', { name: 'Household income' })).getByText('+7,39 %').parentElement).toHaveClass('text-positive-text');
    expect(flat(screen.getByRole('region', { name: 'Net Cash Flow Buffer' }))).toContain('+$ 1.060,00');
    expect(within(screen.getByRole('region', { name: 'Savings rate' })).getByText('+8,66 pp')).toBeInTheDocument();
  });

  it('renders null changes as "Not available", never 0% or NaN', async () => {
    api({
      [KEY]: () =>
        jsonResponse(
          financialProgress({
            kpis: {
              totalSpending: { current: '100.00', previous: '0.00', changeAmount: '100.00', changePercent: null },
              householdIncome: { current: '0.00', previous: '0.00', changeAmount: '0.00', changePercent: null },
              netCashFlowBuffer: { current: '-100.00', previous: '0.00', changeAmount: '-100.00', changePercent: null },
              savingsRate: { current: null, previous: null, changePoints: null },
            },
          }),
        ),
    });
    renderRoute('/progress?month=2026-11');
    const rate = await screen.findByRole('region', { name: 'Savings rate' });
    expect(within(rate).getAllByText('Not available').length).toBeGreaterThan(0);
    expect(within(screen.getByRole('region', { name: 'Total spending' })).getByText('Not available')).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/NaN|Infinity/);
  });

  it('switches the trend window (only the trend), keeping month and partner', async () => {
    const fetchMock = api();
    renderRoute('/progress?month=2026-11&partner=PARTNER_2');
    await screen.findByRole('region', { name: 'Income vs Spend' });
    expect(Object.fromEntries(requestUrls(fetchMock, KEY).at(-1)!.searchParams)).toEqual({
      year: '2026', month: '11', window: 'MOM', partner: 'PARTNER_2',
    });
    await userEvent.click(screen.getByRole('button', { name: '6 Months' }));
    await waitFor(() => expect(requestUrls(fetchMock, KEY).at(-1)!.searchParams.get('window')).toBe('6M'));
    expect(screen.getByRole('button', { name: '6 Months' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('marks the month in progress in the trend table', async () => {
    api();
    renderRoute('/progress?month=2026-11');
    const table = await screen.findByRole('table', { name: 'Income and expenses per month' });
    expect(within(table).getByRole('rowheader', { name: 'November 2026 (to date)' })).toBeInTheDocument();
    expect(within(table).getByRole('rowheader', { name: 'October 2026' })).toBeInTheDocument();
  });

  it('filters category shifts by increases and decreases', async () => {
    api();
    renderRoute('/progress?month=2026-11');
    const panel = await screen.findByRole('region', { name: 'Category Shifts' });
    const table = within(panel).getAllByRole('table')[0]!;
    expect(within(table).getAllByRole('rowheader').map((r) => r.textContent)).toEqual(['Groceries', 'Recreation', 'Pets (inactive)']);
    // previous = 0 → percent not available
    expect(within(within(table).getByRole('rowheader', { name: 'Pets (inactive)' }).closest('tr')!).getByText('Not available')).toBeInTheDocument();

    await userEvent.click(within(panel).getByRole('button', { name: 'Decreases' }));
    expect(within(table).getAllByRole('rowheader').map((r) => r.textContent)).toEqual(['Recreation']);
    await userEvent.click(within(panel).getByRole('button', { name: 'Increases' }));
    expect(within(table).getAllByRole('rowheader').map((r) => r.textContent)).toEqual(['Groceries', 'Pets (inactive)']);
  });

  it('explains a future month instead of showing an error', async () => {
    api({
      [KEY]: () => jsonResponse({ statusCode: 422, message: 'Future period', error: 'FUTURE_PERIOD' }, 422),
    });
    renderRoute('/progress?month=2030-01');
    expect(await screen.findByText("January 2030 hasn't started yet")).toBeInTheDocument();
  });

  it('shows an error state with retry for other failures', async () => {
    api({ [KEY]: () => jsonResponse({ statusCode: 500, message: 'x' }, 500) });
    renderRoute('/progress');
    expect(await screen.findByText("Couldn't load Financial Progress")).toBeInTheDocument();
  });
});
