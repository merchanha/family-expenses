import type { HouseholdMember, PartnerSlot, TransactionType } from '@tandem/shared';

export const TYPE_LABEL: Record<TransactionType, string> = { EXPENSE: 'Expense', INCOME: 'Income' };

/** Form value for "Shared" (not attributed to one partner → paidById null). */
export const SHARED_PAYER = '';

export interface WhoPaidOption {
  /** userId, or SHARED_PAYER. */
  value: string;
  label: string;
  slot: PartnerSlot | null;
}

/** "Who paid for this?" — each member by name (Partner 1 first), then Shared. */
export function whoPaidOptions(
  members: Pick<HouseholdMember, 'userId' | 'partnerSlot' | 'displayName' | 'name'>[],
  label: (m: Pick<HouseholdMember, 'displayName' | 'name'>) => string,
): WhoPaidOption[] {
  const sorted = [...members].sort((a, b) => a.partnerSlot.localeCompare(b.partnerSlot));
  return [
    ...sorted.map((m) => ({ value: m.userId, label: label(m), slot: m.partnerSlot })),
    { value: SHARED_PAYER, label: 'Shared', slot: null },
  ];
}
