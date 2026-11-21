import type {
  AuthSessionResponse,
  Category,
  PeriodSummaryResponse,
  Transaction,
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

export function category(overrides: Partial<Category> = {}): Category {
  return {
    id: 'c1',
    name: 'Groceries & Food',
    description: null,
    icon: 'shopping_cart',
    color: '#0c9488',
    type: 'EXPENSE',
    isDefault: true,
    isActive: true,
    transactionCount: 0,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

export function transaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 't1',
    type: 'EXPENSE',
    description: 'Supermarket',
    amount: '1234.50',
    currency: 'ARS',
    transactionDate: '2026-11-14',
    paymentMethod: null,
    notes: null,
    category: { id: 'c1', name: 'Groceries & Food', icon: 'shopping_cart', color: '#0c9488', type: 'EXPENSE', isActive: true },
    createdBy: { userId: 'u1', name: 'Alex Morgan', partnerSlot: 'PARTNER_1', displayColor: null },
    paidBy: { userId: 'u2', name: 'Maya Lopez', partnerSlot: 'PARTNER_2', displayColor: null },
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

export function periodSummary(overrides: Partial<PeriodSummaryResponse> = {}): PeriodSummaryResponse {
  return {
    period: { from: '2026-11-01', to: '2026-11-30', year: 2026, month: 11 },
    partner: null,
    currency: 'ARS',
    income: '500000.00',
    expenses: '320000.50',
    netCashFlowBuffer: '179999.50',
    savingsRate: '36.00',
    transactionCount: 12,
    ...overrides,
  };
}
