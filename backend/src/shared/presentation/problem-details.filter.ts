import { ArgumentsHost, Catch, ExceptionFilter, Logger } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import {
  isClientFacingProblem,
  PROBLEM_JSON_CONTENT_TYPE,
  toProblemDetails,
} from './problem-details';

/**
 * Prisma validation errors quote the arguments of the failed call (e-mail, password hash, token hash) in their message;
 * pino redaction only matches keys, so the message is dropped and the name and stack kept.
 */
function withoutQueryArguments(exception: unknown): unknown {
  if (
    exception instanceof Error &&
    exception.name === 'PrismaClientValidationError'
  ) {
    // The message (repeated at the top of the stack, possibly over several lines) goes; only the frames stay.
    const frames = (exception.stack ?? '')
      .split('\n')
      .filter((line) => /^\s+at /.test(line));
    return { name: exception.name, stack: frames.join('\n') };
  }
  return exception;
}

/** Global filter: every error response is RFC 7807 application/problem+json, including unknown routes (404). */
@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<FastifyRequest>();
    const reply = http.getResponse<FastifyReply>();

    // Path only: the query string may carry user input and is not part of the resource identity.
    const instance = request.url.split('?')[0];
    const problem = toProblemDetails(exception, instance);

    if (!isClientFacingProblem(exception)) {
      const err = withoutQueryArguments(exception);
      // Unexpected errors (and 5xx thrown by libraries) keep the cause and stack in the log; the client only gets
      // the generic problem.
      this.logger.error(
        { err, status: problem.status, instance },
        'Unhandled exception',
      );
    } else if (problem.status >= 500) {
      // Deliberate 5xx ProblemException (e.g. health 503): the cause was logged where it was raised.
      this.logger.warn(
        { status: problem.status, instance },
        'Request failed with a server error',
      );
    }

    void reply
      .status(problem.status)
      .header('content-type', PROBLEM_JSON_CONTENT_TYPE)
      .send(problem);
  }
}
