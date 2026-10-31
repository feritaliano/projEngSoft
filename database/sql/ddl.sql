-- Carteira B3 — DDL do schema de domínio (public), PostgreSQL 16.
-- ARQUIVO GERADO por `npm run db:ddl` (pg_dump do banco migrado). Não edite à mão:
-- a fonte da verdade é prisma/schema.prisma + prisma/migrations.
-- Nomes físicos em inglês; correspondência com o ER em database/docs/glossario.md.

CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA public;
--
-- PostgreSQL database dump
--

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA IF NOT EXISTS public;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

--
-- Name: analysis_asset_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.analysis_asset_type AS ENUM (
    'STOCK',
    'FII'
);

--
-- Name: asset_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.asset_type AS ENUM (
    'STOCK',
    'FII',
    'ETF',
    'BDR',
    'FIXED_INCOME',
    'CRYPTO'
);

--
-- Name: bdr_program; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.bdr_program AS ENUM (
    'DRN',
    'DR1',
    'DR2',
    'DR3',
    'DRE'
);

--
-- Name: corporate_event_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.corporate_event_type AS ENUM (
    'SPLIT',
    'REVERSE_SPLIT',
    'BONUS'
);

--
-- Name: data_source; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.data_source AS ENUM (
    'B3',
    'MANUAL'
);

--
-- Name: filing_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.filing_type AS ENUM (
    'DFP',
    'ITR'
);

--
-- Name: goal_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.goal_type AS ENUM (
    'NET_WORTH',
    'MONTHLY_INCOME'
);

--
-- Name: import_batch_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.import_batch_status AS ENUM (
    'PENDING',
    'CONFIRMED',
    'DISCARDED'
);

--
-- Name: income_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.income_type AS ENUM (
    'DIVIDEND',
    'JCP',
    'FII_INCOME'
);

--
-- Name: index_code; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.index_code AS ENUM (
    'CDI',
    'SELIC',
    'IPCA',
    'IBOV',
    'IGPM'
);

--
-- Name: index_periodicity; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.index_periodicity AS ENUM (
    'DAILY',
    'MONTHLY'
);

--
-- Name: index_unit; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.index_unit AS ENUM (
    'RATE_PERCENT',
    'POINTS'
);

--
-- Name: indicator_group; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.indicator_group AS ENUM (
    'VALUATION',
    'EFFICIENCY',
    'PROFITABILITY',
    'DEBT',
    'GROWTH',
    'FII'
);

--
-- Name: indicator_unit; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.indicator_unit AS ENUM (
    'RATIO',
    'PERCENT',
    'CURRENCY'
);

--
-- Name: issuer_kind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.issuer_kind AS ENUM (
    'COMPANY',
    'FUND',
    'FOREIGN',
    'GOVERNMENT'
);

--
-- Name: operation_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.operation_type AS ENUM (
    'BUY',
    'SELL'
);

--
-- Name: price_direction; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.price_direction AS ENUM (
    'ABOVE',
    'BELOW'
);

--
-- Name: property_class; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.property_class AS ENUM (
    'RENT_FINISHED',
    'RENT_UNDER_CONSTRUCTION',
    'SALE_FINISHED',
    'SALE_UNDER_CONSTRUCTION'
);

--
-- Name: share_class; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.share_class AS ENUM (
    'ON',
    'PN',
    'PNA',
    'PNB',
    'UNIT'
);

--
-- Name: sort_direction; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.sort_direction AS ENUM (
    'ASC',
    'DESC'
);

--
-- Name: statement_scope; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.statement_scope AS ENUM (
    'INDIVIDUAL',
    'CONSOLIDATED'
);

--
-- Name: tax_category_code; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.tax_category_code AS ENUM (
    'COMMON_STOCK',
    'COMMON_OTHER',
    'DAY_TRADE',
    'FII'
);

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: assets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    issuer_id uuid,
    ticker character varying(12),
    isin character(12),
    type public.asset_type NOT NULL,
    share_class public.share_class,
    is_active boolean DEFAULT true NOT NULL,
    bdr_program public.bdr_program,
    CONSTRAINT assets_bdr_program_check CHECK (((bdr_program IS NOT NULL) = (type = 'BDR'::public.asset_type))),
    CONSTRAINT assets_isin_check CHECK ((((isin IS NULL) OR (isin ~ '^[A-Z]{2}[A-Z0-9]{9}[0-9]$'::text)) AND
CASE type
    WHEN 'FIXED_INCOME'::public.asset_type THEN true
    WHEN 'CRYPTO'::public.asset_type THEN (isin IS NULL)
    ELSE (isin IS NOT NULL)
END)),
    CONSTRAINT assets_issuer_check CHECK (((issuer_id IS NULL) = (type = 'CRYPTO'::public.asset_type))),
    CONSTRAINT assets_share_class_check CHECK (((share_class IS NULL) OR (type = 'STOCK'::public.asset_type))),
    CONSTRAINT assets_ticker_check CHECK (
CASE type
    WHEN 'FIXED_INCOME'::public.asset_type THEN (ticker IS NULL)
    WHEN 'CRYPTO'::public.asset_type THEN ((ticker IS NOT NULL) AND ((ticker)::text ~ '^[A-Z0-9]{2,10}$'::text))
    ELSE ((ticker IS NOT NULL) AND ((ticker)::text ~ '^[A-Z0-9]{4}[0-9]{1,2}$'::text))
END)
);

