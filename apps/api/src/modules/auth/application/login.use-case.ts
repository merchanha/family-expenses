import { Injectable } from '@nestjs/common';
import type { LoginInput } from '@tandem/shared';
import { InvalidCredentialsError } from '../domain/auth.errors';
import { PasswordHasher } from '../domain/password-hasher';
import { UserRepository } from '../domain/user.repository';
import { IssuedSession, SessionIssuer } from './session-issuer';

@Injectable()
export class LoginUseCase {
  private dummyHash: Promise<string> | null = null;

  constructor(
    private readonly users: UserRepository,
    private readonly hasher: PasswordHasher,
    private readonly sessions: SessionIssuer,
  ) {}

  async execute(input: LoginInput): Promise<IssuedSession> {
    const user = await this.users.findByEmail(input.email);
    if (!user) {
      // Spend the same hashing time for unknown emails so response time doesn't reveal accounts.
      await this.hasher.verify(await this.getDummyHash(), input.password);
      throw new InvalidCredentialsError();
    }
    if (!(await this.hasher.verify(user.passwordHash, input.password))) throw new InvalidCredentialsError();
    return this.sessions.start(user.id);
  }

  private getDummyHash(): Promise<string> {
    this.dummyHash ??= this.hasher.hash('tandem-dummy-password-for-timing');
    return this.dummyHash;
  }
}
