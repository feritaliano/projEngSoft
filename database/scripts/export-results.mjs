// Gera database/results/ (tarefa P3) num banco migrado e semeado: a listagem completa de cada tabela de public
// (tables/<tabela>.txt, ordenada pela PK) e o resultado de cada consulta de database/sql/queries.sql
// (queries/consulta-NN.txt, com enunciado e SQL no topo). Texto alinhado do psql, pronto para o relatório.
// Uso: npm run db:results. Os arquivos versionados vêm de um banco recém-semeado (o CI confere): num banco de
// desenvolvimento com dados criados pela tela, a listagem muda.
// Mesmo caminho do run-sql.mjs: psql de dentro do contêiner (PG_CONTAINER); com PSQL=local usa o da máquina.
import "dotenv/config";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";

const url = new URL(process.env.DATABASE_URL);
const db = url.pathname.slice(1), user = decodeURIComponent(url.username);
const TZ = "America/Sao_Paulo"; // timestamptz sai no fuso do seed, igual em qualquer máquina

function psql(sql, extra = []) {
  const args = ["-X", "-U", user, "-d", db, "-v", "ON_ERROR_STOP=1", "-q", "-P", "pager=off", ...extra];
  const opts = { input: sql, encoding: "utf8", stdio: ["pipe", "pipe", "inherit"] };
  if (process.env.PSQL === "local") {
    return execFileSync("psql", ["-h", url.hostname, "-p", url.port || "5432", ...args],
      { ...opts, env: { ...process.env, PGPASSWORD: decodeURIComponent(url.password), PGTZ: TZ } });
  }
  return execFileSync("docker", ["exec", "-i", "-e", `PGTZ=${TZ}`, process.env.PG_CONTAINER || "carteira-b3-db", "psql", ...args], opts);
}

const out = "database/results";
rmSync(out, { recursive: true, force: true }); // arquivo de tabela ou consulta que deixou de existir some no diff
mkdirSync(`${out}/tables`, { recursive: true });
mkdirSync(`${out}/queries`, { recursive: true });

// Tabelas de public com as colunas da PK, em ordem; _prisma_migrations é controle do Prisma, fora do ER.
const tables = psql(`
  SELECT c.relname, string_agg(quote_ident(a.attname), ', ' ORDER BY k.ord)
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = 'public'
  JOIN pg_constraint p ON p.conrelid = c.oid AND p.contype = 'p'
  CROSS JOIN LATERAL unnest(p.conkey) WITH ORDINALITY AS k(attnum, ord)
  JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = k.attnum
  WHERE c.relkind = 'r' AND c.relname <> '_prisma_migrations'
  GROUP BY c.relname ORDER BY c.relname;`, ["-At", "-F", "\t"]).trim().split("\n").map((l) => l.split("\t"));
const tableCount = Number(psql(`SELECT count(*) FROM pg_tables WHERE schemaname = 'public' AND tablename <> '_prisma_migrations';`, ["-At"]));
if (tables.length !== tableCount) throw new Error(`${tableCount - tables.length} tabela(s) de public sem PK: sem ordem determinística`);

for (const [name, pk] of tables) {
  const body = psql(`SELECT * FROM public.${name} ORDER BY ${pk};`);
  writeFileSync(`${out}/tables/${name}.txt`, `-- Listagem completa da tabela ${name} (ordem: ${pk})\n\n${body}`);
}

// Cada bloco começa em "-- Consulta N." e vai até o próximo bloco ou cabeçalho de seção ("-- ====").
const blocks = readFileSync("database/sql/queries.sql", "utf8").split(/^(?=-- Consulta \d+\.|-- =+)/m)
  .filter((b) => /^-- Consulta \d+\./.test(b));
blocks.forEach((block, i) => {
  const n = Number(block.match(/^-- Consulta (\d+)\./)[1]);
  if (n !== i + 1) throw new Error(`queries.sql: esperada a consulta ${i + 1}, encontrada a ${n}`);
  const sql = block.trimEnd();
  writeFileSync(`${out}/queries/consulta-${String(n).padStart(2, "0")}.txt`, `${sql}\n\n${psql(sql)}`);
});

console.log(`database/results: ${tables.length} tabelas, ${blocks.length} consultas`);
