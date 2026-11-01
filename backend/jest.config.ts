import type { Config } from 'jest';

// Unit tests (D40): no database, no Docker, run in parallel. Integration and E2E: test/jest-e2e.config.ts.
const config: Config = {
  rootDir: '.',
  roots: ['<rootDir>/src'],
  testRegex: String.raw`.*\.spec\.ts$`,
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: {
    [String.raw`^.+\.ts$`]: [
      'ts-jest',
      { tsconfig: '<rootDir>/tsconfig.json' },
    ],
  },
  resolver: '<rootDir>/test/jest-resolver.cjs',
  testEnvironment: 'node',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/generated/**',
    // Composition roots: covered by the E2E suite, not by unit tests.
    '!src/main.*.ts',
    '!src/**/*.module.ts',
    '!src/openapi/export-openapi.ts',
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text-summary', 'lcov'],
  // 90% of lines in the project (backend prompt). The 100%-of-branches threshold for domain/ enters with K0,
  // when the first domain files exist (Jest fails a threshold whose glob matches no file).
  coverageThreshold: { global: { lines: 90 } },
};

export default config;
