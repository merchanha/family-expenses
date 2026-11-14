import { ApiErrorCode } from '@tandem/shared';
import { BusinessRuleError, ConflictError, UnauthenticatedError } from '../../../common/domain-error';

export class EmailAlreadyRegisteredError extends ConflictError {
  constructor() {
    super('An account with this email already exists', ApiErrorCode.EMAIL_TAKEN);
  }
}

export class InvalidCredentialsError extends UnauthenticatedError {
  constructor() {
    super('Invalid email or password', ApiErrorCode.INVALID_CREDENTIALS);
  }
}

export class InvalidRefreshTokenError extends UnauthenticatedError {
  constructor() {
    super('Session expired, please sign in again', ApiErrorCode.INVALID_REFRESH_TOKEN);
  }
}

export class InvalidResetTokenError extends BusinessRuleError {
  constructor() {
    super('This reset link is invalid or has expired', ApiErrorCode.INVALID_RESET_TOKEN);
  }
}

export class UserNotFoundError extends UnauthenticatedError {
  constructor() {
    super('Authentication required', ApiErrorCode.UNAUTHENTICATED);
  }
}
