import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Prisma 7: a URL do banco vem do .env (DATABASE_URL), criado a partir do .env.example.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // database/sql/inserts.sql é a fonte única do seed; `prisma db seed` só o executa (igual a npm run db:seed).
    seed: "node database/scripts/run-sql.mjs database/sql/inserts.sql",
  },
  datasource: {
    url: env("DATABASE_URL"),
    shadowDatabaseUrl: env("SHADOW_DATABASE_URL"),
  },
});
