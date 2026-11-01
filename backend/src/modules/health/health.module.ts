import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { DatabasePing } from './application/database-ping';
import { PrismaDatabasePing } from './infrastructure/prisma-database-ping';
import { HealthController } from './presentation/health.controller';

@Module({
  // Terminus logs failures itself; the controller already logs them through pino.
  imports: [TerminusModule.forRoot({ logger: false })],
  controllers: [HealthController],
  providers: [{ provide: DatabasePing, useClass: PrismaDatabasePing }],
})
export class HealthModule {}
