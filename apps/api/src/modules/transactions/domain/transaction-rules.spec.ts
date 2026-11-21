import { assertCategoryAssignable } from './transaction-rules';
import { CategoryInactiveError, CategoryTypeMismatchError, InvalidCategoryError } from './transaction.errors';

const expense = { id: 'c1', type: 'EXPENSE' as const, isActive: true };

describe('assertCategoryAssignable', () => {
  it('accepts an active category of the same type', () => {
    expect(() => assertCategoryAssignable(expense, 'EXPENSE', { newlyAssigned: true })).not.toThrow();
  });
  it('rejects a missing / foreign category', () => {
    expect(() => assertCategoryAssignable(null, 'EXPENSE', { newlyAssigned: true })).toThrow(InvalidCategoryError);
  });
  it('rejects a type mismatch both ways', () => {
    expect(() => assertCategoryAssignable(expense, 'INCOME', { newlyAssigned: true })).toThrow(CategoryTypeMismatchError);
    const income = { ...expense, type: 'INCOME' as const };
    expect(() => assertCategoryAssignable(income, 'EXPENSE', { newlyAssigned: false })).toThrow(CategoryTypeMismatchError);
  });
  it('rejects assigning an inactive category but allows keeping one', () => {
    const inactive = { ...expense, isActive: false };
    expect(() => assertCategoryAssignable(inactive, 'EXPENSE', { newlyAssigned: true })).toThrow(CategoryInactiveError);
    expect(() => assertCategoryAssignable(inactive, 'EXPENSE', { newlyAssigned: false })).not.toThrow();
  });
});
