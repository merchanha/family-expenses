import { BadRequestException, Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { ApiErrorCode, type ListTransactionsQuery as ListTransactionsInput, type TransactionListResponse } from '@tandem/shared';
import type { HouseholdContext } from '../../../common/auth/auth-context';
import { paidByPartnerWhere } from '../../../common/partner-filter';
import { dateOnlyToDate, dateToDateOnly, explicitPeriod } from '../../../common/period';
import { PrismaService } from '../../../prisma/prisma.service';
import { decodeCursor, encodeCursor, type TransactionCursor } from '../infrastructure/transaction-cursor';
import { toTransactionResponse, transactionInclude } from '../infrastructure/transaction.mapper';

/**
 * GET /transactions — filters (period on transactionDate, type, category, partner = paid by, text
 * search) + keyset pagination, newest first. No period = all time.
 */
@Injectable()
export class ListTransactionsQuery {
  constructor(private readonly prisma: PrismaService) {}

  async execute(ctx: HouseholdContext, input: ListTransactionsInput): Promise<TransactionListResponse> {
    const cursor = input.cursor !== undefined ? decodeCursor(input.cursor) : null;
    if (input.cursor !== undefined && !cursor) {
      throw new BadRequestException({ message: 'Invalid cursor', error: ApiErrorCode.INVALID_CURSOR });
    }
    const period = explicitPeriod(input);
    const and: Prisma.TransactionWhereInput[] = [
      { householdId: ctx.householdId },
      paidByPartnerWhere(ctx.householdId, input.partner),
    ];
    if (period) and.push({ transactionDate: { gte: dateOnlyToDate(period.from), lte: dateOnlyToDate(period.to) } });
    if (input.type) and.push({ type: input.type });
    if (input.categoryId) and.push({ categoryId: input.categoryId });
    if (input.q) {
      const term = escapeLike(input.q);
      and.push({
        OR: [
          { description: { contains: term, mode: 'insensitive' } },
          { notes: { contains: term, mode: 'insensitive' } },
        ],
      });
    }
    if (cursor) and.push(afterCursor(cursor));

    const rows = await this.prisma.transaction.findMany({
      where: { AND: and },
      include: transactionInclude(ctx.householdId),
      orderBy: [{ transactionDate: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
      take: input.limit + 1,
    });
    const page = rows.slice(0, input.limit);
    const last = page[page.length - 1];
    return {
      items: page.map(toTransactionResponse),
      nextCursor:
        rows.length > input.limit && last
          ? encodeCursor({ transactionDate: dateToDateOnly(last.transactionDate), createdAt: last.createdAt, id: last.id })
          : null,
    };
  }
}

/**
 * Prisma passes `contains` to ILIKE without escaping, so `%` and `_` would act as wildcards.
 * Escape them (and the escape char itself) with backslash, Postgres' default LIKE escape.
 */
const escapeLike = (value: string): string => value.replace(/[\\%_]/g, (c) => `\\${c}`);

/** Rows strictly after the cursor in (transactionDate desc, createdAt desc, id desc) order. */
function afterCursor(c: TransactionCursor): Prisma.TransactionWhereInput {
  const date = dateOnlyToDate(c.transactionDate);
  return {
    OR: [
      { transactionDate: { lt: date } },
      { transactionDate: date, createdAt: { lt: c.createdAt } },
      { transactionDate: date, createdAt: c.createdAt, id: { lt: c.id } },
    ],
  };
}
