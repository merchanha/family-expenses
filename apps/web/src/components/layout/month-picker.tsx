import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMonthFilter } from '@/hooks/use-month-filter';
import { monthLabel, shiftMonth } from '@/lib/month';
import { cn } from '@/lib/utils';

/** Header month navigation: ‹ November 2026 › — state lives in `?month=YYYY-MM`. */
export function MonthPicker({ className }: { className?: string }) {
  const { month, isCurrent, current, setMonth } = useMonthFilter();
  const label = monthLabel(month);
  return (
    <div role="group" aria-label="Month" className={cn('flex items-center gap-0.5', className)}>
      <Button variant="ghost" size="icon-sm" aria-label="Previous month" onClick={() => setMonth(shiftMonth(month, -1))}>
        <ChevronLeft className="size-4" />
      </Button>
      <button
        type="button"
        onClick={() => setMonth(current)}
        disabled={isCurrent}
        title={isCurrent ? undefined : 'Back to this month'}
        aria-label={isCurrent ? `${label} (this month)` : `${label}. Back to this month`}
        className="flex min-h-8 items-center gap-1.5 rounded-base pointer-coarse:min-h-10 px-space-sm text-label-md text-on-surface tabular hover:bg-surface-container-low disabled:cursor-default disabled:hover:bg-transparent"
      >
        <CalendarDays className="size-4 text-on-surface-variant" aria-hidden="true" />
        <span aria-live="polite" className="whitespace-nowrap">{label}</span>
      </button>
      <Button variant="ghost" size="icon-sm" aria-label="Next month" onClick={() => setMonth(shiftMonth(month, 1))}>
        <ChevronRight className="size-4" />
      </Button>
    </div>
  );
}
