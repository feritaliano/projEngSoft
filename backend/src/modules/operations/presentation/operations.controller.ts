import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
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
  invalidValueProblem,
  ProblemException,
} from '../../../shared/presentation/problem-details';
import {
  ApiProblemResponse,
  badRequestExample,
} from '../../../shared/presentation/problem-details.dto';
import { API_PREFIX } from '../../../shared/presentation/api-prefix';
import { PortfolioNotFoundError } from '../../portfolios/domain/portfolio';
import { CreateOperation } from '../application/create-operation.use-case';
import { DeleteOperation } from '../application/delete-operation.use-case';
import { GetOperation } from '../application/get-operation.use-case';
import { ListOperations } from '../application/list-operations.use-case';
import { OperationRejectedError } from '../application/operation-details';
import { UpdateOperation } from '../application/update-operation.use-case';
import { DEFAULT_HISTORY_PAGE_SIZE } from '../domain/operation-history';
import { OperationNotFoundError } from '../domain/operation';
import {
  CreateOperationDto,
  ListOperationsQueryDto,
  OperationDto,
  OperationPageDto,
  RuleViolationProblemDto,
  UpdateOperationDto,
} from './operation.dto';

const VIOLATION_DETAIL = {
  RN07: 'The sell exceeds the position held at its date (RN07). Nothing was saved.',
  RN10: 'The change would make a later sell exceed the position held at its date (RN10). Nothing was saved.',
} as const;

