-- Migration inicial do schema de domínio (public): 29 tabelas do ER congelado (D14).
-- Gerada a partir de prisma/schema.prisma no formato do Prisma Migrate; seção final escrita à mão
-- (extensão citext e CHECK constraints, que o Prisma não expressa).

-- Extensão necessária para users.email (e-mail único sem diferenciar maiúsculas)
CREATE EXTENSION IF NOT EXISTS citext;

-- CreateEnum
CREATE TYPE "import_batch_status" AS ENUM ('PENDING', 'CONFIRMED', 'DISCARDED');

-- CreateEnum
CREATE TYPE "operation_type" AS ENUM ('BUY', 'SELL');

-- CreateEnum
CREATE TYPE "issuer_kind" AS ENUM ('COMPANY', 'FUND', 'FOREIGN');

-- CreateEnum
CREATE TYPE "asset_type" AS ENUM ('STOCK', 'FII', 'ETF', 'BDR');

-- CreateEnum
CREATE TYPE "share_class" AS ENUM ('ON', 'PN', 'PNA', 'PNB', 'UNIT');

-- CreateEnum
CREATE TYPE "index_code" AS ENUM ('CDI', 'SELIC', 'IPCA', 'IBOV');

-- CreateEnum
CREATE TYPE "index_periodicity" AS ENUM ('DAILY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "index_unit" AS ENUM ('RATE_PERCENT', 'POINTS');

-- CreateEnum
CREATE TYPE "filing_type" AS ENUM ('DFP', 'ITR');

-- CreateEnum
CREATE TYPE "statement_scope" AS ENUM ('INDIVIDUAL', 'CONSOLIDATED');

-- CreateEnum
CREATE TYPE "property_class" AS ENUM ('RENT_FINISHED', 'RENT_UNDER_CONSTRUCTION', 'SALE_FINISHED', 'SALE_UNDER_CONSTRUCTION');

-- CreateEnum
CREATE TYPE "corporate_event_type" AS ENUM ('SPLIT', 'REVERSE_SPLIT', 'BONUS');

-- CreateEnum
CREATE TYPE "data_source" AS ENUM ('B3', 'MANUAL');

-- CreateEnum
CREATE TYPE "income_type" AS ENUM ('DIVIDEND', 'JCP', 'FII_INCOME');

-- CreateEnum
CREATE TYPE "tax_category_code" AS ENUM ('COMMON_STOCK', 'COMMON_OTHER', 'DAY_TRADE', 'FII');

-- CreateEnum
CREATE TYPE "indicator_group" AS ENUM ('VALUATION', 'EFFICIENCY', 'PROFITABILITY', 'DEBT', 'GROWTH', 'FII');

-- CreateEnum
CREATE TYPE "indicator_unit" AS ENUM ('RATIO', 'PERCENT', 'CURRENCY');

-- CreateEnum
CREATE TYPE "analysis_asset_type" AS ENUM ('STOCK', 'FII');

-- CreateEnum
CREATE TYPE "price_direction" AS ENUM ('ABOVE', 'BELOW');

-- CreateEnum
CREATE TYPE "sort_direction" AS ENUM ('ASC', 'DESC');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(150) NOT NULL,
    "email" CITEXT NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brokers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(150) NOT NULL,
    "cnpj" CHAR(14) NOT NULL,
    CONSTRAINT "brokers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portfolios" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "portfolios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_batches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "portfolio_id" UUID NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "file_sha256" CHAR(64) NOT NULL,
    "status" "import_batch_status" NOT NULL DEFAULT 'PENDING',
    "row_count" INTEGER NOT NULL,
    "imported_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmed_at" TIMESTAMPTZ(3),
    CONSTRAINT "import_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "portfolio_id" UUID NOT NULL,
    "asset_id" UUID NOT NULL,
    "broker_id" UUID NOT NULL,
    "import_batch_id" UUID,
    "type" "operation_type" NOT NULL,
    "trade_date" DATE NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(20,8) NOT NULL,
    "fees" DECIMAL(18,2) NOT NULL,
    "sequence" BIGSERIAL NOT NULL,
    CONSTRAINT "operations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sectors" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "parent_id" UUID,
    "name" VARCHAR(150) NOT NULL,
    CONSTRAINT "sectors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issuers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sector_id" UUID,
    "name" VARCHAR(150) NOT NULL,
    "kind" "issuer_kind" NOT NULL,
    "cnpj" CHAR(14),
    "cvm_code" VARCHAR(10),
    CONSTRAINT "issuers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "issuer_id" UUID NOT NULL,
    "ticker" VARCHAR(12) NOT NULL,
    "isin" CHAR(12) NOT NULL,
    "type" "asset_type" NOT NULL,
    "share_class" "share_class",
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotes" (
    "asset_id" UUID NOT NULL,
    "quote_date" DATE NOT NULL,
    "open" DECIMAL(20,8) NOT NULL,
    "high" DECIMAL(20,8) NOT NULL,
    "low" DECIMAL(20,8) NOT NULL,
    "close" DECIMAL(20,8) NOT NULL,
    "volume" DECIMAL(18,2) NOT NULL,
    "trades_count" INTEGER NOT NULL,
    CONSTRAINT "quotes_pkey" PRIMARY KEY ("asset_id", "quote_date")
);

