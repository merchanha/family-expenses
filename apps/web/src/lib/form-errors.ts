import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiError } from '@/lib/api';

export const NETWORK_ERROR_MESSAGE = "Can't reach Tandem right now. Check your connection and try again.";

interface ValidationIssue {
  path: string | Array<string | number>;
  message: string;
}

function readIssues(body: unknown): ValidationIssue[] {
  if (!body || typeof body !== 'object' || !('issues' in body)) return [];
  const issues = (body as { issues: unknown }).issues;
  if (!Array.isArray(issues)) return [];
  return issues.filter(
    (i): i is ValidationIssue =>
      !!i &&
      typeof i === 'object' &&
      typeof (i as ValidationIssue).message === 'string' &&
      (typeof (i as ValidationIssue).path === 'string' || Array.isArray((i as ValidationIssue).path)),
  );
}

/**
 * Map an API error onto a react-hook-form form.
 * - 400 `{ issues: [{ path, message }] }` → `setError` on each known field.
 * - Anything else (401/404/409/422/5xx/network) → returned as a form-level message.
 * Returns the form-level message to show, or `null` when every issue was mapped to a field.
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
  messages: Partial<Record<number, string>> = {},
): string | null {
  if (!(error instanceof ApiError)) return 'Something went wrong. Please try again.';
  if (error.status === 0) return NETWORK_ERROR_MESSAGE;

  const override = messages[error.status];
  if (override) return override;

  if (error.status === 400) {
    const unmapped: string[] = [];
    for (const issue of readIssues(error.body)) {
      const path = (Array.isArray(issue.path) ? issue.path.join('.') : issue.path) as Path<T>;
      if (fields.includes(path)) setError(path, { type: 'server', message: issue.message });
      else unmapped.push(issue.message);
    }
    if (unmapped.length) return unmapped.join(' ');
    return readIssues(error.body).length ? null : error.message;
  }
  if (error.status >= 500) return 'Something went wrong on our side. Please try again.';
  return error.message;
}
