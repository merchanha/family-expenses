import { useId, type ReactElement, type ReactNode } from 'react';
import { cloneElement } from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface FormFieldProps {
  label: string;
  /** Right-aligned hint or action next to the label (e.g. "Forgot password?"). */
  aside?: ReactNode;
  hint?: ReactNode;
  error?: string;
  className?: string;
  /** A single input element; receives id, aria-invalid and aria-describedby. */
  children: ReactElement<{ id?: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }>;
}

/** Label + control + hint/error, wired for accessibility (apps/web/CLAUDE.md §17). */
export function FormField({ label, aside, hint, error, className, children }: FormFieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <div className="flex items-center justify-between gap-space-sm">
        <Label htmlFor={id} className="text-label-md text-on-surface">
          {label}
        </Label>
        {aside}
      </div>
      {cloneElement(children, { id, 'aria-invalid': error ? true : undefined, 'aria-describedby': describedBy })}
      {error && (
        <p id={errorId} className="text-body-sm text-negative">
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={hintId} className="text-body-sm text-on-surface-variant">
          {hint}
        </p>
      )}
    </div>
  );
}
