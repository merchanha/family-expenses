import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, Req, Res, UseGuards } from '@nestjs/common';
import { SkipThrottle, ThrottlerGuard } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  updateProfileSchema,
  type AuthSessionResponse,
  type CurrentUserResponse,
  type ForgotPasswordInput,
  type LoginInput,
  type MessageResponse,
  type RegisterInput,
  type ResetPasswordInput,
  type UpdateProfileInput,
} from '@tandem/shared';
import type { AuthUserContext } from '../../../common/auth/auth-context';
import { AllowWithoutHousehold, CurrentUser, Public } from '../../../common/auth/auth.decorators';
import { ZodValidationPipe } from '../../../common/zod-validation.pipe';
import { GetCurrentUserQuery } from '../application/get-current-user.query';
import { LoginUseCase } from '../application/login.use-case';
import { LogoutUseCase } from '../application/logout.use-case';
import { RefreshSessionUseCase } from '../application/refresh-session.use-case';
import { RegisterUseCase } from '../application/register.use-case';
import { RequestPasswordResetUseCase } from '../application/request-password-reset.use-case';
import { ResetPasswordUseCase } from '../application/reset-password.use-case';
import type { IssuedSession } from '../application/session-issuer';
import { UpdateProfileUseCase } from '../application/update-profile.use-case';
import { InvalidRefreshTokenError } from '../domain/auth.errors';
import { CsrfHeaderGuard } from './csrf-header.guard';
import { RefreshCookie } from './refresh-cookie';

const RESET_REQUESTED: MessageResponse = {
  message: 'If an account exists for that email, we sent a link to reset the password.',
};

// Throttled routes use the strict 'auth' bucket; only refresh uses the looser 'refresh' bucket.
@SkipThrottle({ refresh: true })
@Controller('auth')
export class AuthController {
  constructor(
    private readonly registerUseCase: RegisterUseCase,
    private readonly loginUseCase: LoginUseCase,
    private readonly refreshUseCase: RefreshSessionUseCase,
    private readonly logoutUseCase: LogoutUseCase,
    private readonly requestResetUseCase: RequestPasswordResetUseCase,
    private readonly resetPasswordUseCase: ResetPasswordUseCase,
    private readonly updateProfileUseCase: UpdateProfileUseCase,
    private readonly currentUser: GetCurrentUserQuery,
    private readonly cookie: RefreshCookie,
  ) {}

  @Public()
  @UseGuards(ThrottlerGuard)
  @Post('register')
  async register(
    @Body(new ZodValidationPipe(registerSchema)) body: RegisterInput,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthSessionResponse> {
    return this.respondWithSession(res, await this.registerUseCase.execute(body));
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: LoginInput,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthSessionResponse> {
    return this.respondWithSession(res, await this.loginUseCase.execute(body));
  }

  @Public()
  @UseGuards(CsrfHeaderGuard, ThrottlerGuard)
  @SkipThrottle({ auth: true, refresh: false })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<AuthSessionResponse> {
    try {
      return await this.respondWithSession(res, await this.refreshUseCase.execute(this.cookie.read(req)));
    } catch (err) {
      if (err instanceof InvalidRefreshTokenError) this.cookie.clear(res);
      throw err;
    }
  }

  @Public()
  @UseGuards(CsrfHeaderGuard)
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response): Promise<void> {
    await this.logoutUseCase.execute(this.cookie.read(req));
    this.cookie.clear(res);
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Post('forgot-password')
  @HttpCode(HttpStatus.ACCEPTED)
  async forgotPassword(
    @Body(new ZodValidationPipe(forgotPasswordSchema)) body: ForgotPasswordInput,
  ): Promise<MessageResponse> {
    await this.requestResetUseCase.execute(body);
    return RESET_REQUESTED;
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Post('reset-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  async resetPassword(@Body(new ZodValidationPipe(resetPasswordSchema)) body: ResetPasswordInput): Promise<void> {
    await this.resetPasswordUseCase.execute(body);
  }

  @AllowWithoutHousehold()
  @Get('me')
  me(@CurrentUser() user: AuthUserContext): Promise<CurrentUserResponse> {
    return this.currentUser.execute(user.userId);
  }

  @AllowWithoutHousehold()
  @Patch('me')
  async updateMe(
    @CurrentUser() user: AuthUserContext,
    @Body(new ZodValidationPipe(updateProfileSchema)) body: UpdateProfileInput,
  ): Promise<CurrentUserResponse> {
    await this.updateProfileUseCase.execute(user, body);
    return this.currentUser.execute(user.userId);
  }

  private async respondWithSession(res: Response, session: IssuedSession): Promise<AuthSessionResponse> {
    this.cookie.set(res, session.refreshToken, session.refreshTokenExpiresAt);
    const current = await this.currentUser.execute(session.userId);
    return { ...current, accessToken: session.accessToken, expiresIn: session.expiresIn };
  }
}
