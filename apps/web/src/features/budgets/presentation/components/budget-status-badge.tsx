import type { BudgetStatus } from '@tandem/shared';
import { cn } from '@/lib/utils';
import { budgetStatusDisplay } from '@/features/budgets/domain/budget-status';

/** Status pill: text + color, never color alone (apps/web/CLAUDE.md §13/§17). */
export function BudgetStatusBadge({ status, className }: { status: BudgetStatus | null; className?: string }) {
  const d = budgetStatusDisplay(status);
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-label-sm whitespace-nowrap', d.badge, className)}>
      {d.label}
    </span>
  );
}
