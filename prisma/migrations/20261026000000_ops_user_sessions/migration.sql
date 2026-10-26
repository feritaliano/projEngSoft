-- Schema técnico ops com as sessões de refresh token (D2, D39). Fora do ER e do ddl.sql de BD (D22).
-- Gerada por `prisma migrate diff` a partir de prisma/schema.prisma; não altera nada em public.
-- A FK foi qualificada com "public" para não depender do search_path; seção final escrita à mão (CHECK).

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "ops";

-- CreateTable
CREATE TABLE "ops"."user_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "family_id" UUID NOT NULL,
    "token_hash" CHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "revoked_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_token_hash_key" ON "ops"."user_sessions"("token_hash");

-- CreateIndex
CREATE INDEX "user_sessions_user_id_idx" ON "ops"."user_sessions"("user_id");

-- CreateIndex
CREATE INDEX "user_sessions_family_id_idx" ON "ops"."user_sessions"("family_id");

-- AddForeignKey
ALTER TABLE "ops"."user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ================================================================ escrito à mão: CHECK constraints

-- Hash SHA-256 do refresh token em hexadecimal minúsculo (o token nunca é gravado)
ALTER TABLE "ops"."user_sessions" ADD CONSTRAINT "user_sessions_token_hash_check" CHECK ("token_hash" ~ '^[0-9a-f]{64}$');

-- A sessão expira depois de criada. Sem CHECK entre revoked_at e created_at: os relógios da API e do banco podem divergir (D39)
ALTER TABLE "ops"."user_sessions" ADD CONSTRAINT "user_sessions_expiry_check" CHECK ("expires_at" > "created_at");
