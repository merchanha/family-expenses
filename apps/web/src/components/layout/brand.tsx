export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={className}>
      <rect width="32" height="32" rx="8" fill="var(--primary)" />
      <circle cx="13" cy="16" r="6" fill="none" stroke="var(--partner-1)" strokeWidth="2.5" />
      <circle cx="19" cy="16" r="6" fill="none" stroke="var(--partner-2)" strokeWidth="2.5" />
    </svg>
  );
}

interface BrandProps {
  /** Second line, e.g. the Shared Space name in the app shell. */
  subtitle?: string;
}

export function Brand({ subtitle }: BrandProps) {
  return (
    <div className="flex min-w-0 items-center gap-space-sm">
      <BrandMark className="size-8 shrink-0" />
      <div className="flex min-w-0 flex-col">
        <span className="font-headline text-headline-sm text-on-surface">Tandem Finance</span>
        {subtitle && <span className="truncate text-label-sm text-on-surface-variant">{subtitle}</span>}
      </div>
    </div>
  );
}
