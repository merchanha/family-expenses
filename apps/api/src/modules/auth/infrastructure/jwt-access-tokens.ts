import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Env } from '../../../config/env';
import { AccessTokens, IssuedAccessToken } from '../domain/access-tokens';

@Injectable()
export class JwtAccessTokens extends AccessTokens {
  private readonly secret: string;
  private readonly ttlSeconds: number;

  constructor(
    private readonly jwt: JwtService,
    config: ConfigService<Env, true>,
  ) {
    super();
    this.secret = config.get('JWT_ACCESS_SECRET', { infer: true });
    this.ttlSeconds = config.get('JWT_ACCESS_TTL_SECONDS', { infer: true });
  }

  async issue(userId: string): Promise<IssuedAccessToken> {
    const accessToken = await this.jwt.signAsync(
      { sub: userId },
      { secret: this.secret, expiresIn: this.ttlSeconds, algorithm: 'HS256' },
    );
    return { accessToken, expiresIn: this.ttlSeconds };
  }

  async verify(token: string): Promise<{ userId: string } | null> {
    try {
      const payload = await this.jwt.verifyAsync<{ sub?: unknown }>(token, {
        secret: this.secret,
        algorithms: ['HS256'],
      });
      return typeof payload.sub === 'string' ? { userId: payload.sub } : null;
    } catch {
      return null;
    }
  }
}
