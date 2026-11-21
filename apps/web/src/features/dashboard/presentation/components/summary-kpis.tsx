import { ArrowDownLeft, ArrowUpRight, Percent, Wallet } from 'lucide-react';
import type { PeriodSummaryResponse } from '@tandem/shared';
import { MoneyAmount } from '@/components/money-amount';
import { formatMoney, formatPercent } from '@/lib/money';
import { cn } from '@/lib/utils';
import { KpiCard, KpiCardSkeleton } from '@/features/dashboard/presentation/components/kpi-card';

/** Very large totals may wrap inside the card rather than overflow or ellipsize. */
const WRAP = 'whitespace-normal';

function isNegative(amount: string): boolean {
  return amount.trim().startsWith('-');
}

export function SummaryKpis({ summary }: { summary: PeriodSummaryResponse }) {
  const net = summary.netCashFlowBuffer;
  const negative = isNegative(net);
  return (
    <div className="grid gap-gutter sm:grid-cols-2">
      <KpiCard
        label="Total income"
        icon={ArrowDownLeft}
        value={<MoneyAmount amount={summary.income} currency={summary.currency} className={WRAP} />}
        valueTitle={formatMoney(summary.income, { currency: summary.currency })}
        footer={<span className="text-positive">Money in this month</span>}
      />
      <KpiCard
        label="Total expenses"
        icon={ArrowUpRight}
        value={<MoneyAmount amount={summary.expenses} currency={summary.currency} className={WRAP} />}
        valueTitle={formatMoney(summary.expenses, { currency: summary.currency })}
        footer={<span className="tabular">{summary.transactionCount} transaction{summary.transactionCount === 1 ? '' : 's'}</span>}
      />
      <KpiCard
        label="Net Cash Flow Buffer"
        icon={Wallet}
        value={<MoneyAmount amount={net} currency={summary.currency} className={cn(WRAP, negative && 'text-negative')} />}
        valueTitle={formatMoney(net, { currency: summary.currency })}
        badge={
          <span className={negative ? 'rounded-full bg-negative-container px-2 py-0.5 text-label-sm text-negative' : 'rounded-full bg-positive-container px-2 py-0.5 text-label-sm text-positive'}>
            {negative ? 'Overspent' : 'Liquid'}
          </span>
        }
        footer="Income − expenses, before savings"
      />
      <KpiCard
        label="Savings rate"
        icon={Percent}
        value={<span className={summary.savingsRate === null ? 'text-headline-md text-on-surface-variant' : 'tabular'}>{formatPercent(summary.savingsRate)}</span>}
        footer={summary.savingsRate === null ? 'Needs income this month' : 'Share of income not spent'}
      />
    </div>
  );
}

export function SummaryKpisSkeleton() {
  return (
    <div className="grid gap-gutter sm:grid-cols-2">
      {Array.from({ length: 4 }, (_, i) => (
        <KpiCardSkeleton key={i} />
      ))}
    </div>
  );
}