--
-- Name: brokers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.brokers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(150) NOT NULL,
    cnpj character(14),
    CONSTRAINT brokers_cnpj_check CHECK (((cnpj IS NULL) OR (cnpj ~ '^[0-9]{14}$'::text)))
);

--
-- Name: corporate_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.corporate_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    asset_id uuid NOT NULL,
    type public.corporate_event_type NOT NULL,
    ex_date date NOT NULL,
    ratio_from numeric(20,8) NOT NULL,
    ratio_to numeric(20,8) NOT NULL,
    bonus_unit_cost numeric(20,8),
    source public.data_source NOT NULL,
    CONSTRAINT corporate_events_bonus_cost_check CHECK ((((type = 'BONUS'::public.corporate_event_type) = (bonus_unit_cost IS NOT NULL)) AND ((bonus_unit_cost IS NULL) OR (bonus_unit_cost >= (0)::numeric)))),
    CONSTRAINT corporate_events_direction_check CHECK ((((type = 'SPLIT'::public.corporate_event_type) AND (ratio_to > ratio_from)) OR ((type = 'REVERSE_SPLIT'::public.corporate_event_type) AND (ratio_to < ratio_from)) OR ((type = 'BONUS'::public.corporate_event_type) AND (ratio_to > ratio_from)))),
    CONSTRAINT corporate_events_ratio_check CHECK (((ratio_from > (0)::numeric) AND (ratio_to > (0)::numeric)))
);

--
-- Name: corporate_filings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.corporate_filings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    issuer_id uuid NOT NULL,
    category character varying(100) NOT NULL,
    subject character varying(500) NOT NULL,
    reference_date date NOT NULL,
    delivered_at timestamp(3) with time zone NOT NULL,
    document_url character varying(500) NOT NULL,
    cvm_protocol character varying(30) NOT NULL
);

--
-- Name: crypto_assets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crypto_assets (
    asset_id uuid NOT NULL,
    name character varying(100) NOT NULL
);

--
-- Name: crypto_prices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crypto_prices (
    asset_id uuid NOT NULL,
    price_date date NOT NULL,
    reference_price numeric(20,8) NOT NULL,
    CONSTRAINT crypto_prices_reference_price_check CHECK ((reference_price > (0)::numeric))
);

--
-- Name: darfs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.darfs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    reference_month date NOT NULL,
    amount_paid numeric(18,2),
    paid_at date,
    CONSTRAINT darfs_month_check CHECK ((reference_month = (date_trunc('month'::text, (reference_month)::timestamp with time zone))::date)),
    CONSTRAINT darfs_payment_check CHECK ((((amount_paid IS NULL) = (paid_at IS NULL)) AND ((amount_paid IS NULL) OR (amount_paid > (0)::numeric))))
);

--
-- Name: economic_indexes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.economic_indexes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code public.index_code NOT NULL,
    name character varying(150) NOT NULL,
    periodicity public.index_periodicity NOT NULL,
    unit public.index_unit NOT NULL,
    source character varying(100) NOT NULL
);

--
-- Name: fii_monthly_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fii_monthly_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    issuer_id uuid NOT NULL,
    reference_month date NOT NULL,
    version integer NOT NULL,
    net_worth numeric(18,2) NOT NULL,
    shares_outstanding bigint NOT NULL,
    shareholders_count integer NOT NULL,
    dividend_yield_month numeric(10,8) NOT NULL,
    CONSTRAINT fii_monthly_reports_month_check CHECK ((reference_month = (date_trunc('month'::text, (reference_month)::timestamp with time zone))::date)),
    CONSTRAINT fii_monthly_reports_values_check CHECK (((shares_outstanding > 0) AND (shareholders_count >= 0) AND (dividend_yield_month >= (0)::numeric))),
    CONSTRAINT fii_monthly_reports_version_check CHECK ((version >= 1))
);

--
-- Name: fii_quarterly_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fii_quarterly_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    issuer_id uuid NOT NULL,
    reference_date date NOT NULL,
    version integer NOT NULL,
    CONSTRAINT fii_quarterly_reports_version_check CHECK ((version >= 1))
);

