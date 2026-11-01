import { HttpException, HttpStatus } from '@nestjs/common';
import { STATUS_CODES } from 'node:http';

export const PROBLEM_JSON_CONTENT_TYPE =
  'application/problem+json; charset=utf-8';

/** RFC 7807 body. Extensions (e.g. the RN10 offending operation) are extra top-level members. */
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  [extension: string]: unknown;
}

/** Error with an explicit problem detail and extension members, for business errors mapped by the presentation layer. */
export class ProblemException extends HttpException {
  constructor(
    status: HttpStatus,
    readonly detail: string,
    readonly extensions: Record<string, unknown> = {},
  ) {
    super(detail, status);
  }
}

const INTERNAL_ERROR_DETAIL = 'An unexpected error occurred.';
const SERVER_ERROR_DETAIL = 'The server could not complete the request.';
const VALIDATION_ERROR_DETAIL = 'The request is invalid.';

// Nest's not-found message echoes the raw URL ("Cannot GET /path?token=..."); the query may carry user input.
const ROUTE_NOT_FOUND = /^(Cannot [A-Z]+ [^?\s]*)\?\S*$/;

function titleFor(status: number): string {
  return STATUS_CODES[status] ?? 'Error';
}

function withoutQuery(message: string): string {
  return message.replace(ROUTE_NOT_FOUND, '$1');
}

function detailFromResponse(response: string | object): {
  detail?: string;
  errors?: string[];
} {
  if (typeof response === 'string') {
    return { detail: withoutQuery(response) };
  }
  const message = (response as { message?: unknown }).message;
  if (typeof message === 'string') {
    return { detail: withoutQuery(message) };
  }
  if (Array.isArray(message)) {
    // ValidationPipe reports one message per invalid field; other shapes keep only the generic detail.
    return message.every((item) => typeof item === 'string')
      ? { detail: VALIDATION_ERROR_DETAIL, errors: message }
      : { detail: VALIDATION_ERROR_DETAIL };
  }
  return {};
}

/** True when the response is a deliberate business/HTTP problem whose detail was written for the client. */
export function isClientFacingProblem(exception: unknown): boolean {
  return (
    exception instanceof ProblemException ||
    (exception instanceof HttpException && exception.getStatus() < 500)
  );
}

/**
 * Maps any thrown value to a problem. Only ProblemException and 4xx HttpException keep their message; any other
 * error (including a 5xx HttpException thrown by a library) gets a generic detail, so internals never leak.
 */
export function toProblemDetails(
  exception: unknown,
  instance: string,
): ProblemDetails {
  if (exception instanceof ProblemException) {
    const status = exception.getStatus();
    return {
      ...exception.extensions,
      type: 'about:blank',
      title: titleFor(status),
      status,
      detail: exception.detail,
      instance,
    };
  }

  if (exception instanceof HttpException) {
    const status = exception.getStatus();
    return {
      type: 'about:blank',
      title: titleFor(status),
      status,
      ...(status < 500
        ? detailFromResponse(exception.getResponse())
        : { detail: SERVER_ERROR_DETAIL }),
      instance,
    };
  }

  return {
    type: 'about:blank',
    title: titleFor(HttpStatus.INTERNAL_SERVER_ERROR),
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    detail: INTERNAL_ERROR_DETAIL,
    instance,
  };
}
