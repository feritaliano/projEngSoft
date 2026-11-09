import { ApiProperty } from '@nestjs/swagger';

class IndicatorStatusDto {
  @ApiProperty({ enum: ['up', 'down'], example: 'up' })
  status: 'up' | 'down';
}

/** 200 body (terminus HealthCheckResult with status ok). */
export class HealthOkDto {
  @ApiProperty({ enum: ['ok'], example: 'ok' })
  status: 'ok';

  @ApiProperty({
    type: 'object',
    additionalProperties: { $ref: '#/components/schemas/IndicatorStatusDto' },
    example: { database: { status: 'up' } },
  })
  info: Record<string, IndicatorStatusDto>;

  @ApiProperty({
    type: 'object',
    additionalProperties: { $ref: '#/components/schemas/IndicatorStatusDto' },
    example: {},
  })
  error: Record<string, IndicatorStatusDto>;

  @ApiProperty({
    type: 'object',
    additionalProperties: { $ref: '#/components/schemas/IndicatorStatusDto' },
    example: { database: { status: 'up' } },
  })
  details: Record<string, IndicatorStatusDto>;
}

/** Extension members of the 503 problem: which checks are down, without error messages (D52). */
export class HealthChecksProblemDto {
  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'string', enum: ['up', 'down'] },
    example: { database: 'down' },
  })
  checks: Record<string, 'up' | 'down'>;
}

export const HEALTH_EXTRA_MODELS = [IndicatorStatusDto];
