import type { FinancialProgressFilters } from '@/features/financial-progress/infrastructure/financial-progress-api';

/** Root is `financial-progress` so transaction mutations invalidate it by name. */
export const progressKeys = {
  all: ['financial-progress'] as const,
  comparison: (filters: FinancialProgressFilters) => [...progressKeys.all, 'comparison', filters] as const,
};
