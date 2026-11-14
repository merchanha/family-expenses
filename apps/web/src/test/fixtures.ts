import type {
  AuthSessionResponse,
  CurrentHouseholdResponse,
  CurrentUserResponse,
  HouseholdMember,
} from '@tandem/shared';

const NOW = '2026-11-14T12:00:00.000Z';

/** Builders for API responses that satisfy the @tandem/shared schemas. */
export function currentUser(overrides: Partial<CurrentUserResponse> = {}): CurrentUserResponse {
  return {
    user: { id: 'u1', name: 'Alex Morgan', email: 'alex@example.com', createdAt: NOW },
    household: { id: 'h1', name: 'Alex & Maya', partnerSlot: 'PARTNER_1', role: 'OWNER' },
    ...overrides,
  };
}

export function sessionResponse(overrides: Partial<AuthSessionResponse> = {}): AuthSessionResponse {
  return { ...currentUser(), accessToken: 'access-1', expiresIn: 900, ...overrides };
}

export function member(overrides: Partial<HouseholdMember> = {}): HouseholdMember {
  return {
    id: 'm1',
    userId: 'u1',
    name: 'Alex Morgan',
    email: 'alex@example.com',
    role: 'OWNER',
    partnerSlot: 'PARTNER_1',
    displayName: null,
    displayColor: null,
    joinedAt: NOW,
    ...overrides,
  };
}

export function currentHousehold(overrides: Partial<CurrentHouseholdResponse> = {}): CurrentHouseholdResponse {
  return {
    household: {
      id: 'h1',
      name: 'Alex & Maya',
      defaultCurrency: 'ARS',
      timezone: 'America/Argentina/Buenos_Aires',
      defaultSplitPartner1Percent: 50,
      createdAt: NOW,
    },
    members: [
      member(),
      member({
        id: 'm2',
        userId: 'u2',
        name: 'Maya Lopez',
        email: 'maya@example.com',
        role: 'MEMBER',
        partnerSlot: 'PARTNER_2',
      }),
    ],
    invites: [],
    me: { userId: 'u1', partnerSlot: 'PARTNER_1', role: 'OWNER' },
    ...overrides,
  };
}
