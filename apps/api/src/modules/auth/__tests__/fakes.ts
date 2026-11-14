import { AccessTokens, IssuedAccessToken } from '../domain/access-tokens';
import { EmailAlreadyRegisteredError } from '../domain/auth.errors';
import { PasswordHasher } from '../domain/password-hasher';
import { PasswordResetTokenRecord, PasswordResetTokenRepository } from '../domain/password-reset-token.repository';
import { NewRefreshToken, RefreshTokenRecord, RefreshTokenRepository } from '../domain/refresh-token.repository';
import type { User } from '../domain/user';
import { NewUser, UserRepository } from '../domain/user.repository';

let seq = 0;
const id = (p: string) => `${p}_${++seq}`;

export class InMemoryUserRepository extends UserRepository {
  readonly rows = new Map<string, User>();
  async findByEmail(email: string) {
    return [...this.rows.values()].find((u) => u.email === email) ?? null;
  }
  async findById(userId: string) {
    return this.rows.get(userId) ?? null;
  }
  async create(user: NewUser) {
    if (await this.findByEmail(user.email)) throw new EmailAlreadyRegisteredError();
    const row: User = { ...user, id: id('user'), createdAt: new Date() };
    this.rows.set(row.id, row);
    return row;
  }
  async updateName(userId: string, name: string) {
    const row = { ...this.rows.get(userId)!, name };
    this.rows.set(userId, row);
    return row;
  }
}

export class InMemoryRefreshTokenRepository extends RefreshTokenRepository {
  readonly rows: RefreshTokenRecord[] = [];
  async create(token: NewRefreshToken) {
    const row: RefreshTokenRecord = { ...token, id: id('rt'), revokedAt: null, replacedById: null, createdAt: new Date() };
    this.rows.push(row);
    return row;
  }
  async findByHash(tokenHash: string) {
    return this.rows.find((r) => r.tokenHash === tokenHash) ?? null;
  }
  async rotate(currentId: string, replacement: NewRefreshToken, at: Date) {
    const current = this.rows.find((r) => r.id === currentId);
    if (!current || current.revokedAt) return null;
    current.revokedAt = at;
    const next = await this.create(replacement);
    current.replacedById = next.id;
    return next;
  }
  async revokeFamily(familyId: string, at: Date) {
    this.rows.filter((r) => r.familyId === familyId && !r.revokedAt).forEach((r) => (r.revokedAt = at));
  }
  revokeAllForUser(userId: string, at: Date) {
    this.rows.filter((r) => r.userId === userId && !r.revokedAt).forEach((r) => (r.revokedAt = at));
  }
}

export class InMemoryPasswordResetTokenRepository extends PasswordResetTokenRepository {
  readonly rows: PasswordResetTokenRecord[] = [];
  constructor(
    private readonly users: InMemoryUserRepository,
    private readonly refreshTokens: InMemoryRefreshTokenRepository,
  ) {
    super();
  }
  async replaceForUser(token: { userId: string; tokenHash: string; expiresAt: Date }, at: Date) {
    this.rows.filter((r) => r.userId === token.userId && !r.usedAt).forEach((r) => (r.usedAt = at));
    this.rows.push({ ...token, id: id('prt'), usedAt: null });
  }
  async findByHash(tokenHash: string) {
    return this.rows.find((r) => r.tokenHash === tokenHash) ?? null;
  }
  async consumeAndSetPassword(tokenId: string, userId: string, passwordHash: string, at: Date) {
    const token = this.rows.find((r) => r.id === tokenId && r.userId === userId);
    if (!token || token.usedAt) return false;
    token.usedAt = at;
    const user = this.users.rows.get(userId)!;
    this.users.rows.set(userId, { ...user, passwordHash });
    this.rows.filter((r) => r.userId === userId && !r.usedAt).forEach((r) => (r.usedAt = at));
    this.refreshTokens.revokeAllForUser(userId, at);
    return true;
  }
}

/** Reversible "hash" — fast and deterministic for unit tests. */
export class FakePasswordHasher extends PasswordHasher {
  async hash(plain: string) {
    return `hashed:${plain}`;
  }
  async verify(hash: string, plain: string) {
    return hash === `hashed:${plain}`;
  }
}

export class FakeAccessTokens extends AccessTokens {
  async issue(userId: string): Promise<IssuedAccessToken> {
    return { accessToken: `access:${userId}`, expiresIn: 900 };
  }
  async verify(token: string) {
    return token.startsWith('access:') ? { userId: token.slice(7) } : null;
  }
}
