import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface KpiCardProps {
  label: string;
  icon: LucideIcon;
  /** Pre-formatted value (MoneyAmount, percentage text…). */
  value: ReactNode;
  /** Full value as plain text (tooltip); the value itself is never truncated. */
  valueTitle?: string;
  footer?: ReactNode;
  badge?: ReactNode;
  className?: string;
}

/** KPI card (design/main_dashboard; reused by budgets and Financial Progress). Shows server values only. */
export function KpiCard({ label, icon: Icon, value, valueTitle, footer, badge, className }: KpiCardProps) {
  return (
    <section
      aria-label={label}
      className={cn('flex min-w-0 flex-col gap-space-sm rounded-lg border border-hairline bg-surface-container-lowest p-space-lg shadow-level-1', className)}
    >
      <div className="flex items-start justify-between gap-space-sm">
        <h3 className="flex items-center gap-1.5 font-body text-label-sm text-on-surface-variant uppercase">
          <Icon className="size-4" aria-hidden="true" />
          {label}
        </h3>
        {badge}
      </div>
      {/* ARS totals run to 8+ digits: wrap rather than ellipsize so the number is always readable. */}
      <div title={valueTitle} className="min-w-0 font-headline text-stat-lg-mobile break-words text-on-surface xl:text-stat-lg">
        {value}
      </div>
      {footer && <div className="text-body-sm text-on-surface-variant">{footer}</div>}
    </section>
  );
}

export function KpiCardSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-space-sm rounded-lg border border-hairline bg-surface-container-lowest p-space-lg">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-9 w-40" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
}
