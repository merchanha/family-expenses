import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Request, Response } from 'express';
import { ApiErrorCode, type ApiError } from '@tandem/shared';
import { DomainError, type DomainErrorKind } from './domain-error';

const STATUS_BY_KIND: Record<DomainErrorKind, number> = {
  NOT_FOUND: HttpStatus.NOT_FOUND,
  CONFLICT: HttpStatus.CONFLICT,
  BUSINESS_RULE: HttpStatus.UNPROCESSABLE_ENTITY,
  FORBIDDEN: HttpStatus.FORBIDDEN,
  UNAUTHENTICATED: HttpStatus.UNAUTHORIZED,
};

/**
 * One place that turns errors into `{ statusCode, message, error?, issues? }`.
 * Domain errors → 401/403/404/409/422; Prisma unique violation → 409; unknown → generic 500
 * (details logged server-side only — never stack traces or SQL to the client).
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const res = http.getResponse<Response>();
    const req = http.getRequest<Request>();
    const body = this.toBody(exception);
    if (body.statusCode >= 500) {
      const detail = exception instanceof Error ? (exception.stack ?? exception.message) : String(exception);
      this.logger.error(`${req.method} ${req.path} → ${body.statusCode}: ${detail}`);
    }
    res.status(body.statusCode).json(body);
  }

  private toBody(exception: unknown): ApiError {
    if (exception instanceof DomainError) {
      return { statusCode: STATUS_BY_KIND[exception.kind], message: exception.message, error: exception.code };
    }
    if (exception instanceof HttpException) return this.fromHttpException(exception);
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      // P2002 = unique violation; P2010 + 23505 = the same thing surfacing from raw SQL.
      // The message never names the constraint or columns.
      if (exception.code === 'P2002' || (exception.code === 'P2010' && exception.meta?.code === '23505')) {
        return { statusCode: HttpStatus.CONFLICT, message: 'Resource already exists', error: ApiErrorCode.CONFLICT };
      }
      if (exception.code === 'P2025') {
        return { statusCode: HttpStatus.NOT_FOUND, message: 'Not found', error: ApiErrorCode.NOT_FOUND };
      }
    }
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Internal server error',
      error: ApiErrorCode.INTERNAL_ERROR,
    };
  }

  private fromHttpException(exception: HttpException): ApiError {
    const statusCode = exception.getStatus();
    const raw = exception.getResponse();
    const obj: Record<string, unknown> = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
    const rawMessage = typeof raw === 'string' ? raw : obj.message;
    const message = Array.isArray(rawMessage)
      ? rawMessage.join('; ')
      : typeof rawMessage === 'string'
        ? rawMessage
        : exception.message;

    const body: ApiError = { statusCode, message };
    if (Array.isArray(obj.issues)) {
      body.issues = obj.issues as ApiError['issues'];
      body.error = ApiErrorCode.VALIDATION_FAILED;
    } else if (statusCode === HttpStatus.TOO_MANY_REQUESTS) {
      body.error = ApiErrorCode.TOO_MANY_REQUESTS;
    } else if (typeof obj.error === 'string') {
      body.error = obj.error;
    } else if (statusCode === HttpStatus.UNAUTHORIZED) {
      body.error = ApiErrorCode.UNAUTHENTICATED;
    }
    return body;
  }
}
