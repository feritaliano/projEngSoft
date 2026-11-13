-- Seed do banco Carteira B3 (fonte única; `prisma db seed` só executa este arquivo).
-- Idempotente: rodar duas vezes não muda nada (ON CONFLICT DO NOTHING pela PK).
-- Ordem das seções: 1. catálogo (BD-1, primeiro corte do P1, ainda não escrito) → 2. mercado (D59, PF).
-- As linhas de mercado acham o pai pela chave natural (ISIN, código do índice) com LEFT JOIN: se o pai
-- não existir, a FK vem nula e o INSERT falha no NOT NULL, em vez de pular a linha em silêncio.
-- Arquivos de origem, URL, hash e mapeamento: database/docs/fontes-poc.md.

BEGIN;

-- ============================================================ 1. catálogo (BD-1)
-- Pendente. Esta seção precisa criar, antes da seção 2, ao menos:
--   economic_indexes com code = 'IBOV';
--   assets PETR4 (ISIN BRPETRACNPR6), BBDC4 (BRBBDCACNPR8) e HGLG11 (BRHGLGCTF004).

-- ============================================================ 2. mercado (D59, prova de conceito PF)

-- 2.1 index_values (IBOV), pontos de fechamento.
-- Fonte: B3, Índices, "Dados históricos e estatísticas", IBOV 2026, arquivo IBOV_2026.csv
--   https://sistemaswebb3-listados.b3.com.br/indexStatisticsProxy/IndexCall/GetDownloadPortfolioDay/eyJpbmRleCI6IklCT1YiLCJsYW5ndWFnZSI6InB0LWJyIiwieWVhciI6IjIwMjYifQ==
--   baixado em 12/11/2026 21:43 (BRT); SHA-256 35a6de97d2e3c59674cf59b7a86717c6892f1d6f58e3842b010e8d8df72db5e0.
-- Pregões de 26/10/2026 a 12/11/2026 (02/11, Finados, sem pregão).
INSERT INTO index_values (economic_index_id, reference_date, value)
SELECT e.id, v.reference_date::date, v.value::numeric
FROM (VALUES
  ('2026-10-26', '176608.23'),
  ('2026-10-27', '175710.05'),
  ('2026-10-28', '171006.10'),
  ('2026-10-29', '169186.42'),
  ('2026-10-30', '167921.80'),
  ('2026-11-03', '165528.92'),
  ('2026-11-04', '167563.47'),
  ('2026-11-05', '166191.45'),
  ('2026-11-06', '168498.45'),
  ('2026-11-09', '172236.05'),
  ('2026-11-10', '171336.99'),
  ('2026-11-11', '172060.43'),
  ('2026-11-12', '171324.31')
) AS v (reference_date, value)
LEFT JOIN economic_indexes e ON e.code = 'IBOV'
ON CONFLICT DO NOTHING;

