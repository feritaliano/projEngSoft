-- Teste das restrições de integridade da D3 no schema public (D43, D44, D47, D50): carteira ideal,
-- metas, renda fixa, cripto, programa do BDR e colunas que mudaram (ticker, ISIN, emissor, CNPJ, quantidade).
-- Uso: psql -v ON_ERROR_STOP=1 -f database/tests/full-product-constraints.sql  (num banco migrado e vazio)
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
  ('00000000-0000-0000-0000-000000000001', 'Ana', 'ana@exemplo.com', 'hash');
INSERT INTO portfolios (id, user_id, name) VALUES
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000001', 'Longo prazo');

-- corretora da B3 com CNPJ e exchange sem CNPJ (D50)
INSERT INTO brokers (id, name, cnpj) VALUES
  ('00000000-0000-0000-0000-000000000101', 'Corretora A', '12345678000199'),
  ('00000000-0000-0000-0000-000000000102', 'Exchange estrangeira', NULL);

INSERT INTO issuers (id, name, kind, cnpj) VALUES
  ('00000000-0000-0000-0000-000000000401', 'Petrobras', 'COMPANY', '33000167000101'),
  ('00000000-0000-0000-0000-000000000402', 'Apple Inc.', 'FOREIGN', NULL),
  ('00000000-0000-0000-0000-000000000403', 'Tesouro Nacional', 'GOVERNMENT', NULL);

INSERT INTO economic_indexes (id, code, name, periodicity, unit, source) VALUES
  ('00000000-0000-0000-0000-000000000901', 'IPCA', 'IPCA', 'MONTHLY', 'RATE_PERCENT', 'BCB SGS 433'),
  ('00000000-0000-0000-0000-000000000902', 'SELIC', 'Selic', 'DAILY', 'RATE_PERCENT', 'BCB SGS 11');

-- ação, BDR com programa, título de renda fixa sem ticker e sem ISIN, cripto sem emissor e sem ISIN
INSERT INTO assets (id, issuer_id, ticker, isin, type, share_class, bdr_program) VALUES
  ('00000000-0000-0000-0000-000000000501', '00000000-0000-0000-0000-000000000401', 'PETR4', 'BRPETRACNPR6', 'STOCK', 'PN', NULL),
  ('00000000-0000-0000-0000-000000000502', '00000000-0000-0000-0000-000000000402', 'AAPL34', 'BRAAPLBDR004', 'BDR', NULL, 'DRN'),
  ('00000000-0000-0000-0000-000000000503', '00000000-0000-0000-0000-000000000403', NULL, NULL, 'FIXED_INCOME', NULL, NULL),
  ('00000000-0000-0000-0000-000000000504', NULL, 'BTC', NULL, 'CRYPTO', NULL, NULL),
  ('00000000-0000-0000-0000-000000000505', NULL, 'ETH', NULL, 'CRYPTO', NULL, NULL),
  ('00000000-0000-0000-0000-000000000506', '00000000-0000-0000-0000-000000000403', NULL, NULL, 'FIXED_INCOME', NULL, NULL);

INSERT INTO fixed_income_types (id, economic_index_id, name, semiannual_interest) VALUES
  ('00000000-0000-0000-0000-000000001001', '00000000-0000-0000-0000-000000000901', 'Tesouro IPCA+', false),
  ('00000000-0000-0000-0000-000000001002', '00000000-0000-0000-0000-000000000902', 'Tesouro Selic', false),
  ('00000000-0000-0000-0000-000000001003', NULL, 'Tesouro Prefixado', false);
INSERT INTO fixed_income_bonds (asset_id, fixed_income_type_id, maturity_date) VALUES
  ('00000000-0000-0000-0000-000000000503', '00000000-0000-0000-0000-000000001001', '2035-05-15'),
  ('00000000-0000-0000-0000-000000000506', '00000000-0000-0000-0000-000000001002', '2029-03-01');
