// Guards the money lint itself (D5, D28, RN11): lints probe snippets as if they were files in src/app and checks each
// violation is reported and each allowed form is not, so a config change cannot silently disable the rule. It also
// fails when the rule is switched off by an inline comment: the only exception is a *.chart.ts file (eslint.config.js).
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ESLint } from 'eslint';

const RULE = 'no-restricted-syntax';
const FORBIDDEN = [
  'export const a = (p: { value: string }) => Number(p.value);',
  'export const a = (s: string) => parseFloat(s);',
  'export const a = (s: string) => parseInt(s, 10);',
  'export const a = (s: string) => Number.parseFloat(s);',
  'export const a = (s: string) => new Number(s);',
  'export const a = (s: string) => +s;',
  'export const a = (p: { value: string }) => p.value * 2;',
  'export const a = (p: { unitPrice: string; fees: string }) => p.unitPrice + p.fees;',
  'export const a = (p?: { quantity: string }) => p?.quantity + "1";',
  'export const a = (p: { totalCost: string }) => -p.totalCost;',
  'export const a = (p: { availableQuantity: number }) => { p.availableQuantity -= 1; };',
];
const ALLOWED = [
  'export const a = (p: { total: number; pageSize: number }) => Math.ceil(p.total / p.pageSize);',
  'export const a = (i: number) => i + 1;',
  'export const a = (p: { name: string }) => "Carteira " + p.name;',
];

const eslint = new ESLint();
const lint = async (code, file) => (await eslint.lintText(code, { filePath: file }))[0].messages;
const failures = [];

for (const code of FORBIDDEN) {
  const messages = await lint(code, 'src/app/features/__money_probe__.ts');
  if (!messages.some((m) => m.ruleId === RULE)) failures.push(`not reported: ${code}`);
}
for (const code of ALLOWED) {
  const messages = await lint(code, 'src/app/features/__money_probe__.ts');
  if (messages.some((m) => m.ruleId === RULE)) failures.push(`reported but allowed: ${code}`);
}
const chart = await lint(FORBIDDEN[0], 'src/app/shared/__money_probe__.chart.ts');
if (chart.some((m) => m.ruleId === RULE))
  failures.push('reported in a *.chart.ts file (the chart exception)');

const root = 'src/app';
for (const file of readdirSync(root, { recursive: true })) {
  if (!/\.(ts|html)$/.test(file) || file.startsWith('api')) continue;
  if (new RegExp(`eslint-disable.*${RULE}`).test(readFileSync(join(root, file), 'utf8'))) {
    failures.push(
      `${join(root, file)}: ${RULE} disabled by comment; use a *.chart.ts file for chart data`,
    );
  }
}

if (failures.length) {
  console.error('Money lint (D5, D28, RN11) check failed:\n' + failures.join('\n'));
  process.exit(1);
}
