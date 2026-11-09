import { applyDecorators, HttpStatus, Type } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiProperty,
  ApiPropertyOptional,
  ApiResponse,
  ApiSchema,
  getSchemaPath,
} from '@nestjs/swagger';
import { PROBLEM_JSON_CONTENT_TYPE } from './problem-details';
import { MAX_FIELD_ERRORS } from './request-validation';

/** One invalid input of a 400 (see FieldError). */
@ApiSchema({ name: 'FieldError' })
export class FieldErrorDto {
  @ApiProperty({
    example: 'password',
    description:
      'Property path in the body or query string; nested properties use dots (address.street, items.0.quantity).',
  })
  field: string;

  @ApiProperty({
    example: 'password must be longer than or equal to 8 characters',
  })
  message: string;
}

/** OpenAPI schema `ProblemDetails`: the RFC 7807 body of every error response (see ProblemDetails). */
@ApiSchema({ name: 'ProblemDetails' })
export class ProblemDetailsDto {
  @ApiProperty({ example: 'about:blank' })
  type: string;

  @ApiProperty({ example: 'Bad Request' })
  title: string;

  @ApiProperty({ example: 400 })
  status: number;

  @ApiPropertyOptional({ example: 'The request is invalid.' })
  detail?: string;

  @ApiPropertyOptional({ example: '/api/v1/auth/register' })
  instance?: string;

  @ApiPropertyOptional({
    type: [FieldErrorDto],
    maxItems: MAX_FIELD_ERRORS,
    description: `400 only: one entry per invalid input, from validation of the body or query and from domain rules (at most ${MAX_FIELD_ERRORS}).`,
  })
  errors?: FieldErrorDto[];

  @ApiPropertyOptional({
    example: 'email',
    description:
      '409 only: the field whose value conflicts with an existing resource (e.g. e-mail already registered).',
  })
  field?: string;
}

/** Media type of every error response, without parameters (as OpenAPI expects). */
export const PROBLEM_JSON_MEDIA_TYPE = PROBLEM_JSON_CONTENT_TYPE.split(';')[0];

/**
 * Documents an error response as application/problem+json with the ProblemDetails schema; `extension` adds the
 * extension members of that problem (e.g. the health 503 checks) as `allOf`, so ProblemDetails stays the base.
 */
export function ApiProblemResponse(
  status: HttpStatus,
  description: string,
  extension?: Type,
): MethodDecorator & ClassDecorator {
  const problem = { $ref: getSchemaPath(ProblemDetailsDto) };
  return applyDecorators(
    ApiExtraModels(ProblemDetailsDto, ...(extension ? [extension] : [])),
    ApiResponse({
      status,
      description,
      content: {
        [PROBLEM_JSON_MEDIA_TYPE]: {
          schema: extension
            ? { allOf: [problem, { $ref: getSchemaPath(extension) }] }
            : problem,
        },
      },
    }),
  );
}
