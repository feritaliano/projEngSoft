import { BadRequestException } from '@nestjs/common';
import type { ValidationError } from 'class-validator';

/** One invalid input: `field` is the property path of the body or query (`name`, `address.street`, `items.0.qty`). */
export interface FieldError {
  field: string;
  message: string;
}

export const VALIDATION_ERROR_DETAIL = 'The request is invalid.';

/**
 * Cap of errors[] in one 400. A custom exceptionFactory bypasses the ValidationPipe's own message limit, and a body
 * with thousands of unknown keys (forbidNonWhitelisted) would otherwise produce a response many times its size.
 */
export const MAX_FIELD_ERRORS = 50;

/** 400 with the field of each error, so the frontend shows it next to the right input (W2). */
export class RequestValidationException extends BadRequestException {
  constructor(readonly errors: readonly FieldError[]) {
    super(VALIDATION_ERROR_DETAIL);
  }
}

/** One entry per failed constraint, nested properties included (ValidateNested, arrays). */
export function toFieldErrors(
  errors: readonly ValidationError[],
  parentPath = '',
): FieldError[] {
  return errors.flatMap((error) => {
    const field = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;
    const own = Object.values(error.constraints ?? {}).map((message) => ({
      field,
      message,
    }));
    const nested = toFieldErrors(error.children ?? [], field);
    // An error without constraints or children still names its field instead of vanishing from the list.
    return own.length + nested.length > 0
      ? [...own, ...nested]
      : [{ field, message: `${field} is invalid` }];
  });
}

/** ValidationPipe exceptionFactory: the default one flattens the errors into strings and loses the field. */
export function requestValidationExceptionFactory(
  errors: ValidationError[],
): RequestValidationException {
  return new RequestValidationException(
    toFieldErrors(errors).slice(0, MAX_FIELD_ERRORS),
  );
}
