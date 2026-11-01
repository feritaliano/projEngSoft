import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PROBLEM_JSON_CONTENT_TYPE } from './problem-details';

/** OpenAPI schema of the RFC 7807 error body (see ProblemDetails). */
export class ProblemDetailsDto {
  @ApiProperty({ example: 'about:blank' })
  type: string;

  @ApiProperty({ example: 'Not Found' })
  title: string;

  @ApiProperty({ example: 404 })
  status: number;

  @ApiPropertyOptional({ example: 'Cannot GET /api/v1/does-not-exist' })
  detail?: string;

  @ApiPropertyOptional({ example: '/api/v1/does-not-exist' })
  instance?: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'One message per invalid field (400).',
  })
  errors?: string[];
}

/** Media type of every error response, without parameters (as OpenAPI expects). */
export const PROBLEM_JSON_MEDIA_TYPE = PROBLEM_JSON_CONTENT_TYPE.split(';')[0];
