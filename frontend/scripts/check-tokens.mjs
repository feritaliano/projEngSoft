// Design system guard: Tailwind arbitrary values (e.g. text-[#1a2b3c], w-[1120px]) bypass the tokens of
// claude/design-tokens.md. The theme already removes the default palette; this catches the rest.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ARBITRARY = /\b[a-z][\w:-]*-\[[^\]\s]+\]/g;
const root = 'src/app';
const files = readdirSync(root, { recursive: true })
  .map((file) => join(root, file))
  .filter((file) => /\.(ts|html)$/.test(file) && !file.startsWith(join(root, 'api')));

const hits = files.flatMap((file) =>
  readFileSync(file, 'utf8')
    .split('\n')
    .flatMap((line, i) =>
      (line.match(ARBITRARY) ?? []).map((value) => `${file}:${i + 1}: ${value}`),
    ),
);

if (hits.length) {
  console.error(
    'Tailwind arbitrary values are not allowed; use the design tokens:\n' + hits.join('\n'),
  );
  process.exit(1);
}
