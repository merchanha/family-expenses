import { Injectable } from '@nestjs/common';
import type { UpdateHouseholdInput } from '@tandem/shared';
import type { HouseholdContext } from '../../../common/auth/auth-context';
import { HouseholdRepository } from '../domain/household.repository';

/** Any member may change household settings (equal permissions, BUSINESS_RULES §1.2). */
@Injectable()
export class UpdateHouseholdSettingsUseCase {
  constructor(private readonly households: HouseholdRepository) {}

  async execute(ctx: HouseholdContext, input: UpdateHouseholdInput): Promise<void> {
    await this.households.update(ctx.householdId, input);
  }
}
