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
