// Guards the money lint itself (D5, D28, RN11): lints probe snippets as if they were files in src/app and checks each
// forbidden form is an error and each allowed form is not, so a config change cannot silently weaken the rule. Then
// lints src/app with inline config off, so a comment that switches the rule off (in any form) fails too; the only
// exception is a *.chart.ts file (eslint.config.js).
import { ESLint } from 'eslint';

const RULE = 'no-restricted-syntax';
// Written here, not imported from eslint.config.js, so the probe does not repeat the implementation.
const FIELDS = [
  'value',
  'quantity',
  'step',
  'fees',
  'price',
  'cost',
  'amount',
  'profit',
  'percent',
];
const SUFFIXED = [
  'unitPrice',
  'availableQuantity',
  'totalCost',
  'grossAmount',
  'netProfit',
  'brokerFees',
  'marketValue',
  'yieldPercent',
];
const OPERATORS = ['+', '-', '*', '/', '%', '**'];

const FORBIDDEN = [
  'export const a = (s: string) => Number(s);',
  'export const a = (s: string) => new Number(s);',
  'export const a = (s: string) => parseFloat(s);',
  'export const a = (s: string) => parseInt(s, 10);',
  'export const a = (s: string) => Number.parseFloat(s);',
  'export const a = (s: string) => Number.parseInt(s, 10);',
  'export const a = (s: string) => globalThis.Number(s);',
  'export const a = (s: string) => window.parseFloat(s);',
  'export const a = (s: string) => +s;',
  ...[...FIELDS, ...SUFFIXED].map((f) => `export const a = (p: { ${f}: string }) => p.${f} * 2;`),
  ...OPERATORS.map((op) => `export const a = (p: { value: string }) => 2 ${op} p.value;`),
  ...OPERATORS.map((op) => `export const a = (p: { value: number }) => { p.value ${op}= 1; };`),
  'export const a = (p: { quantity: number }) => { p.quantity++; };',
  'export const a = (p: { totalCost: string }) => -p.totalCost;',
  'export const a = (p?: { quantity: string }) => p?.quantity * 2;',
  'export const a = (p: { value: string }) => (p.value as unknown as number) * 2;',
  'export const a = (p: { value?: number }) => p.value! * 2;',
];
const ALLOWED = [
  'export const a = (p: { total: number; pageSize: number }) => Math.ceil(p.total / p.pageSize);',
  'export const a = (p: { operationCount: number }) => p.operationCount + 1;',
  'export const a = (i: number) => i + 1;',
  'export const a = (p: { name: string }) => "Carteira " + p.name;',
  'export const a = (p: { value: string }) => `R$ ${p.value}`;',
  "export const a = (p: { quantity: string }) => p.quantity === '0';",
];

const eslint = new ESLint();
const failures = [];

async function ruleErrors(code, filePath) {
  if (await eslint.isPathIgnored(filePath)) {
    failures.push(`${filePath} is ignored by the config; the probe would test nothing`);
    return 0;
  }
  const [{ messages }] = await eslint.lintText(code, { filePath });
  const broken = messages.find((m) => m.fatal || m.ruleId === null);
  if (broken) failures.push(`${filePath}: probe not linted (${broken.message}): ${code}`);
  return messages.filter((m) => m.ruleId === RULE && m.severity === 2).length;
}

for (const dir of ['features', 'shared', 'core']) {
  const file = `src/app/${dir}/__money_probe__.ts`;
  for (const code of FORBIDDEN) {
    if (!(await ruleErrors(code, file))) failures.push(`not an error in ${dir}/: ${code}`);
  }
}
for (const code of ALLOWED) {
  if (await ruleErrors(code, 'src/app/features/__money_probe__.ts'))
    failures.push(`error but allowed: ${code}`);
}
if (await ruleErrors(FORBIDDEN[0], 'src/app/shared/__money_probe__.chart.ts')) {
  failures.push('error in a *.chart.ts file (the chart exception)');
}

const strict = new ESLint({ allowInlineConfig: false });
for (const { filePath, messages } of await strict.lintFiles(['src/app'])) {
  for (const m of messages.filter((m) => m.ruleId === RULE)) {
    failures.push(
      `${filePath}:${m.line}: ${RULE} switched off by a comment; chart data goes in a *.chart.ts file`,
    );
  }
}

if (failures.length) {
  console.error('Money lint (D5, D28, RN11) check failed:\n' + failures.join('\n'));
  process.exit(1);
}
