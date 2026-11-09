import { HttpStatus, Logger } from '@nestjs/common';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import {
  INTERNAL_ERROR_DETAIL,
  PROBLEM_JSON_CONTENT_TYPE,
  ProblemDetails,
  titleFor,
} from './problem-details';

type SecurityRequestHook = Parameters<
  FastifyAdapter['registerSecurityHook']
>[0];

/** Errors the router raises before any hook or filter runs; their Fastify message echoes the raw URL (user input). */
const ROUTER_ERROR_DETAILS: Readonly<Record<string, string>> = {
  FST_ERR_BAD_URL: 'The request URL is malformed.',
  FST_ERR_MAX_PARAM_LENGTH: 'A path parameter is too long.',
};

const logger = new Logger('ApiFastifyAdapter');

/** No `instance`: the path is exactly what could not be parsed. */
function problemOf(status: number, detail: string): ProblemDetails {
  return {
    type: 'about:blank',
    title: titleFor(status),
    status,
    detail,
  };
}

function sendProblem(reply: FastifyReply, problem: ProblemDetails): void {
  void reply
    .status(problem.status)
    .header('content-type', PROBLEM_JSON_CONTENT_TYPE)
    .send(problem);
}

export function routerErrorProblem(error: FastifyError): ProblemDetails {
  const status = error.statusCode ?? HttpStatus.INTERNAL_SERVER_ERROR;
  const detail = ROUTER_ERROR_DETAILS[error.code];
  if (detail && status < 500) {
    return problemOf(status, detail);
  }
  // Any other router error (e.g. a failed async constraint) is a server fault: logged, with a generic body.
  logger.error({ err: error, code: error.code }, 'Router error');
  return problemOf(HttpStatus.INTERNAL_SERVER_ERROR, INTERNAL_ERROR_DETAIL);
}

/**
 * The Fastify adapter of the API (main.api.ts, OpenAPI export, tests). It answers in problem+json the responses
 * Fastify produces outside the Nest exception filter:
 * - router errors (`frameworkErrors`): malformed URL (400 FST_ERR_BAD_URL) and over-long path parameter (414). Nest's
 *   own handler runs its security hook (CSRF and security headers) first; this one keeps doing so, with the hook
 *   captured in `registerSecurityHook`;
 * - requests that arrive while the app shuts down: 503 from `beforeClose()` on (Nest's shutdown sequence), instead
 *   of Fastify's built-in `return503OnClosing`, whose body is plain JSON written directly to the socket.
 */
export class ApiFastifyAdapter extends FastifyAdapter {
  private readonly security: { hook?: SecurityRequestHook };
  private draining = false;

  constructor() {
    const security: { hook?: SecurityRequestHook } = {};
    super({
      return503OnClosing: false,
      frameworkErrors: (
        error: FastifyError,
        request: FastifyRequest,
        reply: FastifyReply,
      ) => {
        try {
          security.hook?.(request, reply.raw);
        } catch {
          // As in Nest's handler: the request is rejected either way, and a throw here would escape the router.
        }
        sendProblem(reply, routerErrorProblem(error));
      },
    });
    this.security = security;
    // Added after the adapter's own onRequest hooks (CORS, Nest security hook), so the 503 carries their headers.
    this.getInstance().addHook('onRequest', (request, reply, done) => {
      if (!this.draining) {
        done();
        return;
      }
      if (request.raw.httpVersionMajor !== 2) {
        void reply.header('connection', 'close');
      }
      sendProblem(
        reply,
        problemOf(
          HttpStatus.SERVICE_UNAVAILABLE,
          'The server is shutting down. Try again.',
        ),
      );
    });
  }

  override registerSecurityHook(hook: SecurityRequestHook): void {
    this.security.hook = hook;
    super.registerSecurityHook(hook);
  }

  override beforeClose(): void {
    this.draining = true;
    super.beforeClose();
  }

  override async close(): Promise<void> {
    this.draining = true;
    await super.close();
  }
}
