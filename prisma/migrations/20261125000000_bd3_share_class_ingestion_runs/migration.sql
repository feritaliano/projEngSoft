-- BD-3 (D64): classes de ação que faltavam em share_class e o registro das execuções da ingestão (ops.ingestion_runs).
-- Gerada por `prisma migrate diff` a partir de prisma/schema.prisma. Ajustes à mão: tipos qualificados com o schema
-- (não depender do search_path), valores novos antes de UNIT (o ddl.sql fica em ordem de leitura) e a seção final.
-- ADD VALUE roda dentro da transação da migration no PostgreSQL 12+; nada aqui usa os valores novos.

-- AlterEnum
-- Fontes: layout do COTAHIST da B3 (tabela ESPECI) e legenda da página "Empresas listadas"; database/docs/fontes-poc.md, seção 7.
ALTER TYPE "public"."share_class" ADD VALUE 'PNC' BEFORE 'UNIT';
ALTER TYPE "public"."share_class" ADD VALUE 'PND' BEFORE 'UNIT';
ALTER TYPE "public"."share_class" ADD VALUE 'PNV' BEFORE 'UNIT';
ALTER TYPE "public"."share_class" ADD VALUE 'PRA' BEFORE 'UNIT';
ALTER TYPE "public"."share_class" ADD VALUE 'PRB' BEFORE 'UNIT';

-- CreateEnum
CREATE TYPE "ops"."ingestion_status" AS ENUM ('RUNNING', 'SUCCEEDED', 'FAILED');

-- CreateTable
CREATE TABLE "ops"."ingestion_runs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source" VARCHAR(40) NOT NULL,
    "file_name" VARCHAR(255),
    "file_sha256" CHAR(64),
    "reference_date" DATE,
    "status" "ops"."ingestion_status" NOT NULL DEFAULT 'RUNNING',
    "rows_read" INTEGER NOT NULL DEFAULT 0,
    "rows_written" INTEGER NOT NULL DEFAULT 0,
    "rows_rejected" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "started_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ(3),

    CONSTRAINT "ingestion_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ingestion_runs_source_file_sha256_idx" ON "ops"."ingestion_runs"("source", "file_sha256");

-- ================================================================ escrito à mão: CHECK constraints e índice parcial

-- Fonte como código em maiúsculas, definido pelo adapter do backend (ex.: B3_COTAHIST, B3_INSTRUMENTS, BCB_SGS)
ALTER TABLE "ops"."ingestion_runs" ADD CONSTRAINT "ingestion_runs_source_check" CHECK ("source" ~ '^[A-Z][A-Z0-9_]{1,39}$');

-- SHA-256 do arquivo baixado em hexadecimal minúsculo (mesmo formato de import_batches.file_sha256)
ALTER TABLE "ops"."ingestion_runs" ADD CONSTRAINT "ingestion_runs_file_sha256_check" CHECK ("file_sha256" ~ '^[0-9a-f]{64}$');

-- Contagens de linhas não negativas. Sem relação entre elas: linhas fora do catálogo não são gravadas nem rejeitadas,
-- e uma linha lida pode gravar mais de uma tabela (emissor e ativo)
ALTER TABLE "ops"."ingestion_runs" ADD CONSTRAINT "ingestion_runs_rows_check" CHECK ("rows_read" >= 0 AND "rows_written" >= 0 AND "rows_rejected" >= 0);

-- Só a execução em andamento não tem fim. Sem CHECK entre finished_at e started_at: started_at vem do relógio do banco
-- e finished_at pode vir do da aplicação (mesma razão da D39)
ALTER TABLE "ops"."ingestion_runs" ADD CONSTRAINT "ingestion_runs_finished_at_check" CHECK (("status" = 'RUNNING') = ("finished_at" IS NULL));

-- Erro só (e sempre) na execução que falhou
ALTER TABLE "ops"."ingestion_runs" ADD CONSTRAINT "ingestion_runs_error_check" CHECK (("status" = 'FAILED') = ("error" IS NOT NULL));

-- Execução com sucesso identifica o arquivo: é o que torna o hash a chave da idempotência
ALTER TABLE "ops"."ingestion_runs" ADD CONSTRAINT "ingestion_runs_succeeded_check" CHECK ("status" <> 'SUCCEEDED' OR ("file_name" IS NOT NULL AND "file_sha256" IS NOT NULL AND "reference_date" IS NOT NULL));

-- No máximo uma execução em andamento por fonte. O advisory lock do backend é a trava principal; este índice segura o
-- caso em que ele falha (outro processo sem o lock). Uma linha RUNNING de um worker que caiu fica órfã: quem obtém o
-- lock da fonte sabe que ninguém mais roda e a fecha como FAILED antes de inserir a sua
CREATE UNIQUE INDEX "ingestion_runs_source_running_key" ON "ops"."ingestion_runs"("source") WHERE "status" = 'RUNNING';
