import { randomUUID } from 'node:crypto';
import {
  NewSession,
  SessionRepository,
  StoredSession,
} from '../../src/modules/auth/domain/session';

type Row = Omit<StoredSession, 'revokedAt'> & {
  revokedAt: Date | null;
  tokenHash: string;
};

/** SessionRepository in memory for unit tests, with the same rotate/revoke semantics as the Prisma one. */
export class InMemorySessionRepository extends SessionRepository {
  readonly rows: Row[] = [];

  create(session: NewSession): Promise<void> {
    this.rows.push({ ...session, id: randomUUID(), revokedAt: null });
    return Promise.resolve();
  }

  findByTokenHash(tokenHash: string): Promise<StoredSession | null> {
    return Promise.resolve(
      this.rows.find((row) => row.tokenHash === tokenHash) ?? null,
    );
  }

  async rotate(
    currentId: string,
    next: NewSession,
    now: Date,
  ): Promise<boolean> {
    const current = this.rows.find((row) => row.id === currentId);
    if (!current || current.revokedAt !== null) {
      return false;
    }
    current.revokedAt = now;
    await this.create(next);
    return true;
  }

  revokeFamily(familyId: string, now: Date): Promise<void> {
    for (const row of this.rows) {
      if (row.familyId === familyId && row.revokedAt === null) {
        row.revokedAt = now;
      }
    }
    return Promise.resolve();
  }

  active(): Row[] {
    return this.rows.filter((row) => row.revokedAt === null);
  }
}