--
-- Name: fii_report_properties; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fii_report_properties (
    fii_quarterly_report_id uuid NOT NULL,
    item_number integer NOT NULL,
    name character varying(255) NOT NULL,
    address character varying(255) NOT NULL,
    property_class public.property_class NOT NULL,
    area numeric(14,2),
    vacancy_rate numeric(10,8),
    delinquency_rate numeric(10,8),
    revenue_share numeric(10,8),
    leased_rate numeric(10,8),
    CONSTRAINT fii_report_properties_area_check CHECK (((area IS NULL) OR (area > (0)::numeric))),
    CONSTRAINT fii_report_properties_item_number_check CHECK ((item_number >= 1)),
    CONSTRAINT fii_report_properties_leased_class_check CHECK (((leased_rate IS NULL) OR (property_class = 'RENT_UNDER_CONSTRUCTION'::public.property_class))),
    CONSTRAINT fii_report_properties_rates_check CHECK ((((vacancy_rate IS NULL) OR ((vacancy_rate >= (0)::numeric) AND (vacancy_rate <= (1)::numeric))) AND ((delinquency_rate IS NULL) OR ((delinquency_rate >= (0)::numeric) AND (delinquency_rate <= (1)::numeric))) AND ((revenue_share IS NULL) OR ((revenue_share >= (0)::numeric) AND (revenue_share <= (1)::numeric))) AND ((leased_rate IS NULL) OR ((leased_rate >= (0)::numeric) AND (leased_rate <= (1)::numeric))))),
    CONSTRAINT fii_report_properties_vacancy_class_check CHECK (((vacancy_rate IS NULL) OR (property_class = 'RENT_FINISHED'::public.property_class)))
);

--
-- Name: financial_statements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.financial_statements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    issuer_id uuid NOT NULL,
    filing_type public.filing_type NOT NULL,
    fiscal_year_start date NOT NULL,
    period_end date NOT NULL,
    version integer NOT NULL,
    filed_at timestamp(3) with time zone NOT NULL,
    common_shares bigint NOT NULL,
    preferred_shares bigint NOT NULL,
    treasury_common bigint NOT NULL,
    treasury_preferred bigint NOT NULL,
    CONSTRAINT financial_statements_period_check CHECK ((period_end > fiscal_year_start)),
    CONSTRAINT financial_statements_shares_check CHECK (((common_shares >= 0) AND (preferred_shares >= 0) AND (treasury_common >= 0) AND (treasury_preferred >= 0))),
    CONSTRAINT financial_statements_version_check CHECK ((version >= 1))
);

--
-- Name: fixed_income_bonds; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fixed_income_bonds (
    asset_id uuid NOT NULL,
    fixed_income_type_id uuid NOT NULL,
    maturity_date date NOT NULL
);

--
-- Name: fixed_income_prices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fixed_income_prices (
    asset_id uuid NOT NULL,
    base_date date NOT NULL,
    buy_rate numeric(10,8),
    sell_rate numeric(10,8),
    buy_price numeric(20,8),
    sell_price numeric(20,8),
    CONSTRAINT fixed_income_prices_any_value_check CHECK ((num_nonnulls(buy_rate, sell_rate, buy_price, sell_price) >= 1)),
    CONSTRAINT fixed_income_prices_prices_check CHECK ((((buy_price IS NULL) OR (buy_price > (0)::numeric)) AND ((sell_price IS NULL) OR (sell_price > (0)::numeric)))),
    CONSTRAINT fixed_income_prices_rates_check CHECK ((((buy_rate IS NULL) OR ((buy_rate >= ('-1'::integer)::numeric) AND (buy_rate <= (1)::numeric))) AND ((sell_rate IS NULL) OR ((sell_rate >= ('-1'::integer)::numeric) AND (sell_rate <= (1)::numeric)))))
);

--
-- Name: fixed_income_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fixed_income_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    economic_index_id uuid,
    name character varying(100) NOT NULL,
    semiannual_interest boolean NOT NULL
);

--
-- Name: import_batches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.import_batches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    portfolio_id uuid NOT NULL,
    file_name character varying(255) NOT NULL,
    file_sha256 character(64) NOT NULL,
    status public.import_batch_status DEFAULT 'PENDING'::public.import_batch_status NOT NULL,
    row_count integer NOT NULL,
    imported_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    confirmed_at timestamp(3) with time zone,
    CONSTRAINT import_batches_confirmed_at_check CHECK (((status = 'CONFIRMED'::public.import_batch_status) = (confirmed_at IS NOT NULL))),
    CONSTRAINT import_batches_file_sha256_check CHECK ((file_sha256 ~ '^[0-9a-f]{64}$'::text)),
    CONSTRAINT import_batches_row_count_check CHECK ((row_count >= 0))
);

--
-- Name: income_distributions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.income_distributions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    asset_id uuid NOT NULL,
    type public.income_type NOT NULL,
    record_date date NOT NULL,
    payment_date date,
    amount_per_share numeric(20,8) NOT NULL,
    source character varying(50) NOT NULL,
    CONSTRAINT income_distributions_amount_check CHECK ((amount_per_share > (0)::numeric)),
    CONSTRAINT income_distributions_dates_check CHECK (((payment_date IS NULL) OR (payment_date >= record_date)))
);

--
-- Name: index_values; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.index_values (
    economic_index_id uuid NOT NULL,
    reference_date date NOT NULL,
    value numeric(20,8) NOT NULL
);

