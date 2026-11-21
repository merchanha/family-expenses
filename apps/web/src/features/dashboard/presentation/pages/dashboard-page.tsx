import { ArrowRight, Plus, Receipt } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { Button } from '@/components/ui/button';
import { useMonthFilter } from '@/hooks/use-month-filter';
import { monthLabel } from '@/lib/month';
import { useAuthenticatedSession } from '@/lib/auth/session-context';
import { cn } from '@/lib/utils';
import { usePartnerFilter } from '@/features/households';
import { TransactionList, TransactionListSkeleton, useRecentTransactions, useTransactionDialog } from '@/features/transactions';
import { usePeriodSummary } from '@/features/dashboard/application/use-period-summary';
import { SummaryKpis, SummaryKpisSkeleton } from '@/features/dashboard/presentation/components/summary-kpis';

const RECENT_LIMIT = 5;

/** Dashboard v1 (design/main_dashboard): KPIs from the summary API + recent activity. Charts arrive in P3. */
export function DashboardPage() {
  const { household } = useAuthenticatedSession();
  const { month, isCurrent } = useMonthFilter();
  const [partner] = usePartnerFilter();
  const [params] = useSearchParams();
  const dialog = useTransactionDialog();
  const period = { year: month.year, month: month.month, partner };
  const summary = usePeriodSummary(period);
  const recent = useRecentTransactions({ ...period, limit: RECENT_LIMIT });
  const label = monthLabel(month);
  const kept = params.toString();

  return (
    <div className="flex flex-col gap-space-lg">
      <div className="flex flex-wrap items-end justify-between gap-space-md">
        <div>
          <h2 className="font-headline text-display-lg-mobile text-on-surface md:text-display-lg">
            {household?.name ?? 'Your Shared Space'}
          </h2>
          <p className="text-body-lg text-on-surface-variant">
            {isCurrent ? `${label} so far` : label}
            {partner ? ' · filtered by who paid' : ''}
          </p>
        </div>
        <Button onClick={() => dialog.openNew()}>
          <Plus aria-hidden="true" />
          New Expense
        </Button>
      </div>

      {summary.isPending ? (
        <SummaryKpisSkeleton />
      ) : summary.isError && !summary.data ? (
        <ErrorState error={summary.error} onRetry={() => void summary.refetch()} title="Couldn't load this month's totals" />
      ) : (
        <div className={cn('transition-opacity', summary.isPlaceholderData && 'opacity-60')} aria-busy={summary.isFetching}>
          <SummaryKpis summary={summary.data} />
        </div>
      )}

      <section aria-labelledby="recent-activity" className="flex flex-col gap-space-md">
        <div className="flex items-center justify-between gap-space-md">
          <h3 id="recent-activity" className="font-headline text-headline-md text-on-surface">
            Recent Activity
          </h3>
          <Link
            to={{ pathname: '/transactions', search: kept ? `?${kept}` : '' }}
            className="flex min-h-10 items-center gap-1 text-label-md text-secondary hover:underline"
          >
            View all
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
        {recent.isPending ? (
          <TransactionListSkeleton rows={RECENT_LIMIT} />
        ) : recent.isError && !recent.data ? (
          <ErrorState error={recent.error} onRetry={() => void recent.refetch()} title="Couldn't load recent activity" />
        ) : recent.data.items.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title={`No transactions in ${label}`}
            description="Add your first shared expense or income to see this month take shape."
            action={
              <Button onClick={() => dialog.openNew()}>
                <Plus aria-hidden="true" />
                Add expense
              </Button>
            }
          />
        ) : (
          <TransactionList transactions={recent.data.items} onSelect={dialog.openEdit} label="Recent activity" />
        )}
      </section>
    </div>
  );
}