-- CreateTable
CREATE TABLE "economic_indexes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" "index_code" NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "periodicity" "index_periodicity" NOT NULL,
    "unit" "index_unit" NOT NULL,
    "source" VARCHAR(100) NOT NULL,
    CONSTRAINT "economic_indexes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "index_values" (
    "economic_index_id" UUID NOT NULL,
    "reference_date" DATE NOT NULL,
    "value" DECIMAL(20,8) NOT NULL,
    CONSTRAINT "index_values_pkey" PRIMARY KEY ("economic_index_id", "reference_date")
);

-- CreateTable
CREATE TABLE "financial_statements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "issuer_id" UUID NOT NULL,
    "filing_type" "filing_type" NOT NULL,
    "fiscal_year_start" DATE NOT NULL,
    "period_end" DATE NOT NULL,
    "version" INTEGER NOT NULL,
    "filed_at" TIMESTAMPTZ(3) NOT NULL,
    "common_shares" BIGINT NOT NULL,
    "preferred_shares" BIGINT NOT NULL,
    "treasury_common" BIGINT NOT NULL,
    "treasury_preferred" BIGINT NOT NULL,
    CONSTRAINT "financial_statements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "statement_lines" (
    "financial_statement_id" UUID NOT NULL,
    "scope" "statement_scope" NOT NULL,
    "account_code" VARCHAR(30) NOT NULL,
    "account_description" VARCHAR(255) NOT NULL,
    "value" DECIMAL(18,2) NOT NULL,
    CONSTRAINT "statement_lines_pkey" PRIMARY KEY ("financial_statement_id", "scope", "account_code")
);

-- CreateTable
CREATE TABLE "fii_monthly_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "issuer_id" UUID NOT NULL,
    "reference_month" DATE NOT NULL,
    "version" INTEGER NOT NULL,
    "net_worth" DECIMAL(18,2) NOT NULL,
    "shares_outstanding" BIGINT NOT NULL,
    "shareholders_count" INTEGER NOT NULL,
    "dividend_yield_month" DECIMAL(10,8) NOT NULL,
    CONSTRAINT "fii_monthly_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fii_quarterly_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "issuer_id" UUID NOT NULL,
    "reference_date" DATE NOT NULL,
    "version" INTEGER NOT NULL,
    CONSTRAINT "fii_quarterly_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fii_report_properties" (
    "fii_quarterly_report_id" UUID NOT NULL,
    "item_number" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "address" VARCHAR(255) NOT NULL,
    "property_class" "property_class" NOT NULL,
    "area" DECIMAL(14,2),
    "vacancy_rate" DECIMAL(10,8),
    "delinquency_rate" DECIMAL(10,8),
    "revenue_share" DECIMAL(10,8),
    "leased_rate" DECIMAL(10,8),
    CONSTRAINT "fii_report_properties_pkey" PRIMARY KEY ("fii_quarterly_report_id", "item_number")
);

