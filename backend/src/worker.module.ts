import { Module } from '@nestjs/common';
import { workerEnvSchema } from './config/env';
import { validatedConfigModule } from './config/config.module';
import { LoggingModule } from './shared/infrastructure/logging/logging.module';
import { PrismaModule } from './shared/infrastructure/prisma/prisma.module';
import { WorkerHeartbeat } from './worker/worker-heartbeat';

/** Root module of the worker process (main.worker.ts, D24): scheduler, ingestion and gold refresh from S2 on. */
@Module({
  imports: [
    validatedConfigModule(workerEnvSchema),
    LoggingModule,
    PrismaModule,
  ],
  providers: [WorkerHeartbeat],
})
export class WorkerModule {}
