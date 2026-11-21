import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { tokenStorage } from '@/lib/auth/token-storage';
import { budgetUtilization, category, currentHousehold, envelope, sessionResponse } from '@/test/fixtures';
import { jsonResponse, mockApi, renderRoute, requestBody, requestUrls } from '@/test/render';

const groceries = category({ transactionCount: 3 });
const pets = category({ id: 'c5', name: 'Pets', isDefault: false, icon: 'sell', color: '#ec4899' });
const salary = category({ id: 'c2', name: 'Salary', type: 'INCOME', icon: 'payments' });
const oldGym = category({ id: 'c9', name: 'Gym', isActive: false, isDefault: false, transactionCount: 4 });

function api(overrides: Parameters<typeof mockApi>[0] = {}) {
  const fetchMock = mockApi({
    'POST /api/auth/refresh': () => jsonResponse(sessionResponse()),
    'GET /api/households/me': () => jsonResponse(currentHousehold()),
    'GET /api/categories': () => {
      const inactive = requestUrls(fetchMock, 'GET /api/categories').at(-1)!.searchParams.get('includeInactive') === 'true';
      return jsonResponse({ items: inactive ? [groceries, pets, oldGym, salary] : [groceries, pets, salary] });
    },
    'GET /api/budgets/utilization': () => jsonResponse(budgetUtilization()),
    ...overrides,
  });
  return fetchMock;
}

