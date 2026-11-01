import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import {
  NewSession,
  SessionRepository,
  StoredSession,
  TokenHash,
} from '../domain/session';

@Injectable()
export class PrismaSessionRepository extends SessionRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(session: NewSession): Promise<void> {
    await this.prisma.userSession.create({ data: session });
  }

  findByTokenHash(tokenHash: TokenHash): Promise<StoredSession | null> {
    return this.prisma.userSession.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        userId: true,
        familyId: true,
        expiresAt: true,
        revokedAt: true,
      },
    });
  }

  rotate(currentId: string, next: NewSession, now: Date): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      // Conditional update: only one of two concurrent refreshes with the same token revokes it.
      const revoked = await tx.userSession.updateMany({
        where: { id: currentId, revokedAt: null },
        data: { revokedAt: now },
      });
      if (revoked.count === 0) {
        return false;
      }
      await tx.userSession.create({ data: next });
      return true;
    });
  }

  async revokeFamily(familyId: string, now: Date): Promise<void> {
    await this.prisma.userSession.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: now },
    });
  }
}
