import { Module } from '@nestjs/common';
import { Clock } from '../../shared/domain/clock';
import { SystemClock } from '../../shared/infrastructure/system-clock';
import { PortfoliosModule } from '../portfolios/portfolios.module';
import { ReferenceDataModule } from '../reference-data/reference-data.module';
import { CreateOperation } from './application/create-operation.use-case';
import { DeleteOperation } from './application/delete-operation.use-case';
import { GetOperation } from './application/get-operation.use-case';
import { ListOperations } from './application/list-operations.use-case';
import { OperationDetails } from './application/operation-details';
import { OperationDrafts } from './application/operation-drafts';
import { UpdateOperation } from './application/update-operation.use-case';
import { OperationHistory } from './domain/operation-history';
import { OperationStore } from './domain/operation-store';
import { PrismaOperationHistory } from './infrastructure/prisma-operation-history';
import { PrismaOperationStore } from './infrastructure/prisma-operation-store';
import { OperationsReadModule } from './operations-read.module';
import { OperationsController } from './presentation/operations.controller';

/**
 * Command side of operations (owns the operations table, arquitetura 7.2). Imports portfolios for ownership and the
 * catalog for assets and brokers; portfolios imports only OperationsReadModule, so there is no cycle.
 */
@Module({
  imports: [PortfoliosModule, OperationsReadModule, ReferenceDataModule],
  controllers: [OperationsController],
  providers: [
    ListOperations,
    GetOperation,
    CreateOperation,
    UpdateOperation,
    DeleteOperation,
    OperationDetails,
    OperationDrafts,
    { provide: OperationStore, useClass: PrismaOperationStore },
    { provide: OperationHistory, useClass: PrismaOperationHistory },
    { provide: Clock, useClass: SystemClock },
  ],
})
export class OperationsModule {}
