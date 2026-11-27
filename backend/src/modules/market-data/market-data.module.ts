import { Module } from '@nestjs/common';
import {
  IndexValueWriter,
  LatestCloseDate,
  QuoteWriter,
} from './domain/market-data';
import {
  PrismaIndexValueWriter,
  PrismaLatestCloseDate,
  PrismaQuoteWriter,
} from './infrastructure/prisma-market-data';

/**
 * Quotes and indexes (arquitetura 7.2; brought into S1+ by D64). Written only by the ingestion (K6), through
 * QuoteWriter and IndexValueWriter; LatestCloseDate is the date of the last close for K7 and K8.
 */
@Module({
  providers: [
    { provide: QuoteWriter, useClass: PrismaQuoteWriter },
    { provide: IndexValueWriter, useClass: PrismaIndexValueWriter },
    { provide: LatestCloseDate, useClass: PrismaLatestCloseDate },
  ],
  exports: [QuoteWriter, IndexValueWriter, LatestCloseDate],
})
export class MarketDataModule {}
