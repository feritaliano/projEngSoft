import { Logger } from '@nestjs/common';
import { HEARTBEAT_INTERVAL_MS, WorkerHeartbeat } from './worker-heartbeat';

describe('WorkerHeartbeat', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('logs while running and stops on shutdown', () => {
    const debug = jest
      .spyOn(Logger.prototype, 'debug')
      .mockImplementation(() => undefined);
    const heartbeat = new WorkerHeartbeat();

    heartbeat.onApplicationBootstrap();
    jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS * 2);
    expect(debug).toHaveBeenCalledTimes(2);

    heartbeat.onApplicationShutdown();
    jest.advanceTimersByTime(HEARTBEAT_INTERVAL_MS * 2);
    expect(debug).toHaveBeenCalledTimes(2);
    expect(jest.getTimerCount()).toBe(0);
  });
});
