import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Prisma 7: a URL do banco vem do .env (DATABASE_URL), criado a partir do .env.example.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
    shadowDatabaseUrl: env("SHADOW_DATABASE_URL"),
  },
});
