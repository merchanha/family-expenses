import { ApiErrorCode } from '@tandem/shared';
import { BusinessRuleError, ConflictError, ForbiddenError, NotFoundError } from '../../../common/domain-error';

export class AlreadyInHouseholdError extends ConflictError {
  constructor() {
    super('You already belong to a household', ApiErrorCode.ALREADY_IN_HOUSEHOLD);
  }
}

export class HouseholdFullError extends ConflictError {
  constructor() {
    super('This household already has two members', ApiErrorCode.HOUSEHOLD_FULL);
  }
}

export class OwnerOnlyError extends ForbiddenError {
  constructor() {
    super('Only the household owner can manage invites', ApiErrorCode.OWNER_ONLY);
  }
}

export class InviteNotFoundError extends NotFoundError {
  constructor() {
    super('Invite not found', ApiErrorCode.INVITE_NOT_FOUND);
  }
}

export class InviteNotUsableError extends BusinessRuleError {
  constructor() {
    super('This invite has expired, was revoked or was already used', ApiErrorCode.INVITE_NOT_USABLE);
  }
}

export class InviteEmailMismatchError extends ForbiddenError {
  constructor() {
    super('This invite was sent to a different email address', ApiErrorCode.INVITE_EMAIL_MISMATCH);
  }
}

export class CannotInviteSelfError extends BusinessRuleError {
  constructor() {
    super('You cannot invite yourself', ApiErrorCode.CANNOT_INVITE_SELF);
  }
}

export class HouseholdNotFoundError extends NotFoundError {
  constructor() {
    super('Household not found', ApiErrorCode.NOT_FOUND);
  }
}
