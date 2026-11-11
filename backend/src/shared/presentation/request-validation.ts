import { BadRequestException } from '@nestjs/common';
import {
  getMetadataStorage,
  minLength,
  ValidationError,
} from 'class-validator';
import type { FieldErrorCode, FieldErrorParams } from '../domain/domain-error';

/**
 * One invalid input (D56): `field` is the property path of the body or query (`name`, `address.street`,
 * `items.0.qty`); `code` and `params` are the contract the client shows texts by; `message` is English, for logs and
 * readers of the API, never shown in the app.
 */
export interface FieldError {
  readonly field: string;
  readonly code: FieldErrorCode;
  readonly message: string;
  readonly params?: FieldErrorParams;
}

export const VALIDATION_ERROR_DETAIL = 'The request is invalid.';

/**
 * Cap of errors[] in one 400. A custom exceptionFactory bypasses the ValidationPipe's own message limit, and a body
 * with thousands of unknown keys (forbidNonWhitelisted) would otherwise produce a response many times its size.
 */
export const MAX_FIELD_ERRORS = 50;

/** 400 with the field and code of each error, so the frontend shows the right text next to the right input (W2). */
export class RequestValidationException extends BadRequestException {
  constructor(readonly errors: readonly FieldError[]) {
    super(VALIDATION_ERROR_DETAIL);
  }
}

/**
 * A class-validator constraint without a code: a programming error, never a generic code (D56). The unit test of the
 * DTOs fails first; at runtime it becomes a 500 with the cause in the log.
 */
export class UnmappedConstraintError extends Error {
  constructor(constraint: string, detail = 'has no field error code (D56)') {
    super(`Constraint "${constraint}" ${detail}`);
    this.name = 'UnmappedConstraintError';
  }
}

interface CodedConstraint {
  readonly code: FieldErrorCode;
  readonly params?: FieldErrorParams;
}

/** The arguments of a constraint as declared in the decorator (e.g. MaxLength(150) → [150]) and the value sent. */
type ConstraintMapper = (
  args: readonly unknown[],
  value: unknown,
) => CodedConstraint;

function numberArg(
  constraint: string,
  args: readonly unknown[],
  index: number,
): number {
  const arg = args[index];
  if (typeof arg !== 'number') {
    throw new UnmappedConstraintError(
      constraint,
      `has no numeric argument ${index}`,
    );
  }
  return arg;
}

const fixed =
  (code: FieldErrorCode): ConstraintMapper =>
  () => ({ code });

/**
 * Code of every constraint used in the DTOs (D56). Order is priority: when several fail on one field, the first listed
 * wins, so a field gets one error (the type before the length, the length before the format: a 300-character e-mail
 * is TOO_LONG, not INVALID_FORMAT). A missing or blank value is REQUIRED before any of them.
 */
export const CONSTRAINT_CODES: ReadonlyMap<string, ConstraintMapper> = new Map<
  string,
  ConstraintMapper
>([
  // A property the DTO does not declare (forbidNonWhitelisted).
  ['whitelistValidation', fixed('INVALID_VALUE')],
  // The ValidationPipe's own error for a body that is not an object (e.g. an array in a PATCH with only optional
  // fields): field "body", no value and no target, so it is answered as REQUIRED before reaching this mapper.
  ['isObject', fixed('REQUIRED')],
  ['isString', fixed('INVALID_FORMAT')],
  [
    'isLength',
    (args, value) => {
      const min = numberArg('isLength', args, 0);
      // class-validator's own count (an emoji is one character), so the code agrees with the check that failed.
      return typeof value === 'string' && !minLength(value, min)
        ? { code: 'TOO_SHORT', params: { min } }
        : { code: 'TOO_LONG', params: { max: numberArg('isLength', args, 1) } };
    },
  ],
  [
    'minLength',
    (args) => ({
      code: 'TOO_SHORT',
      params: { min: numberArg('minLength', args, 0) },
    }),
  ],
  [
    'maxLength',
    (args) => ({
      code: 'TOO_LONG',
      params: { max: numberArg('maxLength', args, 0) },
    }),
  ],
  ['isEmail', fixed('INVALID_FORMAT')],
  ['isUuid', fixed('INVALID_FORMAT')],
  ['matches', fixed('INVALID_FORMAT')],
  ['isIn', fixed('INVALID_VALUE')],
  ['isInt', fixed('NOT_INTEGER')],
  [
    'min',
    (args) => {
      // Only Min(1) (page, pageSize) has a code in the closed list; another lower bound needs a decision first.
      if (numberArg('min', args, 0) !== 1) {
        throw new UnmappedConstraintError('min', 'is only mapped for Min(1)');
      }
      return { code: 'NOT_POSITIVE' };
    },
  ],
  [
    'max',
    (args) => ({
      code: 'TOO_LARGE',
      params: { max: numberArg('max', args, 0) },
    }),
  ],
]);

