import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { tokenStorage } from '@/lib/auth/token-storage';
import { currentMonth } from '@/lib/month';
import { budgetUtilization, currentHousehold, dashboardCharts, periodSummary, sessionResponse, transaction } from '@/test/fixtures';
import { jsonResponse, mockApi, renderRoute, requestUrls } from '@/test/render';

function api(overrides: Parameters<typeof mockApi>[0] = {}) {
  return mockApi({
    'POST /api/auth/refresh': () => jsonResponse(sessionResponse()),
    'GET /api/households/me': () => jsonResponse(currentHousehold()),
    'GET /api/summaries/period': () => jsonResponse(periodSummary()),
    'GET /api/transactions': () => jsonResponse({ items: [transaction()], nextCursor: null }),
    'GET /api/summaries/charts': () => jsonResponse(dashboardCharts()),
    'GET /api/budgets/utilization': () => jsonResponse(budgetUtilization()),
    ...overrides,
  });
}

const flat = (el: HTMLElement) => el.textContent?.replace(/\s/g, ' ');

describe('DashboardPage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    tokenStorage.clear();
  });

  it('shows the API’s KPIs formatted as ARS, plus recent activity', async () => {
    const fetchMock = api();
    renderRoute('/dashboard');
    const income = await screen.findByRole('region', { name: 'Total income' });
    expect(flat(income)).toContain('$ 500.000,00');
    expect(flat(screen.getByRole('region', { name: 'Total expenses' }))).toContain('$ 320.000,50');
    expect(flat(screen.getByRole('region', { name: 'Net Cash Flow Buffer' }))).toContain('$ 179.999,50');
    expect(flat(screen.getByRole('region', { name: 'Savings rate' }))).toContain('36,00 %');
    expect(await screen.findByRole('button', { name: 'Edit Supermarket' })).toBeInTheDocument();

    const now = currentMonth();
    const url = requestUrls(fetchMock, 'GET /api/summaries/period')[0]!;
    expect(url.searchParams.get('year')).toBe(String(now.year));
    expect(url.searchParams.get('month')).toBe(String(now.month));
    expect(requestUrls(fetchMock, 'GET /api/transactions')[0]!.searchParams.get('limit')).toBe('5');
  });

  it('never truncates large ARS totals and exposes the full value', async () => {
    api({
      'GET /api/summaries/period': () =>
        jsonResponse(periodSummary({ income: '12345678.90', expenses: '3456789.12', netCashFlowBuffer: '8888889.78' })),
    });
    renderRoute('/dashboard');
    const income = await screen.findByRole('region', { name: 'Total income' });
    const value = within(income).getByTitle(/12\.345\.678,90/);
    expect(value).not.toHaveClass('truncate');
    expect(flat(value)).toBe('$ 12.345.678,90');
  });

  it('shows "Not available" for a null savings rate and flags a negative buffer', async () => {
    api({
      'GET /api/summaries/period': () =>
        jsonResponse(periodSummary({ income: '0.00', expenses: '100.00', netCashFlowBuffer: '-100.00', savingsRate: null })),
    });
    renderRoute('/dashboard');
    const rate = await screen.findByRole('region', { name: 'Savings rate' });
    expect(rate).toHaveTextContent('Not available');
    expect(rate).not.toHaveTextContent('0%');
    const buffer = screen.getByRole('region', { name: 'Net Cash Flow Buffer' });
    expect(buffer).toHaveTextContent('Overspent');
    expect(flat(buffer)).toContain('-$ 100,00');
  });

  it('passes the partner filter to the summary', async () => {
    const fetchMock = api();
    renderRoute('/dashboard');
    await screen.findByRole('region', { name: 'Total income' });
    await userEvent.click(within(screen.getByRole('group', { name: 'Partner filter' })).getByRole('button', { name: 'Maya Lopez' }));
    await waitFor(() =>
      expect(requestUrls(fetchMock, 'GET /api/summaries/period').at(-1)!.searchParams.get('partner')).toBe('PARTNER_2'),
    );
  });

  it('shows empty and error states', async () => {
    api({
      'GET /api/summaries/period': () => jsonResponse({ statusCode: 503, message: 'down' }, 503),
      'GET /api/transactions': () => jsonResponse({ items: [], nextCursor: null }),
    });
    renderRoute('/dashboard');
    expect(await screen.findByText("Couldn't load this month's totals")).toBeInTheDocument();
    expect(await screen.findByText(/^No transactions in/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add expense' })).toBeInTheDocument();
  });
});

describe('DashboardPage charts', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    tokenStorage.clear();
  });

  it('shows the cash-flow trajectory, spending by category and budget utilization from the API', async () => {
    const fetchMock = api();
    renderRoute('/dashboard?month=2026-11&partner=PARTNER_1');

    const cashFlow = await screen.findByRole('region', { name: 'Monthly Cash Flow' });
    expect(await within(cashFlow).findByText('Income')).toBeInTheDocument();
    expect(within(cashFlow).getByText('Expenses')).toBeInTheDocument();
    expect(flat(within(cashFlow).getByRole('figure'))).toContain('$ 320.000,50');

    const spending = screen.getByRole('region', { name: 'Spending by Category' });
    const rows = within(within(spending).getByRole('list', { name: 'Spending by category' })).getAllByRole('listitem');
    expect(rows.map((r) => r.textContent)).toEqual([
      expect.stringContaining('Rent & Housing'),
      expect.stringContaining('Groceries & Food'),
    ]);
    expect(flat(rows[0]!)).toContain('93,75 %');
    expect(flat(rows[0]!)).toContain('$ 300.000,00');

    const budget = screen.getByRole('region', { name: 'Budget Utilization' });
    expect(await within(budget).findByText('77,50 %')).toBeInTheDocument();
    expect(within(budget).getByText('Within budget')).toBeInTheDocument();

    for (const key of ['GET /api/summaries/charts', 'GET /api/budgets/utilization']) {
      const url = requestUrls(fetchMock, key).at(-1)!;
      expect(Object.fromEntries(url.searchParams)).toEqual({ year: '2026', month: '11', partner: 'PARTNER_1' });
    }
  });

  it('links to /categories to set budgets when there are none, keeping the month', async () => {
    api({
      'GET /api/budgets/utilization': () =>
        jsonResponse(
          budgetUtilization({
            summary: { monthlyAllocation: '0.00', consumed: '0.00', consumedPercent: null, status: null, remaining: '0.00', budgetCount: 0 },
          }),
        ),
    });
    renderRoute('/dashboard?month=2026-10');
    const budget = await screen.findByRole('region', { name: 'Budget Utilization' });
    const link = await within(budget).findByRole('link', { name: 'Set budgets' });
    expect(link).toHaveAttribute('href', '/categories?month=2026-10');
    expect(within(budget).queryByText(/0,00 %/)).not.toBeInTheDocument();
  });

  it('shows empty states when the month has no activity', async () => {
    api({
      'GET /api/summaries/charts': () =>
        jsonResponse(dashboardCharts({ cashFlowTrajectory: [], spendingByCategory: [], totalExpenses: '0.00' })),
    });
    renderRoute('/dashboard?month=2026-11');
    expect(await screen.findByText('No income or expenses in November 2026 yet')).toBeInTheDocument();
    expect(screen.getByText('No expenses in November 2026')).toBeInTheDocument();
  });
});
