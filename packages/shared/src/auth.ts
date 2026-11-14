import { z } from 'zod';
import { householdMemberRoleSchema, partnerSlotSchema } from './enums';

/** Header required on POST /auth/refresh and /auth/logout (CSRF guard; forces a CORS preflight). */
export const CSRF_HEADER_NAME = 'X-Requested-With';
export const CSRF_HEADER_VALUE = 'tandem';
/** httpOnly refresh cookie, Path=/api/auth. Never readable from JS. */
export const REFRESH_COOKIE_NAME = 'tandem_rt';

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export const emailSchema = z.string().trim().toLowerCase().email('Enter a valid email').max(254);
export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(PASSWORD_MAX_LENGTH, `Password must be at most ${PASSWORD_MAX_LENGTH} characters`);
export const personNameSchema = z.string().trim().min(1, 'Name is required').max(100);

// ---- Requests ----

/** POST /auth/register */
export const registerSchema = z.object({
  name: personNameSchema,
  email: emailSchema,
  password: passwordSchema,
});
export type RegisterInput = z.infer<typeof registerSchema>;

/** POST /auth/login (no length rules on login, only on register/reset). */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required').max(PASSWORD_MAX_LENGTH),
});
export type LoginInput = z.infer<typeof loginSchema>;

/** POST /auth/forgot-password */
export const forgotPasswordSchema = z.object({ email: emailSchema });
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

/** POST /auth/reset-password */
export const resetPasswordSchema = z.object({
  token: z.string().min(1).max(256),
  password: passwordSchema,
});
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

/** PATCH /auth/me */
export const updateProfileSchema = z.object({ name: personNameSchema });
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// ---- Responses ----

export const authUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  createdAt: z.string().datetime(),
});
export type AuthUser = z.infer<typeof authUserSchema>;

/** The caller's membership summary; `null` means "no household yet" → onboarding. */
export const sessionHouseholdSchema = z.object({
  id: z.string(),
  name: z.string(),
  partnerSlot: partnerSlotSchema,
  role: householdMemberRoleSchema,
});
export type SessionHousehold = z.infer<typeof sessionHouseholdSchema>;

/** GET /auth/me, PATCH /auth/me */
export const currentUserResponseSchema = z.object({
  user: authUserSchema,
  household: sessionHouseholdSchema.nullable(),
});
export type CurrentUserResponse = z.infer<typeof currentUserResponseSchema>;

/** POST /auth/register (201), /auth/login (200), /auth/refresh (200). Also sets the refresh cookie. */
export const authSessionResponseSchema = currentUserResponseSchema.extend({
  accessToken: z.string(),
  /** Access token lifetime in seconds. */
  expiresIn: z.number().int().positive(),
});
export type AuthSessionResponse = z.infer<typeof authSessionResponseSchema>;

/** POST /auth/forgot-password (202) — identical whether or not the email exists. */
export const messageResponseSchema = z.object({ message: z.string() });
export type MessageResponse = z.infer<typeof messageResponseSchema>;
