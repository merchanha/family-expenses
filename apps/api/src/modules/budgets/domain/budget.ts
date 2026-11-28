import type { TransactionType } from '@tandem/shared';

export interface BudgetRecord {
  id: string;
  householdId: string;
  categoryId: string;
  year: number;
  month: number;
  /** 2-decimal money string. */
  amount: string;
  currency: string;
  splitPartner1Percent: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export type NewBudget = Omit<BudgetRecord, 'id' | 'createdAt' | 'updatedAt'>;

export interface BudgetPatch {
  amount: string;
  splitPartner1Percent?: number | null;
}

export interface BudgetCategoryRef {
  id: string;
  type: TransactionType;
  isActive: boolean;
}

export interface YearMonth {
  year: number;
  month: number;
}
