import { test } from 'node:test';
import assert from 'node:assert/strict';
import { budgetSplitPercentSchema, upsertBudgetSchema } from './budgets';
import { splitPercentSchema } from './households';

const body = { categoryId: 'c1', year: 2026, month: 11, amount: '500.00' };

test('budget split accepts 0 and 100 (one partner covers the envelope)', () => {
  for (const v of [0, 1, 50, 99, 100]) assert.equal(budgetSplitPercentSchema.safeParse(v).success, true, String(v));
  assert.equal(upsertBudgetSchema.safeParse({ ...body, splitPartner1Percent: 0 }).success, true);
  assert.equal(upsertBudgetSchema.safeParse({ ...body, splitPartner1Percent: 100 }).success, true);
  assert.equal(upsertBudgetSchema.safeParse({ ...body, splitPartner1Percent: null }).success, true);
  assert.equal(upsertBudgetSchema.safeParse(body).success, true);
});

test('budget split rejects out of range and non-integers', () => {
  for (const v of [-1, 101, 50.5, '50']) {
    assert.equal(upsertBudgetSchema.safeParse({ ...body, splitPartner1Percent: v }).success, false, String(v));
  }
});

test('household default split stays 1–99 (separate schema)', () => {
  assert.equal(splitPercentSchema.safeParse(0).success, false);
  assert.equal(splitPercentSchema.safeParse(100).success, false);
});
