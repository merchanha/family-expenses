import { ApiErrorCode } from '@tandem/shared';
import { BusinessRuleError, NotFoundError } from '../../../common/domain-error';

export class BudgetNotFoundError extends NotFoundError {
  constructor() {
    super('Budget not found', ApiErrorCode.BUDGET_NOT_FOUND);
  }
}

export class BudgetCategoryNotExpenseError extends BusinessRuleError {
  constructor() {
    super('Budgets can only be set on expense categories', ApiErrorCode.BUDGET_CATEGORY_NOT_EXPENSE);
  }
}

export class BudgetCategoryInactiveError extends BusinessRuleError {
  constructor() {
    super('This category is deactivated; a new budget needs an active category', ApiErrorCode.CATEGORY_INACTIVE);
  }
}

/** Unknown categoryId or another household's (same answer, so existence is not revealed). Decision #18: 404. */
export class BudgetCategoryNotFoundError extends NotFoundError {
  constructor() {
    super('Category not found', ApiErrorCode.CATEGORY_NOT_FOUND);
  }
}
