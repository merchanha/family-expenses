import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { SkipThrottle, ThrottlerGuard } from '@nestjs/throttler';
import {
  acceptInviteSchema,
  z,
  type AcceptInviteInput,
  type CurrentHouseholdResponse,
  type InvitePreviewResponse,
} from '@tandem/shared';
import type { AuthUserContext } from '../../../common/auth/auth-context';
import { AllowWithoutHousehold, CurrentUser, Public } from '../../../common/auth/auth.decorators';
import { ZodValidationPipe } from '../../../common/zod-validation.pipe';
import { AcceptInviteUseCase } from '../application/accept-invite.use-case';
import { GetCurrentHouseholdQuery } from '../application/get-current-household.query';
import { PreviewInviteQuery } from '../application/preview-invite.query';

const tokenParamSchema = z.string().min(1).max(256);

@SkipThrottle({ refresh: true })
@Controller('invites')
export class InvitesController {
  constructor(
    private readonly acceptInvite: AcceptInviteUseCase,
    private readonly previewInvite: PreviewInviteQuery,
    private readonly currentHousehold: GetCurrentHouseholdQuery,
  ) {}

  @AllowWithoutHousehold()
  @Post('accept')
  @HttpCode(HttpStatus.OK)
  async accept(
    @CurrentUser() user: AuthUserContext,
    @Body(new ZodValidationPipe(acceptInviteSchema)) body: AcceptInviteInput,
  ): Promise<CurrentHouseholdResponse> {
    const householdId = await this.acceptInvite.execute(user, body);
    return this.currentHousehold.execute(householdId, user.userId);
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Get(':token')
  preview(@Param('token', new ZodValidationPipe(tokenParamSchema)) token: string): Promise<InvitePreviewResponse> {
    return this.previewInvite.execute(token);
  }
}
