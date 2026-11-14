import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import type { Env } from '../../config/env';
import { GetCurrentUserQuery } from './application/get-current-user.query';
import { LoginUseCase } from './application/login.use-case';
import { LogoutUseCase } from './application/logout.use-case';
import { RefreshSessionUseCase } from './application/refresh-session.use-case';
import { RegisterUseCase } from './application/register.use-case';
import { RequestPasswordResetUseCase } from './application/request-password-reset.use-case';
import { ResetPasswordUseCase } from './application/reset-password.use-case';
import { SessionIssuer } from './application/session-issuer';
import { UpdateProfileUseCase } from './application/update-profile.use-case';
import { AccessTokens } from './domain/access-tokens';
import { AuthSettings } from './domain/auth-settings';
import { PasswordHasher } from './domain/password-hasher';
import { PasswordResetTokenRepository } from './domain/password-reset-token.repository';
import { RefreshTokenRepository } from './domain/refresh-token.repository';
import { UserRepository } from './domain/user.repository';
import { Argon2PasswordHasher } from './infrastructure/argon2-password-hasher';
import { JwtAccessTokens } from './infrastructure/jwt-access-tokens';
import { PrismaMembershipLookup } from './infrastructure/prisma-membership.lookup';
import { PrismaPasswordResetTokenRepository } from './infrastructure/prisma-password-reset-token.repository';
import { PrismaRefreshTokenRepository } from './infrastructure/prisma-refresh-token.repository';
import { PrismaUserRepository } from './infrastructure/prisma-user.repository';
import { AuthController } from './presentation/auth.controller';
import { CsrfHeaderGuard } from './presentation/csrf-header.guard';
import { JwtAuthGuard } from './presentation/jwt-auth.guard';
import { RefreshCookie } from './presentation/refresh-cookie';

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    {
      provide: AuthSettings,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        new AuthSettings(
          config.get('REFRESH_TOKEN_TTL_DAYS', { infer: true }),
          config.get('PASSWORD_RESET_TTL_MINUTES', { infer: true }),
          config.get('WEB_APP_URL', { infer: true }),
        ),
    },
    { provide: UserRepository, useClass: PrismaUserRepository },
    { provide: RefreshTokenRepository, useClass: PrismaRefreshTokenRepository },
    { provide: PasswordResetTokenRepository, useClass: PrismaPasswordResetTokenRepository },
    { provide: PasswordHasher, useClass: Argon2PasswordHasher },
    { provide: AccessTokens, useClass: JwtAccessTokens },
    PrismaMembershipLookup,
    SessionIssuer,
    RegisterUseCase,
    LoginUseCase,
    RefreshSessionUseCase,
    LogoutUseCase,
    RequestPasswordResetUseCase,
    ResetPasswordUseCase,
    UpdateProfileUseCase,
    GetCurrentUserQuery,
    RefreshCookie,
    CsrfHeaderGuard,
  ],
})
export class AuthModule {}
