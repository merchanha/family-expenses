import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipProps } from 'recharts';
import type { CashFlowPoint } from '@tandem/shared';
import { formatMoney, formatMoneyCompact } from '@/lib/money';
import { plotValue, shortDayLabel } from '@/features/dashboard/domain/chart-display';

interface CashFlowChartProps {
  points: CashFlowPoint[];
  currency: string;
}

interface Row {
  date: string;
  income: number;
  expenses: number;
  point: CashFlowPoint;
}

const SERIES = [
  { key: 'income', label: 'Income', color: 'var(--chart-income)' },
  { key: 'expenses', label: 'Expenses', color: 'var(--chart-expenses)' },
] as const;

function CashFlowTooltip({ active, payload, currency }: TooltipProps<number, string> & { currency: string }) {
  const row = active ? (payload?.[0]?.payload as Row | undefined) : undefined;
  if (!row) return null;
  return (
    <div className="rounded-md border border-hairline bg-surface-container-lowest px-space-sm py-space-xs text-body-sm shadow-level-2">
      <p className="text-label-sm text-on-surface-variant">{shortDayLabel(row.date)}</p>
      <p className="tabular text-on-surface">Income: {formatMoney(row.point.cumulativeIncome, { currency })}</p>
      <p className="tabular text-on-surface">Expenses: {formatMoney(row.point.cumulativeExpenses, { currency })}</p>
    </div>
  );
}

/**
 * Cumulative income vs expenses per day (decision #17): actuals only — no projection. The current
 * month stops at today. Values come from the API; strings become numbers for plotting only.
 */
export function CashFlowChart({ points, currency }: CashFlowChartProps) {
  const rows: Row[] = points.map((p) => ({
    date: p.date,
    income: plotValue(p.cumulativeIncome),
    expenses: plotValue(p.cumulativeExpenses),
    point: p,
  }));
  const last = points.at(-1);

  return (
    <figure className="flex flex-col gap-space-sm">
      <ul className="flex flex-wrap gap-space-md text-label-sm text-on-surface-variant" aria-label="Legend">
        {SERIES.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 rounded-full" style={{ backgroundColor: s.color }} aria-hidden="true" />
            {s.label}
          </li>
        ))}
      </ul>
      <div className="h-64 w-full" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--hairline)" />
            <XAxis
              dataKey="date"
              tickFormatter={(d: string) => shortDayLabel(d)}
              tick={{ fontSize: 12, fill: 'var(--on-surface-variant)' }}
              tickLine={false}
              axisLine={{ stroke: 'var(--outline-variant)' }}
              minTickGap={24}
            />
            <YAxis
              tickFormatter={(v: number) => formatMoneyCompact(String(v), { currency })}
              tick={{ fontSize: 12, fill: 'var(--on-surface-variant)' }}
              tickLine={false}
              axisLine={false}
              width={72}
            />
            <Tooltip content={<CashFlowTooltip currency={currency} />} cursor={{ stroke: 'var(--outline)', strokeDasharray: '3 3' }} />
            {SERIES.map((s) => (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.label}
                stroke={s.color}
                strokeWidth={2}
                fill={s.color}
                fillOpacity={0.08}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--surface-container-lowest)' }}
                isAnimationActive={false}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      {last && (
        <figcaption className="text-body-sm text-on-surface-variant">
          Through {shortDayLabel(last.date)}: income{' '}
          <span className="tabular text-on-surface">{formatMoney(last.cumulativeIncome, { currency })}</span>, expenses{' '}
          <span className="tabular text-on-surface">{formatMoney(last.cumulativeExpenses, { currency })}</span>.
        </figcaption>
      )}
    </figure>
  );
}
