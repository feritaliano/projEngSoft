import { Module } from '@nestjs/common';
import { Clock } from '../../shared/domain/clock';
import { SystemClock } from '../../shared/infrastructure/system-clock';
import { MarketDataModule } from '../market-data/market-data.module';
import { ReferenceDataModule } from '../reference-data/reference-data.module';
import { OperationDetails } from './application/operation-details';
import { PortfolioValuation } from './application/portfolio-valuation';
import { TimelineReader } from './domain/timeline-reader';
import { PrismaTimelineReader } from './infrastructure/prisma-timeline-reader';

/**
 * What the portfolios module needs from operations (PortfolioValuation: open positions, equity and returns of each
 * portfolio), and the readers OperationsModule shares. Split from OperationsModule, which imports portfolios for
 * ownership: portfolios imports only this one, so there is no cycle.
 */
@Module({
  imports: [ReferenceDataModule, MarketDataModule],
  providers: [
    PortfolioValuation,
    OperationDetails,
    { provide: TimelineReader, useClass: PrismaTimelineReader },
    { provide: Clock, useClass: SystemClock },
  ],
  exports: [PortfolioValuation, OperationDetails, TimelineReader],
})
export class OperationsReadModule {}
