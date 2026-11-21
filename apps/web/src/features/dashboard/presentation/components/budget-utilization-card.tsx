import { PieChart } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { BudgetUtilizationResponse } from '@tandem/shared';
import { EmptyState } from '@/components/empty-state';
import { formatMoney, formatPercent } from '@/lib/money';
import { BudgetStatusBadge, UtilizationBar } from '@/features/budgets';

interface BudgetUtilizationCardProps {
  data: BudgetUtilizationResponse;
  /** Query string to keep (month, partner) on the link to /categories. */
  search: string;
}

/** Total budgeted vs spent in budgeted categories (decision #17; replaces the mockup's ring). */
export function BudgetUtilizationCard({ data, search }: BudgetUtilizationCardProps) {
  const { summary, currency } = data;
  if (summary.budgetCount === 0) {
    return (
      <EmptyState
        icon={PieChart}
        title="No budgets this month"
        description="Give your envelopes a monthly cap to track how much is left."
        action={
          <Link
            to={{ pathname: '/categories', search }}
            className="inline-flex min-h-10 items-center rounded-base bg-primary px-4 text-label-md text-primary-foreground hover:bg-primary-container"
          >
            Set budgets
          </Link>
        }
        className="flex-1"
      />
    );
  }
  return (
    <div className="flex flex-col gap-space-md">
      <div className="flex flex-wrap items-baseline justify-between gap-space-sm">
        <span className="font-headline text-stat-lg-mobile text-on-surface tabular">{formatPercent(summary.consumedPercent)}</span>
        <BudgetStatusBadge status={summary.status} />
      </div>
      <UtilizationBar utilization={summary.consumedPercent} status={summary.status} className="h-3" />
      <dl className="grid grid-cols-2 gap-space-sm text-body-sm">
        <div>
          <dt className="text-on-surface-variant">Spent (budgeted)</dt>
          <dd className="tabular text-on-surface">{formatMoney(summary.consumed, { currency })}</dd>
        </div>
        <div>
          <dt className="text-on-surface-variant">Budgeted</dt>
          <dd className="tabular text-on-surface">{formatMoney(summary.monthlyAllocation, { currency })}</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-on-surface-variant">Remaining</dt>
          <dd className="tabular text-on-surface">{formatMoney(summary.remaining, { currency })}</dd>
        </div>
      </dl>
      <Link to={{ pathname: '/categories', search }} className="self-start text-label-md text-secondary hover:underline">
        See envelopes
      </Link>
    </div>
  );
}