describe('Categories & Budgets page: category management', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    tokenStorage.clear();
  });

  it('groups expense and income categories with usage', async () => {
    api();
    renderRoute('/categories');
    const expense = await screen.findByRole('region', { name: 'Expense categories' });
    expect(within(expense).getByText('Groceries & Food')).toBeInTheDocument();
    expect(within(expense).getByText('Used by 3 transactions')).toBeInTheDocument();
    expect(within(expense).getByText('Pets')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Income categories' })).getByText('Salary')).toBeInTheDocument();
  });

  it('creates a category', async () => {
    const fetchMock = api({ 'POST /api/categories': () => jsonResponse(category({ id: 'c7', name: 'Kids' }), 201) });
    renderRoute('/categories');
    await userEvent.click(await screen.findByRole('button', { name: 'New category' }));
    const dialog = await screen.findByRole('dialog', { name: 'New category' });
    await userEvent.type(within(dialog).getByLabelText('Name'), 'Kids');
    await userEvent.click(within(dialog).getByRole('radio', { name: 'school' }));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create category' }));
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
    expect(requestBody(fetchMock, 'POST /api/categories')).toEqual({ name: 'Kids', type: 'EXPENSE', icon: 'school', color: '#4b41e1' });
  });

  it('shows a duplicate name (409) on the name field', async () => {
    api({
      'POST /api/categories': () =>
        jsonResponse({ statusCode: 409, message: 'Name taken', error: 'CATEGORY_NAME_TAKEN' }, 409),
    });
    renderRoute('/categories');
    await userEvent.click(await screen.findByRole('button', { name: 'New category' }));
    const dialog = await screen.findByRole('dialog', { name: 'New category' });
    await userEvent.type(within(dialog).getByLabelText('Name'), 'Pets');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Create category' }));
    expect(await within(dialog).findByText(/already an active expense category/)).toBeInTheDocument();
  });

  it('a used category is deactivated (not deleted), and can be reactivated', async () => {
    const fetchMock = api({
      'DELETE /api/categories/c1': () =>
        jsonResponse({ result: 'DEACTIVATED', category: { ...groceries, isActive: false } }),
      'PATCH /api/categories/c9': () => jsonResponse({ ...oldGym, isActive: true }),
    });
    renderRoute('/categories');
    await userEvent.click(await screen.findByRole('button', { name: 'Deactivate Groceries & Food' }));
    const dialog = await screen.findByRole('dialog', { name: 'Deactivate Groceries & Food?' });
    expect(dialog).toHaveTextContent('deactivated instead of deleted');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Deactivate' }));
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
    expect(fetchMock.mock.calls.some(([u, i]) => i?.method === 'DELETE' && String(u) === '/api/categories/c1')).toBe(true);

    // Unused categories are deleted outright.
    expect(screen.getByRole('button', { name: 'Delete Pets' })).toBeInTheDocument();

    await userEvent.click(screen.getByRole('checkbox', { name: 'Show inactive' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Reactivate Gym' }));
    await waitFor(() => expect(requestBody(fetchMock, 'PATCH /api/categories/c9')).toEqual({ isActive: true }));
  });

  it('shows an error state with retry', async () => {
    api({ 'GET /api/categories': () => jsonResponse({ statusCode: 500, message: 'x' }, 500) });
    renderRoute('/categories');
    expect(await screen.findByText("Couldn't load categories")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });
});

const rent = envelope({
  category: { id: 'c3', name: 'Rent & Housing', icon: 'home', color: '#4b41e1', type: 'EXPENSE', isActive: true },
  budget: { id: 'b3', amount: '400.00', splitPartner1Percent: 60 },
  spent: '450.00',
  remaining: '-50.00',
  utilization: '112.50',
  status: 'EXCEEDED',
  paidBy: { partner1: '290.00', partner2: '160.00', shared: '0.00' },
});
const utilities = envelope({
  category: { id: 'c4', name: 'Utilities', icon: 'bolt', color: '#f59e0b', type: 'EXPENSE', isActive: true },
  budget: { id: 'b4', amount: '400.00', splitPartner1Percent: null },
  spent: '340.00',
  remaining: '60.00',
  utilization: '85.00',
  status: 'APPROACHING',
});
const pets2 = envelope({
  category: { id: 'c5', name: 'Pets', icon: 'sell', color: '#ec4899', type: 'EXPENSE', isActive: true },
  budget: null,
  spent: '25.00',
  remaining: null,
  utilization: null,
  status: null,
  paidBy: { partner1: '0.00', partner2: '0.00', shared: '25.00' },
});

describe('Categories & Budgets page: envelopes', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    tokenStorage.clear();
  });

  it('shows each envelope with the API status as text + color, paid-by amounts and split labels', async () => {
    api({
      'GET /api/budgets/utilization': () =>
        jsonResponse(budgetUtilization({ items: [envelope(), rent, utilities, pets2] })),
    });
    renderRoute('/categories?month=2026-11');

    const groceriesCard = await screen.findByRole('article', { name: 'Groceries & Food' });
    expect(within(groceriesCard).getByText('Within budget')).toHaveClass('text-positive');
    expect(within(groceriesCard).getByText('77,50 % utilized')).toBeInTheDocument();
    expect(within(groceriesCard).getByText('Default (50/50)')).toBeInTheDocument();
    expect(within(groceriesCard).getByText('Alex Morgan:')).toBeInTheDocument();
    expect(within(groceriesCard).getByText('Maya Lopez:')).toBeInTheDocument();

    const rentCard = screen.getByRole('article', { name: 'Rent & Housing' });
    expect(within(rentCard).getByText('Exceeded')).toHaveClass('text-negative');
    expect(within(rentCard).getByText(/over$/)).toHaveTextContent('50,00');
    expect(within(rentCard).getByText('60/40')).toBeInTheDocument();

    expect(within(screen.getByRole('article', { name: 'Utilities' })).getByText('Approaching (80%+)')).toHaveClass('text-warning');

    const petsCard = screen.getByRole('article', { name: 'Pets' });
    expect(within(petsCard).getByText('No budget')).toBeInTheDocument();
    expect(within(petsCard).getByRole('button', { name: 'Set budget for Pets' })).toBeInTheDocument();
    expect(within(petsCard).queryByText(/utilized/)).not.toBeInTheDocument();
  });

  it('summary shows "no budgets" rather than 0% when the allocation is empty', async () => {
    api({
      'GET /api/budgets/utilization': () =>
        jsonResponse(
          budgetUtilization({
            summary: { monthlyAllocation: '0.00', consumed: '0.00', consumedPercent: null, status: null, remaining: '0.00', budgetCount: 0 },
            items: [pets2],
          }),
        ),
    });
    renderRoute('/categories?month=2026-11');
    const consumed = await screen.findByRole('region', { name: 'Consumed to date' });
    expect(within(consumed).getByText('No budgets set this month')).toBeInTheDocument();
    expect(within(consumed).queryByText(/0,00 %/)).not.toBeInTheDocument();
  });

  it('sets a budget from the drawer (es-AR amount, household default split)', async () => {
    const fetchMock = api({
      'GET /api/budgets/utilization': () => jsonResponse(budgetUtilization({ items: [pets2] })),
      'PUT /api/budgets': () =>
        jsonResponse({
          id: 'b5', categoryId: 'c5', year: 2026, month: 11, amount: '1234.50', currency: 'ARS',
          splitPartner1Percent: null, createdAt: '2026-11-14T12:00:00.000Z', updatedAt: '2026-11-14T12:00:00.000Z',
        }),
    });
    renderRoute('/categories?month=2026-11');
    await userEvent.click(await screen.findByRole('button', { name: 'Set budget for Pets' }));
    const drawer = await screen.findByRole('dialog', { name: 'Set budget: Pets' });
    await userEvent.type(within(drawer).getByLabelText('Monthly budget (ARS)'), '1.234,50');
    await userEvent.click(within(drawer).getByRole('button', { name: 'Set budget' }));
    await waitFor(() => expect(drawer).not.toBeInTheDocument());
    expect(requestBody(fetchMock, 'PUT /api/budgets')).toEqual({
      categoryId: 'c5', year: 2026, month: 11, amount: '1234.50', splitPartner1Percent: null,
    });
  });

  it('edits the split and validates it', async () => {
    const fetchMock = api({
      'PUT /api/budgets': () =>
        jsonResponse({
          id: 'b1', categoryId: 'c1', year: 2026, month: 11, amount: '900.00', currency: 'ARS',
          splitPartner1Percent: 70, createdAt: '2026-11-14T12:00:00.000Z', updatedAt: '2026-11-14T12:00:00.000Z',
        }),
    });
    renderRoute('/categories?month=2026-11');
    await userEvent.click(await screen.findByRole('button', { name: 'Edit budget for Groceries & Food' }));
    const drawer = await screen.findByRole('dialog', { name: 'Edit budget: Groceries & Food' });
    expect(within(drawer).getByLabelText('Monthly budget (ARS)')).toHaveValue('800.00');
    await userEvent.click(within(drawer).getByRole('radio', { name: 'Custom split for this envelope' }));
    const split = within(drawer).getByLabelText('Partner 1 share (%)');
    await userEvent.type(split, '120');
    await userEvent.click(within(drawer).getByRole('button', { name: 'Save budget' }));
    expect(await within(drawer).findByText('Use a whole number from 0 to 100')).toBeInTheDocument();
    await userEvent.clear(split);
    await userEvent.type(split, '70');
    await userEvent.click(within(drawer).getByRole('button', { name: 'Save budget' }));
    await waitFor(() => expect(drawer).not.toBeInTheDocument());
    expect(requestBody(fetchMock, 'PUT /api/budgets')).toMatchObject({ categoryId: 'c1', amount: '800.00', splitPartner1Percent: 70 });
  });

  it('explains a 422 for an inactive category', async () => {
    api({
      'GET /api/budgets/utilization': () => jsonResponse(budgetUtilization({ items: [pets2] })),
      'PUT /api/budgets': () => jsonResponse({ statusCode: 422, message: 'Category inactive', error: 'CATEGORY_INACTIVE' }, 422),
    });
    renderRoute('/categories?month=2026-11');
    await userEvent.click(await screen.findByRole('button', { name: 'Set budget for Pets' }));
    const drawer = await screen.findByRole('dialog', { name: 'Set budget: Pets' });
    await userEvent.type(within(drawer).getByLabelText('Monthly budget (ARS)'), '100');
    await userEvent.click(within(drawer).getByRole('button', { name: 'Set budget' }));
    expect(await within(drawer).findByText(/can’t get a new budget/)).toBeInTheDocument();
  });

  it('removes a budget after confirming', async () => {
    const fetchMock = api({ 'DELETE /api/budgets/b1': () => new Response(null, { status: 204 }) });
    renderRoute('/categories?month=2026-11');
    await userEvent.click(await screen.findByRole('button', { name: 'Edit budget for Groceries & Food' }));
    const drawer = await screen.findByRole('dialog', { name: 'Edit budget: Groceries & Food' });
    await userEvent.click(within(drawer).getByRole('button', { name: 'Remove budget' }));
    await userEvent.click(within(drawer).getByRole('button', { name: 'Yes, remove' }));
    await waitFor(() => expect(drawer).not.toBeInTheDocument());
    expect(fetchMock.mock.calls.some(([u, i]) => i?.method === 'DELETE' && String(u) === '/api/budgets/b1')).toBe(true);
  });

  it("copies last month's budgets and reports how many were created", async () => {
    const fetchMock = api({ 'POST /api/budgets/copy-previous-month': () => jsonResponse({ created: 3 }) });
    renderRoute('/categories?month=2026-11');
    await userEvent.click(await screen.findByRole('button', { name: 'Copy last month’s budgets' }));
    expect(await screen.findByText('Copied 3 budgets from October 2026. Existing budgets were kept.')).toBeInTheDocument();
    expect(requestBody(fetchMock, 'POST /api/budgets/copy-previous-month')).toEqual({ year: 2026, month: 11 });
  });

  it('asks for the selected month and partner', async () => {
    const fetchMock = api();
    renderRoute('/categories?month=2026-10&partner=PARTNER_2');
    await screen.findByRole('article', { name: 'Groceries & Food' });
    const url = requestUrls(fetchMock, 'GET /api/budgets/utilization').at(-1)!;
    expect(Object.fromEntries(url.searchParams)).toEqual({ year: '2026', month: '10', partner: 'PARTNER_2' });
  });

  it('shows an error state when budgets fail to load', async () => {
    api({ 'GET /api/budgets/utilization': () => jsonResponse({ statusCode: 500, message: 'x' }, 500) });
    renderRoute('/categories');
    expect(await screen.findByText("Couldn't load budgets")).toBeInTheDocument();
  });
});
