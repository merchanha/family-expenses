import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { validateEnv, type Env } from './config/env';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { HealthModule } from './health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { HouseholdsModule } from './modules/households/households.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { TransactionsModule } from './modules/transactions/transactions.module';
import { SummariesModule } from './modules/summaries/summaries.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    // In-memory, per-instance storage: acceptable for the MVP (Cloud Run may run >1 instance).
    // Applied only where @UseGuards(ThrottlerGuard) is declared (credential endpoints).
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => [
        {
          name: 'auth',
          ttl: config.get('AUTH_THROTTLE_TTL_SECONDS', { infer: true }) * 1000,
          limit: config.get('AUTH_THROTTLE_LIMIT', { infer: true }),
        },
      ],
    }),
        // Session refresh runs on every page load (both partners, several tabs, one IP), so it gets
        // its own, looser bucket. Refresh tokens rotate and reuse revokes the family (FOR-105).
        {
          name: 'refresh',
          ttl: config.get('AUTH_THROTTLE_TTL_SECONDS', { infer: true }) * 1000,
          limit: config.get('AUTH_REFRESH_THROTTLE_LIMIT', { infer: true }),
        },
    PrismaModule,
    CommonModule,
    HealthModule,
    AuthModule,
    HouseholdsModule,
    CategoriesModule,
    TransactionsModule,
    SummariesModule,
  ],
  providers: [{ provide: APP_FILTER, useClass: AllExceptionsFilter }],
})
export class AppModule {}