-- CreateTable
CREATE TABLE "corporate_filings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "issuer_id" UUID NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "subject" VARCHAR(500) NOT NULL,
    "reference_date" DATE NOT NULL,
    "delivered_at" TIMESTAMPTZ(3) NOT NULL,
    "document_url" VARCHAR(500) NOT NULL,
    "cvm_protocol" VARCHAR(30) NOT NULL,
    CONSTRAINT "corporate_filings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corporate_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "asset_id" UUID NOT NULL,
    "type" "corporate_event_type" NOT NULL,
    "ex_date" DATE NOT NULL,
    "ratio_from" DECIMAL(20,8) NOT NULL,
    "ratio_to" DECIMAL(20,8) NOT NULL,
    "bonus_unit_cost" DECIMAL(20,8),
    "source" "data_source" NOT NULL,
    CONSTRAINT "corporate_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "income_distributions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "asset_id" UUID NOT NULL,
    "type" "income_type" NOT NULL,
    "record_date" DATE NOT NULL,
    "payment_date" DATE,
    "amount_per_share" DECIMAL(20,8) NOT NULL,
    "source" VARCHAR(50) NOT NULL,
    CONSTRAINT "income_distributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "received_income" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "income_distribution_id" UUID NOT NULL,
    "portfolio_id" UUID NOT NULL,
    "broker_id" UUID NOT NULL,
    "base_quantity" INTEGER NOT NULL,
    "gross_amount" DECIMAL(18,2) NOT NULL,
    "withheld_tax" DECIMAL(18,2) NOT NULL,
    "received_at" DATE NOT NULL,
    CONSTRAINT "received_income_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" "tax_category_code" NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "revenue_code" VARCHAR(10) NOT NULL,
    CONSTRAINT "tax_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tax_rules" (
    "tax_category_id" UUID NOT NULL,
    "effective_from" DATE NOT NULL,
    "rate" DECIMAL(10,8) NOT NULL,
    "sales_exemption_limit" DECIMAL(18,2),
    CONSTRAINT "tax_rules_pkey" PRIMARY KEY ("tax_category_id", "effective_from")
);

-- CreateTable
CREATE TABLE "tax_assessments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "darf_id" UUID,
    "tax_category_id" UUID NOT NULL,
    "reference_month" DATE NOT NULL,
    "total_sales" DECIMAL(18,2) NOT NULL,
    "net_result" DECIMAL(18,2) NOT NULL,
    "loss_offset" DECIMAL(18,2) NOT NULL,
    "closed_at" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "tax_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "darfs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "reference_month" DATE NOT NULL,
    "amount_paid" DECIMAL(18,2),
    "paid_at" DATE,
    CONSTRAINT "darfs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "indicators" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(20) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "indicator_group" "indicator_group" NOT NULL,
    "formula" TEXT NOT NULL,
    "unit" "indicator_unit" NOT NULL,
    "applies_to" "analysis_asset_type" NOT NULL,
    CONSTRAINT "indicators_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "price_alerts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "asset_id" UUID NOT NULL,
    "target_price" DECIMAL(20,8) NOT NULL,
    "direction" "price_direction" NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "triggered_at" TIMESTAMPTZ(3),
    "triggered_quote_date" DATE,
    CONSTRAINT "price_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_screens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "sort_indicator_id" UUID,
    "name" VARCHAR(150) NOT NULL,
    "asset_type" "analysis_asset_type" NOT NULL,
    "sort_direction" "sort_direction" NOT NULL,
    CONSTRAINT "saved_screens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "watchlist_items" (
    "user_id" UUID NOT NULL,
    "asset_id" UUID NOT NULL,
    "added_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "watchlist_items_pkey" PRIMARY KEY ("user_id", "asset_id")
);

