import { useSearchParams } from 'react-router-dom';
import { transactionTypeSchema, type TransactionType } from '@tandem/shared';
import { usePartnerFilter } from '@/features/households';
import { useMonthFilter } from '@/hooks/use-month-filter';
import type { TransactionListFilters } from '@/features/transactions/infrastructure/transactions-api';

export interface TransactionFilterState {
  /** API query: chrome month + partner, plus the page's own search/type/category. */
  filters: TransactionListFilters;
  q: string;
  type: TransactionType | null;
  categoryId: string | null;
  /** Search, type or category is set (the month/partner are chrome, not "filters" for empty states). */
  hasPageFilters: boolean;
  setQ(q: string): void;
  setType(type: TransactionType | null): void;
  setCategoryId(id: string | null): void;
  clear(): void;
}

const PAGE_KEYS = ['q', 'type', 'category'] as const;

/** Transactions view state in the URL: `?q=&type=&category=` + chrome `?month=&partner=`. */
export function useTransactionFilters(): TransactionFilterState {
  const [params, setParams] = useSearchParams();
  const { month } = useMonthFilter();
  const [partner] = usePartnerFilter();

  const q = params.get('q') ?? '';
  const parsedType = transactionTypeSchema.safeParse(params.get('type'));
  const type = parsedType.success ? parsedType.data : null;
  const categoryId = params.get('category') || null;

  const set = (key: (typeof PAGE_KEYS)[number], value: string | null) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );

  return {
    filters: {
      year: month.year,
      month: month.month,
      partner,
      type,
      categoryId,
      q: q.trim() || null,
    },
    q,
    type,
    categoryId,
    hasPageFilters: !!(q.trim() || type || categoryId),
    setQ: (value) => set('q', value),
    setType: (value) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value) next.set('type', value);
          else next.delete('type');
          // A category only matches one type; drop it when switching.
          next.delete('category');
          return next;
        },
        { replace: true },
      );
    },
    setCategoryId: (value) => set('category', value),
    clear: () =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const key of PAGE_KEYS) next.delete(key);
          return next;
        },
        { replace: true },
      ),
  };
}
