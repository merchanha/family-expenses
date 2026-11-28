import {
  budgetSchema,
  budgetUtilizationResponseSchema,
  copyPreviousMonthBudgetsResponseSchema,
  type Budget,
  type BudgetUtilizationResponse,
  type CopyPreviousMonthBudgetsInput,
  type CopyPreviousMonthBudgetsResponse,
  type PartnerSlot,
  type UpsertBudgetInput,
} from '@tandem/shared';
import { api } from '@/lib/api';

export interface BudgetUtilizationFilters {
  year: number;
  month: number;
  partner: PartnerSlot | null;
}

/** GET /budgets/utilization — envelopes + summary, all computed by the API. */
export function getBudgetUtilization(filters: BudgetUtilizationFilters): Promise<BudgetUtilizationResponse> {
  return api.get('/budgets/utilization', { schema: budgetUtilizationResponseSchema, query: { ...filters } });
}

/** PUT /budgets — upsert by category + month. */
export function upsertBudget(input: UpsertBudgetInput): Promise<Budget> {
  return api.put('/budgets', input, { schema: budgetSchema });
}

export function deleteBudget(id: string): Promise<void> {
  return api.delete(`/budgets/${encodeURIComponent(id)}`);
}

export function copyPreviousMonthBudgets(input: CopyPreviousMonthBudgetsInput): Promise<CopyPreviousMonthBudgetsResponse> {
  return api.post('/budgets/copy-previous-month', input, { schema: copyPreviousMonthBudgetsResponseSchema });
}
