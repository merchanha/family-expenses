import { useSearchParams } from 'react-router-dom';
import { useCurrentHousehold } from '@/features/households';
import { compareMonths, currentMonth, parseMonthParam, toMonthParam, type YearMonth } from '@/lib/month';

export interface MonthFilter {
  /** Selected month (`?month=YYYY-MM`), defaulting to the current month in the household timezone. */
  month: YearMonth;
  /** The current month in the household timezone. */
  current: YearMonth;
  isCurrent: boolean;
  setMonth(month: YearMonth): void;
}

/** Chrome-level month selection shared by Dashboard and Transactions (apps/web/CLAUDE.md §7). */
export function useMonthFilter(): MonthFilter {
  const [params, setParams] = useSearchParams();
  const { data } = useCurrentHousehold();
  const current = currentMonth(data?.household.timezone);
  const month = parseMonthParam(params.get('month')) ?? current;

  const setMonth = (next: YearMonth) =>
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        // The current month is the default, so keep the URL clean for it.
        if (compareMonths(next, current) === 0) p.delete('month');
        else p.set('month', toMonthParam(next));
        return p;
      },
      { replace: true },
    );

  return { month, current, isCurrent: compareMonths(month, current) === 0, setMonth };
}
