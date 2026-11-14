import {
  authSessionResponseSchema,
  messageResponseSchema,
  type AuthSessionResponse,
  type ForgotPasswordInput,
  type LoginInput,
  type MessageResponse,
  type RegisterInput,
  type ResetPasswordInput,
} from '@tandem/shared';
import { api } from '@/lib/api';

// Auth endpoints that set/clear the httpOnly refresh cookie need credentials: 'include'
// (web on Cloudflare Pages and API on Cloud Run are cross-site).

export function login(input: LoginInput): Promise<AuthSessionResponse> {
  return api.post('/auth/login', input, { schema: authSessionResponseSchema, anonymous: true, credentials: 'include' });
}

export function register(input: RegisterInput): Promise<AuthSessionResponse> {
  return api.post('/auth/register', input, { schema: authSessionResponseSchema, anonymous: true, credentials: 'include' });
}

export function requestPasswordReset(input: ForgotPasswordInput): Promise<MessageResponse> {
  return api.post('/auth/forgot-password', input, { schema: messageResponseSchema, anonymous: true });
}

export function resetPassword(input: ResetPasswordInput): Promise<void> {
  return api.post('/auth/reset-password', input, { anonymous: true });
}
