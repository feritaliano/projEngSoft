import {
  BadRequestException,
  ConflictException,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  isClientFacingProblem,
  ProblemException,
  toProblemDetails,
} from './problem-details';

describe('toProblemDetails (RFC 7807)', () => {
  it('maps an HttpException with a string message', () => {
    expect(
      toProblemDetails(
        new NotFoundException('Cannot GET /api/v1/nope'),
        '/api/v1/nope',
      ),
    ).toEqual({
      type: 'about:blank',
      title: 'Not Found',
      status: 404,
      detail: 'Cannot GET /api/v1/nope',
      instance: '/api/v1/nope',
    });
  });

  it('removes the query string from the route-not-found detail', () => {
    const problem = toProblemDetails(
      new NotFoundException('Cannot GET /api/v1/nope?token=secret'),
      '/api/v1/nope',
    );

    expect(problem.detail).toBe('Cannot GET /api/v1/nope');
  });

  it('maps a 4xx HttpException created with a plain string response', () => {
    expect(toProblemDetails(new ConflictException(), '/x')).toMatchObject({
      status: 409,
      title: 'Conflict',
      detail: 'Conflict',
    });
  });

  it.each([
    [
      'a 503 from a library',
      new ServiceUnavailableException({ status: 'error', details: {} }),
    ],
    [
      'a 500 carrying an internal message',
      new InternalServerErrorException('relation "users" does not exist'),
    ],
  ])('hides the message of %s behind a generic detail', (_case, exception) => {
    const problem = toProblemDetails(exception, '/api/v1/x');

    expect(problem.detail).toBe('The server could not complete the request.');
    expect(JSON.stringify(problem)).not.toMatch(/relation|details/);
  });

  it('lists ValidationPipe messages in errors', () => {
    const exception = new BadRequestException([
      'name must be a string',
      'name should not be empty',
    ]);

    expect(toProblemDetails(exception, '/api/v1/portfolios')).toEqual({
      type: 'about:blank',
      title: 'Bad Request',
      status: 400,
      detail: 'The request is invalid.',
      errors: ['name must be a string', 'name should not be empty'],
      instance: '/api/v1/portfolios',
    });
  });

  it('omits detail when a 4xx response object has no usable message', () => {
    const exception = new ConflictException({ code: 42 });

    expect(toProblemDetails(exception, '/x')).toEqual({
      type: 'about:blank',
      title: 'Conflict',
      status: 409,
      instance: '/x',
    });
  });

  it('keeps the generic validation detail when messages are not strings', () => {
    const exception = new BadRequestException({ message: [{ field: 'name' }] });

    expect(toProblemDetails(exception, '/x')).toMatchObject({
      status: 400,
      detail: 'The request is invalid.',
    });
    expect(toProblemDetails(exception, '/x')).not.toHaveProperty('errors');
  });

  it('treats only ProblemException and 4xx as client-facing', () => {
    expect(
      isClientFacingProblem(
        new ProblemException(HttpStatus.SERVICE_UNAVAILABLE, 'x'),
      ),
    ).toBe(true);
    expect(isClientFacingProblem(new ConflictException())).toBe(true);
    expect(isClientFacingProblem(new ServiceUnavailableException())).toBe(
      false,
    );
    expect(isClientFacingProblem(new Error('x'))).toBe(false);
  });

  it('carries extension members of a ProblemException without letting them override the standard members', () => {
    const exception = new ProblemException(
      HttpStatus.UNPROCESSABLE_ENTITY,
      'Sell above position.',
      {
        operationId: 'op-1',
        status: 999,
      },
    );

    expect(
      toProblemDetails(exception, '/api/v1/portfolios/p/operations'),
    ).toEqual({
      type: 'about:blank',
      title: 'Unprocessable Entity',
      status: 422,
      detail: 'Sell above position.',
      operationId: 'op-1',
      instance: '/api/v1/portfolios/p/operations',
    });
  });

  it.each([
    ['an Error', new Error('connection string postgresql://u:secret@h/db')],
    ['a thrown string', 'boom'],
    ['undefined', undefined],
  ])('hides the cause of %s behind a generic 500', (_case, thrown) => {
    const problem = toProblemDetails(thrown, '/api/v1/x');

    expect(problem).toEqual({
      type: 'about:blank',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An unexpected error occurred.',
      instance: '/api/v1/x',
    });
  });

  it('falls back to a generic title for a non-standard status', () => {
    expect(
      toProblemDetails(new ProblemException(599 as HttpStatus, 'odd'), '/x')
        .title,
    ).toBe('Error');
  });
});
