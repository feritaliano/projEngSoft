import { Module } from '@nestjs/common';
import { apiEnvSchema } from './config/env';
import { validatedConfigModule } from './config/config.module';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { OperationsModule } from './modules/operations/operations.module';
import { PortfoliosModule } from './modules/portfolios/portfolios.module';
import { ReferenceDataModule } from './modules/reference-data/reference-data.module';
import { LoggingModule } from './shared/infrastructure/logging/logging.module';
import { PrismaModule } from './shared/infrastructure/prisma/prisma.module';

/** Root module of the HTTP process (main.api.ts, D24). */
@Module({
  imports: [
    validatedConfigModule(apiEnvSchema),
    LoggingModule,
    PrismaModule,
    HealthModule,
    AuthModule,
    ReferenceDataModule,
    PortfoliosModule,
    OperationsModule,
  ],
})
export class ApiModule {}
