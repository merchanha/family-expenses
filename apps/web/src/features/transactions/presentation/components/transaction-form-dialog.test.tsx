import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { tokenStorage } from '@/lib/auth/token-storage';
import { todayIso } from '@/lib/month';
import { category, currentHousehold, sessionResponse, transaction } from '@/test/fixtures';
import { jsonResponse, mockApi, renderRoute, requestBody, requestUrls } from '@/test/render';

const expenseCats = [category(), category({ id: 'c3', name: 'Rent & Housing', icon: 'home' })];
const incomeCats = [category({ id: 'c2', name: 'Salary', type: 'INCOME', icon: 'payments' })];

function api(overrides: Parameters<typeof mockApi>[0] = {}) {
  const fetchMock = mockApi({
    'POST /api/auth/refresh': () => jsonResponse(sessionResponse()),
    'GET /api/households/me': () => jsonResponse(currentHousehold()),
    'GET /api/categories': () => {
      const url = requestUrls(fetchMock, 'GET /api/categories').at(-1)!;
      const type = url.searchParams.get('type');
      const items = type === 'INCOME' ? incomeCats : type === 'EXPENSE' ? expenseCats : [...expenseCats, ...incomeCats];
      return jsonResponse({ items });
    },
    'GET /api/transactions': () => jsonResponse({ items: [transaction()], nextCursor: null }),
    'POST /api/transactions': () => jsonResponse(transaction({ id: 't9' }), 201),
    ...overrides,
  });
  return fetchMock;
}

async function openWithShortcut() {
  await screen.findByRole('list', { name: /Transactions in/ });
  await userEvent.keyboard('{Control>}k{/Control}');
  return screen.findByRole('dialog', { name: 'Add Transaction' });
}