-- 2.2 income_distributions: dividendos, JCP e rendimentos de FII.
-- Fonte: B3, portal de empresas listadas, endpoint listedCompaniesProxy (não oficial, D59), campo cashDividends:
--   https://sistemaswebb3-listados.b3.com.br/listedCompaniesProxy/CompanyCall/GetListedSupplementCompany/<base64>
--   PETR: eyJpc3N1aW5nQ29tcGFueSI6IlBFVFIiLCJsYW5ndWFnZSI6InB0LWJyIn0= (SHA-256 9640204b919e1b8050e2370e4d007510b44745a43bda35b453af25c3ca3df283)
--   BBDC: eyJpc3N1aW5nQ29tcGFueSI6IkJCREMiLCJsYW5ndWFnZSI6InB0LWJyIn0= (SHA-256 1c4d2b89f81b1f387c4c76378eee620fdf99928aa322c55ed2d4eee2bca71e9c)
--   HGLG: eyJpc3N1aW5nQ29tcGFueSI6IkhHTEciLCJsYW5ndWFnZSI6InB0LWJyIn0= (SHA-256 1943379b36917b904fee6a37f637387c23aaaba263a1294a530b65f243499e0a)
--   baixados em 12/11/2026 21:43 (BRT).
-- Campos: isinCode → asset_id; label → type (DIVIDENDO → DIVIDEND, JRS CAP PROPRIO → JCP, RENDIMENTO de FII → FII_INCOME);
--   lastDatePrior (data-com) → record_date; paymentDate → payment_date; rate → amount_per_share.
-- Fora do seed: "RENDIMENTO" de ação (PETR, sem valor em income_type) e direitos de subscrição de FII (HGLG13/14).
-- amount_per_share é NUMERIC(20,8) e a B3 publica 11 casas: onde a fonte tem 9 casas significativas,
--   o valor abaixo está arredondado na 8ª e o original vai no comentário (achado F2 do fontes-poc.md).
INSERT INTO income_distributions (id, asset_id, type, record_date, payment_date, amount_per_share, source)
SELECT v.id::uuid, a.id, v.type::income_type, v.record_date::date, v.payment_date::date, v.amount::numeric, 'B3'
FROM (VALUES
  -- PETR4: Anual/2025, aprovados em 11/12/2025
  ('00000000-0000-0000-0000-000000000001', 'BRPETRACNPR6', 'JCP',        '2025-12-22', '2026-02-20', '0.47160378'),
  ('00000000-0000-0000-0000-000000000002', 'BRPETRACNPR6', 'DIVIDEND',   '2025-12-22', '2026-03-20', '0.29642144'),
  ('00000000-0000-0000-0000-000000000003', 'BRPETRACNPR6', 'JCP',        '2025-12-22', '2026-03-20', '0.17518233'),
  -- PETR4: Anual/2025, aprovados em 16/04/2026 (duas parcelas)
  ('00000000-0000-0000-0000-000000000004', 'BRPETRACNPR6', 'JCP',        '2026-04-22', '2026-05-20', '0.31311454'),
  ('00000000-0000-0000-0000-000000000005', 'BRPETRACNPR6', 'JCP',        '2026-04-22', '2026-06-22', '0.31311454'),
  -- PETR4: Anual/2026, aprovados em 11/05/2026 (duas parcelas)
  ('00000000-0000-0000-0000-000000000006', 'BRPETRACNPR6', 'JCP',        '2026-06-01', '2026-08-20', '0.35048636'),
  ('00000000-0000-0000-0000-000000000007', 'BRPETRACNPR6', 'JCP',        '2026-06-01', '2026-09-21', '0.35048636'),
  -- PETR4: Anual/2026, aprovados em 06/08/2026 (a pagar em 12/11/2026)
  ('00000000-0000-0000-0000-000000000008', 'BRPETRACNPR6', 'JCP',        '2026-08-21', '2026-11-23', '0.67407131'),
  ('00000000-0000-0000-0000-000000000009', 'BRPETRACNPR6', 'DIVIDEND',   '2026-08-21', '2026-12-21', '0.47156696'),
  ('00000000-0000-0000-0000-000000000010', 'BRPETRACNPR6', 'JCP',        '2026-08-21', '2026-12-21', '0.20250435'),
  -- BBDC4: JCP complementar 2025, mensais e trimestrais de 2026
  ('00000000-0000-0000-0000-000000000011', 'BRBBDCACNPR8', 'JCP',        '2025-12-29', '2026-07-31', '0.38630982'), -- fonte 0,38630982300
  ('00000000-0000-0000-0000-000000000012', 'BRBBDCACNPR8', 'JCP',        '2026-01-02', '2026-02-02', '0.01897481'), -- fonte 0,01897480900
  ('00000000-0000-0000-0000-000000000013', 'BRBBDCACNPR8', 'JCP',        '2026-04-06', '2026-09-15', '0.29733852'), -- fonte 0,29733851900
  ('00000000-0000-0000-0000-000000000014', 'BRBBDCACNPR8', 'JCP',        '2026-07-03', '2026-09-15', '0.34689494'), -- fonte 0,34689493900
  ('00000000-0000-0000-0000-000000000015', 'BRBBDCACNPR8', 'JCP',        '2026-10-13', '2027-04-30', '0.35624459'),
  ('00000000-0000-0000-0000-000000000016', 'BRBBDCACNPR8', 'JCP',        '2026-11-03', '2026-12-01', '0.01897481'), -- fonte 0,01897480900
  -- HGLG11: rendimentos mensais de jan. a out. de 2026 (data-com no último dia útil do mês)
  ('00000000-0000-0000-0000-000000000017', 'BRHGLGCTF004', 'FII_INCOME', '2026-01-30', '2026-02-13', '1.10'),
  ('00000000-0000-0000-0000-000000000018', 'BRHGLGCTF004', 'FII_INCOME', '2026-02-27', '2026-03-13', '1.10'),
  ('00000000-0000-0000-0000-000000000019', 'BRHGLGCTF004', 'FII_INCOME', '2026-03-31', '2026-04-15', '1.10'),
  ('00000000-0000-0000-0000-000000000020', 'BRHGLGCTF004', 'FII_INCOME', '2026-04-30', '2026-05-15', '1.10'),
  ('00000000-0000-0000-0000-000000000021', 'BRHGLGCTF004', 'FII_INCOME', '2026-05-29', '2026-06-15', '1.10'),
  ('00000000-0000-0000-0000-000000000022', 'BRHGLGCTF004', 'FII_INCOME', '2026-06-30', '2026-07-14', '1.10'),
  ('00000000-0000-0000-0000-000000000023', 'BRHGLGCTF004', 'FII_INCOME', '2026-07-31', '2026-08-14', '1.17'),
  ('00000000-0000-0000-0000-000000000024', 'BRHGLGCTF004', 'FII_INCOME', '2026-08-31', '2026-09-15', '1.17'),
  ('00000000-0000-0000-0000-000000000025', 'BRHGLGCTF004', 'FII_INCOME', '2026-09-30', '2026-10-15', '1.17'),
  ('00000000-0000-0000-0000-000000000026', 'BRHGLGCTF004', 'FII_INCOME', '2026-10-30', '2026-11-16', '1.17')
) AS v (id, isin, type, record_date, payment_date, amount)
LEFT JOIN assets a ON a.isin = v.isin
ON CONFLICT DO NOTHING;

-- 2.3 crypto_prices: sem linhas.
-- Fonte prevista (D44, D59): Mercado Bitcoin, API pública v4, candles diários de BTC-BRL
--   https://api.mercadobitcoin.net/api/v4/candles?symbol=BTC-BRL&resolution=1d&from=1790812800&to=1794528000
-- Em 12/11/2026 21:43 (BRT) a API respondeu 403 (bloqueio do Cloudflare) a esta rede; nenhum preço
-- foi transcrito para não inventar dado (achado F1 do fontes-poc.md).

COMMIT;
