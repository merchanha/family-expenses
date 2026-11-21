import type { ReactNode } from 'react';
import { CalendarClock, ChartColumn } from 'lucide-react';
import { ApiErrorCode, type ProgressWindow } from '@tandem/shared';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useMonthFilter } from '@/hooks/use-month-filter';
import { ApiError } from '@/lib/api';
import { monthLabel } from '@/lib/month';
import { cn } from '@/lib/utils';
import { usePartnerFilter } from '@/features/households';
import { useFinancialProgress } from '@/features/financial-progress/application/use-financial-progress';
import { useProgressWindow } from '@/features/financial-progress/application/use-progress-window';
import { comparisonLabel, rangeLabel } from '@/features/financial-progress/domain/progress-display';
import { CategoryVariation } from '@/features/financial-progress/presentation/components/category-variation';
import { ProgressKpis, ProgressKpisSkeleton } from '@/features/financial-progress/presentation/components/progress-kpis';
import { TrendChart } from '@/features/financial-progress/presentation/components/trend-chart';

const WINDOWS: { value: ProgressWindow; label: string }[] = [
  { value: 'MOM', label: 'Month over Month' },
  { value: '3M', label: '3 Months' },
  { value: '6M', label: '6 Months' },
];

function Panel({ id, title, description, aside, children }: { id: string; title: string; description?: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex min-w-0 flex-col gap-space-md rounded-lg border border-hairline bg-surface-container-lowest p-space-lg shadow-level-1">
      <div className="flex flex-wrap items-start justify-between gap-space-sm">
        <div className="min-w-0">
          <h3 id={id} className="font-headline text-headline-sm text-on-surface">
            {title}
          </h3>
          {description && <p className="text-body-sm text-on-surface-variant">{description}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

/** Financial Progress (design/financial_progress_comparison; decisions #16/#20). */
export function FinancialProgressPage() {
  const { month } = useMonthFilter();
  const [partner] = usePartnerFilter();
  const [trendWindow, setTrendWindow] = useProgressWindow();
  const query = useFinancialProgress({ year: month.year, month: month.month, window: trendWindow, partner });
  const label = monthLabel(month);
  const future = query.error instanceof ApiError && query.error.code === ApiErrorCode.FUTURE_PERIOD;
  const data = query.data;

  return (
    <div className="flex flex-col gap-space-xl">
      <div className="flex flex-col gap-1">
        <h2 className="font-headline text-headline-lg-mobile text-on-surface md:text-headline-lg">Financial Progress</h2>
        <p className="text-body-md text-on-surface-variant">
          {data ? comparisonLabel(data.current, data.previous) : label}
          {data?.isPartial ? ' · same days of each month' : ''}
          {partner ? ' · filtered by who paid' : ''}
        </p>
      </div>

      {query.isPending ? (
        <>
          <ProgressKpisSkeleton />
          <Skeleton className="h-80 w-full rounded-lg" />
        </>
      ) : future ? (
        <EmptyState
          icon={CalendarClock}
          title={`${label} hasn't started yet`}
          description="Pick this month or an earlier one to compare it with the month before."
        />
      ) : query.isError && !data ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} title="Couldn't load Financial Progress" />
      ) : data ? (
        <div className={cn('flex flex-col gap-space-xl transition-opacity', query.isPlaceholderData && 'opacity-60')} aria-busy={query.isFetching}>
          <ProgressKpis data={data} previousLabel={rangeLabel(data.previous)} />

          <Panel
            id="progress-trend"
            title="Income vs Spend"
            description="Per calendar month, ending with the selected month"
            aside={
              <div role="group" aria-label="Trend window" className="flex rounded-base bg-surface-container p-0.5">
                {WINDOWS.map((w) => (
                  <button
                    key={w.value}
                    type="button"
                    aria-pressed={trendWindow === w.value}
                    onClick={() => setTrendWindow(w.value)}
                    className={cn(
                      'min-h-10 rounded-[6px] px-space-sm text-label-sm sm:px-space-md',
                      trendWindow === w.value ? 'bg-surface-container-lowest text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface',
                    )}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
            }
          >
            {data.trend.length === 0 ? (
              <EmptyState icon={ChartColumn} title="No months to show yet" />
            ) : (
              <TrendChart trend={data.trend} currency={data.currency} />
            )}
          </Panel>

          <Panel
            id="progress-categories"
            title="Category Shifts"
            description={`Expense categories, ${comparisonLabel(data.current, data.previous)}`}
          >
            <CategoryVariation
              rows={data.categories}
              currency={data.currency}
              currentLabel={rangeLabel(data.current)}
              previousLabel={rangeLabel(data.previous)}
            />
          </Panel>
        </div>
      ) : null}
    </div>
  );
}
