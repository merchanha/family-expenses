import { useState } from 'react';
import { CalendarClock, Copy, PieChart } from 'lucide-react';
import type { Envelope } from '@tandem/shared';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { FormAlert } from '@/components/form-alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useMonthFilter } from '@/hooks/use-month-filter';
import { actionErrorMessage } from '@/lib/form-errors';
import { monthLabel, shiftMonth, todayIso } from '@/lib/month';
import { cn } from '@/lib/utils';
import { CategoryManager } from '@/features/categories';
import { memberBySlot, memberLabel, PARTNER_SLOT_LABEL, useCurrentHousehold, usePartnerFilter } from '@/features/households';
import { useBudgetUtilization } from '@/features/budgets/application/use-budget-utilization';
import { useCopyPreviousMonthBudgets } from '@/features/budgets/application/use-budget-mutations';
import { daysLeftInPeriod } from '@/features/budgets/domain/budget-display';
import { BudgetDrawer } from '@/features/budgets/presentation/components/budget-drawer';
import { EnvelopeCard, type PartnerNames } from '@/features/budgets/presentation/components/envelope-card';
import { EnvelopeSummary, EnvelopeSummarySkeleton } from '@/features/budgets/presentation/components/envelope-summary';

function EnvelopeGridSkeleton() {
  return (
    <div className="grid gap-gutter sm:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-56 w-full rounded-lg" />
      ))}
    </div>
  );
}

function usePartnerNames(): PartnerNames {
  const { data } = useCurrentHousehold();
  const name = (slot: 'PARTNER_1' | 'PARTNER_2') => {
    const m = data ? memberBySlot(data, slot) : undefined;
    return m ? memberLabel(m) : PARTNER_SLOT_LABEL[slot];
  };
  return { partner1: name('PARTNER_1'), partner2: name('PARTNER_2') };
}

/** Categories & Budgets (design/categories_monthly_budgets; decisions #18/#19). */
export function CategoriesBudgetsPage() {
  const { month } = useMonthFilter();
  const [partner] = usePartnerFilter();
  const household = useCurrentHousehold();
  const names = usePartnerNames();
  const query = useBudgetUtilization({ year: month.year, month: month.month, partner });
  const copy = useCopyPreviousMonthBudgets();
  const [editing, setEditing] = useState<Envelope | null>(null);
  const [notice, setNotice] = useState<{ message: string; tone: 'error' | 'success' } | null>(null);
  const label = monthLabel(month);
  const previousLabel = monthLabel(shiftMonth(month, -1));
  const today = todayIso(household.data?.household.timezone);
  const daysLeft = query.data ? daysLeftInPeriod(query.data.period, today) : null;

  const onCopy = () => {
    setNotice(null);
    copy.mutate(
      { year: month.year, month: month.month },
      {
        onSuccess: ({ created }) =>
          setNotice({
            tone: 'success',
            message:
              created === 0
                ? `Nothing to copy: ${previousLabel} had no budgets for categories still without one in ${label}.`
                : `Copied ${created} budget${created === 1 ? '' : 's'} from ${previousLabel}. Existing budgets were kept.`,
          }),
        onError: (err) => setNotice({ tone: 'error', message: actionErrorMessage(err) }),
      },
    );
  };

  return (
    <div className="flex flex-col gap-space-xl">
      <div className="flex flex-wrap items-end justify-between gap-space-md">
        <div className="flex flex-col gap-1">
          <span className="flex flex-wrap items-center gap-space-sm">
            <span className="rounded-full bg-secondary-container px-2 py-0.5 text-label-sm text-on-secondary-container uppercase">
              Joint envelopes
            </span>
            {daysLeft !== null && (
              <span className="flex items-center gap-1 rounded-full bg-surface-container px-2 py-0.5 text-label-sm text-on-surface-variant">
                <CalendarClock className="size-3.5" aria-hidden="true" />
                {daysLeft} day{daysLeft === 1 ? '' : 's'} left in {label}
              </span>
            )}
          </span>
          <h2 className="font-headline text-headline-lg-mobile text-on-surface md:text-headline-lg">Categories & Budgets</h2>
          <p className="text-body-md text-on-surface-variant">
            Monthly caps for {label}
            {partner ? ' · spending filtered by who paid' : ''}.
          </p>
        </div>
        <Button variant="secondary" onClick={onCopy} disabled={copy.isPending}>
          <Copy aria-hidden="true" />
          {copy.isPending ? 'Copying…' : 'Copy last month’s budgets'}
        </Button>
      </div>

      <FormAlert message={notice?.message ?? null} tone={notice?.tone} />

      {query.isPending ? (
        <>
          <EnvelopeSummarySkeleton />
          <EnvelopeGridSkeleton />
        </>
      ) : query.isError && !query.data ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} title="Couldn't load budgets" />
      ) : (
        <div className={cn('flex flex-col gap-space-xl transition-opacity', query.isPlaceholderData && 'opacity-60')} aria-busy={query.isFetching}>
          <EnvelopeSummary summary={query.data.summary} currency={query.data.currency} />
          <section aria-labelledby="envelopes" className="flex flex-col gap-space-md">
            <h3 id="envelopes" className="flex items-center gap-space-sm font-headline text-headline-md text-on-surface">
              Envelopes
              <span className="rounded-full bg-surface-container px-2 py-0.5 font-body text-label-sm text-on-surface-variant tabular">
                {query.data.items.length}
              </span>
            </h3>
            {query.data.items.length === 0 ? (
              <EmptyState
                icon={PieChart}
                title="No expense categories yet"
                description="Create an expense category below, then give it a monthly budget."
              />
            ) : (
              <div className="grid gap-gutter sm:grid-cols-2 xl:grid-cols-3">
                {query.data.items.map((envelope) => (
                  <EnvelopeCard
                    key={envelope.category.id}
                    envelope={envelope}
                    currency={query.data.currency}
                    defaultSplitPartner1Percent={query.data.defaultSplitPartner1Percent}
                    names={names}
                    onEdit={setEditing}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      <CategoryManager />

      <BudgetDrawer
        envelope={editing}
        month={month}
        defaultSplitPartner1Percent={query.data?.defaultSplitPartner1Percent ?? 50}
        onOpenChange={(open) => !open && setEditing(null)}
      />
    </div>
  );
}
