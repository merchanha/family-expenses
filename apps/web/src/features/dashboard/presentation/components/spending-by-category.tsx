import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, type TooltipProps } from 'recharts';
import type { CategorySpend } from '@tandem/shared';
import { formatMoney, formatPercent } from '@/lib/money';
import { CategoryIcon } from '@/features/categories';
import { plotValue, UNCOLORED_CATEGORY } from '@/features/dashboard/domain/chart-display';

interface SpendingByCategoryProps {
  items: CategorySpend[];
  totalExpenses: string;
  currency: string;
}

function SliceTooltip({ active, payload, currency }: TooltipProps<number, string> & { currency: string }) {
  const item = active ? (payload?.[0]?.payload as { item: CategorySpend } | undefined)?.item : undefined;
  if (!item) return null;
  return (
    <div className="rounded-md border border-hairline bg-surface-container-lowest px-space-sm py-space-xs text-body-sm shadow-level-2">
      <p className="text-on-surface">{item.category.name}</p>
      <p className="tabular text-on-surface-variant">
        {formatMoney(item.amount, { currency })} · {formatPercent(item.sharePercent)}
      </p>
    </div>
  );
}

/**
 * Donut + list of expense totals per category (decision #17). The API groups, totals and computes
 * shares; the list is the accessible/table view and carries identity in text (name + icon).
 */
export function SpendingByCategory({ items, totalExpenses, currency }: SpendingByCategoryProps) {
  const top = items[0];
  const slices = items.map((item) => ({ item, value: plotValue(item.amount), color: item.category.color ?? UNCOLORED_CATEGORY }));

  return (
    <div className="flex flex-col gap-space-lg">
      <div className="relative mx-auto size-48" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="item.category.name"
              innerRadius="68%"
              outerRadius="100%"
              paddingAngle={slices.length > 1 ? 1 : 0}
              stroke="var(--surface-container-lowest)"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {slices.map((s) => (
                <Cell key={s.item.category.id} fill={s.color} />
              ))}
            </Pie>
            <Tooltip content={<SliceTooltip currency={currency} />} />
          </PieChart>
        </ResponsiveContainer>
        {top && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-label-sm text-on-surface-variant uppercase">Top spent</span>
            <span className="max-w-28 truncate font-headline text-headline-sm text-on-surface">{top.category.name}</span>
            <span className="tabular text-label-sm text-on-surface-variant">{formatPercent(top.sharePercent)}</span>
          </div>
        )}
      </div>
      <ul aria-label="Spending by category" className="flex flex-col divide-y divide-hairline-subtle">
        {items.map((item) => (
          <li key={item.category.id} className="flex items-center gap-space-sm py-space-sm">
            <span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: item.category.color ?? UNCOLORED_CATEGORY }} aria-hidden="true" />
            <CategoryIcon icon={item.category.icon} color={item.category.color} className="size-8 max-sm:hidden" />
            <span className="min-w-0 flex-1 truncate text-body-md text-on-surface">
              {item.category.name}
              {!item.category.isActive && <span className="text-on-surface-variant"> (inactive)</span>}
            </span>
            <span className="tabular text-body-sm text-on-surface-variant">{formatPercent(item.sharePercent)}</span>
            <span className="tabular text-body-md text-on-surface">{formatMoney(item.amount, { currency })}</span>
          </li>
        ))}
      </ul>
      <p className="text-body-sm text-on-surface-variant">
        Total expenses: <span className="tabular text-on-surface">{formatMoney(totalExpenses, { currency })}</span>
      </p>
    </div>
  );
}