-- CreateTable
CREATE TABLE "screen_criteria" (
    "saved_screen_id" UUID NOT NULL,
    "indicator_id" UUID NOT NULL,
    "min_value" DECIMAL(20,8),
    "max_value" DECIMAL(20,8),
    CONSTRAINT "screen_criteria_pkey" PRIMARY KEY ("saved_screen_id", "indicator_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "brokers_cnpj_key" ON "brokers"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "portfolios_user_id_name_key" ON "portfolios"("user_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "import_batches_portfolio_id_file_sha256_key" ON "import_batches"("portfolio_id", "file_sha256");

-- CreateIndex
CREATE UNIQUE INDEX "operations_sequence_key" ON "operations"("sequence");

-- CreateIndex
CREATE INDEX "operations_timeline_idx" ON "operations"("portfolio_id", "asset_id", "trade_date", "sequence");

-- CreateIndex
CREATE INDEX "operations_asset_id_idx" ON "operations"("asset_id");

-- CreateIndex
CREATE UNIQUE INDEX "sectors_parent_id_name_key" ON "sectors"("parent_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "issuers_cnpj_key" ON "issuers"("cnpj");

-- CreateIndex
CREATE UNIQUE INDEX "issuers_cvm_code_key" ON "issuers"("cvm_code");

-- CreateIndex
CREATE INDEX "issuers_sector_id_idx" ON "issuers"("sector_id");

-- CreateIndex
CREATE UNIQUE INDEX "assets_ticker_key" ON "assets"("ticker");

-- CreateIndex
CREATE UNIQUE INDEX "assets_isin_key" ON "assets"("isin");

-- CreateIndex
CREATE INDEX "assets_issuer_id_idx" ON "assets"("issuer_id");

-- CreateIndex
CREATE UNIQUE INDEX "economic_indexes_code_key" ON "economic_indexes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "financial_statements_issuer_id_period_end_key" ON "financial_statements"("issuer_id", "period_end");

-- CreateIndex
CREATE UNIQUE INDEX "fii_monthly_reports_issuer_id_reference_month_key" ON "fii_monthly_reports"("issuer_id", "reference_month");

-- CreateIndex
CREATE UNIQUE INDEX "fii_quarterly_reports_issuer_id_reference_date_key" ON "fii_quarterly_reports"("issuer_id", "reference_date");

-- CreateIndex
CREATE UNIQUE INDEX "corporate_filings_cvm_protocol_key" ON "corporate_filings"("cvm_protocol");

-- CreateIndex
CREATE INDEX "corporate_filings_issuer_id_reference_date_idx" ON "corporate_filings"("issuer_id", "reference_date");

-- CreateIndex
CREATE UNIQUE INDEX "corporate_events_asset_id_type_ex_date_key" ON "corporate_events"("asset_id", "type", "ex_date");

-- CreateIndex
CREATE INDEX "income_distributions_asset_id_record_date_idx" ON "income_distributions"("asset_id", "record_date");

-- CreateIndex
CREATE UNIQUE INDEX "received_income_portfolio_distribution_broker_key" ON "received_income"("portfolio_id", "income_distribution_id", "broker_id");

-- CreateIndex
CREATE UNIQUE INDEX "tax_categories_code_key" ON "tax_categories"("code");

-- CreateIndex
CREATE INDEX "tax_assessments_darf_id_idx" ON "tax_assessments"("darf_id");

-- CreateIndex
CREATE UNIQUE INDEX "tax_assessments_user_month_category_key" ON "tax_assessments"("user_id", "reference_month", "tax_category_id");

-- CreateIndex
CREATE UNIQUE INDEX "darfs_user_id_reference_month_key" ON "darfs"("user_id", "reference_month");

-- CreateIndex
CREATE UNIQUE INDEX "indicators_code_key" ON "indicators"("code");

-- CreateIndex
CREATE INDEX "price_alerts_user_id_idx" ON "price_alerts"("user_id");

-- CreateIndex
CREATE INDEX "price_alerts_asset_id_idx" ON "price_alerts"("asset_id");

-- CreateIndex
CREATE UNIQUE INDEX "saved_screens_user_id_name_key" ON "saved_screens"("user_id", "name");

-- CreateIndex
CREATE INDEX "screen_criteria_indicator_id_idx" ON "screen_criteria"("indicator_id");

-- AddForeignKey
ALTER TABLE "portfolios" ADD CONSTRAINT "portfolios_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_portfolio_id_fkey" FOREIGN KEY ("portfolio_id") REFERENCES "portfolios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations" ADD CONSTRAINT "operations_portfolio_id_fkey" FOREIGN KEY ("portfolio_id") REFERENCES "portfolios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations" ADD CONSTRAINT "operations_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations" ADD CONSTRAINT "operations_broker_id_fkey" FOREIGN KEY ("broker_id") REFERENCES "brokers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operations" ADD CONSTRAINT "operations_import_batch_id_fkey" FOREIGN KEY ("import_batch_id") REFERENCES "import_batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sectors" ADD CONSTRAINT "sectors_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "sectors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issuers" ADD CONSTRAINT "issuers_sector_id_fkey" FOREIGN KEY ("sector_id") REFERENCES "sectors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_issuer_id_fkey" FOREIGN KEY ("issuer_id") REFERENCES "issuers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "index_values" ADD CONSTRAINT "index_values_economic_index_id_fkey" FOREIGN KEY ("economic_index_id") REFERENCES "economic_indexes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_statements" ADD CONSTRAINT "financial_statements_issuer_id_fkey" FOREIGN KEY ("issuer_id") REFERENCES "issuers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "statement_lines" ADD CONSTRAINT "statement_lines_financial_statement_id_fkey" FOREIGN KEY ("financial_statement_id") REFERENCES "financial_statements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fii_monthly_reports" ADD CONSTRAINT "fii_monthly_reports_issuer_id_fkey" FOREIGN KEY ("issuer_id") REFERENCES "issuers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fii_quarterly_reports" ADD CONSTRAINT "fii_quarterly_reports_issuer_id_fkey" FOREIGN KEY ("issuer_id") REFERENCES "issuers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fii_report_properties" ADD CONSTRAINT "fii_report_properties_fii_quarterly_report_id_fkey" FOREIGN KEY ("fii_quarterly_report_id") REFERENCES "fii_quarterly_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_filings" ADD CONSTRAINT "corporate_filings_issuer_id_fkey" FOREIGN KEY ("issuer_id") REFERENCES "issuers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_events" ADD CONSTRAINT "corporate_events_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "income_distributions" ADD CONSTRAINT "income_distributions_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "received_income" ADD CONSTRAINT "received_income_income_distribution_id_fkey" FOREIGN KEY ("income_distribution_id") REFERENCES "income_distributions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "received_income" ADD CONSTRAINT "received_income_portfolio_id_fkey" FOREIGN KEY ("portfolio_id") REFERENCES "portfolios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "received_income" ADD CONSTRAINT "received_income_broker_id_fkey" FOREIGN KEY ("broker_id") REFERENCES "brokers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_rules" ADD CONSTRAINT "tax_rules_tax_category_id_fkey" FOREIGN KEY ("tax_category_id") REFERENCES "tax_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_assessments" ADD CONSTRAINT "tax_assessments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_assessments" ADD CONSTRAINT "tax_assessments_darf_id_fkey" FOREIGN KEY ("darf_id") REFERENCES "darfs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tax_assessments" ADD CONSTRAINT "tax_assessments_tax_category_id_fkey" FOREIGN KEY ("tax_category_id") REFERENCES "tax_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "darfs" ADD CONSTRAINT "darfs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_alerts" ADD CONSTRAINT "price_alerts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "price_alerts" ADD CONSTRAINT "price_alerts_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_screens" ADD CONSTRAINT "saved_screens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_screens" ADD CONSTRAINT "saved_screens_sort_indicator_id_fkey" FOREIGN KEY ("sort_indicator_id") REFERENCES "indicators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchlist_items" ADD CONSTRAINT "watchlist_items_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchlist_items" ADD CONSTRAINT "watchlist_items_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screen_criteria" ADD CONSTRAINT "screen_criteria_saved_screen_id_fkey" FOREIGN KEY ("saved_screen_id") REFERENCES "saved_screens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "screen_criteria" ADD CONSTRAINT "screen_criteria_indicator_id_fkey" FOREIGN KEY ("indicator_id") REFERENCES "indicators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ============================================================================
-- Seção manual: regras de integridade do ER (database/docs/modelo-er.md, seção 4)
-- que o Prisma não expressa. Regras que dependem de outras linhas ou do tempo
-- (venda acima da posição, data não futura, profundidade do setor, informe só
-- para emissor FUND) ficam no backend, não em triggers (padrão do projeto).
-- ============================================================================

-- Corretora e emissor: CNPJ com 14 dígitos
ALTER TABLE "brokers" ADD CONSTRAINT "brokers_cnpj_check" CHECK ("cnpj" ~ '^[0-9]{14}$');
ALTER TABLE "issuers" ADD CONSTRAINT "issuers_cnpj_check" CHECK ("cnpj" IS NULL OR "cnpj" ~ '^[0-9]{14}$');

-- Lote de importação
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_row_count_check" CHECK ("row_count" >= 0);
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_file_sha256_check" CHECK ("file_sha256" ~ '^[0-9a-f]{64}$');
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_confirmed_at_check" CHECK (("status" = 'CONFIRMED') = ("confirmed_at" IS NOT NULL));

-- Operação (RN04): quantidade inteira > 0, preço > 0, custos >= 0
ALTER TABLE "operations" ADD CONSTRAINT "operations_quantity_check" CHECK ("quantity" > 0);
ALTER TABLE "operations" ADD CONSTRAINT "operations_unit_price_check" CHECK ("unit_price" > 0);
ALTER TABLE "operations" ADD CONSTRAINT "operations_fees_check" CHECK ("fees" >= 0);

-- Setor: um setor não é pai de si mesmo
ALTER TABLE "sectors" ADD CONSTRAINT "sectors_parent_check" CHECK ("parent_id" IS NULL OR "parent_id" <> "id");

-- Ativo: ticker no formato B3 (4 caracteres + 1 ou 2 dígitos, ex.: PETR4, B3SA3, TAEE11),
-- ISIN com 12 caracteres, classe só para ações
ALTER TABLE "assets" ADD CONSTRAINT "assets_ticker_check" CHECK ("ticker" ~ '^[A-Z0-9]{4}[0-9]{1,2}$');
ALTER TABLE "assets" ADD CONSTRAINT "assets_isin_check" CHECK ("isin" ~ '^[A-Z]{2}[A-Z0-9]{9}[0-9]$');
ALTER TABLE "assets" ADD CONSTRAINT "assets_share_class_check" CHECK ("share_class" IS NULL OR "type" = 'STOCK');

-- Cotação: preços > 0, mínima <= abertura/fechamento <= máxima
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_prices_positive_check" CHECK ("open" > 0 AND "high" > 0 AND "low" > 0 AND "close" > 0);
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_range_check" CHECK ("low" <= "high" AND "open" BETWEEN "low" AND "high" AND "close" BETWEEN "low" AND "high");
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_volume_check" CHECK ("volume" >= 0 AND "trades_count" >= 0);

-- Demonstração
ALTER TABLE "financial_statements" ADD CONSTRAINT "financial_statements_version_check" CHECK ("version" >= 1);
ALTER TABLE "financial_statements" ADD CONSTRAINT "financial_statements_period_check" CHECK ("period_end" > "fiscal_year_start");
ALTER TABLE "financial_statements" ADD CONSTRAINT "financial_statements_shares_check" CHECK ("common_shares" >= 0 AND "preferred_shares" >= 0 AND "treasury_common" >= 0 AND "treasury_preferred" >= 0);

-- Informe mensal de FII: mês de referência no 1º dia do mês
ALTER TABLE "fii_monthly_reports" ADD CONSTRAINT "fii_monthly_reports_version_check" CHECK ("version" >= 1);
ALTER TABLE "fii_monthly_reports" ADD CONSTRAINT "fii_monthly_reports_month_check" CHECK ("reference_month" = date_trunc('month', "reference_month")::date);
ALTER TABLE "fii_monthly_reports" ADD CONSTRAINT "fii_monthly_reports_values_check" CHECK ("shares_outstanding" > 0 AND "shareholders_count" >= 0 AND "dividend_yield_month" >= 0);

-- Informe trimestral de FII e imóveis do informe (D31)
ALTER TABLE "fii_quarterly_reports" ADD CONSTRAINT "fii_quarterly_reports_version_check" CHECK ("version" >= 1);
ALTER TABLE "fii_report_properties" ADD CONSTRAINT "fii_report_properties_item_number_check" CHECK ("item_number" >= 1);
ALTER TABLE "fii_report_properties" ADD CONSTRAINT "fii_report_properties_area_check" CHECK ("area" IS NULL OR "area" > 0);
ALTER TABLE "fii_report_properties" ADD CONSTRAINT "fii_report_properties_rates_check" CHECK (
  ("vacancy_rate" IS NULL OR "vacancy_rate" BETWEEN 0 AND 1) AND
  ("delinquency_rate" IS NULL OR "delinquency_rate" BETWEEN 0 AND 1) AND
  ("revenue_share" IS NULL OR "revenue_share" BETWEEN 0 AND 1) AND
  ("leased_rate" IS NULL OR "leased_rate" BETWEEN 0 AND 1));
ALTER TABLE "fii_report_properties" ADD CONSTRAINT "fii_report_properties_vacancy_class_check" CHECK ("vacancy_rate" IS NULL OR "property_class" = 'RENT_FINISHED');
ALTER TABLE "fii_report_properties" ADD CONSTRAINT "fii_report_properties_leased_class_check" CHECK ("leased_rate" IS NULL OR "property_class" = 'RENT_UNDER_CONSTRUCTION');

-- Evento corporativo: proporções > 0 e coerentes com o tipo; custo só (e sempre) na bonificação
ALTER TABLE "corporate_events" ADD CONSTRAINT "corporate_events_ratio_check" CHECK ("ratio_from" > 0 AND "ratio_to" > 0);
ALTER TABLE "corporate_events" ADD CONSTRAINT "corporate_events_direction_check" CHECK (
  ("type" = 'SPLIT' AND "ratio_to" > "ratio_from") OR
  ("type" = 'REVERSE_SPLIT' AND "ratio_to" < "ratio_from") OR
  ("type" = 'BONUS' AND "ratio_to" > "ratio_from"));
ALTER TABLE "corporate_events" ADD CONSTRAINT "corporate_events_bonus_cost_check" CHECK ((("type" = 'BONUS') = ("bonus_unit_cost" IS NOT NULL)) AND ("bonus_unit_cost" IS NULL OR "bonus_unit_cost" >= 0));

-- Provento e provento recebido
ALTER TABLE "income_distributions" ADD CONSTRAINT "income_distributions_amount_check" CHECK ("amount_per_share" > 0);
ALTER TABLE "income_distributions" ADD CONSTRAINT "income_distributions_dates_check" CHECK ("payment_date" IS NULL OR "payment_date" >= "record_date");
ALTER TABLE "received_income" ADD CONSTRAINT "received_income_values_check" CHECK ("base_quantity" > 0 AND "gross_amount" >= 0 AND "withheld_tax" >= 0 AND "withheld_tax" <= "gross_amount");

-- Regra de IR: alíquota como fração 0–1; limite de isenção positivo quando houver
ALTER TABLE "tax_rules" ADD CONSTRAINT "tax_rules_rate_check" CHECK ("rate" BETWEEN 0 AND 1);
ALTER TABLE "tax_rules" ADD CONSTRAINT "tax_rules_exemption_check" CHECK ("sales_exemption_limit" IS NULL OR "sales_exemption_limit" > 0);

-- Apuração e DARF: mês de referência no 1º dia do mês; pagamento informado por inteiro
ALTER TABLE "tax_assessments" ADD CONSTRAINT "tax_assessments_month_check" CHECK ("reference_month" = date_trunc('month', "reference_month")::date);
ALTER TABLE "tax_assessments" ADD CONSTRAINT "tax_assessments_values_check" CHECK ("total_sales" >= 0 AND "loss_offset" >= 0);
ALTER TABLE "darfs" ADD CONSTRAINT "darfs_month_check" CHECK ("reference_month" = date_trunc('month', "reference_month")::date);
ALTER TABLE "darfs" ADD CONSTRAINT "darfs_payment_check" CHECK ((("amount_paid" IS NULL) = ("paid_at" IS NULL)) AND ("amount_paid" IS NULL OR "amount_paid" > 0));

-- Alerta de preço
ALTER TABLE "price_alerts" ADD CONSTRAINT "price_alerts_target_price_check" CHECK ("target_price" > 0);
ALTER TABLE "price_alerts" ADD CONSTRAINT "price_alerts_trigger_check" CHECK (("triggered_at" IS NULL) = ("triggered_quote_date" IS NULL));

-- Critério do filtro: pelo menos um limite; mínimo <= máximo
ALTER TABLE "screen_criteria" ADD CONSTRAINT "screen_criteria_bounds_check" CHECK (
  ("min_value" IS NOT NULL OR "max_value" IS NOT NULL) AND
  ("min_value" IS NULL OR "max_value" IS NULL OR "min_value" <= "max_value"));
