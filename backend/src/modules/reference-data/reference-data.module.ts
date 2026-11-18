import { Module } from '@nestjs/common';
import { AssetDirectory, BrokerDirectory } from './application/directories';
import { GetAsset } from './application/get-asset.use-case';
import { ListBrokers } from './application/list-brokers.use-case';
import { SearchAssets } from './application/search-assets.use-case';
import { AssetCatalog, BrokerCatalog } from './domain/catalog';
import { CatalogWriter } from './domain/catalog-entry';
import { PrismaAssetCatalog } from './infrastructure/prisma-asset-catalog';
import { PrismaBrokerCatalog } from './infrastructure/prisma-broker-catalog';
import { PrismaCatalogWriter } from './infrastructure/prisma-catalog-writer';
import {
  AssetsController,
  BrokersController,
} from './presentation/reference-data.controller';

/**
 * Catalog (arquitetura 7.2). Read-only for the API in S1: sectors and brokers come from the seed; issuers and assets
 * from the seed and the B3 catalog load (K5, through CatalogWriter). Other modules read it only through AssetDirectory
 * and BrokerDirectory.
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
    { provide: CatalogWriter, useClass: PrismaCatalogWriter },
  ],
  exports: [AssetDirectory, BrokerDirectory, CatalogWriter],
})
export class ReferenceDataModule {}
