import { Module } from '@nestjs/common';
import {
  IndexValueReader,
  IndexValueWriter,
  LatestCloseDate,
  QuoteReader,
  QuoteWriter,
} from './domain/market-data';
import {
  PrismaIndexValueReader,
  PrismaIndexValueWriter,
  PrismaLatestCloseDate,
  PrismaQuoteReader,
  PrismaQuoteWriter,
} from './infrastructure/prisma-market-data';

/**
 * Quotes and indexes (arquitetura 7.2; brought into S1+ by D64). Written only by the ingestion (K6), through
 * QuoteWriter and IndexValueWriter; read by K7 and K8 through LatestCloseDate, QuoteReader and IndexValueReader.
 */
@Module({
  providers: [
    { provide: QuoteWriter, useClass: PrismaQuoteWriter },
    { provide: IndexValueWriter, useClass: PrismaIndexValueWriter },
    { provide: LatestCloseDate, useClass: PrismaLatestCloseDate },
    { provide: QuoteReader, useClass: PrismaQuoteReader },
    { provide: IndexValueReader, useClass: PrismaIndexValueReader },
  ],
  exports: [
    QuoteWriter,
    IndexValueWriter,
    LatestCloseDate,
    QuoteReader,
    IndexValueReader,
  ],
})
export class MarketDataModule {}
