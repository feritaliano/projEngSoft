import { Controller, Get, Header, HttpStatus, Param } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthenticatedUser } from '../../../shared/presentation/auth-context';
import { CurrentUser } from '../../../shared/presentation/auth-context';
import { ProblemException } from '../../../shared/presentation/problem-details';
import { ApiProblemResponse } from '../../../shared/presentation/problem-details.dto';
import { PortfolioNotFoundError } from '../../portfolios/domain/portfolio';
import { GetPortfolioAllocation } from '../application/get-portfolio-allocation.use-case';
import { GetPortfolioHistory } from '../application/get-portfolio-history.use-case';
import { GetPortfolioSummary } from '../application/get-portfolio-summary.use-case';
import { ListPositions } from '../application/list-positions.use-case';
import {
  PortfolioAllocationDto,
  PortfolioEvolutionDto,
  PortfolioPerformanceDto,
  PortfolioReturnsDto,
} from './market.dto';
import { PortfolioSummaryDto, PositionDto } from './position.dto';

/** Anything but a missing portfolio propagates (500 by the global filter). */
function rethrowAsProblem(error: unknown): never {
  if (error instanceof PortfolioNotFoundError) {
    throw new ProblemException(HttpStatus.NOT_FOUND, 'Portfolio not found.');
  }
  throw error;
}

const PORTFOLIO_NOT_FOUND =
  'Portfolio not found, or it belongs to another user (RN02).';

const MARKET =
  'Market numbers from the last close loaded (marketData.closeDate, LatestCloseDate; a day without trading uses the previous close), COTAHIST not adjusted for splits (D64b); fixed income and crypto at cost (D55). 500 while the portfolio has a corporate event (S2).';

/** B6, B7, D41: positions and totals derived from the operations (RN09). User data: never cached. */
@ApiTags('positions')
// PortfolioReturns is flattened into PortfolioPerformance; GET /portfolios references it by name.
@ApiExtraModels(PortfolioReturnsDto)
@Controller('portfolios/:id')
export class PositionsController {
  constructor(
    private readonly listPositions: ListPositions,
    private readonly getSummary: GetPortfolioSummary,
    private readonly getAllocation: GetPortfolioAllocation,
    private readonly getHistory: GetPortfolioHistory,
  ) {}

  @Get('positions')
  @ApiOperation({
    summary: 'Open and closed positions of a portfolio (B6, D41, RN12)',
    description:
      'Open (quantity > 0) and closed (quantity 0, realized profit ≠ 0) positions; a closed one with realized profit exactly 0 is not listed. Open positions first, their asset classes by market value descending (D63, D64; at cost without quote), a tie by the fixed order of AssetType; then closed positions by that fixed order; display name within a class. ' +
      MARKET,
  })
  @Header('Cache-Control', 'no-store')
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: [PositionDto] })
  @ApiProblemResponse(HttpStatus.NOT_FOUND, PORTFOLIO_NOT_FOUND)
  async positions(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<PositionDto[]> {
    return this.listPositions.execute(user.id, id).catch(rethrowAsProblem);
  }

  @Get('summary')
  @ApiOperation({
    summary: 'Totals of a portfolio (B7)',
    description: 'Computed from the same rows as GET positions. ' + MARKET,
  })
  @Header('Cache-Control', 'no-store')
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: PortfolioSummaryDto })
  @ApiProblemResponse(HttpStatus.NOT_FOUND, PORTFOLIO_NOT_FOUND)
  async summary(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<PortfolioSummaryDto> {
    return this.getSummary.execute(user.id, id).catch(rethrowAsProblem);
  }

  @Get('allocation')
  @ApiOperation({
    summary: 'Allocation by asset class and by sector (B9)',
    description: MARKET,
  })
  @Header('Cache-Control', 'no-store')
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: PortfolioAllocationDto })
  @ApiProblemResponse(HttpStatus.NOT_FOUND, PORTFOLIO_NOT_FOUND)
  async allocation(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<PortfolioAllocationDto> {
    return this.getAllocation.execute(user.id, id).catch(rethrowAsProblem);
  }

  @Get('evolution')
  @ApiOperation({
    summary: 'Equity and invested value over time (B11)',
    description: MARKET,
  })
  @Header('Cache-Control', 'no-store')
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: PortfolioEvolutionDto })
  @ApiProblemResponse(HttpStatus.NOT_FOUND, PORTFOLIO_NOT_FOUND)
  async evolution(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<PortfolioEvolutionDto> {
    return this.getHistory.evolution(user.id, id).catch(rethrowAsProblem);
  }

  @Get('performance')
  @ApiOperation({
    summary: 'TWR compared with CDI, Ibovespa and IPCA (B10)',
    description: MARKET,
  })
  @Header('Cache-Control', 'no-store')
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: PortfolioPerformanceDto })
  @ApiProblemResponse(HttpStatus.NOT_FOUND, PORTFOLIO_NOT_FOUND)
  async performance(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<PortfolioPerformanceDto> {
    return this.getHistory.performance(user.id, id).catch(rethrowAsProblem);
  }
}
