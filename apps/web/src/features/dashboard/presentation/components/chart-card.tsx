import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ChartCardProps {
  title: string;
  description?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}

/** Dashboard panel: titled region around a chart or card body. */
export function ChartCard({ title, description, aside, children, className }: ChartCardProps) {
  const id = useId();
  return (
    <section
      aria-labelledby={id}
      className={cn('flex min-w-0 flex-col gap-space-md rounded-lg border border-hairline bg-surface-container-lowest p-space-lg shadow-level-1', className)}
    >
      <div className="flex items-start justify-between gap-space-sm">
        <div className="min-w-0">
          <h3 id={id} className="font-headline text-headline-sm text-on-surface">
            {title}
          </h3>
          {description && <p className="text-body-sm text-on-surface-variant">{description}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}
