import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { summaryKeys } from '@/features/dashboard/application/summary-keys';
import { getDashboardCharts, type PeriodSummaryFilters } from '@/features/dashboard/infrastructure/summaries-api';

export function useDashboardCharts(filters: PeriodSummaryFilters) {
  return useQuery({
    queryKey: summaryKeys.charts(filters),
    queryFn: () => getDashboardCharts(filters),
    placeholderData: keepPreviousData,
  });
}