--
-- Name: indicators; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.indicators (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code character varying(20) NOT NULL,
    name character varying(150) NOT NULL,
    indicator_group public.indicator_group NOT NULL,
    formula text NOT NULL,
    unit public.indicator_unit NOT NULL,
    applies_to public.analysis_asset_type NOT NULL
);

--
-- Name: issuers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.issuers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sector_id uuid,
    name character varying(150) NOT NULL,
    kind public.issuer_kind NOT NULL,
    cnpj character(14),
    cvm_code character varying(10),
    CONSTRAINT issuers_cnpj_check CHECK (((cnpj IS NULL) OR (cnpj ~ '^[0-9]{14}$'::text)))
);

--
-- Name: operations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.operations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    portfolio_id uuid NOT NULL,
    asset_id uuid NOT NULL,
    broker_id uuid NOT NULL,
    import_batch_id uuid,
    type public.operation_type NOT NULL,
    trade_date date NOT NULL,
    quantity numeric(20,8) NOT NULL,
    unit_price numeric(20,8) NOT NULL,
    fees numeric(18,2) NOT NULL,
    sequence bigint NOT NULL,
    CONSTRAINT operations_fees_check CHECK ((fees >= (0)::numeric)),
    CONSTRAINT operations_quantity_check CHECK ((quantity > (0)::numeric)),
    CONSTRAINT operations_unit_price_check CHECK ((unit_price > (0)::numeric))
);

--
-- Name: operations_sequence_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.operations_sequence_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: operations_sequence_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.operations_sequence_seq OWNED BY public.operations.sequence;

--
-- Name: portfolio_goals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.portfolio_goals (
    portfolio_id uuid NOT NULL,
    type public.goal_type NOT NULL,
    target_amount numeric(18,2) NOT NULL,
    target_month date,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT portfolio_goals_target_amount_check CHECK ((target_amount > (0)::numeric)),
    CONSTRAINT portfolio_goals_target_month_check CHECK (((target_month IS NULL) OR ((target_month = (date_trunc('month'::text, (target_month)::timestamp with time zone))::date) AND (target_month >= (date_trunc('month'::text, (created_at AT TIME ZONE 'America/Sao_Paulo'::text)))::date))))
);

--
-- Name: portfolios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.portfolios (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name character varying(150) NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

--
-- Name: price_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.price_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    asset_id uuid NOT NULL,
    target_price numeric(20,8) NOT NULL,
    direction public.price_direction NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    triggered_at timestamp(3) with time zone,
    triggered_quote_date date,
    CONSTRAINT price_alerts_target_price_check CHECK ((target_price > (0)::numeric)),
    CONSTRAINT price_alerts_trigger_check CHECK (((triggered_at IS NULL) = (triggered_quote_date IS NULL)))
);

--
-- Name: quotes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quotes (
    asset_id uuid NOT NULL,
    quote_date date NOT NULL,
    open numeric(20,8) NOT NULL,
    high numeric(20,8) NOT NULL,
    low numeric(20,8) NOT NULL,
    close numeric(20,8) NOT NULL,
    volume numeric(18,2) NOT NULL,
    trades_count integer NOT NULL,
    CONSTRAINT quotes_prices_positive_check CHECK (((open > (0)::numeric) AND (high > (0)::numeric) AND (low > (0)::numeric) AND (close > (0)::numeric))),
    CONSTRAINT quotes_range_check CHECK (((low <= high) AND ((open >= low) AND (open <= high)) AND ((close >= low) AND (close <= high)))),
    CONSTRAINT quotes_volume_check CHECK (((volume >= (0)::numeric) AND (trades_count >= 0)))
);

--
-- Name: received_income; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.received_income (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    income_distribution_id uuid NOT NULL,
    portfolio_id uuid NOT NULL,
    broker_id uuid NOT NULL,
    base_quantity integer NOT NULL,
    gross_amount numeric(18,2) NOT NULL,
    withheld_tax numeric(18,2) NOT NULL,
    received_at date NOT NULL,
    CONSTRAINT received_income_values_check CHECK (((base_quantity > 0) AND (gross_amount >= (0)::numeric) AND (withheld_tax >= (0)::numeric) AND (withheld_tax <= gross_amount)))
);

--
-- Name: saved_screens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.saved_screens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    sort_indicator_id uuid,
    name character varying(150) NOT NULL,
    asset_type public.analysis_asset_type NOT NULL,
    sort_direction public.sort_direction NOT NULL
);

--
-- Name: screen_criteria; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.screen_criteria (
    saved_screen_id uuid NOT NULL,
    indicator_id uuid NOT NULL,
    min_value numeric(20,8),
    max_value numeric(20,8),
    CONSTRAINT screen_criteria_bounds_check CHECK ((((min_value IS NOT NULL) OR (max_value IS NOT NULL)) AND ((min_value IS NULL) OR (max_value IS NULL) OR (min_value <= max_value))))
);

