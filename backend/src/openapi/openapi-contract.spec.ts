import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { OpenAPIObject } from '@nestjs/swagger';

// The committed contract; the backend CI job fails if it differs from the one generated from the code (D52).
const contract = JSON.parse(
  readFileSync(
    resolve(__dirname, '..', '..', 'openapi', 'openapi.json'),
    'utf8',
  ),
) as OpenAPIObject;

const PROBLEM_REF = '#/components/schemas/ProblemDetails';

type Operation = NonNullable<OpenAPIObject['paths'][string]['post']>;

function operations(): [string, Operation][] {
  return Object.entries(contract.paths).flatMap(([path, item]) =>
    (['get', 'post', 'put', 'patch', 'delete'] as const).flatMap((method) => {
      const operation = item[method];
      return operation ? [[`${method.toUpperCase()} ${path}`, operation]] : [];
    }),
  ) as [string, Operation][];
}

function refersToProblemDetails(schema: unknown): boolean {
  const { $ref, allOf } = (schema ?? {}) as {
    $ref?: string;
    allOf?: { $ref?: string }[];
  };
  return (
    $ref === PROBLEM_REF ||
    (allOf ?? []).some((part) => part.$ref === PROBLEM_REF)
  );
}

describe('openapi.json contract (D52, audit of 09/11)', () => {
  it.each(operations())(
    '%s: every documented error response is problem+json with ProblemDetails',
    (_name, operation) => {
      const errors = Object.entries(operation.responses).filter(
        ([status]) => Number(status) >= 400,
      );

      for (const [, response] of errors) {
        const content = (
          response as { content?: Record<string, { schema?: unknown }> }
        ).content;
        expect(Object.keys(content ?? {})).toEqual([
          'application/problem+json',
        ]);
        expect(
          refersToProblemDetails(content?.['application/problem+json'].schema),
        ).toBe(true);
      }
    },
  );

  it.each([
    ['GET /api/v1/health', []],
    ['POST /api/v1/auth/register', []],
    ['POST /api/v1/auth/login', []],
    ['POST /api/v1/auth/refresh', [{ refresh_token: [] }]],
    ['POST /api/v1/auth/logout', [{ refresh_token: [] }]],
  ])(
    '%s declares its own security (public or refresh cookie)',
    (name, security) => {
      const operation = new Map(operations()).get(name);

      expect(operation?.security).toEqual(security);
    },
  );

  it('requires the bearer scheme on every other route, with a 401 documented', () => {
    const protectedRoutes = operations().filter(
      ([, operation]) => !operation.security,
    );

    expect(contract.security).toEqual([{ bearer: [] }]);
    for (const [, operation] of protectedRoutes) {
      expect(operation.responses).toHaveProperty('401');
    }
  });
});
