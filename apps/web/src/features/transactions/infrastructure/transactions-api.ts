import {
  transactionListResponseSchema,
  transactionSchema,
  type CreateTransactionInput,
  type PartnerSlot,
  type Transaction,
  type TransactionListResponse,
  type TransactionType,
  type UpdateTransactionInput,
} from '@tandem/shared';
import { api } from '@/lib/api';

/** GET /transactions query (period on transactionDate; partner filters on "paid by"). */
export interface TransactionListFilters {
  year?: number;
  month?: number;
  partner?: PartnerSlot | null;
  type?: TransactionType | null;
  categoryId?: string | null;
  q?: string | null;
  limit?: number;
}

export function listTransactions(filters: TransactionListFilters, cursor?: string): Promise<TransactionListResponse> {
  return api.get('/transactions', {
    schema: transactionListResponseSchema,
    query: { ...filters, cursor },
  });
}

export function createTransaction(input: CreateTransactionInput): Promise<Transaction> {
  return api.post('/transactions', input, { schema: transactionSchema });
}

export function updateTransaction(id: string, input: UpdateTransactionInput): Promise<Transaction> {
  return api.patch(`/transactions/${encodeURIComponent(id)}`, input, { schema: transactionSchema });
}

export function deleteTransaction(id: string): Promise<void> {
  return api.delete(`/transactions/${encodeURIComponent(id)}`);
}