--
-- Name: sectors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sectors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    parent_id uuid,
    name character varying(150) NOT NULL,
    CONSTRAINT sectors_parent_check CHECK (((parent_id IS NULL) OR (parent_id <> id)))
);

--
-- Name: statement_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.statement_lines (
    financial_statement_id uuid NOT NULL,
    scope public.statement_scope NOT NULL,
    account_code character varying(30) NOT NULL,
    account_description character varying(255) NOT NULL,
    value numeric(18,2) NOT NULL
);

--
-- Name: target_allocations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.target_allocations (
    portfolio_id uuid NOT NULL,
    asset_class public.asset_type NOT NULL,
    target_percent numeric(10,8) NOT NULL,
    CONSTRAINT target_allocations_percent_check CHECK (((target_percent >= (0)::numeric) AND (target_percent <= (1)::numeric)))
);

--
-- Name: tax_assessments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tax_assessments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    darf_id uuid,
    tax_category_id uuid NOT NULL,
    reference_month date NOT NULL,
    total_sales numeric(18,2) NOT NULL,
    net_result numeric(18,2) NOT NULL,
    loss_offset numeric(18,2) NOT NULL,
    closed_at timestamp(3) with time zone NOT NULL,
    CONSTRAINT tax_assessments_month_check CHECK ((reference_month = (date_trunc('month'::text, (reference_month)::timestamp with time zone))::date)),
    CONSTRAINT tax_assessments_values_check CHECK (((total_sales >= (0)::numeric) AND (loss_offset >= (0)::numeric)))
);

--
-- Name: tax_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tax_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code public.tax_category_code NOT NULL,
    name character varying(150) NOT NULL,
    revenue_code character varying(10) NOT NULL
);

--
-- Name: tax_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tax_rules (
    tax_category_id uuid NOT NULL,
    effective_from date NOT NULL,
    rate numeric(10,8) NOT NULL,
    sales_exemption_limit numeric(18,2),
    CONSTRAINT tax_rules_exemption_check CHECK (((sales_exemption_limit IS NULL) OR (sales_exemption_limit > (0)::numeric))),
    CONSTRAINT tax_rules_rate_check CHECK (((rate >= (0)::numeric) AND (rate <= (1)::numeric)))
);

--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(150) NOT NULL,
    email public.citext NOT NULL,
    password_hash character varying(255) NOT NULL,
    created_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

--
-- Name: watchlist_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.watchlist_items (
    user_id uuid NOT NULL,
    asset_id uuid NOT NULL,
    added_at timestamp(3) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);

--
-- Name: operations sequence; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operations ALTER COLUMN sequence SET DEFAULT nextval('public.operations_sequence_seq'::regclass);

--
-- Name: assets assets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_pkey PRIMARY KEY (id);

--
-- Name: brokers brokers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brokers
    ADD CONSTRAINT brokers_pkey PRIMARY KEY (id);

--
-- Name: corporate_events corporate_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.corporate_events
    ADD CONSTRAINT corporate_events_pkey PRIMARY KEY (id);

--
-- Name: corporate_filings corporate_filings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.corporate_filings
    ADD CONSTRAINT corporate_filings_pkey PRIMARY KEY (id);

--
-- Name: crypto_assets crypto_assets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crypto_assets
    ADD CONSTRAINT crypto_assets_pkey PRIMARY KEY (asset_id);

--
-- Name: crypto_prices crypto_prices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crypto_prices
    ADD CONSTRAINT crypto_prices_pkey PRIMARY KEY (asset_id, price_date);

--
-- Name: darfs darfs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.darfs
    ADD CONSTRAINT darfs_pkey PRIMARY KEY (id);

--
-- Name: economic_indexes economic_indexes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.economic_indexes
    ADD CONSTRAINT economic_indexes_pkey PRIMARY KEY (id);

--
-- Name: fii_monthly_reports fii_monthly_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fii_monthly_reports
    ADD CONSTRAINT fii_monthly_reports_pkey PRIMARY KEY (id);

--
-- Name: fii_quarterly_reports fii_quarterly_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fii_quarterly_reports
    ADD CONSTRAINT fii_quarterly_reports_pkey PRIMARY KEY (id);

--
-- Name: fii_report_properties fii_report_properties_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fii_report_properties
    ADD CONSTRAINT fii_report_properties_pkey PRIMARY KEY (fii_quarterly_report_id, item_number);

--
-- Name: financial_statements financial_statements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.financial_statements
    ADD CONSTRAINT financial_statements_pkey PRIMARY KEY (id);

--
-- Name: fixed_income_bonds fixed_income_bonds_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fixed_income_bonds
    ADD CONSTRAINT fixed_income_bonds_pkey PRIMARY KEY (asset_id);

--
-- Name: fixed_income_prices fixed_income_prices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fixed_income_prices
    ADD CONSTRAINT fixed_income_prices_pkey PRIMARY KEY (asset_id, base_date);

--
-- Name: fixed_income_types fixed_income_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fixed_income_types
    ADD CONSTRAINT fixed_income_types_pkey PRIMARY KEY (id);

