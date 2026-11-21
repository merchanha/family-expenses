import { Skeleton } from '@/components/ui/skeleton';

/** Shown inside the layout while a lazily loaded route page's chunk downloads. */
export function PageFallback() {
  return (
    <div role="status" aria-label="Loading page" className="flex flex-col gap-space-lg">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
