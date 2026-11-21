import type { TransactionListFilters } from '@/features/transactions/infrastructure/transactions-api';

export const transactionKeys = {
  all: ['transactions'] as const,
  list: (filters: TransactionListFilters) => [...transactionKeys.all, 'list', filters] as const,
  recent: (filters: TransactionListFilters) => [...transactionKeys.all, 'recent', filters] as const,
};