--
-- Name: import_batches import_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_batches
    ADD CONSTRAINT import_batches_pkey PRIMARY KEY (id);

--
-- Name: income_distributions income_distributions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.income_distributions
    ADD CONSTRAINT income_distributions_pkey PRIMARY KEY (id);

--
-- Name: index_values index_values_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.index_values
    ADD CONSTRAINT index_values_pkey PRIMARY KEY (economic_index_id, reference_date);

--
-- Name: indicators indicators_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.indicators
    ADD CONSTRAINT indicators_pkey PRIMARY KEY (id);

--
-- Name: issuers issuers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issuers
    ADD CONSTRAINT issuers_pkey PRIMARY KEY (id);

--
-- Name: operations operations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operations
    ADD CONSTRAINT operations_pkey PRIMARY KEY (id);

--
-- Name: portfolio_goals portfolio_goals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolio_goals
    ADD CONSTRAINT portfolio_goals_pkey PRIMARY KEY (portfolio_id, type);

--
-- Name: portfolios portfolios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolios
    ADD CONSTRAINT portfolios_pkey PRIMARY KEY (id);

--
-- Name: price_alerts price_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_alerts
    ADD CONSTRAINT price_alerts_pkey PRIMARY KEY (id);

--
-- Name: quotes quotes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_pkey PRIMARY KEY (asset_id, quote_date);

--
-- Name: received_income received_income_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.received_income
    ADD CONSTRAINT received_income_pkey PRIMARY KEY (id);

--
-- Name: saved_screens saved_screens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_screens
    ADD CONSTRAINT saved_screens_pkey PRIMARY KEY (id);

--
-- Name: screen_criteria screen_criteria_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.screen_criteria
    ADD CONSTRAINT screen_criteria_pkey PRIMARY KEY (saved_screen_id, indicator_id);

--
-- Name: sectors sectors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sectors
    ADD CONSTRAINT sectors_pkey PRIMARY KEY (id);

--
-- Name: statement_lines statement_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.statement_lines
    ADD CONSTRAINT statement_lines_pkey PRIMARY KEY (financial_statement_id, scope, account_code);

--
-- Name: target_allocations target_allocations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.target_allocations
    ADD CONSTRAINT target_allocations_pkey PRIMARY KEY (portfolio_id, asset_class);

--
-- Name: tax_assessments tax_assessments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tax_assessments
    ADD CONSTRAINT tax_assessments_pkey PRIMARY KEY (id);

--
-- Name: tax_categories tax_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tax_categories
    ADD CONSTRAINT tax_categories_pkey PRIMARY KEY (id);

--
-- Name: tax_rules tax_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tax_rules
    ADD CONSTRAINT tax_rules_pkey PRIMARY KEY (tax_category_id, effective_from);

--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);

--
-- Name: watchlist_items watchlist_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.watchlist_items
    ADD CONSTRAINT watchlist_items_pkey PRIMARY KEY (user_id, asset_id);

--
-- Name: assets_isin_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX assets_isin_key ON public.assets USING btree (isin);

--
-- Name: assets_issuer_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX assets_issuer_id_idx ON public.assets USING btree (issuer_id);

--
-- Name: assets_ticker_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX assets_ticker_key ON public.assets USING btree (ticker);

--
-- Name: brokers_cnpj_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX brokers_cnpj_key ON public.brokers USING btree (cnpj);

--
-- Name: corporate_events_asset_id_type_ex_date_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX corporate_events_asset_id_type_ex_date_key ON public.corporate_events USING btree (asset_id, type, ex_date);

--
-- Name: corporate_filings_cvm_protocol_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX corporate_filings_cvm_protocol_key ON public.corporate_filings USING btree (cvm_protocol);

--
-- Name: corporate_filings_issuer_id_reference_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX corporate_filings_issuer_id_reference_date_idx ON public.corporate_filings USING btree (issuer_id, reference_date);

--
-- Name: darfs_user_id_reference_month_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX darfs_user_id_reference_month_key ON public.darfs USING btree (user_id, reference_month);

--
-- Name: economic_indexes_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX economic_indexes_code_key ON public.economic_indexes USING btree (code);

--
-- Name: fii_monthly_reports_issuer_id_reference_month_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX fii_monthly_reports_issuer_id_reference_month_key ON public.fii_monthly_reports USING btree (issuer_id, reference_month);

--
-- Name: fii_quarterly_reports_issuer_id_reference_date_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX fii_quarterly_reports_issuer_id_reference_date_key ON public.fii_quarterly_reports USING btree (issuer_id, reference_date);

--
-- Name: financial_statements_issuer_id_period_end_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX financial_statements_issuer_id_period_end_key ON public.financial_statements USING btree (issuer_id, period_end);

--
-- Name: fixed_income_bonds_type_maturity_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX fixed_income_bonds_type_maturity_key ON public.fixed_income_bonds USING btree (fixed_income_type_id, maturity_date);

