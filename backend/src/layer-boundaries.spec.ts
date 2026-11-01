import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

// Guards the layer lint itself (arquitetura.md, 7.2): writes throwaway files with known violations (in a module and in
// shared), runs ESLint on them and checks each violation is reported, so a config change cannot silently disable it.
const BACKEND_ROOT = resolve(__dirname, '..');
const SRC = join(BACKEND_ROOT, 'src');
const MODULE_PROBE_DIR = join(SRC, 'modules', '__lint_probe__');
const SHARED_PROBE_FILE = join(
  SRC,
  'shared',
  'presentation',
  '__lint_probe__.ts',
);
const ESLINT_BIN = join(
  BACKEND_ROOT,
  'node_modules',
  'eslint',
  'bin',
  'eslint.js',
);

/** Probe files by path relative to src/. */
const PROBE_FILES: Record<string, string[]> = {
  'modules/__lint_probe__/domain/bad-domain.ts': [
    "import { Injectable } from '@nestjs/common';",
    "import { ApiProperty } from '@nestjs/swagger';",
    "import { PrismaClient } from '@prisma/client';",
    "import { PrismaDatabasePing } from '../../health/infrastructure/prisma-database-ping';",
    "import { Port } from '../application/port';",
    'export type Bad = [Injectable, ApiProperty, PrismaClient, PrismaDatabasePing, Port];',
  ],
  'modules/__lint_probe__/application/port.ts': [
    "import { PrismaPg } from '@prisma/adapter-pg';",
    "import { IsString } from 'class-validator';",
    "import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';",
    'export type Port = [PrismaPg, IsString, PrismaService];',
  ],
  'modules/__lint_probe__/application/allowed-use-case.ts': [
    "import { Injectable } from '@nestjs/common';",
    "import { Port } from './port';",
    'export type Allowed = [Injectable, Port];',
  ],
  'modules/__lint_probe__/presentation/bad-controller.ts': [
    "import { PrismaDatabasePing } from '../../health/infrastructure/prisma-database-ping';",
    'export type Bad = PrismaDatabasePing;',
  ],
  'modules/__lint_probe__/infrastructure/allowed-repository.ts': [
    "import { Port } from '../application/port';",
    "import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';",
    'export type Allowed = [Port, PrismaService];',
  ],
  'shared/presentation/__lint_probe__.ts': [
    "import { PrismaService } from '../infrastructure/prisma/prisma.service';",
    'export type Bad = PrismaService;',
  ],
};

interface LintMessage {
  ruleId: string | null;
  message: string;
}

interface LintResult {
  filePath: string;
  messages: LintMessage[];
}

function lintProbes(): Map<string, LintMessage[]> {
  let output: string;
  try {
    output = execFileSync(
      process.execPath,
      [ESLINT_BIN, '--format', 'json', MODULE_PROBE_DIR, SHARED_PROBE_FILE],
      { cwd: BACKEND_ROOT, encoding: 'utf8' },
    );
  } catch (error) {
    // ESLint exits with 1 when it reports errors; the JSON report is still on stdout.
    output = (error as { stdout: string }).stdout;
  }
  const results = JSON.parse(output) as LintResult[];
  return new Map(
    results.map((result) => [
      result.filePath.slice(SRC.length + 1).replaceAll('\\', '/'),
      result.messages,
    ]),
  );
}

describe('layer boundaries lint (arquitetura.md 7.2)', () => {
  let messages: Map<string, LintMessage[]>;

  beforeAll(() => {
    try {
      for (const [file, lines] of Object.entries(PROBE_FILES)) {
        mkdirSync(dirname(join(SRC, file)), { recursive: true });
        writeFileSync(join(SRC, file), `${lines.join('\n')}\n`);
      }
      messages = lintProbes();
    } finally {
      rmSync(MODULE_PROBE_DIR, { recursive: true, force: true });
      rmSync(SHARED_PROBE_FILE, { force: true });
    }
  }, 120_000);

  const messagesOf = (file: string, ruleId: string) =>
    (messages.get(file) ?? [])
      .filter((m) => m.ruleId === ruleId)
      .map((m) => m.message);

  const layerErrors = (file: string) =>
    messagesOf(file, 'boundaries/dependencies');

  // One entry per restricted package, even when it matches more than one restricted group.
  const restrictedImports = (file: string) => [
    ...new Set(
      messagesOf(file, 'no-restricted-imports').map(
        (message) => /'([^']+)' import is restricted/.exec(message)?.[1],
      ),
    ),
  ];

  it('domain imports neither application nor infrastructure', () => {
    expect(layerErrors('modules/__lint_probe__/domain/bad-domain.ts')).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          '"domain" to elements of type "infrastructure"',
        ),
        expect.stringContaining('"domain" to elements of type "application"'),
      ]),
    );
  });

  it('domain imports no NestJS, Swagger or Prisma', () => {
    expect(
      restrictedImports('modules/__lint_probe__/domain/bad-domain.ts').sort(),
    ).toEqual(['@nestjs/common', '@nestjs/swagger', '@prisma/client']);
  });

  it('application imports neither infrastructure nor Prisma or DTO libraries', () => {
    const file = 'modules/__lint_probe__/application/port.ts';

    expect(layerErrors(file)).toEqual([
      expect.stringContaining(
        '"application" to elements of type "infrastructure"',
      ),
    ]);
    expect(restrictedImports(file).sort()).toEqual([
      '@prisma/adapter-pg',
      'class-validator',
    ]);
  });

  it('application may use @nestjs/common (DI) and its own module', () => {
    expect(
      messages.get('modules/__lint_probe__/application/allowed-use-case.ts'),
    ).toEqual([]);
  });

  it('presentation does not import infrastructure', () => {
    expect(
      layerErrors('modules/__lint_probe__/presentation/bad-controller.ts'),
    ).toEqual([
      expect.stringContaining(
        '"presentation" to elements of type "infrastructure"',
      ),
    ]);
  });

  it('infrastructure may import application and shared infrastructure', () => {
    expect(
      messages.get(
        'modules/__lint_probe__/infrastructure/allowed-repository.ts',
      ),
    ).toEqual([]);
  });

  it('the same layer rules apply inside src/shared', () => {
    expect(layerErrors('shared/presentation/__lint_probe__.ts')).toEqual([
      expect.stringContaining(
        '"presentation" to elements of type "infrastructure"',
      ),
    ]);
  });
});
