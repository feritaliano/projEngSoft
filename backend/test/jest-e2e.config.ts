import type { Config } from 'jest';

// Integration and E2E (D40): PostgreSQL 16 from Testcontainers, migrations applied by the root Prisma, run serially.
const config: Config = {
  rootDir: '..',
  roots: ['<rootDir>/test'],
  testRegex: String.raw`.*\.e2e-spec\.ts$`,
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    [String.raw`^.+\.ts$`]: [
      'ts-jest',
      { tsconfig: '<rootDir>/tsconfig.json' },
    ],
  },
  resolver: '<rootDir>/test/jest-resolver.cjs',
  testEnvironment: 'node',
  globalSetup: '<rootDir>/test/global-setup.ts',
  globalTeardown: '<rootDir>/test/global-teardown.ts',
  maxWorkers: 1,
  testTimeout: 30_000,
};

export default config;
