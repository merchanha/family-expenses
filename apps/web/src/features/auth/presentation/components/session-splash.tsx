import { BrandMark } from '@/components/layout/brand';

/** Shown only while the session bootstraps (first load). */
export function SessionSplash() {
  return (
    <div role="status" aria-live="polite" className="flex min-h-dvh flex-col items-center justify-center gap-space-md bg-surface">
      <BrandMark className="size-10 animate-pulse" />
      <span className="text-body-sm text-on-surface-variant">Opening your Shared Space…</span>
    </div>
  );
}
