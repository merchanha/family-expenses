import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import {
  createHouseholdSchema,
  createInviteSchema,
  updateHouseholdSchema,
  updateMyMemberSchema,
  z,
  type CreateHouseholdInput,
  type CreateInviteInput,
  type CreateInviteResponse,
  type CurrentHouseholdResponse,
  type UpdateHouseholdInput,
  type UpdateMyMemberInput,
} from '@tandem/shared';
import type { AuthUserContext, HouseholdContext } from '../../../common/auth/auth-context';
import { AllowWithoutHousehold, CurrentHousehold, CurrentUser } from '../../../common/auth/auth.decorators';
import { ZodValidationPipe } from '../../../common/zod-validation.pipe';
import { CreateHouseholdUseCase } from '../application/create-household.use-case';
import { CreateInviteUseCase } from '../application/create-invite.use-case';
import { GetCurrentHouseholdQuery } from '../application/get-current-household.query';
import { RevokeInviteUseCase } from '../application/revoke-invite.use-case';
import { UpdateHouseholdSettingsUseCase } from '../application/update-household-settings.use-case';
import { UpdateMyMemberUseCase } from '../application/update-my-member.use-case';
import { toInviteResponse } from '../infrastructure/household.mapper';

const idParamSchema = z.string().min(1).max(64);

/** The household is always the caller's own (from HouseholdContext) — never an id from the client. */
@Controller('households')
export class HouseholdsController {
  constructor(
    private readonly createHousehold: CreateHouseholdUseCase,
    private readonly updateSettings: UpdateHouseholdSettingsUseCase,
    private readonly updateMyMember: UpdateMyMemberUseCase,
    private readonly createInvite: CreateInviteUseCase,
    private readonly revokeInvite: RevokeInviteUseCase,
    private readonly currentHousehold: GetCurrentHouseholdQuery,
  ) {}

  @AllowWithoutHousehold()
  @Post()
  async create(
    @CurrentUser() user: AuthUserContext,
    @Body(new ZodValidationPipe(createHouseholdSchema)) body: CreateHouseholdInput,
  ): Promise<CurrentHouseholdResponse> {
    const householdId = await this.createHousehold.execute(user, body);
    return this.currentHousehold.execute(householdId, user.userId);
  }

  @Get('me')
  me(@CurrentHousehold() ctx: HouseholdContext): Promise<CurrentHouseholdResponse> {
    return this.currentHousehold.execute(ctx.householdId, ctx.userId);
  }

  @Patch('me')
  async update(
    @CurrentHousehold() ctx: HouseholdContext,
    @Body(new ZodValidationPipe(updateHouseholdSchema)) body: UpdateHouseholdInput,
  ): Promise<CurrentHouseholdResponse> {
    await this.updateSettings.execute(ctx, body);
    return this.currentHousehold.execute(ctx.householdId, ctx.userId);
  }

  @Patch('me/members/me')
  async updateMember(
    @CurrentHousehold() ctx: HouseholdContext,
    @Body(new ZodValidationPipe(updateMyMemberSchema)) body: UpdateMyMemberInput,
  ): Promise<CurrentHouseholdResponse> {
    await this.updateMyMember.execute(ctx, body);
    return this.currentHousehold.execute(ctx.householdId, ctx.userId);
  }

  @Post('me/invites')
  async invite(
    @CurrentHousehold() ctx: HouseholdContext,
    @Body(new ZodValidationPipe(createInviteSchema)) body: CreateInviteInput,
  ): Promise<CreateInviteResponse> {
    const { invite, inviteUrl } = await this.createInvite.execute(ctx, body);
    return { invite: toInviteResponse(invite), inviteUrl };
  }

  @Delete('me/invites/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async revoke(
    @CurrentHousehold() ctx: HouseholdContext,
    @Param('id', new ZodValidationPipe(idParamSchema)) id: string,
  ): Promise<void> {
    await this.revokeInvite.execute(ctx, id);
  }
}
