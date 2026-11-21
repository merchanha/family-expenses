import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { summaryKeys } from '@/features/dashboard/application/summary-keys';
import { getPeriodSummary, type PeriodSummaryFilters } from '@/features/dashboard/infrastructure/summaries-api';

export function usePeriodSummary(filters: PeriodSummaryFilters) {
  return useQuery({
    queryKey: summaryKeys.period(filters),
    queryFn: () => getPeriodSummary(filters),
    placeholderData: keepPreviousData,
  });
}
