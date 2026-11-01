import { Logger } from '@nestjs/common';
import { exitOnBootstrapFailure } from './bootstrap-failure';

describe('exitOnBootstrapFailure', () => {
  afterEach(() => {
    process.exitCode = undefined;
    jest.restoreAllMocks();
  });

  it('logs the error and sets exit code 1', () => {
    const error = jest.spyOn(Logger.prototype, 'error').mockImplementation();
    const cause = new Error('listen EADDRINUSE :::3000');

    exitOnBootstrapFailure(cause);

    expect(error).toHaveBeenCalledWith(
      { err: cause },
      'Process failed to start',
    );
    expect(process.exitCode).toBe(1);
  });
});