--
-- Name: fixed_income_types_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX fixed_income_types_name_key ON public.fixed_income_types USING btree (name);

--
-- Name: import_batches_portfolio_id_file_sha256_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX import_batches_portfolio_id_file_sha256_key ON public.import_batches USING btree (portfolio_id, file_sha256);

--
-- Name: income_distributions_asset_id_record_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX income_distributions_asset_id_record_date_idx ON public.income_distributions USING btree (asset_id, record_date);

--
-- Name: indicators_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX indicators_code_key ON public.indicators USING btree (code);

--
-- Name: issuers_cnpj_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX issuers_cnpj_key ON public.issuers USING btree (cnpj);

--
-- Name: issuers_cvm_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX issuers_cvm_code_key ON public.issuers USING btree (cvm_code);

--
-- Name: issuers_sector_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX issuers_sector_id_idx ON public.issuers USING btree (sector_id);

--
-- Name: operations_asset_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX operations_asset_id_idx ON public.operations USING btree (asset_id);

--
-- Name: operations_sequence_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX operations_sequence_key ON public.operations USING btree (sequence);

--
-- Name: operations_timeline_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX operations_timeline_idx ON public.operations USING btree (portfolio_id, asset_id, trade_date, sequence);

--
-- Name: portfolios_user_id_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX portfolios_user_id_name_key ON public.portfolios USING btree (user_id, name);

--
-- Name: price_alerts_asset_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX price_alerts_asset_id_idx ON public.price_alerts USING btree (asset_id);

--
-- Name: price_alerts_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX price_alerts_user_id_idx ON public.price_alerts USING btree (user_id);

--
-- Name: received_income_portfolio_distribution_broker_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX received_income_portfolio_distribution_broker_key ON public.received_income USING btree (portfolio_id, income_distribution_id, broker_id);

--
-- Name: saved_screens_user_id_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX saved_screens_user_id_name_key ON public.saved_screens USING btree (user_id, name);

--
-- Name: screen_criteria_indicator_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX screen_criteria_indicator_id_idx ON public.screen_criteria USING btree (indicator_id);

--
-- Name: sectors_parent_id_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX sectors_parent_id_name_key ON public.sectors USING btree (parent_id, name);

--
-- Name: tax_assessments_darf_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tax_assessments_darf_id_idx ON public.tax_assessments USING btree (darf_id);

--
-- Name: tax_assessments_user_month_category_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX tax_assessments_user_month_category_key ON public.tax_assessments USING btree (user_id, reference_month, tax_category_id);

--
-- Name: tax_categories_code_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX tax_categories_code_key ON public.tax_categories USING btree (code);

--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);