-- linha real do arquivo do Tesouro (30/10/2026), taxas em fração; título fora de oferta sem taxa e PU de compra;
-- spread negativo do Tesouro Selic
INSERT INTO fixed_income_prices (asset_id, base_date, buy_rate, sell_rate, buy_price, sell_price) VALUES
  ('00000000-0000-0000-0000-000000000503', '2026-10-30', 0.0788, 0.0800, 2509.91, 2484.95),
  ('00000000-0000-0000-0000-000000000503', '2026-10-29', NULL, 0.0798, NULL, 2486.10),
  ('00000000-0000-0000-0000-000000000506', '2026-10-30', -0.0001, 0.0007, 20185.67, 20170.66);

INSERT INTO crypto_assets (asset_id, name) VALUES
  ('00000000-0000-0000-0000-000000000504', 'Bitcoin'),
  ('00000000-0000-0000-0000-000000000505', 'Ether');
INSERT INTO crypto_prices (asset_id, price_date, reference_price) VALUES
  ('00000000-0000-0000-0000-000000000505', '2026-10-30', 21000.12345678);

-- quantidade fracionária: cripto em exchange sem CNPJ (8 casas) e renda fixa (0,52 título)
INSERT INTO operations (portfolio_id, asset_id, broker_id, type, trade_date, quantity, unit_price, fees) VALUES
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000504', '00000000-0000-0000-0000-000000000102', 'BUY', '2026-08-15', 0.01250000, 328000, 0),
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000503', '00000000-0000-0000-0000-000000000101', 'BUY', '2026-07-10', 0.52, 3846.15, 0);

-- carteira ideal (0% é aceito) e uma meta de cada tipo, com e sem prazo
INSERT INTO target_allocations (portfolio_id, asset_class, target_percent) VALUES
  ('00000000-0000-0000-0000-000000000201', 'STOCK', 0.40),
  ('00000000-0000-0000-0000-000000000201', 'FII', 0.25),
  ('00000000-0000-0000-0000-000000000201', 'BDR', 0);
INSERT INTO portfolio_goals (portfolio_id, type, target_amount, target_month) VALUES
  ('00000000-0000-0000-0000-000000000201', 'NET_WORTH', 50000, '2028-12-01'),
  ('00000000-0000-0000-0000-000000000201', 'MONTHLY_INCOME', 300, NULL);

-- ---------------------------------------------------------------- casos inválidos: ativo (RN03)
SELECT pg_temp.expect_error('ação sem ticker',
  $q$INSERT INTO assets (issuer_id, ticker, isin, type) VALUES ('00000000-0000-0000-0000-000000000401', NULL, 'BRPETRACNOR9', 'STOCK')$q$, '23514');
SELECT pg_temp.expect_error('renda fixa com ticker',
  $q$INSERT INTO assets (issuer_id, ticker, type) VALUES ('00000000-0000-0000-0000-000000000403', 'IPCA35', 'FIXED_INCOME')$q$, '23514');
SELECT pg_temp.expect_error('cripto com símbolo fora do formato',
  $q$INSERT INTO assets (ticker, type) VALUES ('sol', 'CRYPTO')$q$, '23514');
SELECT pg_temp.expect_error('cripto sem símbolo',
  $q$INSERT INTO assets (ticker, type) VALUES (NULL, 'CRYPTO')$q$, '23514');
SELECT pg_temp.expect_error('símbolo de cripto igual a ticker existente',
  $q$INSERT INTO assets (ticker, type) VALUES ('BTC', 'CRYPTO')$q$, '23505');
SELECT pg_temp.expect_error('ação sem ISIN',
  $q$INSERT INTO assets (issuer_id, ticker, isin, type) VALUES ('00000000-0000-0000-0000-000000000401', 'PETR3', NULL, 'STOCK')$q$, '23514');
SELECT pg_temp.expect_error('cripto com ISIN',
  $q$INSERT INTO assets (ticker, isin, type) VALUES ('SOL', 'BRSOLACNOR00', 'CRYPTO')$q$, '23514');
SELECT pg_temp.expect_error('ISIN da renda fixa fora do formato',
  $q$INSERT INTO assets (issuer_id, isin, type) VALUES ('00000000-0000-0000-0000-000000000403', 'NTNB2035', 'FIXED_INCOME')$q$, '23514');
