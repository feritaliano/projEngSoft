import {
  Controller,
  Get,
  Header,
  HttpStatus,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import {
  HealthCheckResult,
  HealthCheckService,
  HealthIndicatorService,
} from '@nestjs/terminus';
import { Public } from '../../../shared/presentation/auth-context';
import { ProblemException } from '../../../shared/presentation/problem-details';
import { ApiProblemResponse } from '../../../shared/presentation/problem-details.dto';
import { DatabasePing } from '../application/database-ping';
import {
  HEALTH_EXTRA_MODELS,
  HealthOkDto,
  HealthChecksProblemDto,
} from './health.dto';

const DATABASE_CHECK = 'database';

/**
 * Status of each check from terminus' result. Always present (the OpenAPI schema requires it): empty if the body is
 * not the expected HealthCheckResult.
 */
function checksOf(response: unknown): { checks: Record<string, string> } {
  const details = (response as Partial<HealthCheckResult> | null)?.details;
  if (typeof details !== 'object' || details === null) {
    return { checks: {} };
  }
  return {
    checks: Object.fromEntries(
      Object.entries(details).map(([name, check]) => [name, check.status]),
    ),
  };
}

@ApiTags('health')
@Public()
@ApiExtraModels(...HEALTH_EXTRA_MODELS)
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private readonly health: HealthCheckService,
    private readonly indicators: HealthIndicatorService,
    private readonly database: DatabasePing,
  ) {}

  /** 200 when PostgreSQL answers; 503 problem+json listing the failed checks otherwise (D52). */
  @Get()
  @ApiOperation({ summary: 'Health check of the API and PostgreSQL (D52)' })
  @Header('Cache-Control', 'no-store')
  @ApiOkResponse({ type: HealthOkDto, description: 'PostgreSQL answers.' })
  @ApiProblemResponse(
    HttpStatus.SERVICE_UNAVAILABLE,
    'A dependency does not answer.',
    { extension: HealthChecksProblemDto },
  )
  async check(): Promise<HealthCheckResult> {
    try {
      return await this.health.check([() => this.checkDatabase()]);
    } catch (error) {
      if (error instanceof ServiceUnavailableException) {
        throw new ProblemException(
          HttpStatus.SERVICE_UNAVAILABLE,
          'One or more dependencies are unavailable.',
          checksOf(error.getResponse()),
        );
      }
      throw error;
    }
  }

  private async checkDatabase() {
    const indicator = this.indicators.check(DATABASE_CHECK);
    try {
      await this.database.ping();
      return indicator.up();
    } catch (error) {
      // The cause stays in the log; the response only says the check is down.
      this.logger.warn({ err: error }, 'Database health check failed');
      return indicator.down();
    }
  }
}
