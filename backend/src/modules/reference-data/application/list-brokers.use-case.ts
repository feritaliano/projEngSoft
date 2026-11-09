import { Injectable } from '@nestjs/common';
import { Broker, BrokerCatalog } from '../domain/catalog';

/** RN04/D9: every operation names a broker; the operation form lists them. */
@Injectable()
export class ListBrokers {
  constructor(private readonly brokers: BrokerCatalog) {}

  execute(): Promise<Broker[]> {
    return this.brokers.list();
  }
}
