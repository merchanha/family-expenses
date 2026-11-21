import { Module } from '@nestjs/common';
import { CreateTransactionUseCase } from './application/create-transaction.use-case';
import { DeleteTransactionUseCase } from './application/delete-transaction.use-case';
import { GetTransactionQuery } from './application/get-transaction.query';
import { ListTransactionsQuery } from './application/list-transactions.query';
import { UpdateTransactionUseCase } from './application/update-transaction.use-case';
import { TransactionRepository } from './domain/transaction.repository';
import { PrismaTransactionRepository } from './infrastructure/prisma-transaction.repository';
import { TransactionsController } from './presentation/transactions.controller';

@Module({
  controllers: [TransactionsController],
  providers: [
    { provide: TransactionRepository, useClass: PrismaTransactionRepository },
    CreateTransactionUseCase,
    UpdateTransactionUseCase,
    DeleteTransactionUseCase,
    GetTransactionQuery,
    ListTransactionsQuery,
  ],
})
export class TransactionsModule {}
