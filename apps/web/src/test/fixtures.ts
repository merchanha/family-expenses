import type {
  AuthSessionResponse,
  BudgetUtilizationResponse,
  DashboardChartsResponse,
  FinancialProgressResponse,
  Envelope,
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

export function envelope(overrides: Partial<Envelope> = {}): Envelope {
  return {
    category: { id: 'c1', name: 'Groceries & Food', icon: 'shopping_cart', color: '#0c9488', type: 'EXPENSE', isActive: true },
    budget: { id: 'b1', amount: '800.00', splitPartner1Percent: null },
    spent: '620.00',
    remaining: '180.00',
    utilization: '77.50',
    status: 'WITHIN',
    paidBy: { partner1: '310.00', partner2: '310.00', shared: '0.00' },
    ...overrides,
  };
}

export function budgetUtilization(overrides: Partial<BudgetUtilizationResponse> = {}): BudgetUtilizationResponse {
  return {
    period: { from: '2026-11-01', to: '2026-11-30', year: 2026, month: 11 },
    partner: null,
    currency: 'ARS',
    defaultSplitPartner1Percent: 50,
    summary: {
      monthlyAllocation: '800.00',
      consumed: '620.00',
      consumedPercent: '77.50',
      status: 'WITHIN',
      remaining: '180.00',
      budgetCount: 1,
    },
    items: [envelope()],
    ...overrides,
  };
}

export function dashboardCharts(overrides: Partial<DashboardChartsResponse> = {}): DashboardChartsResponse {
  return {
    period: { from: '2026-11-01', to: '2026-11-30', year: 2026, month: 11 },
    partner: null,
    currency: 'ARS',
    cashFlowTrajectory: [
      { date: '2026-11-01', cumulativeIncome: '500000.00', cumulativeExpenses: '20000.00' },
      { date: '2026-11-02', cumulativeIncome: '500000.00', cumulativeExpenses: '320000.50' },
    ],
    spendingByCategory: [
      {
        category: { id: 'c3', name: 'Rent & Housing', icon: 'home', color: '#4b41e1', type: 'EXPENSE', isActive: true },
        amount: '300000.00',
        sharePercent: '93.75',
      },
      {
        category: { id: 'c1', name: 'Groceries & Food', icon: 'shopping_cart', color: '#0c9488', type: 'EXPENSE', isActive: true },
        amount: '20000.50',
        sharePercent: '6.25',
      },
    ],
    totalExpenses: '320000.50',
    ...overrides,
  };
}

export function financialProgress(overrides: Partial<FinancialProgressResponse> = {}): FinancialProgressResponse {
  return {
    year: 2026,
    month: 11,
    window: 'MOM',
    partner: null,
    currency: 'ARS',
    current: { from: '2026-11-01', to: '2026-11-21' },
    previous: { from: '2026-10-01', to: '2026-10-21' },
    isPartial: true,
    kpis: {
      totalSpending: { current: '5120.00', previous: '5530.00', changeAmount: '-410.00', changePercent: '-7.41' },
      householdIncome: { current: '9450.00', previous: '8800.00', changeAmount: '650.00', changePercent: '7.39' },
      netCashFlowBuffer: { current: '4330.00', previous: '3270.00', changeAmount: '1060.00', changePercent: '32.42' },
      savingsRate: { current: '45.82', previous: '37.16', changePoints: '8.66' },
    },
    trend: [
      { year: 2026, month: 10, from: '2026-10-01', to: '2026-10-31', income: '8800.00', expenses: '6000.00', netCashFlowBuffer: '2800.00', isPartial: false },
      { year: 2026, month: 11, from: '2026-11-01', to: '2026-11-21', income: '9450.00', expenses: '5120.00', netCashFlowBuffer: '4330.00', isPartial: true },
    ],
    categories: [
      {
        category: { id: 'c1', name: 'Groceries', icon: 'shopping_cart', color: '#0c9488', type: 'EXPENSE', isActive: true },
        current: '620.00', previous: '525.00', varianceAmount: '95.00', variancePercent: '18.10',
      },
      {
        category: { id: 'c6', name: 'Recreation', icon: 'sell', color: '#ec4899', type: 'EXPENSE', isActive: true },
        current: '450.00', previous: '510.00', varianceAmount: '-60.00', variancePercent: '-11.76',
      },
      {
        category: { id: 'c7', name: 'Pets', icon: 'sell', color: '#8b5cf6', type: 'EXPENSE', isActive: false },
        current: '40.00', previous: '0.00', varianceAmount: '40.00', variancePercent: null,
      },
    ],
    ...overrides,
  };
}
