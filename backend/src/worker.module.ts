import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { workerEnvSchema } from './config/env';
import { validatedConfigModule } from './config/config.module';
import { IngestionModule } from './modules/ingestion/ingestion.module';
import { Clock } from './shared/domain/clock';
import { LoggingModule } from './shared/infrastructure/logging/logging.module';
import { PrismaModule } from './shared/infrastructure/prisma/prisma.module';
import { SystemClock } from './shared/infrastructure/system-clock';
import { DailyIngestionScheduler } from './worker/daily-ingestion.scheduler';

/**
 * Root module of the worker process (main.worker.ts, D24): the daily ingestion of quotes and indexes (K6). Its pending
 * timer keeps the process alive.
 */
@Module({
  imports: [
    validatedConfigModule(workerEnvSchema),
    LoggingModule,
    PrismaModule,
    ScheduleModule.forRoot(),
    IngestionModule,
  ],
  providers: [
    DailyIngestionScheduler,
    { provide: Clock, useClass: SystemClock },
  ],
})
export class WorkerModule {}
