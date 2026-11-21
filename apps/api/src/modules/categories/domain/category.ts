import type { TransactionType } from '@tandem/shared';

export interface CategoryRecord {
  id: string;
  householdId: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  type: TransactionType;
  isDefault: boolean;
  isActive: boolean;
  /** Transactions referencing this category (all time). */
  transactionCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface NewCategory {
  householdId: string;
  name: string;
  type: TransactionType;
  icon: string | null;
  color: string | null;
  description: string | null;
}

export interface CategoryPatch {
  name?: string;
  icon?: string | null;
  color?: string | null;
  description?: string | null;
  isActive?: boolean;
}

export interface CategoryListFilter {
  type?: TransactionType;
  includeInactive: boolean;
}
