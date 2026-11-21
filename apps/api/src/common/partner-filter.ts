import type { Prisma } from '@prisma/client';
import type { PartnerSlot } from '@tandem/shared';

/**
 * Partner filter (BUSINESS_RULES §4): only transactions **paid by** the member in that slot of
 * this household. Resolved in SQL through the membership, so an empty slot simply matches nothing.
 * Unattributed ("Shared") transactions are excluded under a partner filter.
 */
export function paidByPartnerWhere(householdId: string, partner: PartnerSlot | undefined): Prisma.TransactionWhereInput {
  if (!partner) return {};
  return { paidBy: { memberships: { some: { householdId, partnerSlot: partner } } } };
}
