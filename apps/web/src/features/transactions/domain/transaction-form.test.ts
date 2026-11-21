import { describe, expect, it } from 'vitest';
import type { Transaction } from '@tandem/shared';
import { changedFields, transactionFormSchema, toFormValues } from '@/features/transactions/domain/transaction-form';

const tx: Transaction = {
  id: 't1',
  type: 'EXPENSE',
  description: 'Groceries',
  amount: '128.50',
  currency: 'ARS',
  transactionDate: '2026-11-20',
  paymentMethod: null,
  notes: null,
  category: { id: 'c1', name: 'Groceries & Food', icon: 'shopping_cart', color: '#0c9488', type: 'EXPENSE', isActive: false },
  createdBy: { userId: 'u1', name: 'Alex', partnerSlot: 'PARTNER_1', displayColor: null },
  paidBy: null,
  createdAt: '2026-11-20T12:00:00.000Z',
  updatedAt: '2026-11-20T12:00:00.000Z',
};

describe('transactionFormSchema', () => {
  it('normalises es-AR amounts and keeps them as strings', () => {
    const out = transactionFormSchema.parse({ ...toFormValues(tx), amount: '1.234,50' });
    expect(out.amount).toBe('1234.50');
  });

  it('maps "Shared" to paidById null and empty notes to null', () => {
    const out = transactionFormSchema.parse(toFormValues(tx));
    expect(out.paidById).toBeNull();
    expect(out.notes).toBeNull();
  });

  it('rejects zero and malformed amounts', () => {
    expect(transactionFormSchema.safeParse({ ...toFormValues(tx), amount: '0,00' }).success).toBe(false);
    expect(transactionFormSchema.safeParse({ ...toFormValues(tx), amount: '12,345' }).success).toBe(false);
  });
});

describe('changedFields', () => {
  it('sends only what changed, so an inactive category can be kept', () => {
    const next = transactionFormSchema.parse({ ...toFormValues(tx), amount: '128,5', description: 'Weekly groceries' });
    expect(changedFields(tx, next)).toEqual({ description: 'Weekly groceries' });
  });

  it('includes paidBy and amount changes', () => {
    const next = transactionFormSchema.parse({ ...toFormValues(tx), amount: '130', paidById: 'u2' });
    expect(changedFields(tx, next)).toEqual({ amount: '130', paidById: 'u2' });
  });
});
