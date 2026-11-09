import { Module } from '@nestjs/common';
import { CountOpenPositions } from './application/count-open-positions';
import { TimelineReader } from './domain/timeline-reader';
import { PrismaTimelineReader } from './infrastructure/prisma-timeline-reader';

/**
 * Read side of the operations module (positions derived from the timeline). Separate from the command side (K4),
 * which will import the portfolios module for ownership: portfolios imports only this one, so there is no cycle.
 */
@Module({
  providers: [
    CountOpenPositions,
    { provide: TimelineReader, useClass: PrismaTimelineReader },
  ],
  exports: [CountOpenPositions],
})
export class OperationsReadModule {}
