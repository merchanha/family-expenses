import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import type { TransactionType } from '@tandem/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useCategories } from '@/features/categories';
import type { TransactionFilterState } from '@/features/transactions/application/use-transaction-filters';

const TYPE_OPTIONS: { value: TransactionType | null; label: string }[] = [
  { value: null, label: 'All' },
  { value: 'EXPENSE', label: 'Expenses' },
  { value: 'INCOME', label: 'Income' },
];

const SEARCH_DEBOUNCE_MS = 300;

/** Search (description + notes), type and category filters, all in the URL. */
export function TransactionFilters({ state }: { state: TransactionFilterState }) {
  const [search, setSearch] = useState(state.q);
  // Include inactive categories: past transactions may still use them.
  const categories = useCategories({ type: state.type ?? undefined, includeInactive: true });

  // React Router's setter closes over the params of its render; the debounced call
  // must use the latest one or it would undo a type/category change made meanwhile.
  const latest = useRef(state);
  latest.current = state;

  // Back/forward or "Clear" changes the URL: mirror it into the input.
  useEffect(() => setSearch(state.q), [state.q]);

  useEffect(() => {
    if (search === latest.current.q) return;
    const id = setTimeout(() => latest.current.setQ(search.trim() ? search : ''), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [search]);

  return (
    <div className="flex flex-col gap-space-sm md:flex-row md:items-center">
      <div className="relative md:max-w-xs md:flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-on-surface-variant" aria-hidden="true" />
        <Input
          type="search"
          aria-label="Search transactions"
          placeholder="Search transactions…"
          value={search}
          maxLength={100}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="flex flex-wrap items-center gap-space-sm">
        <div role="group" aria-label="Transaction type" className="flex rounded-base bg-surface-container-low p-0.5">
          {TYPE_OPTIONS.map((o) => (
            <button
              key={o.label}
              type="button"
              aria-pressed={state.type === o.value}
              onClick={() => state.setType(o.value)}
              className={cn(
                'min-h-9 rounded-[6px] px-space-md text-label-md',
                state.type === o.value ? 'bg-surface-container-lowest text-on-surface shadow-sm' : 'text-on-surface-variant hover:text-on-surface',
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
        <select
          aria-label="Category"
          value={state.categoryId ?? ''}
          onChange={(e) => state.setCategoryId(e.target.value || null)}
          className="h-10 min-w-0 max-w-56 rounded-base border border-transparent bg-surface-container-low px-3 text-body-md text-on-surface outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <option value="">All categories</option>
          {categories.data?.items.map((c) => (
            <option key={c.id} value={c.id}>
              {c.isActive ? c.name : `${c.name} (inactive)`}
            </option>
          ))}
        </select>
        {state.hasPageFilters && (
          <Button variant="ghost" size="sm" onClick={state.clear}>
            <X aria-hidden="true" />
            Clear filters
          </Button>
        )}
      </div>
    </div>
  );
}
