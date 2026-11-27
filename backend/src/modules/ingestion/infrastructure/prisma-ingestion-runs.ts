import { Injectable } from '@nestjs/common';
import { LocalDate } from '../../../shared/domain/local-date';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { utcMidnight } from '../domain/business-days';
import {
  type IngestionSource,
  IngestionRuns,
  type RunEnd,
} from '../domain/ingestion-run';

export const ORPHAN_RUN_ERROR =
  'The worker stopped before finishing this run (closed by the next run of the source)';

const MAX_ERROR_LENGTH = 2000;

/** Error texts may quote bytes of a file: PostgreSQL refuses NUL in TEXT, and a whole line is enough. */
function sanitizedError(error: string): string {
  return error.replaceAll('\u0000', '').slice(0, MAX_ERROR_LENGTH);
}

/** The columns a closed run fills besides status and file. */
function endColumns(end: RunEnd) {
  switch (end.status) {
    case 'SUCCEEDED':
      return {
        referenceDate: utcMidnight(end.referenceDate),
        rowsRead: end.rowsRead,
        rowsWritten: end.rowsWritten,
        rowsRejected: end.rowsRejected,
      };
    case 'NO_FILE':
      return { referenceDate: utcMidnight(end.referenceDate) };
    case 'FAILED':
      return { error: sanitizedError(end.error) };
  }
}

/** ops.ingestion_runs through Prisma (BD-3). The CHECKs of the table hold the rules of each status. */
@Injectable()
export class PrismaIngestionRuns extends IngestionRuns {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  start(source: IngestionSource): Promise<string> {
    return this.prisma.$transaction(async (tx) => {
      await tx.ingestionRun.updateMany({
        where: { source, status: 'RUNNING' },
        data: {
          status: 'FAILED',
          error: ORPHAN_RUN_ERROR,
          finishedAt: new Date(),
        },
      });
      const run = await tx.ingestionRun.create({
        data: { source },
        select: { id: true },
      });
      return run.id;
    });
  }

  async loadedReferenceDate(
    source: IngestionSource,
    sha256: string,
  ): Promise<LocalDate | null> {
    const run = await this.prisma.ingestionRun.findFirst({
      where: { source, fileSha256: sha256, status: 'SUCCEEDED' },
      orderBy: { startedAt: 'desc' },
      select: { referenceDate: true },
    });
    // SUCCEEDED always has a reference date (CHECK ingestion_runs_succeeded_check).
    return run?.referenceDate
      ? LocalDate.parse(run.referenceDate.toISOString().slice(0, 10))
      : null;
  }

  async finish(runId: string, end: RunEnd): Promise<void> {
    const file = end.file && {
      fileName: end.file.name,
      fileSha256: end.file.sha256,
    };
    // Only a RUNNING run is closed: one already closed as an orphan by another process is not rewritten.
    const { count } = await this.prisma.ingestionRun.updateMany({
      where: { id: runId, status: 'RUNNING' },
      data: {
        status: end.status,
        ...file,
        ...endColumns(end),
        finishedAt: new Date(),
      },
    });
    if (count === 0) {
      throw new Error(
        `Ingestion run ${runId} is no longer RUNNING: another process closed it (advisory lock lost?)`,
      );
    }
  }

  async purgeUnsuccessfulBefore(before: Date): Promise<number> {
    const { count } = await this.prisma.ingestionRun.deleteMany({
      where: {
        status: { in: ['NO_FILE', 'FAILED'] },
        startedAt: { lt: before },
      },
    });
    return count;
  }
}
