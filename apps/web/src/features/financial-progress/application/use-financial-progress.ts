import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { progressKeys } from '@/features/financial-progress/application/progress-keys';
import { getFinancialProgress, type FinancialProgressFilters } from '@/features/financial-progress/infrastructure/financial-progress-api';

export function useFinancialProgress(filters: FinancialProgressFilters) {
  return useQuery({
    queryKey: progressKeys.comparison(filters),
    queryFn: () => getFinancialProgress(filters),
    placeholderData: keepPreviousData,
  });
}
