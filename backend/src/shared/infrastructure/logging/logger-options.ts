import type { Params } from 'nestjs-pino';
import type { WorkerEnv } from '../../../config/env';

const CREDENTIAL_KEYS = [
  'password',
  'passwordHash',
  'refreshToken',
  'accessToken',
  'token',
];

/**
 * Paths removed from every log line (D52): credentials and session cookies never reach the logs. The request
 * serializer below already keeps only method, url and id; this list is the second barrier. pino wildcards match
 * one level each, so credentials are covered up to two levels deep in any logged object.
 */
export const REDACTED_LOG_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'res.headers["set-cookie"]',
  'req.body',
  ...CREDENTIAL_KEYS.flatMap((key) => [`*.${key}`, `*.*.${key}`]),
];

interface SerializableRequest {
  id?: unknown;
  method?: string;
  url?: string;
}

interface SerializableResponse {
  statusCode?: number;
}

export function buildLoggerParams(
  env: Pick<WorkerEnv, 'NODE_ENV' | 'LOG_LEVEL'>,
): Params {
  return {
    pinoHttp: {
      level: env.LOG_LEVEL,
      redact: { paths: REDACTED_LOG_PATHS, remove: true },
      serializers: {
        // Headers, body and query string are never logged (the query may carry tokens or e-mail).
        req: (req: SerializableRequest) => ({
          id: req.id,
          method: req.method,
          url: req.url?.split('?')[0],
        }),
        res: (res: SerializableResponse) => ({ statusCode: res.statusCode }),
      },
      transport:
        env.NODE_ENV === 'development'
          ? { target: 'pino-pretty', options: { singleLine: true } }
          : undefined,
    },
  };
}
