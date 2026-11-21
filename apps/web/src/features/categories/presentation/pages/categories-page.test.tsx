import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { tokenStorage } from '@/lib/auth/token-storage';
import { category, currentHousehold, sessionResponse } from '@/test/fixtures';
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
    ...overrides,
  });
  return fetchMock;
}

describe('CategoriesPage', () => {
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
