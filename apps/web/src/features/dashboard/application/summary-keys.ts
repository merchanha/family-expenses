import type { PeriodSummaryFilters } from '@/features/dashboard/infrastructure/summaries-api';

/** Root is `summaries` so transaction mutations can invalidate it by name. */
export const summaryKeys = {
  all: ['summaries'] as const,
  period: (filters: PeriodSummaryFilters) => [...summaryKeys.all, 'period', filters] as const,
};
