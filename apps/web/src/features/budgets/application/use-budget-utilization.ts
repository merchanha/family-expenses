import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { budgetKeys } from '@/features/budgets/application/budget-keys';
import { getBudgetUtilization, type BudgetUtilizationFilters } from '@/features/budgets/infrastructure/budgets-api';

export function useBudgetUtilization(filters: BudgetUtilizationFilters) {
  return useQuery({
    queryKey: budgetKeys.utilization(filters),
    queryFn: () => getBudgetUtilization(filters),
    placeholderData: keepPreviousData,
  });
}