describe('Add/Edit Transaction modal', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    tokenStorage.clear();
  });

  it('opens with Ctrl+K / ⌘K and from the sidebar "New Expense" CTA', async () => {
    api();
    renderRoute('/transactions');
    const dialog = await openWithShortcut();
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(dialog).not.toBeInTheDocument());

    await userEvent.keyboard('{Meta>}k{/Meta}');
    expect(await screen.findByRole('dialog', { name: 'Add Transaction' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');

    await userEvent.click(screen.getAllByRole('button', { name: /New Expense/ })[0]!);
    expect(await screen.findByRole('dialog', { name: 'Add Transaction' })).toBeInTheDocument();
  });

  it('validates required fields and a positive amount', async () => {
    api();
    renderRoute('/transactions');
    const dialog = await openWithShortcut();
    await userEvent.type(within(dialog).getByLabelText('Transaction amount'), '0');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save Transaction' }));
    expect(await within(dialog).findByText('Amount must be greater than zero')).toBeInTheDocument();
    expect(within(dialog).getByText('Description is required')).toBeInTheDocument();
    await userEvent.clear(within(dialog).getByLabelText('Transaction amount'));
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save Transaction' }));
    expect(await within(dialog).findByText('Amount is required')).toBeInTheDocument();
    expect(within(dialog).getByLabelText('Category')).toHaveAccessibleDescription('Choose a category');
  });

  it('creates an expense: es-AR amount as a string, who paid by name, category by type', async () => {
    const fetchMock = api();
    renderRoute('/transactions');
    const dialog = await openWithShortcut();

    // Who paid defaults to me; pick the partner by name.
    const payers = within(dialog).getByRole('group', { name: 'Who paid for this?' });
    expect(within(payers).getByRole('radio', { name: 'Alex Morgan' })).toBeChecked();
    await userEvent.click(within(payers).getByRole('radio', { name: 'Maya Lopez' }));

    await userEvent.type(within(dialog).getByLabelText('Transaction amount'), '1.234,50');
    await userEvent.type(within(dialog).getByLabelText('Description'), 'Supermarket');
    const select = within(dialog).getByLabelText('Category');
    await waitFor(() => expect(within(select).getByRole('option', { name: 'Rent & Housing' })).toBeInTheDocument());
    expect(within(select).queryByRole('option', { name: 'Salary' })).not.toBeInTheDocument();
    await userEvent.selectOptions(select, 'c1');
    await userEvent.type(within(dialog).getByLabelText('Notes (optional)'), 'weekly');
    const before = requestUrls(fetchMock, 'GET /api/transactions').length;
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save Transaction' }));

    await waitFor(() => expect(dialog).not.toBeInTheDocument());
    expect(requestBody(fetchMock, 'POST /api/transactions')).toEqual({
      type: 'EXPENSE',
      amount: '1234.50',
      description: 'Supermarket',
      categoryId: 'c1',
      transactionDate: todayIso('America/Argentina/Buenos_Aires'),
      paidById: 'u2',
      notes: 'weekly',
    });
    // The list (and every money aggregate) is refetched — no optimistic totals.
    await waitFor(() => expect(requestUrls(fetchMock, 'GET /api/transactions').length).toBeGreaterThan(before));
  });

  it('switching to Income shows income categories and "Shared" sends paidById null', async () => {
    const fetchMock = api();
    renderRoute('/transactions');
    const dialog = await openWithShortcut();
    await userEvent.click(within(dialog).getByRole('radio', { name: 'Income' }));
    const select = within(dialog).getByLabelText('Category');
    await waitFor(() => expect(within(select).getByRole('option', { name: 'Salary' })).toBeInTheDocument());
    await userEvent.selectOptions(select, 'c2');
    await userEvent.click(within(dialog).getByRole('radio', { name: 'Shared' }));
    await userEvent.type(within(dialog).getByLabelText('Transaction amount'), '500000');
    await userEvent.type(within(dialog).getByLabelText('Description'), 'Salary');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save Transaction' }));
    await waitFor(() => expect(requestBody(fetchMock, 'POST /api/transactions')).toMatchObject({ type: 'INCOME', categoryId: 'c2', paidById: null, notes: null }));
  });

  it('maps a 422 category error onto the category field', async () => {
    api({
      'POST /api/transactions': () =>
        jsonResponse({ statusCode: 422, message: 'This category is inactive', error: 'CATEGORY_INACTIVE' }, 422),
    });
    renderRoute('/transactions');
    const dialog = await openWithShortcut();
    await userEvent.type(within(dialog).getByLabelText('Transaction amount'), '10');
    await userEvent.type(within(dialog).getByLabelText('Description'), 'x');
    const select = within(dialog).getByLabelText('Category');
    await waitFor(() => expect(within(select).getByRole('option', { name: 'Groceries & Food' })).toBeInTheDocument());
    await userEvent.selectOptions(select, 'c1');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save Transaction' }));
    expect(await within(dialog).findByText('This category is inactive')).toBeInTheDocument();
    expect(select).toHaveAttribute('aria-invalid', 'true');
  });

  it('edits only the changed fields and deletes after confirmation', async () => {
    const fetchMock = api({
      'PATCH /api/transactions/t1': () => jsonResponse(transaction({ description: 'Big shop' })),
      'DELETE /api/transactions/t1': () => new Response(null, { status: 204 }),
    });
    renderRoute('/transactions');
    await userEvent.click(await screen.findByRole('button', { name: 'Edit Supermarket' }));
    let dialog = await screen.findByRole('dialog', { name: 'Edit Transaction' });
    expect(within(dialog).getByLabelText('Transaction amount')).toHaveValue('1234.50');
    expect(within(within(dialog).getByRole('group', { name: 'Who paid for this?' })).getByRole('radio', { name: 'Maya Lopez' })).toBeChecked();
    const description = within(dialog).getByLabelText('Description');
    await userEvent.clear(description);
    await userEvent.type(description, 'Big shop');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Save changes' }));
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
    expect(requestBody(fetchMock, 'PATCH /api/transactions/t1')).toEqual({ description: 'Big shop' });

    await userEvent.click(await screen.findByRole('button', { name: 'Edit Supermarket' }));
    dialog = await screen.findByRole('dialog', { name: 'Edit Transaction' });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));
    expect(fetchMock.mock.calls.some(([, i]) => i?.method === 'DELETE')).toBe(false);
    await userEvent.click(within(dialog).getByRole('button', { name: 'Confirm delete' }));
    await waitFor(() => expect(dialog).not.toBeInTheDocument());
    expect(fetchMock.mock.calls.some(([u, i]) => i?.method === 'DELETE' && String(u) === '/api/transactions/t1')).toBe(true);
  });
});
