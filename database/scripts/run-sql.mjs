// Executa um arquivo .sql no banco do docker-compose (ou num PostgreSQL local com PSQL=local).
// Uso: node database/scripts/run-sql.mjs database/tests/constraints.sql
import "dotenv/config";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const file = process.argv[2];
if (!file) { console.error("informe o arquivo .sql"); process.exit(2); }
const url = new URL(process.env.DATABASE_URL);
const db = url.pathname.slice(1), user = decodeURIComponent(url.username);
const sql = readFileSync(file);
const opts = { input: sql, stdio: ["pipe", "inherit", "inherit"] };
if (process.env.PSQL === "local") {
  execFileSync("psql", ["-h", url.hostname, "-p", url.port || "5432", "-U", user, "-d", db, "-v", "ON_ERROR_STOP=1", "-q"],
    { ...opts, env: { ...process.env, PGPASSWORD: decodeURIComponent(url.password) } });
} else {
  execFileSync("docker", ["exec", "-i", "carteira-b3-db", "psql", "-U", user, "-d", db, "-v", "ON_ERROR_STOP=1", "-q"], opts);
}
