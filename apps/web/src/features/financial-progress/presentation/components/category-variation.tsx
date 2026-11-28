import { useState } from 'react';
import type { CategoryComparison } from '@tandem/shared';
import { EmptyState } from '@/components/empty-state';
import { MoneyAmount } from '@/components/money-amount';
import { formatMoney } from '@/lib/money';
import { cn } from '@/lib/utils';
import { CategoryIcon } from '@/features/categories';
import { directionOf, filterCategories, unsigned, type VarianceFilter } from '@/features/financial-progress/domain/progress-display';
import { ChangeBadge, signedPercent } from '@/features/financial-progress/presentation/components/change-badge';

interface CategoryVariationProps {
  rows: CategoryComparison[];
  currency: string;
  currentLabel: string;
  previousLabel: string;
}

const FILTERS: { value: VarianceFilter; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'INCREASES', label: 'Increases' },
  { value: 'DECREASES', label: 'Decreases' },
];

function VarianceCell({ row, currency }: { row: CategoryComparison; currency: string }) {
  const d = directionOf(row.varianceAmount);
  const amount = `${d === 'up' ? '+' : d === 'down' ? '−' : ''}${formatMoney(unsigned(row.varianceAmount), { currency })}`;
  return (
    <span className="flex flex-wrap items-center justify-end gap-space-sm">
      <span className="tabular text-on-surface">{amount}</span>
      <ChangeBadge
        value={row.variancePercent}
        label={row.variancePercent === null ? 'Not available' : signedPercent(row.variancePercent)}
        higherIsBetter={false}
      />
    </span>
  );
}

/** Category-by-category spending shift (decision #16). Chips filter on the client; numbers are the API's. */
export function CategoryVariation({ rows, currency, currentLabel, previousLabel }: CategoryVariationProps) {
  const [filter, setFilter] = useState<VarianceFilter>('ALL');
  const visible = filterCategories(rows, filter);

  return (
    <div className="flex flex-col gap-space-md">
      <div role="group" aria-label="Filter categories" className="flex flex-wrap gap-space-xs">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            aria-pressed={filter === f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              'min-h-10 rounded-full border px-space-md text-label-md',
              filter === f.value
                ? 'border-secondary bg-secondary-fixed text-on-secondary-fixed'
                : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-low',
            )}
          >
            {f.label}
            {f.value === 'ALL' && <span className="tabular"> ({rows.length})</span>}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No expenses in either period" description="Category shifts appear once there is spending to compare." />
      ) : visible.length === 0 ? (
        <EmptyState title={filter === 'INCREASES' ? 'No category went up' : 'No category went down'} description="Try another filter." />
      ) : (
        <>
          {/* md+: table. Below md: stacked rows (apps/web/CLAUDE.md §17). */}
          <table className="hidden w-full text-body-md md:table">
            <thead>
              <tr className="border-b border-hairline text-left text-label-sm text-on-surface-variant uppercase">
                <th scope="col" className="py-space-sm font-medium">Expense category</th>
                <th scope="col" className="py-space-sm text-right font-medium">{currentLabel}</th>
                <th scope="col" className="py-space-sm text-right font-medium">{previousLabel}</th>
                <th scope="col" className="py-space-sm text-right font-medium">Variance ($ / %)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline-subtle">
              {visible.map((row) => (
                <tr key={row.category.id}>
                  <th scope="row" className="py-space-sm text-left font-normal">
                    <span className="flex items-center gap-space-sm">
                      <CategoryIcon icon={row.category.icon} color={row.category.color} className="size-8" />
                      <span className="text-on-surface">
                        {row.category.name}
                        {!row.category.isActive && <span className="text-on-surface-variant"> (inactive)</span>}
                      </span>
                    </span>
                  </th>
                  <td className="py-space-sm text-right">
                    <MoneyAmount amount={row.current} currency={currency} className="text-on-surface" />
                  </td>
                  <td className="py-space-sm text-right">
                    <MoneyAmount amount={row.previous} currency={currency} className="text-on-surface-variant" />
                  </td>
                  <td className="py-space-sm">
                    <VarianceCell row={row} currency={currency} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <ul className="flex flex-col divide-y divide-hairline-subtle md:hidden" aria-label="Category shifts">
            {visible.map((row) => (
              <li key={row.category.id} className="flex flex-col gap-space-xs py-space-sm">
                <span className="flex items-center gap-space-sm">
                  <CategoryIcon icon={row.category.icon} color={row.category.color} className="size-8" />
                  <span className="min-w-0 flex-1 truncate text-label-md text-on-surface">{row.category.name}</span>
                </span>
                <span className="flex justify-between text-body-sm text-on-surface-variant">
                  <span>
                    {currentLabel}: <MoneyAmount amount={row.current} currency={currency} className="text-on-surface" />
                  </span>
                  <span>
                    {previousLabel}: <MoneyAmount amount={row.previous} currency={currency} />
                  </span>
                </span>
                <VarianceCell row={row} currency={currency} />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
