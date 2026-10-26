-- Teste das restrições de integridade do schema public (D1).
-- Uso: psql -v ON_ERROR_STOP=1 -f database/tests/constraints.sql  (num banco migrado e vazio)
-- Roda tudo numa transação e desfaz no fim: não deixa dados no banco.
-- Cada caso inválido precisa falhar com o SQLSTATE esperado; caso contrário o script aborta.
--   23514 = CHECK, 23505 = UNIQUE, 23503 = FK, 23502 = NOT NULL, 22P02 = valor de enum inválido

BEGIN;

CREATE FUNCTION pg_temp.expect_error(label text, stmt text, expected text) RETURNS void AS $$
BEGIN
  BEGIN
    EXECUTE stmt;
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE = expected THEN
      RAISE NOTICE 'ok  %', label;
      RETURN;
    END IF;
    RAISE EXCEPTION 'FALHOU %: esperado SQLSTATE %, veio % (%)', label, expected, SQLSTATE, SQLERRM;
  END;
  RAISE EXCEPTION 'FALHOU %: o comando deveria ter sido rejeitado', label;
END $$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------- dados válidos mínimos
INSERT INTO users (id, name, email, password_hash) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Ana', 'Ana@Exemplo.com', 'hash');
INSERT INTO brokers (id, name, cnpj) VALUES ('00000000-0000-0000-0000-000000000101', 'Corretora A', '12345678000199');
INSERT INTO portfolios (id, user_id, name) VALUES ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000001', 'Longo prazo');
INSERT INTO sectors (id, parent_id, name) VALUES ('00000000-0000-0000-0000-000000000301', NULL, 'Petróleo, Gás e Biocombustíveis');
INSERT INTO issuers (id, sector_id, name, kind, cnpj, cvm_code) VALUES
  ('00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000301', 'Petrobras', 'COMPANY', '33000167000101', '9512');
INSERT INTO assets (id, issuer_id, ticker, isin, type, share_class) VALUES
  ('00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000401', 'PETR4', 'BRPETRACNPR6', 'STOCK', 'PN'),
  ('00000000-0000-0000-0000-000000000502', '00000000-0000-0000-0000-000000000401', 'B3SA3', 'BRB3SAACNOR6', 'STOCK', 'ON');
INSERT INTO operations (portfolio_id, asset_id, broker_id, type, trade_date, quantity, unit_price, fees) VALUES
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000101', 'BUY', '2026-03-02', 100, 38.5, 0);
INSERT INTO tax_categories (id, code, name, revenue_code) VALUES ('00000000-0000-0000-0000-000000000601', 'COMMON_STOCK', 'Operações comuns com ações', '6015');
INSERT INTO indicators (id, code, name, indicator_group, formula, unit, applies_to) VALUES
  ('00000000-0000-0000-0000-000000000701', 'PL', 'Preço/Lucro', 'VALUATION', 'preço / LPA', 'RATIO', 'STOCK');
INSERT INTO saved_screens (id, user_id, name, asset_type, sort_direction) VALUES
  ('00000000-0000-0000-0000-000000000801', '00000000-0000-0000-0000-000000000001', 'Baratas', 'STOCK', 'ASC');

-- ---------------------------------------------------------------- casos inválidos
SELECT pg_temp.expect_error('e-mail único sem diferenciar maiúsculas (RN01)',
  $q$INSERT INTO users (name, email, password_hash) VALUES ('Outra', 'ana@exemplo.com', 'h')$q$, '23505');
SELECT pg_temp.expect_error('CNPJ da corretora com 14 dígitos',
  $q$INSERT INTO brokers (name, cnpj) VALUES ('X', '12.345.678/001')$q$, '23514');
SELECT pg_temp.expect_error('nome de carteira único por usuário (RN02)',
  $q$INSERT INTO portfolios (user_id, name) VALUES ('00000000-0000-0000-0000-000000000001', 'Longo prazo')$q$, '23505');
