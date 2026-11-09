import { Module } from '@nestjs/common';
import { OperationsReadModule } from '../operations/operations-read.module';
import { CreatePortfolio } from './application/create-portfolio.use-case';
import { DeletePortfolio } from './application/delete-portfolio.use-case';
import { GetOwnedPortfolio } from './application/get-owned-portfolio.use-case';
import { ListPortfolios } from './application/list-portfolios.use-case';
import { PortfolioRepository } from './domain/portfolio';
import { PrismaPortfolioRepository } from './infrastructure/prisma-portfolio.repository';
import { PortfoliosController } from './presentation/portfolios.controller';

/** Owns the portfolios table (arquitetura 7.2). GetOwnedPortfolio is the ownership check other modules use (K4). */
@Module({
  imports: [OperationsReadModule],
  controllers: [PortfoliosController],
  providers: [
    ListPortfolios,
    GetOwnedPortfolio,
    CreatePortfolio,
    DeletePortfolio,
    { provide: PortfolioRepository, useClass: PrismaPortfolioRepository },
  ],
  exports: [GetOwnedPortfolio],
})
export class PortfoliosModule {}
