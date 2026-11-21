import {
  createTransactionSchema,
  positiveMoneyStringSchema,
  z,
  type Transaction,
  type TransactionType,
  type UpdateTransactionInput,
} from '@tandem/shared';
import { normalizeMoneyInput } from '@/lib/money';
import { SHARED_PAYER } from '@/features/transactions/domain/transaction-display';

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v || null);

/**
 * The shared create schema, with form-only input handling (apps/web/CLAUDE.md §10):
 * the amount is normalised from es-AR input ("1.234,50") and stays a string;
 * "Shared" (empty) becomes paidById null; empty notes become null.
 */
export const transactionFormSchema = createTransactionSchema.extend({
  amount: z.string().trim().min(1, 'Amount is required').transform(normalizeMoneyInput).pipe(positiveMoneyStringSchema),
  categoryId: z.string().min(1, 'Choose a category'),
  paidById: z.string().transform((v) => (v === SHARED_PAYER ? null : v)),
  notes: optionalText(1000),
});

export type TransactionFormValues = z.input<typeof transactionFormSchema>;
export type TransactionFormOutput = z.output<typeof transactionFormSchema>;

export function emptyFormValues(
  type: TransactionType,
  transactionDate: string,
  paidById: string,
): TransactionFormValues {
  return { type, amount: '', description: '', categoryId: '', transactionDate, paidById, notes: '' };
}

export function toFormValues(tx: Transaction): TransactionFormValues {
  return {
    type: tx.type,
    amount: tx.amount,
    description: tx.description,
    categoryId: tx.category.id,
    transactionDate: tx.transactionDate,
    paidById: tx.paidBy?.userId ?? SHARED_PAYER,
    notes: tx.notes ?? '',
  };
}

/**
 * PATCH body with only the fields that changed, so keeping an inactive category
 * (allowed) isn't re-validated as a change. Amounts compare as normalised strings.
 */
export function changedFields(original: Transaction, next: TransactionFormOutput): UpdateTransactionInput {
  const before = transactionFormSchema.parse(toFormValues(original));
  const patch: UpdateTransactionInput = {};
  if (next.type !== before.type) patch.type = next.type;
  if (next.description !== before.description) patch.description = next.description;
  if (!sameMoney(next.amount, before.amount)) patch.amount = next.amount;
  if (next.categoryId !== before.categoryId) patch.categoryId = next.categoryId;
  if (next.transactionDate !== before.transactionDate) patch.transactionDate = next.transactionDate;
  if (next.paidById !== before.paidById) patch.paidById = next.paidById;
  if (next.notes !== before.notes) patch.notes = next.notes;
  return patch;
}

/** "128.5" vs "128.50": same amount, compared as strings (no float math). */
function sameMoney(a: string, b: string): boolean {
  const canon = (v: string) => {
    const [int = '0', frac = ''] = v.split('.');
    return `${int.replace(/^0+(?=\d)/, '')}.${frac.padEnd(2, '0')}`;
  };
  return canon(a) === canon(b);
}
