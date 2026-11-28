import { ArrowDownLeft, ArrowUpRight, Percent, Wallet } from 'lucide-react';
import type { FinancialProgressResponse, MoneyComparison } from '@tandem/shared';
import { KpiCard, KpiCardSkeleton } from '@/components/kpi-card';
import { MoneyAmount } from '@/components/money-amount';
import { formatMoney, formatPercent } from '@/lib/money';
import { directionOf, unsigned } from '@/features/financial-progress/domain/progress-display';
import { ChangeBadge, signedPercent, signedPoints } from '@/features/financial-progress/presentation/components/change-badge';

const NOT_AVAILABLE = 'Not available';

function signedMoney(value: string, currency: string): string {
  const d = directionOf(value);
  return `${d === 'up' ? '+' : d === 'down' ? '−' : ''}${formatMoney(unsigned(value), { currency })}`;
}

function MoneyKpi({
  label,
  icon,
  kpi,
  currency,
  higherIsBetter,
  previousLabel,
}: {
  label: string;
  icon: typeof Wallet;
  kpi: MoneyComparison;
  currency: string;
  higherIsBetter: boolean;
  previousLabel: string;
}) {
  return (
    <KpiCard
      label={label}
      icon={icon}
      value={<MoneyAmount amount={kpi.current} currency={currency} className="whitespace-normal" />}
      valueTitle={formatMoney(kpi.current, { currency })}
      badge={
        <ChangeBadge
          value={kpi.changePercent}
          label={kpi.changePercent === null ? NOT_AVAILABLE : signedPercent(kpi.changePercent)}
          higherIsBetter={higherIsBetter}
        />
      }
      footer={
        <span className="tabular">
          vs {formatMoney(kpi.previous, { currency })} ({previousLabel})
        </span>
      }
    />
  );
}

/** The 4 comparison KPIs (decisions #16/#20): M vs M−1 over an equivalent period. */
export function ProgressKpis({ data, previousLabel }: { data: FinancialProgressResponse; previousLabel: string }) {
  const { kpis, currency } = data;
  const net = kpis.netCashFlowBuffer;
  const rate = kpis.savingsRate;
  return (
    <div className="grid gap-gutter sm:grid-cols-2">
      <MoneyKpi label="Total spending" icon={ArrowUpRight} kpi={kpis.totalSpending} currency={currency} higherIsBetter={false} previousLabel={previousLabel} />
      <MoneyKpi label="Household income" icon={ArrowDownLeft} kpi={kpis.householdIncome} currency={currency} higherIsBetter previousLabel={previousLabel} />
      <KpiCard
        label="Net Cash Flow Buffer"
        icon={Wallet}
        value={<MoneyAmount amount={net.current} currency={currency} className="whitespace-normal" />}
        valueTitle={formatMoney(net.current, { currency })}
        badge={<ChangeBadge value={net.changeAmount} label={signedMoney(net.changeAmount, currency)} higherIsBetter />}
        footer={
          <span className="tabular">
            vs {formatMoney(net.previous, { currency })} ({previousLabel})
            {net.changePercent !== null && ` · ${signedPercent(net.changePercent)}`}
          </span>
        }
      />
      <KpiCard
        label="Savings rate"
        icon={Percent}
        value={
          <span className={rate.current === null ? 'text-headline-md text-on-surface-variant' : 'tabular'}>
            {formatPercent(rate.current)}
          </span>
        }
        badge={
          <ChangeBadge
            value={rate.changePoints}
            label={rate.changePoints === null ? NOT_AVAILABLE : signedPoints(rate.changePoints)}
            higherIsBetter
          />
        }
        footer={<span className="tabular">vs {formatPercent(rate.previous)} ({previousLabel})</span>}
      />
    </div>
  );
}

export function ProgressKpisSkeleton() {
  return (
    <div className="grid gap-gutter sm:grid-cols-2">
      {Array.from({ length: 4 }, (_, i) => (
        <KpiCardSkeleton key={i} />
      ))}
    </div>
  );
}
