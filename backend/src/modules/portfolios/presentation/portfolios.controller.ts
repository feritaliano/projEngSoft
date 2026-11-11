import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { InvalidValueError } from '../../../shared/domain/domain-error';
import type { AuthenticatedUser } from '../../../shared/presentation/auth-context';
import { CurrentUser } from '../../../shared/presentation/auth-context';
import {
  alreadyExistsProblem,
  invalidValueProblem,
  ProblemException,
} from '../../../shared/presentation/problem-details';
import {
  ApiProblemResponse,
  badRequestExample,
} from '../../../shared/presentation/problem-details.dto';
import { API_PREFIX } from '../../../shared/presentation/api-prefix';
import { CreatePortfolio } from '../application/create-portfolio.use-case';
import { DeletePortfolio } from '../application/delete-portfolio.use-case';
import { GetOwnedPortfolio } from '../application/get-owned-portfolio.use-case';
import { ListPortfolios } from '../application/list-portfolios.use-case';
import {
  PortfolioNameTakenError,
  PortfolioNotFoundError,
} from '../domain/portfolio';
import { CreatePortfolioDto, PortfolioDto } from './portfolio.dto';

/** Domain errors of the portfolios flow as HTTP problems; anything else propagates (500 by the global filter). */
function toProblem(error: unknown): unknown {
  if (error instanceof PortfolioNotFoundError) {
    return new ProblemException(HttpStatus.NOT_FOUND, 'Portfolio not found.');
  }
  if (error instanceof PortfolioNameTakenError) {
    return alreadyExistsProblem(
      'name',
      'A portfolio with this name already exists.',
    );
  }
  if (error instanceof InvalidValueError) {
    return invalidValueProblem(error);
  }
  return error;
}

function rethrowAsProblem(error: unknown): never {
  throw toProblem(error);
}

const NOT_FOUND = 'Portfolio not found, or it belongs to another user (RN02).';

/** B1, RN02. User data: never cached. Ownership is checked in the use cases, by the authenticated user's id. */
@ApiTags('portfolios')
@Controller('portfolios')
export class PortfoliosController {
  constructor(
    private readonly listPortfolios: ListPortfolios,
    private readonly getOwnedPortfolio: GetOwnedPortfolio,
    private readonly createPortfolio: CreatePortfolio,
    private readonly deletePortfolio: DeletePortfolio,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List the portfolios of the user (B1)' })
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: [PortfolioDto] })
  async list(@CurrentUser() user: AuthenticatedUser): Promise<PortfolioDto[]> {
    return this.listPortfolios.execute(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a portfolio of the user (RN02)' })
  @Header('Cache-Control', 'no-store')
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: PortfolioDto })
  @ApiProblemResponse(HttpStatus.NOT_FOUND, NOT_FOUND)
  async get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<PortfolioDto> {
    return this.getOwnedPortfolio.execute(user.id, id).catch(rethrowAsProblem);
  }

  @Post()
  @ApiOperation({ summary: 'Create a portfolio (B1, RN02)' })
  @Header('Cache-Control', 'no-store')
  @ApiCreatedResponse({ type: PortfolioDto })
  @ApiProblemResponse(
    HttpStatus.BAD_REQUEST,
    'Invalid body: errors[] names each field and why (D56): name REQUIRED, TOO_LONG or INVALID_VALUE (control characters); a field that should not exist is INVALID_VALUE.',
    {
      example: badRequestExample(`/${API_PREFIX}/portfolios`, [
        {
          field: 'name',
          code: 'TOO_LONG',
          message: 'name must have at most 150 characters',
          params: { max: 150 },
        },
      ]),
    },
  )
  @ApiProblemResponse(
    HttpStatus.CONFLICT,
    'The user already has a portfolio with this name: field name, and errors[] with ALREADY_EXISTS (D56).',
  )
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: CreatePortfolioDto,
  ): Promise<PortfolioDto> {
    return this.createPortfolio
      .execute(user.id, body.name)
      .catch(rethrowAsProblem);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a portfolio and its operations (B1, D41)',
  })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiNoContentResponse({
    description: 'Deleted, with its operations (ON DELETE CASCADE).',
  })
  @ApiProblemResponse(HttpStatus.NOT_FOUND, NOT_FOUND)
  async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<void> {
    await this.deletePortfolio.execute(user.id, id).catch(rethrowAsProblem);
  }
}
