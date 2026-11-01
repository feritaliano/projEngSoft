import { Module } from '@nestjs/common';
import { apiEnvSchema } from './config/env';
import { validatedConfigModule } from './config/config.module';
import { HealthModule } from './modules/health/health.module';
import { LoggingModule } from './shared/infrastructure/logging/logging.module';
import { PrismaModule } from './shared/infrastructure/prisma/prisma.module';

/** Root module of the HTTP process (main.api.ts, D24). */
@Module({
  imports: [
    validatedConfigModule(apiEnvSchema),
    LoggingModule,
    PrismaModule,
    HealthModule,
  ],
})
export class ApiModule {}
