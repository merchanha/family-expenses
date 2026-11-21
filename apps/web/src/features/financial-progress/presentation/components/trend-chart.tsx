import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, type TooltipProps } from 'recharts';
import type { TrendMonth } from '@tandem/shared';
import { formatMoney, formatMoneyCompact } from '@/lib/money';
import { monthLabel } from '@/lib/month';

interface TrendChartProps {
  trend: TrendMonth[];
  currency: string;
}

interface Row {
  key: string;
  label: string;
  income: number;
  expenses: number;
  month: TrendMonth;
}

const SERIES = [
  { key: 'income', label: 'Income', color: 'var(--chart-income)' },
  { key: 'expenses', label: 'Expenses', color: 'var(--chart-expenses)' },
] as const;

const shortMonth = (m: TrendMonth) =>
  new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' }).format(new Date(Date.UTC(m.year, m.month - 1, 15)));

/** Plot coordinate for an API decimal string (geometry only; labels use the string). */
const plot = (amount: string) => Number.parseFloat(amount) || 0;

function TrendTooltip({ active, payload, currency }: TooltipProps<number, string> & { currency: string }) {
  const row = active ? (payload?.[0]?.payload as Row | undefined) : undefined;
  if (!row) return null;
  return (
    <div className="rounded-md border border-hairline bg-surface-container-lowest px-space-sm py-space-xs text-body-sm shadow-level-2">
      <p className="text-label-sm text-on-surface-variant">{row.label}</p>
      <p className="tabular text-on-surface">Income: {formatMoney(row.month.income, { currency })}</p>
      <p className="tabular text-on-surface">Expenses: {formatMoney(row.month.expenses, { currency })}</p>
      <p className="tabular text-on-surface">Buffer: {formatMoney(row.month.netCashFlowBuffer, { currency })}</p>
    </div>
  );
}

/** Income vs expenses per month (decision #16). The in-progress month is marked "to date" and drawn lighter. */
export function TrendChart({ trend, currency }: TrendChartProps) {
  const rows: Row[] = trend.map((m) => ({
    key: `${m.year}-${m.month}`,
    label: m.isPartial ? `${shortMonth(m)} (to date)` : shortMonth(m),
    income: plot(m.income),
    expenses: plot(m.expenses),
    month: m,
  }));

  return (
    <figure className="flex flex-col gap-space-sm">
      <ul className="flex flex-wrap gap-space-md text-label-sm text-on-surface-variant" aria-label="Legend">
        {SERIES.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ backgroundColor: s.color }} aria-hidden="true" />
            {s.label}
          </li>
        ))}
        {trend.some((m) => m.isPartial) && <li>Lighter bars: month in progress</li>}
      </ul>
      <div className="h-64 w-full" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barGap={2} barCategoryGap="28%">
            <CartesianGrid vertical={false} stroke="var(--hairline)" />
            <XAxis dataKey="label" tick={{ fontSize: 12, fill: 'var(--on-surface-variant)' }} tickLine={false} axisLine={{ stroke: 'var(--outline-variant)' }} />
            <YAxis
              tickFormatter={(v: number) => formatMoneyCompact(String(v), { currency })}
              tick={{ fontSize: 12, fill: 'var(--on-surface-variant)' }}
              tickLine={false}
              axisLine={false}
              width={72}
            />
            <Tooltip content={<TrendTooltip currency={currency} />} cursor={{ fill: 'var(--surface-container-low)' }} />
            {SERIES.map((s) => (
              <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[4, 4, 0, 0]} maxBarSize={40} isAnimationActive={false}>
                {rows.map((r) => (
                  <Cell key={r.key} fillOpacity={r.month.isPartial ? 0.5 : 1} />
                ))}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      {/* Table view of the same series (screen readers; the chart itself is decorative). */}
      <table className="sr-only">
        <caption>Income and expenses per month</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Income</th>
            <th scope="col">Expenses</th>
            <th scope="col">Net Cash Flow Buffer</th>
          </tr>
        </thead>
        <tbody>
          {trend.map((m) => (
            <tr key={`${m.year}-${m.month}`}>
              <th scope="row">
                {monthLabel(m)}
                {m.isPartial ? ' (to date)' : ''}
              </th>
              <td>{formatMoney(m.income, { currency })}</td>
              <td>{formatMoney(m.expenses, { currency })}</td>
              <td>{formatMoney(m.netCashFlowBuffer, { currency })}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