const PRIORITY = [...CONSTRAINT_CODES.keys()];

function isBlank(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    (typeof value === 'string' && value.trim() === '')
  );
}

/** The arguments the decorator was declared with, read from class-validator's metadata of the validated class. */
export function constraintArgs(
  target: object | undefined,
  property: string,
  constraint: string,
): readonly unknown[] {
  if (!target) {
    throw new UnmappedConstraintError(
      constraint,
      'was reported without its target class',
    );
  }
  const metadata = getMetadataStorage()
    .getTargetValidationMetadatas(target.constructor, '', true, false)
    .find((item) => item.propertyName === property && item.name === constraint);
  return metadata?.constraints ?? [];
}

/** The constraint of a field that becomes its error: the first by priority; unknown names fail loudly. */
function mainConstraint(names: readonly string[]): string {
  const unknown = names.find((name) => !CONSTRAINT_CODES.has(name));
  if (unknown !== undefined) {
    throw new UnmappedConstraintError(unknown);
  }
  return PRIORITY.find((name) => names.includes(name)) as string;
}

/** The minimum length of a field (Length or MinLength above 1), shown by the text of REQUIRED ("at least {min}"). */
function requiredParams(
  error: ValidationError,
  names: readonly string[],
): FieldErrorParams | undefined {
  const lengthConstraint = names.find(
    (name) => name === 'isLength' || name === 'minLength',
  );
  if (lengthConstraint === undefined) {
    return undefined;
  }
  const min = numberArg(
    lengthConstraint,
    constraintArgs(error.target, error.property, lengthConstraint),
    0,
  );
  return min > 1 ? { min } : undefined;
}

function fieldErrorOf(
  error: ValidationError,
  field: string,
  constraints: Record<string, string>,
): FieldError {
  const names = Object.keys(constraints);
  const main = mainConstraint(names);
  if (main !== 'whitelistValidation' && isBlank(error.value)) {
    const params = requiredParams(error, names);
    return {
      field,
      code: 'REQUIRED',
      message: `${field} is required`,
      ...(params && { params }),
    };
  }
  const mapper = CONSTRAINT_CODES.get(main) as ConstraintMapper;
  const { code, params } = mapper(
    constraintArgs(error.target, error.property, main),
    error.value,
  );
  return { field, code, message: constraints[main], ...(params && { params }) };
}

/** One entry per invalid field, nested properties included (ValidateNested, arrays). */
export function toFieldErrors(
  errors: readonly ValidationError[],
  parentPath = '',
): FieldError[] {
  return errors.flatMap((error) => {
    const field = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;
    const own =
      error.constraints && Object.keys(error.constraints).length > 0
        ? [fieldErrorOf(error, field, error.constraints)]
        : [];
    const nested = toFieldErrors(error.children ?? [], field);
    if (own.length + nested.length === 0) {
      throw new UnmappedConstraintError(field, 'failed without any constraint');
    }
    return [...own, ...nested];
  });
}

/** ValidationPipe exceptionFactory: the default one flattens the errors into strings and loses the field and code. */
export function requestValidationExceptionFactory(
  errors: ValidationError[],
): RequestValidationException {
  return new RequestValidationException(
    toFieldErrors(errors).slice(0, MAX_FIELD_ERRORS),
  );
}
