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
import {
  notImplemented,
  ProblemException,
} from '../../../shared/presentation/problem-details';
import { ApiProblemResponse } from '../../../shared/presentation/problem-details.dto';
import { PortfolioNotFoundError } from '../../portfolios/domain/portfolio';
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

const UNTIL_K7 = 'S1+ (D64) contract: 501 until K7 implements it.';

/** B6, B7, D41: positions and totals derived from the operations (RN09). User data: never cached. */
@ApiTags('positions')
// PortfolioReturns is flattened into PortfolioPerformance; GET /portfolios references it by name.
@ApiExtraModels(PortfolioReturnsDto)
@Controller('portfolios/:id')
export class PositionsController {
  constructor(
    private readonly listPositions: ListPositions,
    private readonly getSummary: GetPortfolioSummary,
  ) {}

  @Get('positions')
  @ApiOperation({
    summary: 'Open and closed positions of a portfolio (B6, D41, RN12)',
    description:
      'Open (quantity > 0) and closed (quantity 0, realized profit ≠ 0) positions; a closed one with realized profit exactly 0 is not listed. Open positions first, their asset classes by total cost descending (market value from S2 on), a tie by the fixed order of AssetType; then closed positions by that fixed order; display name within a class (D63). 500 while the portfolio has a corporate event (traced from S2 on).',
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
    description:
      'Computed from the same rows as GET positions. 500 while the portfolio has a corporate event (traced from S2 on).',
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
    description: UNTIL_K7,
  })
  @Header('Cache-Control', 'no-store')
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: PortfolioAllocationDto })
  @ApiProblemResponse(HttpStatus.NOT_FOUND, PORTFOLIO_NOT_FOUND)
  @ApiProblemResponse(HttpStatus.NOT_IMPLEMENTED, UNTIL_K7)
  allocation(): PortfolioAllocationDto {
    throw notImplemented('K7');
  }

  @Get('evolution')
  @ApiOperation({
    summary: 'Equity and invested value over time (B11)',
    description: UNTIL_K7,
  })
  @Header('Cache-Control', 'no-store')
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: PortfolioEvolutionDto })
  @ApiProblemResponse(HttpStatus.NOT_FOUND, PORTFOLIO_NOT_FOUND)
  @ApiProblemResponse(HttpStatus.NOT_IMPLEMENTED, UNTIL_K7)
  evolution(): PortfolioEvolutionDto {
    throw notImplemented('K7');
  }

  @Get('performance')
  @ApiOperation({
    summary: 'TWR compared with CDI, Ibovespa and IPCA (B10)',
    description: UNTIL_K7,
  })
  @Header('Cache-Control', 'no-store')
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: PortfolioPerformanceDto })
  @ApiProblemResponse(HttpStatus.NOT_FOUND, PORTFOLIO_NOT_FOUND)
  @ApiProblemResponse(HttpStatus.NOT_IMPLEMENTED, UNTIL_K7)
  performance(): PortfolioPerformanceDto {
    throw notImplemented('K7');
  }
}
