import { currentUserResponseSchema, type CurrentUserResponse, type UpdateProfileInput } from '@tandem/shared';
import { api } from '@/lib/api';

/** PATCH /auth/me — the signed-in user's own profile (Settings & Household). */
export function updateProfile(input: UpdateProfileInput): Promise<CurrentUserResponse> {
  return api.patch('/auth/me', input, { schema: currentUserResponseSchema });
}
