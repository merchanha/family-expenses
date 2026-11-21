import { z } from 'zod';
import { transactionTypeSchema, type TransactionType } from './enums';
import { hexColorSchema } from './households';

export interface DefaultCategoryTemplate {
  name: string;
  type: TransactionType;
  icon: string; // Material Symbols name (matches design mockups)
  color: string; // hex
}

/** Default envelopes per BUSINESS_RULES.md "Default Expense/Income Categories". */
export const DEFAULT_CATEGORIES: readonly DefaultCategoryTemplate[] = [
  { name: 'Rent & Housing', type: 'EXPENSE', icon: 'home', color: '#4b41e1' },
  { name: 'Groceries & Food', type: 'EXPENSE', icon: 'shopping_cart', color: '#0c9488' },
  { name: 'Utilities & Services', type: 'EXPENSE', icon: 'bolt', color: '#f59e0b' },
  { name: 'Transportation', type: 'EXPENSE', icon: 'directions_car', color: '#3b82f6' },
  { name: 'Recreation & Entertainment', type: 'EXPENSE', icon: 'theater_comedy', color: '#ec4899' },
  { name: 'Healthcare', type: 'EXPENSE', icon: 'medical_services', color: '#ef4444' },
  { name: 'Shopping', type: 'EXPENSE', icon: 'shopping_bag', color: '#8b5cf6' },
  { name: 'Subscriptions', type: 'EXPENSE', icon: 'subscriptions', color: '#6366f1' },
  { name: 'Travel', type: 'EXPENSE', icon: 'flight', color: '#14b8a6' },
  { name: 'Education & Personal', type: 'EXPENSE', icon: 'school', color: '#a855f7' },
  { name: 'Savings, Investments & Debt', type: 'EXPENSE', icon: 'account_balance', color: '#565e74' },
  { name: 'Other', type: 'EXPENSE', icon: 'more_horiz', color: '#76777d' },
  { name: 'Salary', type: 'INCOME', icon: 'payments', color: '#0c9488' },
  { name: 'Freelance', type: 'INCOME', icon: 'work', color: '#4b41e1' },
  { name: 'Additional Income', type: 'INCOME', icon: 'add_card', color: '#3b82f6' },
  { name: 'Other Income', type: 'INCOME', icon: 'more_horiz', color: '#76777d' },
];

// ---- P2: categories API contract ----

export const CATEGORY_NAME_MAX = 50;

export const categoryNameSchema = z.string().trim().min(1, 'Name is required').max(CATEGORY_NAME_MAX);
/** Material Symbols name, e.g. `shopping_cart`. */
export const categoryIconSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9_]{1,64}$/, 'Use a Material Symbols icon name like shopping_cart');
export const categoryDescriptionSchema = z.string().trim().max(200);

/** Query-string boolean: only "true" / "false". */
export const queryBooleanSchema = z.enum(['true', 'false']).transform((v) => v === 'true');

/** GET /categories?type=&includeInactive= — active only unless includeInactive=true. */
export const listCategoriesQuerySchema = z.object({
  type: transactionTypeSchema.optional(),
  includeInactive: queryBooleanSchema.optional(),
});
export type ListCategoriesQuery = z.infer<typeof listCategoriesQuerySchema>;

/** POST /categories (201). Name is unique among ACTIVE categories of the same type (case-insensitive) → 409 CATEGORY_NAME_TAKEN. */
export const createCategorySchema = z.object({
  name: categoryNameSchema,
  type: transactionTypeSchema,
  icon: categoryIconSchema.optional(),
  color: hexColorSchema.optional(),
  description: categoryDescriptionSchema.optional(),
});
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;

/**
 * PATCH /categories/:id. `type` is immutable (history must keep matching its category).
 * `isActive: false` deactivates, `true` reactivates (409 if an active category now has the name).
 * null clears icon/color/description.
 */
export const updateCategorySchema = z
  .object({
    name: categoryNameSchema,
    icon: categoryIconSchema.nullable(),
    color: hexColorSchema.nullable(),
    description: categoryDescriptionSchema.nullable(),
    isActive: z.boolean(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Provide at least one field');
export type UpdateCategoryInput = z.infer<typeof updateCategorySchema>;

export const categorySchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  icon: z.string().nullable(),
  color: z.string().nullable(),
  type: transactionTypeSchema,
  isDefault: z.boolean(),
  isActive: z.boolean(),
  /** Transactions using it (all time). > 0 means DELETE will deactivate instead of delete. */
  transactionCount: z.number().int(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export type Category = z.infer<typeof categorySchema>;

/** GET /categories — ordered by type (EXPENSE first), then name. */
export const categoryListResponseSchema = z.object({ items: z.array(categorySchema) });
export type CategoryListResponse = z.infer<typeof categoryListResponseSchema>;

/**
 * DELETE /categories/:id (200). Unused → hard-deleted (`category: null`).
 * Used by any transaction or budget → deactivated instead, returned with isActive=false.
 */
export const deleteCategoryResponseSchema = z.object({
  result: z.enum(['DELETED', 'DEACTIVATED']),
  category: categorySchema.nullable(),
});
export type DeleteCategoryResponse = z.infer<typeof deleteCategoryResponseSchema>;
