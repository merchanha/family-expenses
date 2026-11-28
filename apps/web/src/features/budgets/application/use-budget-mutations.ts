import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CopyPreviousMonthBudgetsInput, UpsertBudgetInput } from '@tandem/shared';
import { budgetKeys } from '@/features/budgets/application/budget-keys';
import { copyPreviousMonthBudgets, deleteBudget, upsertBudget } from '@/features/budgets/infrastructure/budgets-api';

/** Budgets never change transactions (BUSINESS_RULES §3), so only budget aggregates refresh. */
function useInvalidateBudgets() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: budgetKeys.all });
}

export function useUpsertBudget() {
  const invalidate = useInvalidateBudgets();
  return useMutation({ mutationFn: (input: UpsertBudgetInput) => upsertBudget(input), onSuccess: invalidate });
}

export function useDeleteBudget() {
  const invalidate = useInvalidateBudgets();
  return useMutation({ mutationFn: (id: string) => deleteBudget(id), onSuccess: invalidate });
}

export function useCopyPreviousMonthBudgets() {
  const invalidate = useInvalidateBudgets();
  return useMutation({
    mutationFn: (input: CopyPreviousMonthBudgetsInput) => copyPreviousMonthBudgets(input),
    onSuccess: invalidate,
  });
}
