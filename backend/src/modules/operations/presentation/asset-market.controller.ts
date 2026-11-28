import { Controller, Get, HttpStatus, Param, Query } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { notImplemented } from '../../../shared/presentation/problem-details';
import { ApiProblemResponse } from '../../../shared/presentation/problem-details.dto';
import {
  AssetPerformanceDto,
  AssetPeriodQueryDto,
  AssetQuotesDto,
} from './market.dto';

const UNTIL_K8 = 'S1+ (D64) contract: 501 until K8 implements it.';
const NOT_FOUND =
  'No active asset with this ticker (fixed income has no ticker: no asset page until S11).';
const INVALID_PERIOD =
  'Invalid query: errors[] with field period and INVALID_VALUE (D56).';

/** C2, C3: asset page with market data (D64), for authenticated users only (D59). Never a file (D59b). */
@ApiTags('market-data')
@Controller('assets/:ticker')
export class AssetMarketController {
  @Get('quotes')
  @ApiOperation({
    summary: 'Last close, day change and closes of a window (C2)',
    description: UNTIL_K8,
  })
  @ApiParam({ name: 'ticker', example: 'PETR4' })
  @ApiOkResponse({ type: AssetQuotesDto })
  @ApiProblemResponse(HttpStatus.BAD_REQUEST, INVALID_PERIOD)
  @ApiProblemResponse(HttpStatus.NOT_FOUND, NOT_FOUND)
  @ApiProblemResponse(HttpStatus.NOT_IMPLEMENTED, UNTIL_K8)
  quotes(
    @Param('ticker') _ticker: string,
    @Query() _query: AssetPeriodQueryDto,
  ): AssetQuotesDto {
    throw notImplemented('K8');
  }

  @Get('performance')
  @ApiOperation({
    summary: 'Return of the asset compared with CDI, Ibovespa and IPCA (C3)',
    description: UNTIL_K8,
  })
  @ApiParam({ name: 'ticker', example: 'BOVA11' })
  @ApiOkResponse({ type: AssetPerformanceDto })
  @ApiProblemResponse(HttpStatus.BAD_REQUEST, INVALID_PERIOD)
  @ApiProblemResponse(HttpStatus.NOT_FOUND, NOT_FOUND)
  @ApiProblemResponse(HttpStatus.NOT_IMPLEMENTED, UNTIL_K8)
  performance(
    @Param('ticker') _ticker: string,
    @Query() _query: AssetPeriodQueryDto,
  ): AssetPerformanceDto {
    throw notImplemented('K8');
  }
}
