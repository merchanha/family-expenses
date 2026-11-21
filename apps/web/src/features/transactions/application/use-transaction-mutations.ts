import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { CreateTransactionInput, UpdateTransactionInput } from '@tandem/shared';
import { invalidateMoneyQueries } from '@/features/transactions/application/invalidate-money-queries';
import {
  createTransaction,
  deleteTransaction,
  updateTransaction,
} from '@/features/transactions/infrastructure/transactions-api';

// No optimistic updates: amounts and totals wait for the server (apps/web/CLAUDE.md §6).

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTransactionInput) => createTransaction(input),
    onSuccess: () => invalidateMoneyQueries(queryClient),
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTransactionInput }) => updateTransaction(id, input),
    onSuccess: () => invalidateMoneyQueries(queryClient),
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTransaction(id),
    onSuccess: () => invalidateMoneyQueries(queryClient),
  });
}
