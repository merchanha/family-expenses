import { ArrowLeftRight, Plus, SearchX } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { Button } from '@/components/ui/button';
import { useMonthFilter } from '@/hooks/use-month-filter';
import { monthLabel } from '@/lib/month';
import { cn } from '@/lib/utils';
import { useTransactionDialog } from '@/features/transactions/application/transaction-dialog-context';
import { useTransactionFilters } from '@/features/transactions/application/use-transaction-filters';
import { useTransactions } from '@/features/transactions/application/use-transactions';
import { TransactionFilters } from '@/features/transactions/presentation/components/transaction-filters';
import { TransactionList, TransactionListSkeleton } from '@/features/transactions/presentation/components/transaction-list';

/** Transactions for the selected month (+ partner), with search and type/category filters. */
export function TransactionsPage() {
  const filterState = useTransactionFilters();
  const { month } = useMonthFilter();
  const dialog = useTransactionDialog();
  const query = useTransactions(filterState.filters);
  const items = query.data?.pages.flatMap((p) => p.items) ?? [];
  const label = monthLabel(month);

  return (
    <div className="flex flex-col gap-space-lg">
      <div className="flex flex-wrap items-end justify-between gap-space-md">
        <div>
          <h2 className="font-headline text-headline-lg-mobile text-on-surface md:text-headline-lg">{label}</h2>
          <p className="text-body-md text-on-surface-variant">Every shared income and expense, newest first.</p>
        </div>
        <Button onClick={() => dialog.openNew()}>
          <Plus aria-hidden="true" />
          Add transaction
        </Button>
      </div>

      <TransactionFilters state={filterState} />

      {query.isPending ? (
        <TransactionListSkeleton />
      ) : query.isError && !query.data ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} title="Couldn't load transactions" />
      ) : items.length === 0 ? (
        filterState.hasPageFilters ? (
          <EmptyState
            icon={SearchX}
            title="No results for these filters"
            description="Try another search, type or category."
            action={
              <Button variant="secondary" onClick={filterState.clear}>
                Clear filters
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={ArrowLeftRight}
            title={`No transactions in ${label}`}
            description="Record what you spend and earn together to see it here."
            action={
              <Button onClick={() => dialog.openNew()}>
                <Plus aria-hidden="true" />
                Add expense
              </Button>
            }
          />
        )
      ) : (
        <div className={cn('flex flex-col gap-space-md transition-opacity', query.isPlaceholderData && 'opacity-60')} aria-busy={query.isFetching}>
          <TransactionList transactions={items} onSelect={dialog.openEdit} label={`Transactions in ${label}`} />
          {query.hasNextPage && (
            <Button
              variant="secondary"
              className="self-center"
              onClick={() => void query.fetchNextPage()}
              disabled={query.isFetchingNextPage}
            >
              {query.isFetchingNextPage ? 'Loading…' : 'Load more'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
