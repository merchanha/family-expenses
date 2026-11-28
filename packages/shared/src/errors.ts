import { z } from 'zod';

/**
 * Machine-readable codes sent in the `error` field of API error bodies, so the web
 * can branch on them (e.g. route to onboarding on HOUSEHOLD_REQUIRED).
 */
export const ApiErrorCode = {
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  INVALID_REFRESH_TOKEN: 'INVALID_REFRESH_TOKEN',
  CSRF_HEADER_MISSING: 'CSRF_HEADER_MISSING',
  EMAIL_TAKEN: 'EMAIL_TAKEN',
  INVALID_RESET_TOKEN: 'INVALID_RESET_TOKEN',
  /** Authenticated user has no household yet → onboarding (create household or accept invite). */
  HOUSEHOLD_REQUIRED: 'HOUSEHOLD_REQUIRED',
  ALREADY_IN_HOUSEHOLD: 'ALREADY_IN_HOUSEHOLD',
  HOUSEHOLD_FULL: 'HOUSEHOLD_FULL',
  OWNER_ONLY: 'OWNER_ONLY',
  INVITE_NOT_FOUND: 'INVITE_NOT_FOUND',
  INVITE_NOT_USABLE: 'INVITE_NOT_USABLE',
  INVITE_EMAIL_MISMATCH: 'INVITE_EMAIL_MISMATCH',
  CANNOT_INVITE_SELF: 'CANNOT_INVITE_SELF',
  CATEGORY_NOT_FOUND: 'CATEGORY_NOT_FOUND',
  CATEGORY_NAME_TAKEN: 'CATEGORY_NAME_TAKEN',
  /** Payload categoryId is unknown or belongs to another household (422). */
  INVALID_CATEGORY: 'INVALID_CATEGORY',
  CATEGORY_INACTIVE: 'CATEGORY_INACTIVE',
  CATEGORY_TYPE_MISMATCH: 'CATEGORY_TYPE_MISMATCH',
  PAID_BY_NOT_MEMBER: 'PAID_BY_NOT_MEMBER',
  TRANSACTION_NOT_FOUND: 'TRANSACTION_NOT_FOUND',
  INVALID_CURSOR: 'INVALID_CURSOR',
  BUDGET_NOT_FOUND: 'BUDGET_NOT_FOUND',
  /** Budgets exist only for EXPENSE categories (422). */
  BUDGET_CATEGORY_NOT_EXPENSE: 'BUDGET_CATEGORY_NOT_EXPENSE',
  /** Financial Progress cannot be anchored on a month after the current one (422). */
  FUTURE_PERIOD: 'FUTURE_PERIOD',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;
export type ApiErrorCode = (typeof ApiErrorCode)[keyof typeof ApiErrorCode];

/** Every non-2xx response body: `{ statusCode, message, error?, issues? }`. */
export const apiErrorSchema = z.object({
  statusCode: z.number().int(),
  message: z.string(),
  error: z.string().optional(),
  issues: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
});
export type ApiError = z.infer<typeof apiErrorSchema>;
