import { Module } from '@nestjs/common';
import { CountOpenPositions } from './application/count-open-positions';
import { TimelineReader } from './domain/timeline-reader';
import { PrismaTimelineReader } from './infrastructure/prisma-timeline-reader';

/**
 * What the portfolios module needs from operations (CountOpenPositions, and TimelineReader for OperationsModule). Split
 * from OperationsModule, which imports portfolios for ownership: portfolios imports only this one, so there is no cycle.
 */
@Module({
  providers: [
    CountOpenPositions,
    { provide: TimelineReader, useClass: PrismaTimelineReader },
  ],
  exports: [CountOpenPositions, TimelineReader],
})
export class OperationsReadModule {}
