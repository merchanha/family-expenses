import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../config/env';
import { AcceptInviteUseCase } from './application/accept-invite.use-case';
import { CreateHouseholdUseCase } from './application/create-household.use-case';
import { CreateInviteUseCase } from './application/create-invite.use-case';
import { GetCurrentHouseholdQuery } from './application/get-current-household.query';
import { PreviewInviteQuery } from './application/preview-invite.query';
import { RevokeInviteUseCase } from './application/revoke-invite.use-case';
import { UpdateHouseholdSettingsUseCase } from './application/update-household-settings.use-case';
import { UpdateMyMemberUseCase } from './application/update-my-member.use-case';
import { HouseholdRepository } from './domain/household.repository';
import { HouseholdSettings } from './domain/household-settings';
import { InviteRepository } from './domain/invite.repository';
import { PrismaHouseholdRepository } from './infrastructure/prisma-household.repository';
import { PrismaInviteRepository } from './infrastructure/prisma-invite.repository';
import { HouseholdsController } from './presentation/households.controller';
import { InvitesController } from './presentation/invites.controller';

@Module({
  controllers: [HouseholdsController, InvitesController],
  providers: [
    {
      provide: HouseholdSettings,
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) =>
        new HouseholdSettings(config.get('INVITE_TTL_DAYS', { infer: true }), config.get('WEB_APP_URL', { infer: true })),
    },
    { provide: HouseholdRepository, useClass: PrismaHouseholdRepository },
    { provide: InviteRepository, useClass: PrismaInviteRepository },
    CreateHouseholdUseCase,
    UpdateHouseholdSettingsUseCase,
    UpdateMyMemberUseCase,
    CreateInviteUseCase,
    RevokeInviteUseCase,
    AcceptInviteUseCase,
    GetCurrentHouseholdQuery,
    PreviewInviteQuery,
  ],
})
export class HouseholdsModule {}
