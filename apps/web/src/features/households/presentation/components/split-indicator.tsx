import { Scale } from 'lucide-react';
import { splitLabel } from '@/features/households/domain/member-display';
import { cn } from '@/lib/utils';

/** Household default split (display/planning only — no settlements). */
export function SplitIndicator({ partner1Percent, className }: { partner1Percent: number; className?: string }) {
  const label = splitLabel(partner1Percent);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-hairline bg-surface-container-lowest px-2 py-1 text-label-sm text-secondary',
        className,
      )}
      title={`Default split ${label} (Partner 1 / Partner 2)`}
    >
      <Scale className="size-3.5" aria-hidden="true" />
      <span className="tabular">{label}</span>
      <span className="sr-only">default split</span>
    </span>
  );
}
