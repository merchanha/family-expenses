import { z } from 'zod';

// Mirrors Prisma enums in apps/api/prisma/schema.prisma — keep in sync.
export const TransactionType = { INCOME: 'INCOME', EXPENSE: 'EXPENSE' } as const;
export type TransactionType = (typeof TransactionType)[keyof typeof TransactionType];
export const transactionTypeSchema = z.enum(['INCOME', 'EXPENSE']);

export const PartnerSlot = { PARTNER_1: 'PARTNER_1', PARTNER_2: 'PARTNER_2' } as const;
export type PartnerSlot = (typeof PartnerSlot)[keyof typeof PartnerSlot];
export const partnerSlotSchema = z.enum(['PARTNER_1', 'PARTNER_2']);

export const HouseholdMemberRole = { OWNER: 'OWNER', MEMBER: 'MEMBER' } as const;
export type HouseholdMemberRole = (typeof HouseholdMemberRole)[keyof typeof HouseholdMemberRole];
export const householdMemberRoleSchema = z.enum(['OWNER', 'MEMBER']);

export const InviteStatus = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  EXPIRED: 'EXPIRED',
  REVOKED: 'REVOKED',
} as const;
export type InviteStatus = (typeof InviteStatus)[keyof typeof InviteStatus];
export const inviteStatusSchema = z.enum(['PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED']);

export const SavingsGoalStatus = { ACTIVE: 'ACTIVE', COMPLETED: 'COMPLETED', ARCHIVED: 'ARCHIVED' } as const;
export type SavingsGoalStatus = (typeof SavingsGoalStatus)[keyof typeof SavingsGoalStatus];
export const savingsGoalStatusSchema = z.enum(['ACTIVE', 'COMPLETED', 'ARCHIVED']);

export const NotificationType = {
  BUDGET_THRESHOLD: 'BUDGET_THRESHOLD',
  SPENDING_INCREASE: 'SPENDING_INCREASE',
  GOAL_MILESTONE: 'GOAL_MILESTONE',
  PARTNER_ACTIVITY: 'PARTNER_ACTIVITY',
  SYSTEM: 'SYSTEM',
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];
export const notificationTypeSchema = z.enum([
  'BUDGET_THRESHOLD',
  'SPENDING_INCREASE',
  'GOAL_MILESTONE',
  'PARTNER_ACTIVITY',
  'SYSTEM',
]);