SELECT pg_temp.expect_error('operação com quantidade zero (RN04)',
  $q$INSERT INTO operations (portfolio_id, asset_id, broker_id, type, trade_date, quantity, unit_price, fees) VALUES ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000101', 'BUY', '2026-03-03', 0, 10, 0)$q$, '23514');
SELECT pg_temp.expect_error('operação com custo negativo (RN04)',
  $q$INSERT INTO operations (portfolio_id, asset_id, broker_id, type, trade_date, quantity, unit_price, fees) VALUES ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000101', 'BUY', '2026-03-03', 10, 10, -1)$q$, '23514');
SELECT pg_temp.expect_error('operação sem corretora (D9)',
  $q$INSERT INTO operations (portfolio_id, asset_id, type, trade_date, quantity, unit_price, fees) VALUES ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000501', 'BUY', '2026-03-03', 10, 10, 0)$q$, '23502');
SELECT pg_temp.expect_error('tipo de operação fora do domínio',
  $q$INSERT INTO operations (portfolio_id, asset_id, broker_id, type, trade_date, quantity, unit_price, fees) VALUES ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000101', 'SHORT', '2026-03-03', 10, 10, 0)$q$, '22P02');
SELECT pg_temp.expect_error('ativo usado em operação não pode ser apagado',
  $q$DELETE FROM assets WHERE id = '00000000-0000-0000-0000-000000000501'$q$, '23503');
SELECT pg_temp.expect_error('ticker fora do formato B3',
  $q$INSERT INTO assets (issuer_id, ticker, isin, type) VALUES ('00000000-0000-0000-0000-000000000401', 'petr4', 'BRPETRACNOR9', 'STOCK')$q$, '23514');
SELECT pg_temp.expect_error('classe de ação em FII',
  $q$INSERT INTO assets (issuer_id, ticker, isin, type, share_class) VALUES ('00000000-0000-0000-0000-000000000401', 'XPLG11', 'BRXPLGCTF000', 'FII', 'ON')$q$, '23514');
SELECT pg_temp.expect_error('setor pai de si mesmo',
  $q$UPDATE sectors SET parent_id = id WHERE id = '00000000-0000-0000-0000-000000000301'$q$, '23514');
SELECT pg_temp.expect_error('cotação com mínima acima da máxima',
  $q$INSERT INTO quotes VALUES ('00000000-0000-0000-0000-000000000501', '2026-03-02', 38, 37, 39, 38, 1000, 10)$q$, '23514');
SELECT pg_temp.expect_error('duas cotações do mesmo ativo na mesma data',
  $q$INSERT INTO quotes VALUES ('00000000-0000-0000-0000-000000000501', '2026-03-02', 38, 39, 37, 38, 1000, 10), ('00000000-0000-0000-0000-000000000501', '2026-03-02', 38, 39, 37, 38, 1000, 10)$q$, '23505');
SELECT pg_temp.expect_error('vacância em imóvel que não é para renda acabado (D31)',
  $q$WITH r AS (INSERT INTO fii_quarterly_reports (issuer_id, reference_date, version) VALUES ('00000000-0000-0000-0000-000000000401', '2026-06-30', 1) RETURNING id)
     INSERT INTO fii_report_properties (fii_quarterly_report_id, item_number, name, address, property_class, vacancy_rate) SELECT id, 1, 'Galpão', 'Rua A', 'SALE_FINISHED', 0.1 FROM r$q$, '23514');
SELECT pg_temp.expect_error('percentual de vacância acima de 1 (fração)',
  $q$WITH r AS (INSERT INTO fii_quarterly_reports (issuer_id, reference_date, version) VALUES ('00000000-0000-0000-0000-000000000401', '2026-09-30', 1) RETURNING id)
     INSERT INTO fii_report_properties (fii_quarterly_report_id, item_number, name, address, property_class, vacancy_rate) SELECT id, 1, 'Laje', 'Rua B', 'RENT_FINISHED', 12.4 FROM r$q$, '23514');
SELECT pg_temp.expect_error('desdobramento que reduz a quantidade',
  $q$INSERT INTO corporate_events (asset_id, type, ex_date, ratio_from, ratio_to, source) VALUES ('00000000-0000-0000-0000-000000000501', 'SPLIT', '2026-04-01', 2, 1, 'MANUAL')$q$, '23514');
SELECT pg_temp.expect_error('bonificação sem custo atribuído',
  $q$INSERT INTO corporate_events (asset_id, type, ex_date, ratio_from, ratio_to, source) VALUES ('00000000-0000-0000-0000-000000000501', 'BONUS', '2026-04-01', 10, 11, 'MANUAL')$q$, '23514');
SELECT pg_temp.expect_error('pagamento de provento antes da data-com',
  $q$INSERT INTO income_distributions (asset_id, type, record_date, payment_date, amount_per_share, source) VALUES ('00000000-0000-0000-0000-000000000501', 'DIVIDEND', '2026-05-10', '2026-05-01', 0.5, 'B3')$q$, '23514');
SELECT pg_temp.expect_error('alíquota de IR acima de 100%',
  $q$INSERT INTO tax_rules VALUES ('00000000-0000-0000-0000-000000000601', '2026-01-01', 15, NULL)$q$, '23514');
SELECT pg_temp.expect_error('apuração com mês que não começa no dia 1',
  $q$INSERT INTO tax_assessments (user_id, tax_category_id, reference_month, total_sales, net_result, loss_offset, closed_at) VALUES ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000601', '2026-03-15', 0, 0, 0, now())$q$, '23514');
SELECT pg_temp.expect_error('DARF com valor pago sem data de pagamento',
  $q$INSERT INTO darfs (user_id, reference_month, amount_paid) VALUES ('00000000-0000-0000-0000-000000000001', '2026-03-01', 100)$q$, '23514');
SELECT pg_temp.expect_error('critério de filtro sem nenhum limite',
  $q$INSERT INTO screen_criteria (saved_screen_id, indicator_id) VALUES ('00000000-0000-0000-0000-000000000801', '00000000-0000-0000-0000-000000000701')$q$, '23514');
SELECT pg_temp.expect_error('critério com mínimo maior que o máximo',
  $q$INSERT INTO screen_criteria VALUES ('00000000-0000-0000-0000-000000000801', '00000000-0000-0000-0000-000000000701', 10, 5)$q$, '23514');
SELECT pg_temp.expect_error('mesmo ativo duas vezes na lista de observação',
  $q$INSERT INTO watchlist_items (user_id, asset_id) VALUES ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000501'), ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000501')$q$, '23505');

-- ---------------------------------------------------------------- comportamento das FKs
-- excluir o usuário remove carteiras, operações e filtros (CASCADE), mas não o catálogo
DELETE FROM users WHERE id = '00000000-0000-0000-0000-000000000001';
DO $$ BEGIN
  IF (SELECT count(*) FROM portfolios) <> 0 OR (SELECT count(*) FROM operations) <> 0 OR (SELECT count(*) FROM saved_screens) <> 0 THEN
    RAISE EXCEPTION 'FALHOU cascata da exclusão de usuário';
  END IF;
  IF (SELECT count(*) FROM assets) <> 2 THEN RAISE EXCEPTION 'FALHOU catálogo afetado pela exclusão de usuário'; END IF;
  RAISE NOTICE 'ok  exclusão de usuário em cascata, catálogo preservado';
END $$;

ROLLBACK;
\echo 'Todos os testes de restrição passaram.'
