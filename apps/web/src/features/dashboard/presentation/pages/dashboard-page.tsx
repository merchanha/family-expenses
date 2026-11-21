import { ArrowRight, ChartLine as LineChartIcon, PieChart, Plus, Receipt } from 'lucide-react';
import type { CashFlowPoint } from '@tandem/shared';
import { Link, useSearchParams } from 'react-router-dom';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useMonthFilter } from '@/hooks/use-month-filter';
import { monthLabel } from '@/lib/month';
import { useAuthenticatedSession } from '@/lib/auth/session-context';
import { cn } from '@/lib/utils';
import { useBudgetUtilization } from '@/features/budgets';
import { usePartnerFilter } from '@/features/households';
import { TransactionList, TransactionListSkeleton, useRecentTransactions, useTransactionDialog } from '@/features/transactions';
import { useDashboardCharts } from '@/features/dashboard/application/use-dashboard-charts';
import { usePeriodSummary } from '@/features/dashboard/application/use-period-summary';
import { isZeroAmount } from '@/features/dashboard/domain/chart-display';
import { BudgetUtilizationCard } from '@/features/dashboard/presentation/components/budget-utilization-card';
import { CashFlowChart } from '@/features/dashboard/presentation/components/cash-flow-chart';
import { ChartCard } from '@/features/dashboard/presentation/components/chart-card';
import { SpendingByCategory } from '@/features/dashboard/presentation/components/spending-by-category';
import { SummaryKpis, SummaryKpisSkeleton } from '@/features/dashboard/presentation/components/summary-kpis';

const RECENT_LIMIT = 5;

/** Anything to plot: the last cumulative point is non-zero (string check, no arithmetic). */
function hasActivity(points: CashFlowPoint[]): boolean {
  const last = points.at(-1);
  return !!last && !(isZeroAmount(last.cumulativeIncome) && isZeroAmount(last.cumulativeExpenses));
}

/** Dashboard (design/main_dashboard; decision #17): KPIs, cash flow, budget utilization, spending by category, recent activity. */
export function DashboardPage() {
  const { household } = useAuthenticatedSession();
  const { month, isCurrent } = useMonthFilter();
  const [partner] = usePartnerFilter();
  const [params] = useSearchParams();
  const dialog = useTransactionDialog();
  const period = { year: month.year, month: month.month, partner };
  const summary = usePeriodSummary(period);
  const charts = useDashboardCharts(period);
  const budgets = useBudgetUtilization(period);
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

      <div className="grid gap-gutter lg:grid-cols-3">
        <ChartCard
          title="Monthly Cash Flow"
          description={`Cumulative income and expenses, ${isCurrent ? `${label} to date` : label}`}
          className="lg:col-span-2"
        >
          {charts.isPending ? (
            <Skeleton className="h-64 w-full" />
          ) : charts.isError && !charts.data ? (
            <ErrorState error={charts.error} onRetry={() => void charts.refetch()} title="Couldn't load the cash-flow chart" />
          ) : !hasActivity(charts.data.cashFlowTrajectory) ? (
            <EmptyState icon={LineChartIcon} title={`No income or expenses in ${label} yet`} description="The chart fills in as you add transactions." />
          ) : (
            <CashFlowChart points={charts.data.cashFlowTrajectory} currency={charts.data.currency} />
          )}
        </ChartCard>

        <ChartCard title="Budget Utilization" description="Spent vs budgeted, in budgeted envelopes">
          {budgets.isPending ? (
            <Skeleton className="h-40 w-full" />
          ) : budgets.isError && !budgets.data ? (
            <ErrorState error={budgets.error} onRetry={() => void budgets.refetch()} title="Couldn't load budgets" />
          ) : (
            <BudgetUtilizationCard data={budgets.data} search={kept ? `?${kept}` : ''} />
          )}
        </ChartCard>
      </div>

      <div className="grid gap-gutter lg:grid-cols-2">
        <ChartCard title="Spending by Category" description={`Expenses per category in ${label}`}>
          {charts.isPending ? (
            <Skeleton className="h-64 w-full" />
          ) : charts.isError && !charts.data ? (
            <ErrorState error={charts.error} onRetry={() => void charts.refetch()} title="Couldn't load spending by category" />
          ) : charts.data.spendingByCategory.length === 0 ? (
            <EmptyState
              icon={PieChart}
              title={`No expenses in ${label}`}
              action={
                <Button onClick={() => dialog.openNew()}>
                  <Plus aria-hidden="true" />
                  Add expense
                </Button>
              }
            />
          ) : (
            <SpendingByCategory
              items={charts.data.spendingByCategory}
              totalExpenses={charts.data.totalExpenses}
              currency={charts.data.currency}
            />
          )}
        </ChartCard>

        <ChartCard
          title="Recent Activity"
          description={`Latest transactions in ${label}`}
          aside={
            <Link
              to={{ pathname: '/transactions', search: kept ? `?${kept}` : '' }}
              className="flex min-h-10 shrink-0 items-center gap-1 text-label-md text-secondary hover:underline"
            >
              View all
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          }
        >
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
        </ChartCard>
      </div>
    </div>
  );
}
