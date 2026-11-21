import { ApiErrorCode } from '@tandem/shared';
import { ConflictError, NotFoundError } from '../../../common/domain-error';

export class CategoryNotFoundError extends NotFoundError {
  constructor() {
    super('Category not found', ApiErrorCode.CATEGORY_NOT_FOUND);
  }
}

export class CategoryNameTakenError extends ConflictError {
  constructor() {
    super('An active category with this name and type already exists', ApiErrorCode.CATEGORY_NAME_TAKEN);
  }
}
