import { Injectable } from '@nestjs/common';
import type { UpdateProfileInput } from '@tandem/shared';
import type { AuthUserContext } from '../../../common/auth/auth-context';
import { UserNotFoundError } from '../domain/auth.errors';
import { UserRepository } from '../domain/user.repository';

@Injectable()
export class UpdateProfileUseCase {
  constructor(private readonly users: UserRepository) {}

  async execute(ctx: AuthUserContext, input: UpdateProfileInput): Promise<void> {
    if (!(await this.users.findById(ctx.userId))) throw new UserNotFoundError();
    await this.users.updateName(ctx.userId, input.name);
  }
}
