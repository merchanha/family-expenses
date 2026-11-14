import { z } from 'zod';
import { householdMemberRoleSchema, inviteStatusSchema, partnerSlotSchema } from './enums';
import { emailSchema } from './auth';

export const DEFAULT_TIMEZONE = 'America/Argentina/Buenos_Aires';
export const DEFAULT_SPLIT_PARTNER_1_PERCENT = 50;
export const MAX_HOUSEHOLD_MEMBERS = 2;
/** Default partner chip colors (design/tandem_finance/DESIGN.md "Dual Partner Attribution"). */
export const PARTNER_COLORS = { PARTNER_1: '#6366F1', PARTNER_2: '#0D9488' } as const;

const isValidTimeZone = (tz: string): boolean => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

export const householdNameSchema = z.string().trim().min(1, 'Name is required').max(100);
export const timezoneSchema = z.string().min(1).max(64).refine(isValidTimeZone, 'Unknown timezone');
export const currencyCodeSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z]{3}$/, 'Use a 3-letter currency code')
  .transform((v) => v.toUpperCase());
/** Partner 1 share of the default split; Partner 2 gets 100 − this. 1–99 (P1-008). */
export const splitPercentSchema = z.number().int().min(1).max(99);
export const hexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Use a hex color like #6366F1');
export const displayNameSchema = z.string().trim().min(1).max(50);

// ---- Requests ----

/** POST /households — creator becomes OWNER / PARTNER_1. */
export const createHouseholdSchema = z.object({
  name: householdNameSchema,
  defaultCurrency: currencyCodeSchema.optional(),
  timezone: timezoneSchema.optional(),
  displayName: displayNameSchema.optional(),
});
export type CreateHouseholdInput = z.infer<typeof createHouseholdSchema>;

/** PATCH /households/me — any member (equal permissions). At least one field. */
export const updateHouseholdSchema = z
  .object({
    name: householdNameSchema,
    defaultSplitPartner1Percent: splitPercentSchema,
    defaultCurrency: currencyCodeSchema,
    timezone: timezoneSchema,
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Provide at least one field');
export type UpdateHouseholdInput = z.infer<typeof updateHouseholdSchema>;

/** PATCH /households/me/members/me — the caller's own partner display. null clears. */
export const updateMyMemberSchema = z
  .object({
    displayName: displayNameSchema.nullable(),
    displayColor: hexColorSchema.nullable(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Provide at least one field');
export type UpdateMyMemberInput = z.infer<typeof updateMyMemberSchema>;

/** POST /households/me/invites — OWNER only; replaces any pending invite. */
export const createInviteSchema = z.object({ email: emailSchema });
export type CreateInviteInput = z.infer<typeof createInviteSchema>;

/** POST /invites/accept */
export const acceptInviteSchema = z.object({ token: z.string().min(1).max(256) });
export type AcceptInviteInput = z.infer<typeof acceptInviteSchema>;

// ---- Responses ----

export const householdSchema = z.object({
  id: z.string(),
  name: z.string(),
  defaultCurrency: z.string(),
  timezone: z.string(),
  defaultSplitPartner1Percent: z.number().int(),
  createdAt: z.string().datetime(),
});
export type Household = z.infer<typeof householdSchema>;

export const householdMemberSchema = z.object({
  id: z.string(),
  userId: z.string(),
  name: z.string(),
  email: z.string(),
  role: householdMemberRoleSchema,
  partnerSlot: partnerSlotSchema,
  /** Null → show `name`. */
  displayName: z.string().nullable(),
  /** Hex; null → use PARTNER_COLORS[partnerSlot]. */
  displayColor: z.string().nullable(),
  joinedAt: z.string().datetime(),
});
export type HouseholdMember = z.infer<typeof householdMemberSchema>;

export const householdInviteSchema = z.object({
  id: z.string(),
  email: z.string(),
  status: inviteStatusSchema,
  invitedById: z.string(),
  expiresAt: z.string().datetime(),
  createdAt: z.string().datetime(),
});
export type HouseholdInvite = z.infer<typeof householdInviteSchema>;

/** GET /households/me, PATCH /households/me, POST /households (201), POST /invites/accept. */
export const currentHouseholdResponseSchema = z.object({
  household: householdSchema,
  /** Ordered PARTNER_1, PARTNER_2. */
  members: z.array(householdMemberSchema),
  /** Pending, non-expired invites (at most one). */
  invites: z.array(householdInviteSchema),
  me: z.object({ userId: z.string(), partnerSlot: partnerSlotSchema, role: householdMemberRoleSchema }),
});
export type CurrentHouseholdResponse = z.infer<typeof currentHouseholdResponseSchema>;

/** POST /households/me/invites (201). `inviteUrl` lets the owner share the link directly. */
export const createInviteResponseSchema = z.object({
  invite: householdInviteSchema,
  inviteUrl: z.string(),
});
export type CreateInviteResponse = z.infer<typeof createInviteResponseSchema>;

/** GET /invites/:token (public) — for the "join household" screen. */
export const invitePreviewResponseSchema = z.object({
  householdName: z.string(),
  invitedByName: z.string(),
  email: z.string(),
  status: inviteStatusSchema,
  expiresAt: z.string().datetime(),
});
export type InvitePreviewResponse = z.infer<typeof invitePreviewResponseSchema>;
