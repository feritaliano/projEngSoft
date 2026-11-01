import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { DatabasePing } from '../application/database-ping';

@Injectable()
export class PrismaDatabasePing extends DatabasePing {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async ping(): Promise<void> {
    await this.prisma.$queryRaw`SELECT 1`;
  }
}
