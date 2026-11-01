import { Logger } from '@nestjs/common';

/**
 * Last barrier of main.api.ts and main.worker.ts: a failure after NestFactory.create (port in use, plugin
 * registration) is logged with its stack and the process exits with code 1 instead of an unhandled rejection.
 */
export function exitOnBootstrapFailure(error: unknown): void {
  new Logger('Bootstrap').error({ err: error }, 'Process failed to start');
  process.exitCode = 1;
}
