// @ts-check
import eslint from '@eslint/js';
import boundaries from 'eslint-plugin-boundaries';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const LAYERS = ['domain', 'application', 'infrastructure', 'presentation'];

// Layers inside each module (src/modules/<module>/<layer>) and inside src/shared/<layer> (arquitetura.md, 7.2).
const layerElements = LAYERS.map((layer) => ({
  type: layer,
  pattern: [`src/modules/*/${layer}`, `src/shared/${layer}`],
}));

/** Policy: files of layer `from` may import only the listed element types. */
const allow = (from, to) => ({
  from: { element: { type: from } },
  allow: { to: { element: { types: { anyOf: to } } } },
});

const FRAMEWORK_AND_PERSISTENCE = [
  {
    group: ['@nestjs/*', 'nestjs-pino'],
    message: 'domain is pure TypeScript: no NestJS.',
  },
  {
    group: ['@prisma/*', '**/generated/**'],
    message: 'domain and application never touch Prisma: use a port.',
  },
  {
    group: ['fastify', '@fastify/*', 'pino', 'pino-*'],
    message: 'HTTP and logging belong to presentation/infrastructure.',
  },
  {
    group: ['class-validator', 'class-transformer', '@nestjs/swagger'],
    message: 'DTO decorators belong to presentation.',
  },
];

export default tseslint.config(
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'openapi/**',
      'src/generated/**',
      'eslint.config.mjs',
      'test/jest-resolver.cjs',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  prettier,
  {
    languageOptions: {
      globals: { ...globals.node, ...globals.jest },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // Test doubles and Jest matchers produce `any` on purpose.
    files: ['**/*.spec.ts', 'test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/unbound-method': 'off',
    },
  },
  {
    // Layer boundaries, checked in CI: a violation fails the build (arquitetura.md, 7.2; backend prompt).
    files: ['src/**/*.ts'],
    ignores: ['src/**/*.spec.ts'],
    plugins: { boundaries },
    settings: {
      'boundaries/elements': [
        ...layerElements,
        { type: 'generated', pattern: 'src/generated' },
        { type: 'config', pattern: 'src/config' },
        // Last, so it only takes what is not a layer, generated or config: module files (*.module.ts), entrypoints,
        // root modules, worker and OpenAPI export (composition roots).
        { type: 'composition', pattern: 'src' },
      ],
      'import/resolver': { node: { extensions: ['.ts', '.js'] } },
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          policies: [
            allow('domain', ['domain']),
            allow('application', ['domain', 'application']),
            allow('infrastructure', [
              'domain',
              'application',
              'infrastructure',
              'generated',
              'config',
            ]),
            allow('presentation', ['domain', 'application', 'presentation']),
            allow('config', ['config']),
            allow('composition', [
              'domain',
              'application',
              'infrastructure',
              'presentation',
              'config',
              'composition',
            ]),
          ],
        },
      ],
    },
  },
  {
    files: ['src/modules/*/domain/**/*.ts', 'src/shared/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: FRAMEWORK_AND_PERSISTENCE },
      ],
    },
  },
  {
    // Application may use @nestjs/common (DI decorators) but no persistence, HTTP or DTO libraries.
    files: [
      'src/modules/*/application/**/*.ts',
      'src/shared/application/**/*.ts',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: FRAMEWORK_AND_PERSISTENCE.slice(1) },
      ],
    },
  },
);
