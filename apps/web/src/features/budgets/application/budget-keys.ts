import type { BudgetUtilizationFilters } from '@/features/budgets/infrastructure/budgets-api';

/** Root is `budgets` so transaction mutations invalidate it by name. */
export const budgetKeys = {
  all: ['budgets'] as const,
  utilization: (filters: BudgetUtilizationFilters) => [...budgetKeys.all, 'utilization', filters] as const,
};
