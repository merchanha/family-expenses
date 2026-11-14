import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { NewRefreshToken, RefreshTokenRecord, RefreshTokenRepository } from '../domain/refresh-token.repository';

@Injectable()
export class PrismaRefreshTokenRepository extends RefreshTokenRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  create(token: NewRefreshToken): Promise<RefreshTokenRecord> {
    return this.prisma.refreshToken.create({ data: token });
  }

  findByHash(tokenHash: string): Promise<RefreshTokenRecord | null> {
    return this.prisma.refreshToken.findUnique({ where: { tokenHash } });
  }

  rotate(currentId: string, replacement: NewRefreshToken, at: Date): Promise<RefreshTokenRecord | null> {
    return this.prisma.$transaction(async (tx) => {
      // Conditional update = compare-and-set: only one concurrent caller can win.
      const { count } = await tx.refreshToken.updateMany({
        where: { id: currentId, revokedAt: null },
        data: { revokedAt: at },
      });
      if (count === 0) return null;
      const next = await tx.refreshToken.create({ data: replacement });
      await tx.refreshToken.update({ where: { id: currentId }, data: { replacedById: next.id } });
      return next;
    });
  }

  async revokeFamily(familyId: string, at: Date): Promise<void> {
    await this.prisma.refreshToken.updateMany({ where: { familyId, revokedAt: null }, data: { revokedAt: at } });
  }
}
