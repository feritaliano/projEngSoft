import { Module } from '@nestjs/common';
import { AssetDirectory, BrokerDirectory } from './application/directories';
import { GetAsset } from './application/get-asset.use-case';
import { ListBrokers } from './application/list-brokers.use-case';
import { SearchAssets } from './application/search-assets.use-case';
import { AssetCatalog, BrokerCatalog } from './domain/catalog';
import { PrismaAssetCatalog } from './infrastructure/prisma-asset-catalog';
import { PrismaBrokerCatalog } from './infrastructure/prisma-broker-catalog';
import {
  AssetsController,
  BrokersController,
} from './presentation/reference-data.controller';

/**
 * Catalog (arquitetura 7.2). Read-only in S1: sectors, issuers, assets and brokers come from the seed. Other modules
 * read it only through AssetDirectory and BrokerDirectory.
 */
@Module({
  controllers: [AssetsController, BrokersController],
  providers: [
    SearchAssets,
    GetAsset,
    ListBrokers,
    AssetDirectory,
    BrokerDirectory,
    { provide: AssetCatalog, useClass: PrismaAssetCatalog },
    { provide: BrokerCatalog, useClass: PrismaBrokerCatalog },
  ],
  exports: [AssetDirectory, BrokerDirectory],
})
export class ReferenceDataModule {}
