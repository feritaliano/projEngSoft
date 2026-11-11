import { applyDecorators, HttpStatus, Type } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiProperty,
  ApiPropertyOptional,
  ApiResponse,
  ApiSchema,
  getSchemaPath,
} from '@nestjs/swagger';
import { FIELD_ERROR_CODES } from '../domain/domain-error';
import type { FieldErrorCode } from '../domain/domain-error';
import {
  PROBLEM_JSON_CONTENT_TYPE,
  ProblemDetails,
  titleFor,
} from './problem-details';
import {
  FieldError,
  MAX_FIELD_ERRORS,
  VALIDATION_ERROR_DETAIL,
} from './request-validation';

/** The limit a field error refers to (D56); only the members its code uses are present. */
@ApiSchema({ name: 'FieldErrorParams' })
export class FieldErrorParamsDto {
  @ApiPropertyOptional({
    example: 8,
    description:
      'TOO_SHORT, and REQUIRED of a field with a minimum length: the minimum number of characters.',
  })
  min?: number;

  @ApiPropertyOptional({
    example: 150,
    description:
      'TOO_LONG: the maximum number of characters. TOO_LARGE of page and pageSize: the maximum value.',
  })
  max?: number;

  @ApiPropertyOptional({
    example: 8,
    description: 'TOO_MANY_DECIMALS: the maximum number of decimal places.',
  })
  maxDecimals?: number;

  @ApiPropertyOptional({
    example: 12,
    description: 'TOO_LARGE of a decimal: the maximum digits before the point.',
  })
  maxIntegerDigits?: number;

  @ApiPropertyOptional({
    example: '0.01',
    description: 'INVALID_STEP: the step, as a decimal string.',
  })
  step?: string;

  @ApiPropertyOptional({
    format: 'date',
    example: '2026-11-10',
    description: 'FUTURE_DATE: today in São Paulo (D54), YYYY-MM-DD.',
  })
  today?: string;
}

/** One invalid input of a 400 or 409 (see FieldError). */
@ApiSchema({ name: 'FieldError' })
export class FieldErrorDto {
  @ApiProperty({
    example: 'password',
    description:
      'Property path in the body or query string; nested properties use dots (address.street, items.0.quantity).',
  })
  field: string;

  @ApiProperty({
    enum: FIELD_ERROR_CODES,
    enumName: 'FieldErrorCode',
    example: 'TOO_SHORT',
    description:
      'Why the field was rejected (D56): a closed list, the same on every endpoint. The client shows its own text by field + code.',
  })
  code: FieldErrorCode;

  @ApiProperty({
    example: 'password must have at least 8 characters',
    description:
      'English, for logs and readers of the API; not meant to be shown to the user.',
  })
  message: string;

  @ApiPropertyOptional({ type: FieldErrorParamsDto })
  params?: FieldErrorParamsDto;
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
    description: `400: one entry per invalid input, from validation of the body or query and from domain rules (at most ${MAX_FIELD_ERRORS}). 409 of a form: the conflicting field, with ALREADY_EXISTS.`,
  })
  errors?: FieldErrorDto[];

  @ApiPropertyOptional({
    example: 'email',
    description:
      '409 only: the field whose value conflicts with an existing resource (e.g. e-mail already registered); errors[] repeats it with ALREADY_EXISTS.',
  })
  field?: string;
}

/** Media type of every error response, without parameters (as OpenAPI expects). */
export const PROBLEM_JSON_MEDIA_TYPE = PROBLEM_JSON_CONTENT_TYPE.split(';')[0];

export interface ApiProblemOptions {
  /** Extension members of that problem (e.g. the health 503 checks), added as `allOf` so ProblemDetails stays the base. */
  readonly extension?: Type;
  /** A full response body, e.g. a 400 of a form with its errors[] (D56). */
  readonly example?: ProblemDetails;
}

/** Documents an error response as application/problem+json with the ProblemDetails schema. */
export function ApiProblemResponse(
  status: HttpStatus,
  description: string,
  { extension, example }: ApiProblemOptions = {},
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
          ...(example && { example }),
        },
      },
    }),
  );
}

/** Example of a 400 of a form (D56): the body the client gets, with the field, code and params of each error. */
export function badRequestExample(
  instance: string,
  errors: readonly FieldError[],
): ProblemDetails {
  return {
    type: 'about:blank',
    title: titleFor(HttpStatus.BAD_REQUEST),
    status: HttpStatus.BAD_REQUEST,
    detail: VALIDATION_ERROR_DETAIL,
    instance,
    errors,
  };
}
