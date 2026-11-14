import { Injectable } from '@nestjs/common';
import type { UpdateMyMemberInput } from '@tandem/shared';
import type { HouseholdContext } from '../../../common/auth/auth-context';
import { HouseholdRepository } from '../domain/household.repository';

/** A member edits only their own partner display (name/color). */
@Injectable()
export class UpdateMyMemberUseCase {
  constructor(private readonly households: HouseholdRepository) {}

  async execute(ctx: HouseholdContext, input: UpdateMyMemberInput): Promise<void> {
    await this.households.updateMember(ctx.householdId, ctx.userId, input);
  }
}
