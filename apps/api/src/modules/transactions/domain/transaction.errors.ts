import { ApiErrorCode } from '@tandem/shared';
import { BusinessRuleError, NotFoundError } from '../../../common/domain-error';

export class TransactionNotFoundError extends NotFoundError {
  constructor() {
    super('Transaction not found', ApiErrorCode.TRANSACTION_NOT_FOUND);
  }
}

/** Unknown categoryId, or one from another household (same answer, so existence is not revealed). */
export class InvalidCategoryError extends BusinessRuleError {
  constructor() {
    super('Category not found in this household', ApiErrorCode.INVALID_CATEGORY);
  }
}

export class CategoryInactiveError extends BusinessRuleError {
  constructor() {
    super('This category is deactivated; choose an active category', ApiErrorCode.CATEGORY_INACTIVE);
  }
}

export class CategoryTypeMismatchError extends BusinessRuleError {
  constructor() {
    super('The category type must match the transaction type', ApiErrorCode.CATEGORY_TYPE_MISMATCH);
  }
}

export class PaidByNotMemberError extends BusinessRuleError {
  constructor() {
    super('Paid by must be a member of this household', ApiErrorCode.PAID_BY_NOT_MEMBER);
  }
}
