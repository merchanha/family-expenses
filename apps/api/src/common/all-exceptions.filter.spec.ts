import { BadRequestException, HttpException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { Prisma } from '@prisma/client';
import type { ArgumentsHost } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { BusinessRuleError, ConflictError, ForbiddenError, NotFoundError, UnauthenticatedError } from './domain-error';

function run(exception: unknown) {
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const host = {
    switchToHttp: () => ({ getResponse: () => res, getRequest: () => ({ method: 'GET', path: '/x' }) }),
  } as unknown as ArgumentsHost;
  new AllExceptionsFilter().catch(exception, host);
  return { status: res.status.mock.calls[0][0] as number, body: res.json.mock.calls[0][0] };
}

describe('AllExceptionsFilter', () => {
  it.each([
    [new NotFoundError('nope', 'NOT_FOUND'), 404],
    [new ConflictError('dup', 'EMAIL_TAKEN'), 409],
    [new BusinessRuleError('rule', 'INVITE_NOT_USABLE'), 422],
    [new ForbiddenError('no', 'OWNER_ONLY'), 403],
    [new UnauthenticatedError('who', 'INVALID_CREDENTIALS'), 401],
  ])('maps domain error %p to %i with its code', (err, status) => {
    const { status: s, body } = run(err);
    expect(s).toBe(status);
    expect(body).toEqual({ statusCode: status, message: err.message, error: err.code });
  });

  it('keeps validation issues', () => {
    const { body } = run(new BadRequestException({ message: 'Validation failed', issues: [{ path: 'email', message: 'bad' }] }));
    expect(body).toEqual({
      statusCode: 400,
      message: 'Validation failed',
      error: 'VALIDATION_FAILED',
      issues: [{ path: 'email', message: 'bad' }],
    });
  });

  it('maps Prisma unique violation to 409', () => {
    const err = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', { code: 'P2002', clientVersion: 'x' });
    expect(run(err)).toEqual({ status: 409, body: { statusCode: 409, message: 'Resource already exists', error: 'CONFLICT' } });
  });

  it('maps a raw-SQL unique violation (P2010/23505) to 409 without leaking names', () => {
    const err = new Prisma.PrismaClientKnownRequestError('duplicate key value violates "Category_x_key"', {
      code: 'P2010',
      clientVersion: 'x',
      meta: { code: '23505' },
    });
    expect(run(err).body).toEqual({ statusCode: 409, message: 'Resource already exists', error: 'CONFLICT' });
  });

  it('hides unknown errors behind a generic 500', () => {
    const { status, body } = run(new Error('SELECT * FROM secret'));
    expect(status).toBe(500);
    expect(body).toEqual({ statusCode: 500, message: 'Internal server error', error: 'INTERNAL_ERROR' });
  });

  it('passes HttpExceptions through with a code', () => {
    expect(run(new UnauthorizedException()).body).toMatchObject({ statusCode: 401, error: 'UNAUTHENTICATED' });
    expect(run(new ThrottlerException()).body).toMatchObject({ statusCode: 429, error: 'TOO_MANY_REQUESTS' });
    expect(run(new NotFoundException('Cannot GET /x')).body).toEqual({ statusCode: 404, message: 'Cannot GET /x', error: 'Not Found' });
    expect(run(new HttpException('teapot', 418)).body).toEqual({ statusCode: 418, message: 'teapot' });
  });
});
