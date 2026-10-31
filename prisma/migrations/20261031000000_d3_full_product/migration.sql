-- D3 (D43, D44, D47, D50): carteira ideal, metas, renda fixa e cripto; programa do BDR.
-- Gerada por `prisma migrate diff` a partir de prisma/schema.prisma; seção final escrita à mão (CHECK).
-- Não altera a migration de init: os CHECK de assets e brokers que mudam de regra são removidos e recriados aqui.

-- CreateEnum
CREATE TYPE "bdr_program" AS ENUM ('DRN', 'DR1', 'DR2', 'DR3', 'DRE');

-- CreateEnum
CREATE TYPE "goal_type" AS ENUM ('NET_WORTH', 'MONTHLY_INCOME');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "asset_type" ADD VALUE 'FIXED_INCOME';
ALTER TYPE "asset_type" ADD VALUE 'CRYPTO';

-- AlterEnum
ALTER TYPE "index_code" ADD VALUE 'IGPM';

-- AlterEnum
ALTER TYPE "issuer_kind" ADD VALUE 'GOVERNMENT';

-- AlterTable
ALTER TABLE "assets" ADD COLUMN     "bdr_program" "bdr_program",
ALTER COLUMN "issuer_id" DROP NOT NULL,
ALTER COLUMN "ticker" DROP NOT NULL,
ALTER COLUMN "isin" DROP NOT NULL;

-- AlterTable
ALTER TABLE "brokers" ALTER COLUMN "cnpj" DROP NOT NULL;

-- AlterTable
ALTER TABLE "operations" ALTER COLUMN "quantity" SET DATA TYPE DECIMAL(20,8);

-- CreateTable
CREATE TABLE "target_allocations" (
    "portfolio_id" UUID NOT NULL,
    "asset_class" "asset_type" NOT NULL,
    "target_percent" DECIMAL(10,8) NOT NULL,

    CONSTRAINT "target_allocations_pkey" PRIMARY KEY ("portfolio_id","asset_class")
);

-- CreateTable
CREATE TABLE "portfolio_goals" (
    "portfolio_id" UUID NOT NULL,
    "type" "goal_type" NOT NULL,
    "target_amount" DECIMAL(18,2) NOT NULL,
    "target_month" DATE,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portfolio_goals_pkey" PRIMARY KEY ("portfolio_id","type")
);

-- CreateTable
CREATE TABLE "fixed_income_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "economic_index_id" UUID,
    "name" VARCHAR(100) NOT NULL,
    "semiannual_interest" BOOLEAN NOT NULL,

    CONSTRAINT "fixed_income_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fixed_income_bonds" (
    "asset_id" UUID NOT NULL,
    "fixed_income_type_id" UUID NOT NULL,
    "maturity_date" DATE NOT NULL,

    CONSTRAINT "fixed_income_bonds_pkey" PRIMARY KEY ("asset_id")
);

-- CreateTable
CREATE TABLE "fixed_income_prices" (
    "asset_id" UUID NOT NULL,
    "base_date" DATE NOT NULL,
    "buy_rate" DECIMAL(10,8),
    "sell_rate" DECIMAL(10,8),
    "buy_price" DECIMAL(20,8),
    "sell_price" DECIMAL(20,8),

    CONSTRAINT "fixed_income_prices_pkey" PRIMARY KEY ("asset_id","base_date")
);

-- CreateTable
CREATE TABLE "crypto_assets" (
    "asset_id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,

    CONSTRAINT "crypto_assets_pkey" PRIMARY KEY ("asset_id")
);

-- CreateTable
CREATE TABLE "crypto_prices" (
    "asset_id" UUID NOT NULL,
    "price_date" DATE NOT NULL,
    "reference_price" DECIMAL(20,8) NOT NULL,

    CONSTRAINT "crypto_prices_pkey" PRIMARY KEY ("asset_id","price_date")
);

-- CreateIndex
CREATE UNIQUE INDEX "fixed_income_types_name_key" ON "fixed_income_types"("name");

-- CreateIndex
CREATE UNIQUE INDEX "fixed_income_bonds_type_maturity_key" ON "fixed_income_bonds"("fixed_income_type_id", "maturity_date");

