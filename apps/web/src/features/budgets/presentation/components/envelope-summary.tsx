import { CircleGauge, PiggyBank, Wallet } from 'lucide-react';
import type { EnvelopeSummary as EnvelopeSummaryData } from '@tandem/shared';
import { KpiCard, KpiCardSkeleton } from '@/components/kpi-card';
import { MoneyAmount } from '@/components/money-amount';
import { formatMoney, formatPercent } from '@/lib/money';
import { cn } from '@/lib/utils';
import { isNegativeAmount } from '@/features/budgets/domain/budget-display';
import { BudgetStatusBadge } from '@/features/budgets/presentation/components/budget-status-badge';
import { UtilizationBar } from '@/features/budgets/presentation/components/utilization-bar';

interface EnvelopeSummaryProps {
  summary: EnvelopeSummaryData;
  currency: string;
}

/** Monthly Allocation / Consumed / Remaining (decision #18). Server values only. */
export function EnvelopeSummary({ summary, currency }: EnvelopeSummaryProps) {
  const over = isNegativeAmount(summary.remaining);
  return (
    <div className="grid gap-gutter md:grid-cols-3">
      <KpiCard
        label="Monthly allocation"
        icon={Wallet}
        value={<MoneyAmount amount={summary.monthlyAllocation} currency={currency} className="whitespace-normal" />}
        valueTitle={formatMoney(summary.monthlyAllocation, { currency })}
        footer={
          <span className="tabular">
            Across {summary.budgetCount} budgeted envelope{summary.budgetCount === 1 ? '' : 's'}
          </span>
        }
      />
      <KpiCard
        label="Consumed to date"
        icon={CircleGauge}
        value={<MoneyAmount amount={summary.consumed} currency={currency} className="whitespace-normal" />}
        valueTitle={formatMoney(summary.consumed, { currency })}
        badge={summary.status && <BudgetStatusBadge status={summary.status} />}
        footer={
          <div className="flex flex-col gap-1.5">
            <UtilizationBar utilization={summary.consumedPercent} status={summary.status} />
            <span className="tabular">
              {summary.consumedPercent === null
                ? 'No budgets set this month'
                : `${formatPercent(summary.consumedPercent)} of allocation`}
            </span>
          </div>
        }
      />
      <KpiCard
        label="Remaining"
        icon={PiggyBank}
        value={
          <MoneyAmount
            amount={summary.remaining}
            currency={currency}
            className={cn('whitespace-normal', over && 'text-negative')}
          />
        }
        valueTitle={formatMoney(summary.remaining, { currency })}
        footer={over ? <span className="text-danger-text">Over the allocation</span> : 'Allocation − consumed'}
      />
    </div>
  );
}

export function EnvelopeSummarySkeleton() {
  return (
    <div className="grid gap-gutter md:grid-cols-3">
      {Array.from({ length: 3 }, (_, i) => (
        <KpiCardSkeleton key={i} />
      ))}
    </div>
  );
}