SELECT pg_temp.expect_error('ação sem emissor',
  $q$INSERT INTO assets (issuer_id, ticker, isin, type) VALUES (NULL, 'PETR3', 'BRPETRACNOR9', 'STOCK')$q$, '23514');
SELECT pg_temp.expect_error('cripto com emissor',
  $q$INSERT INTO assets (issuer_id, ticker, type) VALUES ('00000000-0000-0000-0000-000000000401', 'SOL', 'CRYPTO')$q$, '23514');
SELECT pg_temp.expect_error('BDR sem programa',
  $q$INSERT INTO assets (issuer_id, ticker, isin, type) VALUES ('00000000-0000-0000-0000-000000000402', 'AAPL35', 'BRAAPLBDR012', 'BDR')$q$, '23514');
SELECT pg_temp.expect_error('programa de BDR em ação',
  $q$INSERT INTO assets (issuer_id, ticker, isin, type, bdr_program) VALUES ('00000000-0000-0000-0000-000000000401', 'PETR3', 'BRPETRACNOR9', 'STOCK', 'DRN')$q$, '23514');
SELECT pg_temp.expect_error('programa de BDR fora do domínio',
  $q$INSERT INTO assets (issuer_id, ticker, isin, type, bdr_program) VALUES ('00000000-0000-0000-0000-000000000402', 'AAPL35', 'BRAAPLBDR012', 'BDR', 'DR4')$q$, '22P02');

-- ---------------------------------------------------------------- casos inválidos: corretora e operação
SELECT pg_temp.expect_error('CNPJ informado continua com 14 dígitos',
  $q$INSERT INTO brokers (name, cnpj) VALUES ('X', '123')$q$, '23514');
