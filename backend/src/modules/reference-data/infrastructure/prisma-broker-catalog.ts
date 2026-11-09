import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { Broker, BrokerCatalog } from '../domain/catalog';

@Injectable()
export class PrismaBrokerCatalog extends BrokerCatalog {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  list(): Promise<Broker[]> {
    return this.prisma.broker.findMany({
      select: { id: true, name: true, cnpj: true },
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
    });
  }
}
