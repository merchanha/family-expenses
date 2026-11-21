import { AlertCircle, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api';
import { NETWORK_ERROR_MESSAGE } from '@/lib/form-errors';
import { cn } from '@/lib/utils';

/** Human-readable message for a failed query (never raw JSON — apps/web/CLAUDE.md §15). */
export function queryErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 0) return NETWORK_ERROR_MESSAGE;
    if (error.code === 'INVALID_RESPONSE') return 'We got an unexpected response from Tandem. Please try again.';
    if (error.status === 404) return "We couldn't find what you were looking for.";
    if (error.status >= 500) return 'Something went wrong on our side. Please try again.';
  }
  return 'Something went wrong. Please try again.';
}

interface ErrorStateProps {
  error: unknown;
  /** Usually the query's `refetch`. */
  onRetry?: () => void;
  title?: string;
  className?: string;
}

/** Inline query error with a retry button. */
export function ErrorState({ error, onRetry, title = "Couldn't load this", className }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-space-sm rounded-lg border border-negative-border bg-negative-container px-space-lg py-space-xl text-center',
        className,
      )}
    >
      <AlertCircle className="size-6 text-negative" aria-hidden="true" />
      <p className="font-headline text-headline-sm text-on-surface">{title}</p>
      <p className="max-w-sm text-body-md text-on-surface-variant">{queryErrorMessage(error)}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry} className="mt-space-sm">
          <RotateCw aria-hidden="true" />
          Try again
        </Button>
      )}
    </div>
  );
}
