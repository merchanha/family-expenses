import { Injectable } from '@nestjs/common';
import { DEFAULT_CURRENCY, DEFAULT_TIMEZONE, PARTNER_COLORS, type CreateHouseholdInput } from '@tandem/shared';
import type { AuthUserContext } from '../../../common/auth/auth-context';
import { AlreadyInHouseholdError } from '../domain/household.errors';
import { HouseholdRepository } from '../domain/household.repository';

/** Creates the Shared Space; the creator becomes OWNER / PARTNER_1. Split defaults to 50/50 (DB default). */
@Injectable()
export class CreateHouseholdUseCase {
  constructor(private readonly households: HouseholdRepository) {}

  async execute(ctx: AuthUserContext, input: CreateHouseholdInput): Promise<string> {
    if (await this.households.findHouseholdIdOfUser(ctx.userId)) throw new AlreadyInHouseholdError();
    return this.households.createWithOwner({
      name: input.name,
      defaultCurrency: input.defaultCurrency ?? DEFAULT_CURRENCY,
      timezone: input.timezone ?? DEFAULT_TIMEZONE,
      owner: {
        userId: ctx.userId,
        role: 'OWNER',
        partnerSlot: 'PARTNER_1',
        displayName: input.displayName ?? null,
        displayColor: PARTNER_COLORS.PARTNER_1,
      },
    });
  }
}