-- AddForeignKey
ALTER TABLE "target_allocations" ADD CONSTRAINT "target_allocations_portfolio_id_fkey" FOREIGN KEY ("portfolio_id") REFERENCES "portfolios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolio_goals" ADD CONSTRAINT "portfolio_goals_portfolio_id_fkey" FOREIGN KEY ("portfolio_id") REFERENCES "portfolios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixed_income_types" ADD CONSTRAINT "fixed_income_types_economic_index_id_fkey" FOREIGN KEY ("economic_index_id") REFERENCES "economic_indexes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixed_income_bonds" ADD CONSTRAINT "fixed_income_bonds_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixed_income_bonds" ADD CONSTRAINT "fixed_income_bonds_fixed_income_type_id_fkey" FOREIGN KEY ("fixed_income_type_id") REFERENCES "fixed_income_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fixed_income_prices" ADD CONSTRAINT "fixed_income_prices_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "fixed_income_bonds"("asset_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crypto_assets" ADD CONSTRAINT "crypto_assets_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crypto_prices" ADD CONSTRAINT "crypto_prices_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "crypto_assets"("asset_id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ============================================================================
-- Seção manual: regras de integridade das entidades novas e das colunas que
-- mudaram (database/docs/modelo-er.md, seção 4). Regras que dependem de outras
-- linhas ou de outra tabela ficam no backend, não em triggers (padrão do projeto):
-- soma de 100% da carteira ideal; quantidade inteira para ação, FII, ETF e BDR
-- (RN04, o tipo do ativo está em assets); subtipo coerente com assets.type.
-- ============================================================================

-- Corretora: CNPJ opcional (exchange sem CNPJ), com 14 dígitos quando informado
ALTER TABLE "brokers" DROP CONSTRAINT "brokers_cnpj_check";
ALTER TABLE "brokers" ADD CONSTRAINT "brokers_cnpj_check" CHECK ("cnpj" IS NULL OR "cnpj" ~ '^[0-9]{14}$');

-- Ativo: ticker no formato B3 para ação, FII, ETF e BDR; símbolo para cripto; sem ticker para renda fixa
ALTER TABLE "assets" DROP CONSTRAINT "assets_ticker_check";
ALTER TABLE "assets" ADD CONSTRAINT "assets_ticker_check" CHECK (CASE "type"
  WHEN 'FIXED_INCOME' THEN "ticker" IS NULL
  WHEN 'CRYPTO' THEN "ticker" IS NOT NULL AND "ticker" ~ '^[A-Z0-9]{2,10}$'
  ELSE "ticker" IS NOT NULL AND "ticker" ~ '^[A-Z0-9]{4}[0-9]{1,2}$' END);

-- Ativo: ISIN obrigatório nas classes da B3, opcional na renda fixa, ausente na cripto
ALTER TABLE "assets" DROP CONSTRAINT "assets_isin_check";
ALTER TABLE "assets" ADD CONSTRAINT "assets_isin_check" CHECK (
  ("isin" IS NULL OR "isin" ~ '^[A-Z]{2}[A-Z0-9]{9}[0-9]$') AND
  CASE "type" WHEN 'FIXED_INCOME' THEN TRUE WHEN 'CRYPTO' THEN "isin" IS NULL ELSE "isin" IS NOT NULL END);

-- Ativo: só a cripto não tem emissor; programa só (e sempre) no BDR
ALTER TABLE "assets" ADD CONSTRAINT "assets_issuer_check" CHECK (("issuer_id" IS NULL) = ("type" = 'CRYPTO'));
ALTER TABLE "assets" ADD CONSTRAINT "assets_bdr_program_check" CHECK (("bdr_program" IS NOT NULL) = ("type" = 'BDR'));

-- Operação (RN04): operations_quantity_check (> 0) continua; a coluna passa a NUMERIC(20,8)

-- Carteira ideal: percentual-alvo como fração 0–1 (0% é aceito; a soma de 100% é do backend)
ALTER TABLE "target_allocations" ADD CONSTRAINT "target_allocations_percent_check" CHECK ("target_percent" BETWEEN 0 AND 1);

-- Meta: valor-alvo > 0; prazo no 1º dia do mês e não anterior ao mês de criação (horário de Brasília)
ALTER TABLE "portfolio_goals" ADD CONSTRAINT "portfolio_goals_target_amount_check" CHECK ("target_amount" > 0);
ALTER TABLE "portfolio_goals" ADD CONSTRAINT "portfolio_goals_target_month_check" CHECK ("target_month" IS NULL OR (
  "target_month" = date_trunc('month', "target_month")::date AND
  "target_month" >= date_trunc('month', "created_at" AT TIME ZONE 'America/Sao_Paulo')::date));

-- Preços e taxas do Tesouro: taxas como fração ao ano (o spread do Tesouro Selic pode ser negativo);
-- PU > 0; pelo menos um valor por dia
ALTER TABLE "fixed_income_prices" ADD CONSTRAINT "fixed_income_prices_rates_check" CHECK (
  ("buy_rate" IS NULL OR "buy_rate" BETWEEN -1 AND 1) AND
  ("sell_rate" IS NULL OR "sell_rate" BETWEEN -1 AND 1));
ALTER TABLE "fixed_income_prices" ADD CONSTRAINT "fixed_income_prices_prices_check" CHECK (
  ("buy_price" IS NULL OR "buy_price" > 0) AND
  ("sell_price" IS NULL OR "sell_price" > 0));
ALTER TABLE "fixed_income_prices" ADD CONSTRAINT "fixed_income_prices_any_value_check" CHECK (num_nonnulls("buy_rate", "sell_rate", "buy_price", "sell_price") >= 1);

-- Preço de referência da cripto
ALTER TABLE "crypto_prices" ADD CONSTRAINT "crypto_prices_reference_price_check" CHECK ("reference_price" > 0);
