import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';

export const HEARTBEAT_INTERVAL_MS = 60_000;

/**
 * Keeps the worker process alive and logs that it is running until the S2 scheduler (@nestjs/schedule) owns the
 * event loop. Without an active timer, a Nest application context with no jobs exits right after boot.
 */
@Injectable()
export class WorkerHeartbeat
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(WorkerHeartbeat.name);
  private timer: NodeJS.Timeout | undefined;

  onApplicationBootstrap(): void {
    this.timer = setInterval(
      () => this.logger.debug('Worker alive'),
      HEARTBEAT_INTERVAL_MS,
    );
  }

  onApplicationShutdown(): void {
    clearInterval(this.timer);
    this.timer = undefined;
  }
}
