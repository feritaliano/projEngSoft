import { Controller, Get, HttpStatus, Param, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InvalidValueError } from '../../../shared/domain/domain-error';
import {
  invalidValueProblem,
  ProblemException,
} from '../../../shared/presentation/problem-details';
import { ApiProblemResponse } from '../../../shared/presentation/problem-details.dto';
import { GetAsset } from '../application/get-asset.use-case';
import { ListBrokers } from '../application/list-brokers.use-case';
import { SearchAssets } from '../application/search-assets.use-case';
import { AssetNotFoundError } from '../domain/catalog';
import {
  AssetDto,
  AssetPageDto,
  AssetSearchQueryDto,
  BrokerDto,
} from './reference-data.dto';

/** Domain errors of the catalog as HTTP problems; anything else propagates (500 by the global filter). */
function toProblem(error: unknown): unknown {
  if (error instanceof AssetNotFoundError) {
    return new ProblemException(HttpStatus.NOT_FOUND, 'Asset not found.');
  }
  if (error instanceof InvalidValueError) {
    return invalidValueProblem(error);
  }
  return error;
}

function rethrowAsProblem(error: unknown): never {
  throw toProblem(error);
}

/** C1: catalog of assets, read-only in S1 (reference data from the seed). */
@ApiTags('reference-data')
@Controller('assets')
export class AssetsController {
  constructor(
    private readonly searchAssets: SearchAssets,
    private readonly getAsset: GetAsset,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Search the asset catalog (C1)' })
  @ApiOkResponse({ type: AssetPageDto })
  @ApiProblemResponse(
    HttpStatus.BAD_REQUEST,
    'Invalid query: errors[] names each parameter (search, page, pageSize).',
  )
  search(@Query() query: AssetSearchQueryDto): Promise<AssetPageDto> {
    return this.searchAssets.execute(query).catch(rethrowAsProblem);
  }

  @Get(':ticker')
  @ApiOperation({ summary: 'Get an asset by ticker (C1)' })
  @ApiOkResponse({ type: AssetDto })
  @ApiProblemResponse(HttpStatus.NOT_FOUND, 'No active asset with this ticker.')
  async get(@Param('ticker') ticker: string): Promise<AssetDto> {
    return this.getAsset.execute(ticker).catch(rethrowAsProblem);
  }
}

@ApiTags('reference-data')
@Controller('brokers')
export class BrokersController {
  constructor(private readonly listBrokers: ListBrokers) {}

  @Get()
  @ApiOperation({ summary: 'List brokers and exchanges (RN04, D9)' })
  @ApiOkResponse({ type: [BrokerDto] })
  list(): Promise<BrokerDto[]> {
    return this.listBrokers.execute();
  }
}
