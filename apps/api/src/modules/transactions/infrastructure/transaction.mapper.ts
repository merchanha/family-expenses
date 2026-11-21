import type { Prisma } from '@prisma/client';
import type { Transaction, TransactionPerson } from '@tandem/shared';
import { fromDecimal } from '../../../common/money';
import { dateToDateOnly } from '../../../common/period';

/** Person select with only *this* household's membership (a user has at most one). */
const person = (householdId: string) =>
  ({
    select: {
      id: true,
      name: true,
      memberships: { where: { householdId }, select: { partnerSlot: true, displayName: true, displayColor: true } },
    },
  }) satisfies Prisma.UserDefaultArgs;

export const transactionInclude = (householdId: string) =>
  ({
    category: { select: { id: true, name: true, icon: true, color: true, type: true, isActive: true } },
    createdBy: person(householdId),
    paidBy: person(householdId),
  }) satisfies Prisma.TransactionInclude;

export type TransactionRow = Prisma.TransactionGetPayload<{ include: ReturnType<typeof transactionInclude> }>;
type PersonRow = TransactionRow['createdBy'];

const toPerson = (u: PersonRow): TransactionPerson => {
  const m = u.memberships[0];
  return {
    userId: u.id,
    name: m?.displayName ?? u.name,
    partnerSlot: m?.partnerSlot ?? null,
    displayColor: m?.displayColor ?? null,
  };
};

export const toTransactionResponse = (t: TransactionRow): Transaction => ({
  id: t.id,
  type: t.type,
  description: t.description,
  amount: fromDecimal(t.amount),
  currency: t.currency,
  transactionDate: dateToDateOnly(t.transactionDate),
  paymentMethod: t.paymentMethod,
  notes: t.notes,
  category: t.category,
  createdBy: toPerson(t.createdBy),
  paidBy: t.paidBy ? toPerson(t.paidBy) : null,
  createdAt: t.createdAt.toISOString(),
  updatedAt: t.updatedAt.toISOString(),
});