--
-- Name: assets assets_issuer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_issuer_id_fkey FOREIGN KEY (issuer_id) REFERENCES public.issuers(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: corporate_events corporate_events_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.corporate_events
    ADD CONSTRAINT corporate_events_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: corporate_filings corporate_filings_issuer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.corporate_filings
    ADD CONSTRAINT corporate_filings_issuer_id_fkey FOREIGN KEY (issuer_id) REFERENCES public.issuers(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: crypto_assets crypto_assets_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crypto_assets
    ADD CONSTRAINT crypto_assets_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: crypto_prices crypto_prices_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crypto_prices
    ADD CONSTRAINT crypto_prices_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.crypto_assets(asset_id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: darfs darfs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.darfs
    ADD CONSTRAINT darfs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: fii_monthly_reports fii_monthly_reports_issuer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fii_monthly_reports
    ADD CONSTRAINT fii_monthly_reports_issuer_id_fkey FOREIGN KEY (issuer_id) REFERENCES public.issuers(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: fii_quarterly_reports fii_quarterly_reports_issuer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fii_quarterly_reports
    ADD CONSTRAINT fii_quarterly_reports_issuer_id_fkey FOREIGN KEY (issuer_id) REFERENCES public.issuers(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: fii_report_properties fii_report_properties_fii_quarterly_report_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fii_report_properties
    ADD CONSTRAINT fii_report_properties_fii_quarterly_report_id_fkey FOREIGN KEY (fii_quarterly_report_id) REFERENCES public.fii_quarterly_reports(id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: financial_statements financial_statements_issuer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.financial_statements
    ADD CONSTRAINT financial_statements_issuer_id_fkey FOREIGN KEY (issuer_id) REFERENCES public.issuers(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: fixed_income_bonds fixed_income_bonds_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fixed_income_bonds
    ADD CONSTRAINT fixed_income_bonds_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: fixed_income_bonds fixed_income_bonds_fixed_income_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fixed_income_bonds
    ADD CONSTRAINT fixed_income_bonds_fixed_income_type_id_fkey FOREIGN KEY (fixed_income_type_id) REFERENCES public.fixed_income_types(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: fixed_income_prices fixed_income_prices_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fixed_income_prices
    ADD CONSTRAINT fixed_income_prices_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.fixed_income_bonds(asset_id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: fixed_income_types fixed_income_types_economic_index_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fixed_income_types
    ADD CONSTRAINT fixed_income_types_economic_index_id_fkey FOREIGN KEY (economic_index_id) REFERENCES public.economic_indexes(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: import_batches import_batches_portfolio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_batches
    ADD CONSTRAINT import_batches_portfolio_id_fkey FOREIGN KEY (portfolio_id) REFERENCES public.portfolios(id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: income_distributions income_distributions_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.income_distributions
    ADD CONSTRAINT income_distributions_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: index_values index_values_economic_index_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.index_values
    ADD CONSTRAINT index_values_economic_index_id_fkey FOREIGN KEY (economic_index_id) REFERENCES public.economic_indexes(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: issuers issuers_sector_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issuers
    ADD CONSTRAINT issuers_sector_id_fkey FOREIGN KEY (sector_id) REFERENCES public.sectors(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: operations operations_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operations
    ADD CONSTRAINT operations_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: operations operations_broker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operations
    ADD CONSTRAINT operations_broker_id_fkey FOREIGN KEY (broker_id) REFERENCES public.brokers(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: operations operations_import_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operations
    ADD CONSTRAINT operations_import_batch_id_fkey FOREIGN KEY (import_batch_id) REFERENCES public.import_batches(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: operations operations_portfolio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.operations
    ADD CONSTRAINT operations_portfolio_id_fkey FOREIGN KEY (portfolio_id) REFERENCES public.portfolios(id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: portfolio_goals portfolio_goals_portfolio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolio_goals
    ADD CONSTRAINT portfolio_goals_portfolio_id_fkey FOREIGN KEY (portfolio_id) REFERENCES public.portfolios(id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: portfolios portfolios_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portfolios
    ADD CONSTRAINT portfolios_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: price_alerts price_alerts_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_alerts
    ADD CONSTRAINT price_alerts_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: price_alerts price_alerts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_alerts
    ADD CONSTRAINT price_alerts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: quotes quotes_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: received_income received_income_broker_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.received_income
    ADD CONSTRAINT received_income_broker_id_fkey FOREIGN KEY (broker_id) REFERENCES public.brokers(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: received_income received_income_income_distribution_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.received_income
    ADD CONSTRAINT received_income_income_distribution_id_fkey FOREIGN KEY (income_distribution_id) REFERENCES public.income_distributions(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: received_income received_income_portfolio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.received_income
    ADD CONSTRAINT received_income_portfolio_id_fkey FOREIGN KEY (portfolio_id) REFERENCES public.portfolios(id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: saved_screens saved_screens_sort_indicator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_screens
    ADD CONSTRAINT saved_screens_sort_indicator_id_fkey FOREIGN KEY (sort_indicator_id) REFERENCES public.indicators(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: saved_screens saved_screens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.saved_screens
    ADD CONSTRAINT saved_screens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: screen_criteria screen_criteria_indicator_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.screen_criteria
    ADD CONSTRAINT screen_criteria_indicator_id_fkey FOREIGN KEY (indicator_id) REFERENCES public.indicators(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: screen_criteria screen_criteria_saved_screen_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.screen_criteria
    ADD CONSTRAINT screen_criteria_saved_screen_id_fkey FOREIGN KEY (saved_screen_id) REFERENCES public.saved_screens(id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: sectors sectors_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sectors
    ADD CONSTRAINT sectors_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.sectors(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: statement_lines statement_lines_financial_statement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.statement_lines
    ADD CONSTRAINT statement_lines_financial_statement_id_fkey FOREIGN KEY (financial_statement_id) REFERENCES public.financial_statements(id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: target_allocations target_allocations_portfolio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.target_allocations
    ADD CONSTRAINT target_allocations_portfolio_id_fkey FOREIGN KEY (portfolio_id) REFERENCES public.portfolios(id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: tax_assessments tax_assessments_darf_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tax_assessments
    ADD CONSTRAINT tax_assessments_darf_id_fkey FOREIGN KEY (darf_id) REFERENCES public.darfs(id) ON UPDATE CASCADE ON DELETE SET NULL;

--
-- Name: tax_assessments tax_assessments_tax_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tax_assessments
    ADD CONSTRAINT tax_assessments_tax_category_id_fkey FOREIGN KEY (tax_category_id) REFERENCES public.tax_categories(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: tax_assessments tax_assessments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tax_assessments
    ADD CONSTRAINT tax_assessments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- Name: tax_rules tax_rules_tax_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tax_rules
    ADD CONSTRAINT tax_rules_tax_category_id_fkey FOREIGN KEY (tax_category_id) REFERENCES public.tax_categories(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: watchlist_items watchlist_items_asset_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.watchlist_items
    ADD CONSTRAINT watchlist_items_asset_id_fkey FOREIGN KEY (asset_id) REFERENCES public.assets(id) ON UPDATE CASCADE ON DELETE RESTRICT;

--
-- Name: watchlist_items watchlist_items_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.watchlist_items
    ADD CONSTRAINT watchlist_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;

--
-- PostgreSQL database dump complete
--

