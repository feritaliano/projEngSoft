import pino, { type LoggerOptions } from 'pino';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Writable } from 'node:stream';
import pinoHttp from 'pino-http';
import { buildLoggerParams } from './logger-options';

function pinoOptionsFor(
  nodeEnv: 'development' | 'test' | 'production',
  interactiveTerminal = false,
): LoggerOptions {
  const { pinoHttp } = buildLoggerParams(
    { NODE_ENV: nodeEnv, LOG_LEVEL: 'info' },
    interactiveTerminal,
  );
  return pinoHttp as LoggerOptions;
}

function captureLogLine(
  write: (logger: pino.Logger) => void,
): Record<string, unknown> {
  const lines: string[] = [];
  const sink = new Writable({
    write(chunk: Buffer, _encoding, callback) {
      lines.push(chunk.toString());
      callback();
    },
  });
  const { transport: _transport, ...options } = pinoOptionsFor('production');
  write(pino(options, sink));
  return JSON.parse(lines[0]) as Record<string, unknown>;
}

/** Sends one real request through pino-http with these options and returns the request log line. */
async function logRealRequest(
  path: string,
  headers: Record<string, string>,
): Promise<Record<string, unknown>> {
  const { transport: _transport, ...options } = pinoOptionsFor('production');
  const line = new Promise<string>((resolve) => {
    const sink = new Writable({
      write(chunk: Buffer, _encoding, callback) {
        resolve(chunk.toString());
        callback();
      },
    });
    const httpLogger = pinoHttp({ ...options, stream: sink });
    const server = createServer((req, res) => {
      httpLogger(req, res);
      res.end('ok');
    });
    server.listen(0, () => {
      const { port } = server.address() as AddressInfo;
      void fetch(`http://127.0.0.1:${port}${path}`, { headers }).finally(() =>
        server.close(),
      );
    });
  });
  return JSON.parse(await line) as Record<string, unknown>;
}

describe('logger options (D52)', () => {
  it('a real request log has no query string, credentials or e-mail', async () => {
    const line = await logRealRequest(
      '/api/v1/auth/reset?token=secret-token&email=ana@example.com',
      {
        authorization: 'Bearer secret-bearer',
        cookie: 'refresh=secret-cookie',
      },
    );

    expect(line.req).toMatchObject({
      method: 'GET',
      url: '/api/v1/auth/reset',
    });
    expect(Object.keys(line.req as object).sort()).toEqual([
      'id',
      'method',
      'url',
    ]);
    expect(JSON.stringify(line)).not.toMatch(/secret|ana@example.com/);
  });

  it('removes credentials nested two levels deep', () => {
    const line = captureLogLine((logger) =>
      logger.info(
        { dto: { user: { id: 'u-1', password: 'p', token: 't' } } },
        'oops',
      ),
    );

    expect(line.dto).toEqual({ user: { id: 'u-1' } });
  });

  it('logs only method, url and id of a request: no headers, cookies or body', () => {
    const line = captureLogLine((logger) =>
      logger.info(
        {
          req: {
            id: 'req-1',
            method: 'POST',
            url: '/api/v1/auth/login',
            headers: {
              authorization: 'Bearer secret-token',
              cookie: 'refresh=secret-cookie',
            },
            body: { email: 'ana@example.com', password: 'secret-password' },
          },
          res: {
            statusCode: 200,
            headers: { 'set-cookie': 'refresh=secret-cookie' },
          },
        },
        'request completed',
      ),
    );

    expect(line.req).toEqual({
      id: 'req-1',
      method: 'POST',
      url: '/api/v1/auth/login',
    });
    expect(line.res).toEqual({ statusCode: 200 });
    expect(JSON.stringify(line)).not.toMatch(/secret|ana@example\.com/);
  });

  it('removes credentials logged by mistake in other objects', () => {
    const line = captureLogLine((logger) =>
      logger.info(
        { user: { id: 'u-1', password: 'p', refreshToken: 'r', token: 't' } },
        'oops',
      ),
    );

    expect(line.user).toEqual({ id: 'u-1' });
  });

  it('uses pino-pretty only in development on an interactive terminal', () => {
    expect(pinoOptionsFor('development', true).transport).toEqual({
      target: 'pino-pretty',
      options: { singleLine: true },
    });
    expect(pinoOptionsFor('production', true).transport).toBeUndefined();
    expect(pinoOptionsFor('test', true).transport).toBeUndefined();
  });

  it('writes JSON in containers (development without a TTY), where pino-pretty is not installed', () => {
    expect(pinoOptionsFor('development', false).transport).toBeUndefined();
  });
});
