import { Injectable } from '@nestjs/common';
import type { RegisterInput } from '@tandem/shared';
import { EmailAlreadyRegisteredError } from '../domain/auth.errors';
import { PasswordHasher } from '../domain/password-hasher';
import { UserRepository } from '../domain/user.repository';
import { IssuedSession, SessionIssuer } from './session-issuer';

@Injectable()
export class RegisterUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly sessions: SessionIssuer,
  ) {}

  async execute(input: RegisterInput): Promise<IssuedSession> {
    if (await this.users.findByEmail(input.email)) throw new EmailAlreadyRegisteredError();
    const passwordHash = await this.hasher.hash(input.password);
    const user = await this.users.create({ name: input.name, email: input.email, passwordHash });
    return this.sessions.start(user.id);
  }
}
