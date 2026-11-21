import type { Budget as BudgetRow } from '@prisma/client';
import type { Budget } from '@tandem/shared';
import { fromDecimal } from '../../../common/money';
import type { BudgetRecord } from '../domain/budget';

export const toBudgetRecord = (row: BudgetRow): BudgetRecord => ({
  id: row.id,
  householdId: row.householdId,
  categoryId: row.categoryId,
  year: row.year,
  month: row.month,
  amount: fromDecimal(row.amount),
  currency: row.currency,
  splitPartner1Percent: row.splitPartner1Percent,
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

export const toBudgetResponse = (b: BudgetRecord): Budget => ({
  id: b.id,
  categoryId: b.categoryId,
  year: b.year,
  month: b.month,
  amount: b.amount,
  currency: b.currency,
  splitPartner1Percent: b.splitPartner1Percent,
  createdAt: b.createdAt.toISOString(),
  updatedAt: b.updatedAt.toISOString(),
});
