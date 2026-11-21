import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: ReactNode;
  /** Primary action, e.g. "Add expense" (apps/web/CLAUDE.md §16). */
  action?: ReactNode;
  className?: string;
}

/** Friendly empty list/chart state. Use different copy for "no data yet" vs "no results for these filters". */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-space-sm rounded-lg border border-dashed border-outline-variant bg-surface-container-lowest px-space-lg py-space-xl text-center',
        className,
      )}
    >
      {Icon && (
        <span className="mb-1 flex size-12 items-center justify-center rounded-full bg-surface-container-low text-on-surface-variant">
          <Icon className="size-6" aria-hidden="true" />
        </span>
      )}
      <p className="font-headline text-headline-sm text-on-surface">{title}</p>
      {description && <p className="max-w-sm text-body-md text-on-surface-variant">{description}</p>}
      {action && <div className="mt-space-sm">{action}</div>}
    </div>
  );
}
