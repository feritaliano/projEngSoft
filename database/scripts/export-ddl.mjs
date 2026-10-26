// Gera database/sql/ddl.sql a partir do banco migrado (D7, D22): só o schema public, sem a
// tabela de controle do Prisma. Uso: npm run db:ddl
// Por padrão roda o pg_dump dentro do contêiner do docker-compose (carteira-b3-db);
// com PG_DUMP=local usa o pg_dump instalado na máquina (PostgreSQL 16).
import "dotenv/config";
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const url = new URL(process.env.DATABASE_URL);
const db = url.pathname.slice(1);
const user = decodeURIComponent(url.username);
const args = ["--schema-only", "--schema=public", "--no-owner", "--no-privileges", "--exclude-table=_prisma_migrations"];

let dump;
if (process.env.PG_DUMP === "local") {
  dump = execFileSync("pg_dump", ["-h", url.hostname, "-p", url.port || "5432", "-U", user, "-d", db, ...args], {
    env: { ...process.env, PGPASSWORD: decodeURIComponent(url.password) },
    encoding: "utf8",
  });
} else {
  dump = execFileSync("docker", ["exec", "carteira-b3-db", "pg_dump", "-U", user, "-d", db, ...args], { encoding: "utf8" });
}

const header = [
  "-- Carteira B3 — DDL do schema de domínio (public), PostgreSQL 16.",
  "-- ARQUIVO GERADO por `npm run db:ddl` (pg_dump do banco migrado). Não edite à mão:",
  "-- a fonte da verdade é prisma/schema.prisma + prisma/migrations.",
  "-- Nomes físicos em inglês; correspondência com o ER em database/docs/glossario.md.",
  "",
  "CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA public;",
  "",
].join("\n");

// remove só as linhas de comentário vazias e de versão do pg_dump, que mudam entre máquinas
const body = dump
  .split("\n")
  .filter((l) => !/^-- Dumped (from|by) /.test(l) && !/^\\(un)?restrict /.test(l))
  .join("\n")
  .replace(/^CREATE SCHEMA public;$/m, "CREATE SCHEMA IF NOT EXISTS public;")
  .replace(/^COMMENT ON SCHEMA public IS .*$/m, "")
  .replace(/\n{3,}/g, "\n\n");

writeFileSync("database/sql/ddl.sql", header + body);
console.log("database/sql/ddl.sql gerado");
