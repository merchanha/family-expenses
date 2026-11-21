import { z } from 'zod';
import { partnerSlotSchema, transactionTypeSchema } from './enums';
import { positiveMoneyStringSchema } from './money';
import { isoDateSchema, partnerFilterSchema, periodQueryFields, refinePeriod } from './periods';

export const TRANSACTIONS_DEFAULT_LIMIT = 50;
export const TRANSACTIONS_MAX_LIMIT = 100;

export const transactionDescriptionSchema = z.string().trim().min(1, 'Description is required').max(200);
const idSchema = z.string().min(1).max(64);

// ---- Requests ----

/**
 * POST /transactions (201). createdBy = the caller. Currency = household default.
 * 422 rules: category unknown / other household → INVALID_CATEGORY; inactive → CATEGORY_INACTIVE;
 * category type ≠ type → CATEGORY_TYPE_MISMATCH; paidById not a household member → PAID_BY_NOT_MEMBER.
 * paidById omitted or null = "Shared" (no attribution).
 */
export const createTransactionSchema = z.object({
  type: transactionTypeSchema,
  description: transactionDescriptionSchema,
  amount: positiveMoneyStringSchema,
  categoryId: idSchema,
  transactionDate: isoDateSchema,
  paidById: idSchema.nullable().optional(),
  paymentMethod: z.string().trim().max(50).nullable().optional(),
  notes: z.string().trim().max(1000).nullable().optional(),
});
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

/**
 * PATCH /transactions/:id — partial, same rules as create on the resulting values.
 * The category must be active only when it changes; keeping an inactive one is allowed.
 * Changing `type` alone fails with CATEGORY_TYPE_MISMATCH unless categoryId changes too.
 */
export const updateTransactionSchema = createTransactionSchema
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Provide at least one field');
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;

/**
 * GET /transactions — newest first (transactionDate desc, then createdAt desc).
 * Period (optional, no default = all time): year+month or from+to, on transactionDate.
 * partner filters on paid by; q searches description and notes (case-insensitive).
 * Pagination: limit (1–100, default 50) + cursor (opaque, from nextCursor).
 */
export const listTransactionsQuerySchema = z
  .object({
    ...periodQueryFields,
    type: transactionTypeSchema.optional(),
    categoryId: idSchema.optional(),
    partner: partnerFilterSchema,
    q: z.string().trim().min(1).max(100).optional(),
    limit: z.coerce.number().int().min(1).max(TRANSACTIONS_MAX_LIMIT).default(TRANSACTIONS_DEFAULT_LIMIT),
    cursor: z.string().min(1).max(200).optional(),
  })
  .superRefine(refinePeriod);
export type ListTransactionsQuery = z.infer<typeof listTransactionsQuerySchema>;

// ---- Responses ----

export const transactionCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string().nullable(),
  color: z.string().nullable(),
  type: transactionTypeSchema,
  isActive: z.boolean(),
});
export type TransactionCategory = z.infer<typeof transactionCategorySchema>;

/** Who created / paid, ready for partner chips. `name` = member displayName ?? user name. */
export const transactionPersonSchema = z.object({
  userId: z.string(),
  name: z.string(),
  /** Null only if the user is no longer a member of the household. */
  partnerSlot: partnerSlotSchema.nullable(),
  /** Null → use PARTNER_COLORS[partnerSlot]. */
  displayColor: z.string().nullable(),
});
export type TransactionPerson = z.infer<typeof transactionPersonSchema>;

export const transactionSchema = z.object({
  id: z.string(),
  type: transactionTypeSchema,
  description: z.string(),
  /** Decimal string, always 2 decimals, e.g. "1234.50". Always > 0; the type gives the sign. */
  amount: z.string(),
  currency: z.string(),
  transactionDate: isoDateSchema,
  paymentMethod: z.string().nullable(),
  notes: z.string().nullable(),
  category: transactionCategorySchema,
  createdBy: transactionPersonSchema,
  /** Null = Shared (not attributed). */
  paidBy: transactionPersonSchema.nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Transaction = z.infer<typeof transactionSchema>;

export const transactionListResponseSchema = z.object({
  items: z.array(transactionSchema),
  /** Pass back as `cursor` for the next page; null when there are no more. */
  nextCursor: z.string().nullable(),
});
export type TransactionListResponse = z.infer<typeof transactionListResponseSchema>;
