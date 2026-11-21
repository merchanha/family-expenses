import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { transactionKeys } from '@/features/transactions/application/transaction-keys';
import { listTransactions, type TransactionListFilters } from '@/features/transactions/infrastructure/transactions-api';

/** Paged transaction list (cursor pagination). Keeps the old page visible while filters change. */
export function useTransactions(filters: TransactionListFilters) {
  return useInfiniteQuery({
    queryKey: transactionKeys.list(filters),
    queryFn: ({ pageParam }) => listTransactions(filters, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    placeholderData: keepPreviousData,
  });
}

/** The newest few transactions for a period (Dashboard "Recent Activity"). */
export function useRecentTransactions(filters: TransactionListFilters) {
  return useQuery({
    queryKey: transactionKeys.recent(filters),
    queryFn: () => listTransactions(filters),
    placeholderData: keepPreviousData,
  });
}
