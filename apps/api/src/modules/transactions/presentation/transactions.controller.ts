import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import {
  createTransactionSchema,
  listTransactionsQuerySchema,
  updateTransactionSchema,
  z,
  type CreateTransactionInput,
  type ListTransactionsQuery as ListTransactionsInput,
  type Transaction,
  type TransactionListResponse,
  type UpdateTransactionInput,
} from '@tandem/shared';
import type { HouseholdContext } from '../../../common/auth/auth-context';
import { CurrentHousehold } from '../../../common/auth/auth.decorators';
import { ZodValidationPipe } from '../../../common/zod-validation.pipe';
import { CreateTransactionUseCase } from '../application/create-transaction.use-case';
import { DeleteTransactionUseCase } from '../application/delete-transaction.use-case';
import { GetTransactionQuery } from '../application/get-transaction.query';
import { ListTransactionsQuery } from '../application/list-transactions.query';
import { UpdateTransactionUseCase } from '../application/update-transaction.use-case';

const idParamSchema = z.string().min(1).max(64);

@Controller('transactions')
export class TransactionsController {
  constructor(
    private readonly listTransactions: ListTransactionsQuery,
    private readonly getTransaction: GetTransactionQuery,
    private readonly createTransaction: CreateTransactionUseCase,
    private readonly updateTransaction: UpdateTransactionUseCase,
    private readonly deleteTransaction: DeleteTransactionUseCase,
  ) {}

  @Get()
  list(
    @CurrentHousehold() ctx: HouseholdContext,
    @Query(new ZodValidationPipe(listTransactionsQuerySchema)) query: ListTransactionsInput,
  ): Promise<TransactionListResponse> {
    return this.listTransactions.execute(ctx, query);
  }

  @Get(':id')
  get(
    @CurrentHousehold() ctx: HouseholdContext,
    @Param('id', new ZodValidationPipe(idParamSchema)) id: string,
  ): Promise<Transaction> {
    return this.getTransaction.execute(ctx, id);
  }

  @Post()
  async create(
    @CurrentHousehold() ctx: HouseholdContext,
    @Body(new ZodValidationPipe(createTransactionSchema)) body: CreateTransactionInput,
  ): Promise<Transaction> {
    const id = await this.createTransaction.execute(ctx, body);
    return this.getTransaction.execute(ctx, id);
  }

  @Patch(':id')
  async update(
    @CurrentHousehold() ctx: HouseholdContext,
    @Param('id', new ZodValidationPipe(idParamSchema)) id: string,
    @Body(new ZodValidationPipe(updateTransactionSchema)) body: UpdateTransactionInput,
  ): Promise<Transaction> {
    await this.updateTransaction.execute(ctx, id, body);
    return this.getTransaction.execute(ctx, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentHousehold() ctx: HouseholdContext,
    @Param('id', new ZodValidationPipe(idParamSchema)) id: string,
  ): Promise<void> {
    await this.deleteTransaction.execute(ctx, id);
  }
}
