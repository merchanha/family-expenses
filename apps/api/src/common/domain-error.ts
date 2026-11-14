import type { ApiErrorCode } from '@tandem/shared';

/**
 * Base class for domain/application errors. Carries a semantic `kind` (never an HTTP status);
 * AllExceptionsFilter maps kinds to HTTP. `code` goes to the response `error` field.
 */
export type DomainErrorKind = 'NOT_FOUND' | 'CONFLICT' | 'BUSINESS_RULE' | 'FORBIDDEN' | 'UNAUTHENTICATED';

export abstract class DomainError extends Error {
  abstract readonly kind: DomainErrorKind;
  constructor(
    message: string,
    readonly code: ApiErrorCode,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class NotFoundError extends DomainError {
  readonly kind = 'NOT_FOUND' as const;
}
export class ConflictError extends DomainError {
  readonly kind = 'CONFLICT' as const;
}
export class BusinessRuleError extends DomainError {
  readonly kind = 'BUSINESS_RULE' as const;
}
export class ForbiddenError extends DomainError {
  readonly kind = 'FORBIDDEN' as const;
}
export class UnauthenticatedError extends DomainError {
  readonly kind = 'UNAUTHENTICATED' as const;
}