/** Domain errors of the operations flow as HTTP problems; anything else propagates (500 by the global filter). */
function toProblem(error: unknown): unknown {
  if (error instanceof PortfolioNotFoundError) {
    return new ProblemException(HttpStatus.NOT_FOUND, 'Portfolio not found.');
  }
  if (error instanceof OperationNotFoundError) {
    return new ProblemException(HttpStatus.NOT_FOUND, 'Operation not found.');
  }
  if (error instanceof OperationRejectedError) {
    return new ProblemException(
      HttpStatus.UNPROCESSABLE_ENTITY,
      VIOLATION_DETAIL[error.violation.rule],
      { violation: error.violation },
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

const PORTFOLIO_NOT_FOUND =
  'Portfolio not found, or it belongs to another user (RN02).';
const OPERATION_NOT_FOUND =
  'Portfolio or operation not found, or they belong to another user (RN02).';
const INVALID_BODY =
  'Invalid body: errors[] names each field and why (D56). assetId, brokerId: REQUIRED, INVALID_FORMAT, NOT_FOUND. type: REQUIRED, INVALID_VALUE. tradeDate: REQUIRED, INVALID_FORMAT, FUTURE_DATE { today }. quantity: REQUIRED, NOT_POSITIVE, NOT_INTEGER (stock, FII, ETF, BDR), INVALID_STEP { step } (fixed income), TOO_MANY_DECIMALS { maxDecimals } (crypto), TOO_LARGE { maxIntegerDigits }. unitPrice: REQUIRED, NOT_POSITIVE, TOO_MANY_DECIMALS, TOO_LARGE. fees: REQUIRED, NEGATIVE, TOO_MANY_DECIMALS, TOO_LARGE.';

const INVALID_BODY_EXAMPLE = badRequestExample(
  `/${API_PREFIX}/portfolios/3f1c2b9e-8d4a-4c6f-9b1e-2a7d5c8e0f13/operations`,
  [
    {
      field: 'quantity',
      code: 'INVALID_STEP',
      message:
        'quantity 0.525 is not allowed for FIXED_INCOME: must be a multiple of 0.01',
      params: { step: '0.01' },
    },
  ],
);
const REJECTED =
  'A sell would exceed the position at its date (RN07, RN10): `violation` identifies the offending sell. Nothing was saved.';

/** B2–B5, RN04–RN10, RN12. User data: never cached. Ownership is checked in the use cases, by the user's id. */
@ApiTags('operations')
@Controller('portfolios/:id/operations')
export class OperationsController {
  constructor(
    private readonly listOperations: ListOperations,
    private readonly getOperation: GetOperation,
    private readonly createOperation: CreateOperation,
    private readonly updateOperation: UpdateOperation,
    private readonly deleteOperation: DeleteOperation,
  ) {}

  @Get()
  @ApiOperation({ summary: 'History of operations of a portfolio (B5, D45)' })
  @Header('Cache-Control', 'no-store')
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: OperationPageDto })
  @ApiProblemResponse(
    HttpStatus.BAD_REQUEST,
    'Invalid query: errors[] names each parameter (assetId, brokerId, assetType, page, pageSize).',
  )
  @ApiProblemResponse(HttpStatus.NOT_FOUND, PORTFOLIO_NOT_FOUND)
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Query() query: ListOperationsQueryDto,
  ): Promise<OperationPageDto> {
    return this.listOperations
      .execute(user.id, id, {
        assetId: query.assetId ?? null,
        brokerId: query.brokerId ?? null,
        assetType: query.assetType ?? null,
        page: query.page ?? 1,
        pageSize: query.pageSize ?? DEFAULT_HISTORY_PAGE_SIZE,
      })
      .catch(rethrowAsProblem);
  }

  @Post()
  @ApiOperation({ summary: 'Enter an operation (B2, B3, RN04–RN07)' })
  @Header('Cache-Control', 'no-store')
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiCreatedResponse({ type: OperationDto })
  @ApiProblemResponse(HttpStatus.BAD_REQUEST, INVALID_BODY, {
    example: INVALID_BODY_EXAMPLE,
  })
  @ApiProblemResponse(HttpStatus.NOT_FOUND, PORTFOLIO_NOT_FOUND)
  @ApiProblemResponse(HttpStatus.UNPROCESSABLE_ENTITY, REJECTED, {
    extension: RuleViolationProblemDto,
  })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: CreateOperationDto,
  ): Promise<OperationDto> {
    return this.createOperation
      .execute(user.id, id, body)
      .catch(rethrowAsProblem);
  }

  @Get(':operationId')
  @ApiOperation({ summary: 'Get an operation, for the edit form (B4, D41)' })
  @Header('Cache-Control', 'no-store')
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiParam({ name: 'operationId', format: 'uuid' })
  @ApiOkResponse({ type: OperationDto })
  @ApiProblemResponse(HttpStatus.NOT_FOUND, OPERATION_NOT_FOUND)
  async get(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('operationId') operationId: string,
  ): Promise<OperationDto> {
    return this.getOperation
      .execute(user.id, id, operationId)
      .catch(rethrowAsProblem);
  }

  @Patch(':operationId')
  @ApiOperation({
    summary: 'Edit an operation and recalculate the timeline (B4, RN10)',
  })
  @Header('Cache-Control', 'no-store')
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiParam({ name: 'operationId', format: 'uuid' })
  @ApiOkResponse({ type: OperationDto })
  @ApiProblemResponse(HttpStatus.BAD_REQUEST, INVALID_BODY, {
    example: INVALID_BODY_EXAMPLE,
  })
  @ApiProblemResponse(HttpStatus.NOT_FOUND, OPERATION_NOT_FOUND)
  @ApiProblemResponse(HttpStatus.UNPROCESSABLE_ENTITY, REJECTED, {
    extension: RuleViolationProblemDto,
  })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('operationId') operationId: string,
    @Body() body: UpdateOperationDto,
  ): Promise<OperationDto> {
    return this.updateOperation
      .execute(user.id, id, operationId, body)
      .catch(rethrowAsProblem);
  }

  @Delete(':operationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete an operation and recalculate the timeline (B4, RN10)',
  })
  @Header('Cache-Control', 'no-store')
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiParam({ name: 'operationId', format: 'uuid' })
  @ApiNoContentResponse({ description: 'Deleted.' })
  @ApiProblemResponse(HttpStatus.NOT_FOUND, OPERATION_NOT_FOUND)
  @ApiProblemResponse(HttpStatus.UNPROCESSABLE_ENTITY, REJECTED, {
    extension: RuleViolationProblemDto,
  })
  async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('operationId') operationId: string,
  ): Promise<void> {
    await this.deleteOperation
      .execute(user.id, id, operationId)
      .catch(rethrowAsProblem);
  }
}
