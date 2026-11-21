import type { BudgetStatus } from '@tandem/shared';
import { cn } from '@/lib/utils';
import { budgetStatusDisplay } from '@/features/budgets/domain/budget-status';

interface UtilizationBarProps {
  /** API utilization ("82.50"); null = no budget. */
  utilization: string | null;
  status: BudgetStatus | null;
  className?: string;
}

/**
 * Visual fill only (decorative): the % and status label are always shown as text next to it.
 * The width is a CSS rendering of the API's percentage, capped at 100%; no figure is computed.
 */
export function UtilizationBar({ utilization, status, className }: UtilizationBarProps) {
  const width = utilization === null ? 0 : Math.min(Math.max(Number.parseFloat(utilization) || 0, 0), 100);
  return (
    <div aria-hidden="true" className={cn('h-2 w-full overflow-hidden rounded-full bg-surface-container', className)}>
      <div className={cn('h-full rounded-full', budgetStatusDisplay(status).bar)} style={{ width: `${width}%` }} />
    </div>
  );
}