SELECT pg_temp.expect_error('quantidade fracionária negativa (RN04)',
  $q$INSERT INTO operations (portfolio_id, asset_id, broker_id, type, trade_date, quantity, unit_price, fees) VALUES ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000504', '00000000-0000-0000-0000-000000000102', 'BUY', '2026-08-16', -0.5, 328000, 0)$q$, '23514');

-- ---------------------------------------------------------------- casos inválidos: carteira ideal e metas (D43)
SELECT pg_temp.expect_error('percentual-alvo acima de 100% (fração)',
  $q$INSERT INTO target_allocations VALUES ('00000000-0000-0000-0000-000000000201', 'ETF', 15)$q$, '23514');
SELECT pg_temp.expect_error('percentual-alvo negativo',
  $q$INSERT INTO target_allocations VALUES ('00000000-0000-0000-0000-000000000201', 'ETF', -0.1)$q$, '23514');
SELECT pg_temp.expect_error('mesma classe duas vezes na carteira ideal',
  $q$INSERT INTO target_allocations VALUES ('00000000-0000-0000-0000-000000000201', 'STOCK', 0.1)$q$, '23505');
SELECT pg_temp.expect_error('classe fora do domínio de Ativo.tipo',
  $q$INSERT INTO target_allocations VALUES ('00000000-0000-0000-0000-000000000201', 'CASH', 0.1)$q$, '22P02');
SELECT pg_temp.expect_error('segunda meta do mesmo tipo na carteira',
  $q$INSERT INTO portfolio_goals (portfolio_id, type, target_amount) VALUES ('00000000-0000-0000-0000-000000000201', 'NET_WORTH', 100000)$q$, '23505');
SELECT pg_temp.expect_error('meta com valor-alvo zero',
  $q$UPDATE portfolio_goals SET target_amount = 0 WHERE type = 'MONTHLY_INCOME'$q$, '23514');
SELECT pg_temp.expect_error('prazo da meta fora do 1º dia do mês',
  $q$UPDATE portfolio_goals SET target_month = '2028-12-15' WHERE type = 'NET_WORTH'$q$, '23514');
SELECT pg_temp.expect_error('prazo da meta anterior ao mês de criação',
  $q$UPDATE portfolio_goals SET target_month = '2020-01-01' WHERE type = 'NET_WORTH'$q$, '23514');

-- ---------------------------------------------------------------- casos inválidos: renda fixa e cripto (D44)
SELECT pg_temp.expect_error('tipo de título com nome repetido',
  $q$INSERT INTO fixed_income_types (name, semiannual_interest) VALUES ('Tesouro Selic', false)$q$, '23505');
SELECT pg_temp.expect_error('mesmo tipo e vencimento em dois títulos',
  $q$WITH a AS (INSERT INTO assets (issuer_id, type) VALUES ('00000000-0000-0000-0000-000000000403', 'FIXED_INCOME') RETURNING id)
     INSERT INTO fixed_income_bonds SELECT id, '00000000-0000-0000-0000-000000001001', '2035-05-15' FROM a$q$, '23505');
SELECT pg_temp.expect_error('dia de preços sem nenhum valor',
  $q$INSERT INTO fixed_income_prices (asset_id, base_date) VALUES ('00000000-0000-0000-0000-000000000503', '2026-10-28')$q$, '23514');
SELECT pg_temp.expect_error('PU de venda zero',
  $q$INSERT INTO fixed_income_prices (asset_id, base_date, sell_price) VALUES ('00000000-0000-0000-0000-000000000503', '2026-10-28', 0)$q$, '23514');
SELECT pg_temp.expect_error('taxa em % em vez de fração',
  $q$INSERT INTO fixed_income_prices (asset_id, base_date, sell_rate) VALUES ('00000000-0000-0000-0000-000000000503', '2026-10-28', 7.88)$q$, '23514');
SELECT pg_temp.expect_error('preço e taxa para ativo que não é título',
  $q$INSERT INTO fixed_income_prices (asset_id, base_date, sell_price) VALUES ('00000000-0000-0000-0000-000000000501', '2026-10-28', 10)$q$, '23503');
SELECT pg_temp.expect_error('preço de referência de cripto zero',
  $q$INSERT INTO crypto_prices VALUES ('00000000-0000-0000-0000-000000000504', '2026-10-30', 0)$q$, '23514');
SELECT pg_temp.expect_error('preço de referência para ativo que não é cripto',
  $q$INSERT INTO crypto_prices VALUES ('00000000-0000-0000-0000-000000000501', '2026-10-30', 38)$q$, '23503');
SELECT pg_temp.expect_error('cripto com série de preço não pode ser apagada',
  $q$DELETE FROM assets WHERE id = '00000000-0000-0000-0000-000000000505'$q$, '23503');
SELECT pg_temp.expect_error('tipo de título em uso não pode ser apagado',
  $q$DELETE FROM fixed_income_types WHERE id = '00000000-0000-0000-0000-000000001001'$q$, '23503');

-- ---------------------------------------------------------------- comportamento das FKs
-- excluir um ativo sem dependentes apaga a especialização (CASCADE)
DELETE FROM fixed_income_prices WHERE asset_id = '00000000-0000-0000-0000-000000000506';
DELETE FROM assets WHERE id = '00000000-0000-0000-0000-000000000506';
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM fixed_income_bonds WHERE asset_id = '00000000-0000-0000-0000-000000000506') THEN
    RAISE EXCEPTION 'FALHOU especialização não removida com o ativo';
  END IF;
  RAISE NOTICE 'ok  exclusão de ativo remove a especialização';
END $$;

-- excluir a carteira remove a carteira ideal e as metas (CASCADE)
DELETE FROM portfolios WHERE id = '00000000-0000-0000-0000-000000000201';
DO $$ BEGIN
  IF (SELECT count(*) FROM target_allocations) <> 0 OR (SELECT count(*) FROM portfolio_goals) <> 0 THEN
    RAISE EXCEPTION 'FALHOU cascata da exclusão de carteira';
  END IF;
  RAISE NOTICE 'ok  exclusão de carteira remove carteira ideal e metas';
END $$;

ROLLBACK;
\echo 'Todos os testes de restrição da D3 passaram.'
