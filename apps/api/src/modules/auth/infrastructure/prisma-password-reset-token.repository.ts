import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { PasswordResetTokenRecord, PasswordResetTokenRepository } from '../domain/password-reset-token.repository';

@Injectable()
export class PrismaPasswordResetTokenRepository extends PasswordResetTokenRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async replaceForUser(token: { userId: string; tokenHash: string; expiresAt: Date }, at: Date): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.passwordResetToken.updateMany({ where: { userId: token.userId, usedAt: null }, data: { usedAt: at } }),
      this.prisma.passwordResetToken.create({ data: token }),
    ]);
  }

  findByHash(tokenHash: string): Promise<PasswordResetTokenRecord | null> {
    return this.prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  }

  consumeAndSetPassword(tokenId: string, userId: string, passwordHash: string, at: Date): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.passwordResetToken.updateMany({
        where: { id: tokenId, userId, usedAt: null },
        data: { usedAt: at },
      });
      if (count === 0) return false;
      await tx.user.update({ where: { id: userId }, data: { passwordHash } });
      await tx.passwordResetToken.updateMany({ where: { userId, usedAt: null }, data: { usedAt: at } });
      await tx.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: at } });
      return true;
    });
  }
}
