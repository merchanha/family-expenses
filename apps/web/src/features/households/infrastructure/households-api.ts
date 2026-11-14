import {
  createInviteResponseSchema,
  currentHouseholdResponseSchema,
  invitePreviewResponseSchema,
  type AcceptInviteInput,
  type CreateHouseholdInput,
  type CreateInviteInput,
  type CreateInviteResponse,
  type CurrentHouseholdResponse,
  type InvitePreviewResponse,
  type UpdateHouseholdInput,
  type UpdateMyMemberInput,
} from '@tandem/shared';
import { api } from '@/lib/api';

// The household is implicit: the API resolves it from the token's membership.

export function getCurrentHousehold(): Promise<CurrentHouseholdResponse> {
  return api.get('/households/me', { schema: currentHouseholdResponseSchema });
}

export function createHousehold(input: CreateHouseholdInput): Promise<CurrentHouseholdResponse> {
  return api.post('/households', input, { schema: currentHouseholdResponseSchema });
}

export function updateHousehold(input: UpdateHouseholdInput): Promise<CurrentHouseholdResponse> {
  return api.patch('/households/me', input, { schema: currentHouseholdResponseSchema });
}

export function updateMyMember(input: UpdateMyMemberInput): Promise<CurrentHouseholdResponse> {
  return api.patch('/households/me/members/me', input, { schema: currentHouseholdResponseSchema });
}

export function createInvite(input: CreateInviteInput): Promise<CreateInviteResponse> {
  return api.post('/households/me/invites', input, { schema: createInviteResponseSchema });
}

export function acceptInvite(input: AcceptInviteInput): Promise<CurrentHouseholdResponse> {
  return api.post('/invites/accept', input, { schema: currentHouseholdResponseSchema });
}

/** Public preview of an invite, for the join screen. */
export function getInvitePreview(token: string): Promise<InvitePreviewResponse> {
  return api.get(`/invites/${encodeURIComponent(token)}`, { schema: invitePreviewResponseSchema, anonymous: true });
}

/** DELETE /households/me/invites/:id — owner cancels the pending invite. */
export function revokeInvite(id: string): Promise<void> {
  return api.delete(`/households/me/invites/${encodeURIComponent(id)}`);
}
