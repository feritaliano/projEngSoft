-- Consultas da Parte 2 de Banco de Dados (tarefa P2): 18 consultas sobre o seed (database/sql/inserts.sql).
-- Uso: num banco migrado e semeado, psql -f database/sql/queries.sql (ou node database/scripts/run-sql.mjs database/sql/queries.sql).
-- 1 a 10: junção de duas ou mais tabelas; 11 a 13: LEFT JOIN; 14 a 18: agregação com GROUP BY, HAVING e ORDER BY.
-- Datas fixas (12/11/2026, último pregão do seed; 13/11/2026, data de corte do seed) em vez de current_date, para o
-- resultado não mudar com o dia em que a consulta roda.
-- Nenhuma consulta compara o preço de compra de uma operação com fixed_income_prices: o Tesouro IPCA+ 2035 da
-- carteira "Longo prazo" tem preço ilustrativo (D62b).

-- ============================================================ Junção (1 a 10)

-- Consulta 1. Quais operações entraram por importação de planilha da corretora? Para cada uma: usuário, carteira,
-- arquivo e situação do lote, data, tipo, ativo, quantidade e preço.
SELECT u.name AS usuario, p.name AS carteira, b.file_name AS arquivo, b.status AS situacao_lote,
       o.trade_date AS data_pregao, o.type AS tipo, a.ticker, o.quantity AS quantidade, o.unit_price AS preco_unitario
FROM operations o
JOIN import_batches b ON b.id = o.import_batch_id
JOIN portfolios p ON p.id = o.portfolio_id
JOIN users u ON u.id = p.user_id
JOIN assets a ON a.id = o.asset_id
ORDER BY u.name, o.trade_date, o.sequence;

-- Consulta 2. Quais proventos a carteira "Dividendos" da conta de demonstração recebeu? Data, ativo, tipo de
-- provento, corretora que pagou, quantidade que gerou o direito, valor bruto, IR retido na fonte e valor líquido.
SELECT r.received_at AS recebido_em, a.ticker, d.type AS tipo_provento, br.name AS corretora,
       r.base_quantity AS quantidade_base, r.gross_amount AS valor_bruto, r.withheld_tax AS ir_retido,
       r.gross_amount - r.withheld_tax AS valor_liquido
FROM received_income r
JOIN income_distributions d ON d.id = r.income_distribution_id
JOIN assets a ON a.id = d.asset_id
JOIN brokers br ON br.id = r.broker_id
JOIN portfolios p ON p.id = r.portfolio_id
JOIN users u ON u.id = p.user_id
WHERE u.email = 'demo@carteirab3.dev' AND p.name = 'Dividendos'
ORDER BY r.received_at, a.ticker, d.record_date, br.name;

-- Consulta 3. Quais alertas de preço já dispararam, e qual fechamento do pregão os disparou? Usuário, ativo,
-- direção, preço-alvo, data e preço de fechamento da cotação.
SELECT u.name AS usuario, a.ticker, al.direction AS direcao, al.target_price AS preco_alvo,
       q.quote_date AS data_cotacao, q.close AS fechamento
FROM price_alerts al
JOIN users u ON u.id = al.user_id
JOIN assets a ON a.id = al.asset_id
JOIN quotes q ON q.asset_id = al.asset_id AND q.quote_date = al.triggered_quote_date
ORDER BY q.quote_date, u.name, a.ticker;

-- Consulta 4. Em que setor, subsetor e segmento da classificação da B3 está cada ação negociada? A classificação é
-- hierárquica (autorrelacionamento de Setor): o emissor aponta para o segmento, que aponta para o subsetor e este
-- para o setor econômico.
SELECT a.ticker, i.name AS emissor, s1.name AS setor_economico, s2.name AS subsetor, s3.name AS segmento
FROM assets a
JOIN issuers i ON i.id = a.issuer_id
JOIN sectors s3 ON s3.id = i.sector_id
JOIN sectors s2 ON s2.id = s3.parent_id
JOIN sectors s1 ON s1.id = s2.parent_id
WHERE a.type = 'STOCK' AND a.is_active
ORDER BY s1.name, s2.name, s3.name, a.ticker;

-- Consulta 5. Quanto custava comprar e quanto pagava vender cada título do Tesouro Direto na data-base de
-- 11/11/2026? Tipo do título, vencimento, se paga juros semestrais, taxas de compra e de venda (% ao ano) e
-- preços unitários (PU) de compra e de venda. Taxa e PU de compra vazios = título fora de venda no dia.
SELECT t.name AS tipo_titulo, b.maturity_date AS vencimento, t.semiannual_interest AS juros_semestrais,
       round(fp.buy_rate * 100, 2) AS taxa_compra_pct, round(fp.sell_rate * 100, 2) AS taxa_venda_pct,
       round(fp.buy_price, 2) AS pu_compra, round(fp.sell_price, 2) AS pu_venda
FROM fixed_income_bonds b
JOIN fixed_income_types t ON t.id = b.fixed_income_type_id
JOIN fixed_income_prices fp ON fp.asset_id = b.asset_id
WHERE fp.base_date = DATE '2026-11-11'
ORDER BY t.name, b.maturity_date;

-- Consulta 6. Em quais compras de criptoativos o preço pago ficou acima ou abaixo do preço de referência do dia?
-- Usuário, carteira, exchange, data, cripto, quantidade, preço pago, preço de referência e diferença em %.
SELECT u.name AS usuario, p.name AS carteira, br.name AS exchange, o.trade_date AS data_pregao, a.ticker,
       c.name AS criptoativo, o.quantity AS quantidade, o.unit_price AS preco_pago, cp.reference_price AS preco_referencia,
       round((o.unit_price / cp.reference_price - 1) * 100, 2) AS diferenca_pct
FROM operations o
JOIN portfolios p ON p.id = o.portfolio_id
JOIN users u ON u.id = p.user_id
JOIN brokers br ON br.id = o.broker_id
JOIN assets a ON a.id = o.asset_id
JOIN crypto_assets c ON c.asset_id = o.asset_id
JOIN crypto_prices cp ON cp.asset_id = o.asset_id AND cp.price_date = o.trade_date
WHERE o.type = 'BUY'
ORDER BY o.trade_date, u.name;

-- Consulta 7. Quais apurações mensais de IR foram quitadas por DARF, e quanto de imposto cada uma gerou pela regra
-- vigente no mês? A regra aplicável é a de maior início de vigência até o mês (RegraIR), não uma FK. Imposto =
-- (resultado − prejuízo compensado) × alíquota, zero se o mês é isento (vendas até o limite de isenção); IRRF de
-- 0,005% sobre as vendas, deduzido quando passa de R$ 1,00 (memoria-calculo.md, R13). Um DARF pode quitar mais de
-- uma apuração (Carla: 02 e 04/2026, R17).
SELECT u.name AS usuario, ta.reference_month AS mes, c.code AS categoria, ta.total_sales AS vendas,
       ta.net_result AS resultado, ta.loss_offset AS prejuizo_compensado, round(tr.rate * 100, 2) AS aliquota_pct,
       x.imposto, x.irrf, x.imposto - x.irrf AS devido,
       d.reference_month AS mes_darf, d.amount_paid AS valor_pago_darf, d.paid_at AS pago_em
FROM tax_assessments ta
JOIN users u ON u.id = ta.user_id
JOIN tax_categories c ON c.id = ta.tax_category_id
JOIN darfs d ON d.id = ta.darf_id
JOIN tax_rules tr ON tr.tax_category_id = ta.tax_category_id
                 AND tr.effective_from = (SELECT max(r2.effective_from) FROM tax_rules r2
                                          WHERE r2.tax_category_id = ta.tax_category_id
                                            AND r2.effective_from <= ta.reference_month)
CROSS JOIN LATERAL (
  SELECT CASE WHEN ta.total_sales <= tr.sales_exemption_limit THEN 0
              ELSE round(greatest(ta.net_result - ta.loss_offset, 0) * tr.rate, 2) END AS imposto,
         CASE WHEN round(ta.total_sales * 0.00005, 2) > 1 THEN round(ta.total_sales * 0.00005, 2) ELSE 0 END AS irrf
) x
ORDER BY u.name, ta.reference_month;

-- Consulta 8. Qual o preço sobre valor patrimonial (P/VP) de cada FII? Valor patrimonial por cota do informe mensal
-- da CVM de 09/2026 (patrimônio líquido ÷ cotas emitidas) e fechamento do pregão de 30/10/2026.
SELECT a.ticker, i.name AS fundo, m.net_worth AS patrimonio_liquido, m.shares_outstanding AS cotas_emitidas,
       round(m.net_worth / m.shares_outstanding, 2) AS vp_por_cota, q.close AS fechamento,
       round(q.close / (m.net_worth / m.shares_outstanding), 2) AS p_vp
FROM fii_monthly_reports m
JOIN issuers i ON i.id = m.issuer_id
JOIN assets a ON a.issuer_id = i.id AND a.type = 'FII'
JOIN quotes q ON q.asset_id = a.id AND q.quote_date = DATE '2026-10-30'
WHERE m.reference_month = DATE '2026-09-01'
ORDER BY p_vp, a.ticker;

-- Consulta 9. Qual a receita, o lucro líquido e a margem líquida de cada empresa na DFP de 2025 (demonstração
-- consolidada)? Conta 3.01 = receita (para bancos, receitas de intermediação financeira); 3.11 = lucro líquido.
SELECT i.name AS empresa, f.period_end AS fim_periodo, rec.value AS receita, luc.value AS lucro_liquido,
       round(luc.value / rec.value * 100, 2) AS margem_liquida_pct
FROM financial_statements f
JOIN issuers i ON i.id = f.issuer_id
JOIN statement_lines rec ON rec.financial_statement_id = f.id AND rec.scope = 'CONSOLIDATED' AND rec.account_code = '3.01'
JOIN statement_lines luc ON luc.financial_statement_id = f.id AND luc.scope = 'CONSOLIDATED' AND luc.account_code = '3.11'
WHERE f.filing_type = 'DFP' AND f.period_end = DATE '2025-12-31'
ORDER BY margem_liquida_pct DESC;

-- Consulta 10. Quais metas têm prazo, e quantos meses faltam para cada uma (contando de 11/2026)? Usuário, carteira,
-- tipo da meta (patrimônio ou renda mensal com proventos), valor-alvo e prazo.
SELECT u.name AS usuario, p.name AS carteira, g.type AS tipo_meta, g.target_amount AS valor_alvo,
       to_char(g.target_month, 'MM/YYYY') AS prazo,
       (extract(year FROM g.target_month) - 2026) * 12 + extract(month FROM g.target_month) - 11 AS meses_restantes
FROM portfolio_goals g
JOIN portfolios p ON p.id = g.portfolio_id
JOIN users u ON u.id = p.user_id
WHERE g.target_month IS NOT NULL
ORDER BY meses_restantes, u.name;

-- ============================================================ LEFT JOIN (11 a 13)

-- Consulta 11. Quantas carteiras cada usuário tem, e quantas operações cada carteira registra, incluindo o usuário
-- sem carteira e as carteiras sem operação?
SELECT u.name AS usuario, p.name AS carteira, count(o.id) AS operacoes, max(o.trade_date) AS ultima_operacao
FROM users u
LEFT JOIN portfolios p ON p.user_id = u.id
LEFT JOIN operations o ON o.portfolio_id = p.id
GROUP BY u.name, p.name
ORDER BY u.name, p.name;

-- Consulta 12. Para cada provento anunciado, quantas carteiras o receberam e quanto foi pago no total, incluindo os
-- proventos sem nenhum recebimento? Situação em 13/11/2026: "a pagar" se a data de pagamento é posterior.
SELECT a.ticker, d.type AS tipo_provento, d.record_date AS data_com, d.payment_date AS data_pagamento,
       d.amount_per_share AS valor_por_cota,
       CASE WHEN d.payment_date > DATE '2026-11-13' THEN 'a pagar' ELSE 'pago' END AS situacao,
       count(r.id) AS recebimentos, coalesce(sum(r.gross_amount), 0) AS total_bruto_recebido
FROM income_distributions d
JOIN assets a ON a.id = d.asset_id
LEFT JOIN received_income r ON r.income_distribution_id = d.id
GROUP BY d.id, a.ticker
ORDER BY a.ticker, d.record_date, d.payment_date, d.type;

-- Consulta 13. Qual o último fechamento de cada ativo da lista de observação da Gabriela, incluindo os que não têm
-- cotação na B3 (cripto e renda fixa têm séries próprias, não Cotação)? Renda fixa sem ticker aparece pelo tipo e
-- vencimento do título.
SELECT coalesce(a.ticker, t.name || ' ' || extract(year FROM fb.maturity_date)) AS ativo, a.type AS classe,
       w.added_at::date AS incluido_em, q.close AS fechamento_12_11_2026
FROM watchlist_items w
JOIN users u ON u.id = w.user_id
JOIN assets a ON a.id = w.asset_id
LEFT JOIN fixed_income_bonds fb ON fb.asset_id = a.id
LEFT JOIN fixed_income_types t ON t.id = fb.fixed_income_type_id
LEFT JOIN quotes q ON q.asset_id = a.id AND q.quote_date = DATE '2026-11-12'
WHERE u.email = 'gabriela.martins@example.com'
ORDER BY w.added_at;

-- ============================================================ Agregação (14 a 18)

-- Consulta 14. Quanto custam as posições abertas da carteira "Longo prazo" da conta de demonstração? Para cada ativo
-- com quantidade > 0: quantidade, preço médio e custo (quantidade × preço médio); e o custo total da carteira, que
-- deve ser R$ 16.151,27. O preço médio é refeito em ordem de data e sequência (RN05 a RN09): a compra soma
-- quantidade × preço + custos ao custo, a venda tira quantidade × preço médio e não muda o preço médio.
WITH RECURSIVE o AS (
  -- ::numeric sem escala: o termo recursivo da CTE precisa do mesmo tipo do termo inicial.
  SELECT op.asset_id, op.type, op.quantity::numeric AS q, op.unit_price::numeric AS p, op.fees::numeric AS f,
         row_number() OVER (PARTITION BY op.asset_id ORDER BY op.trade_date, op.sequence) AS rn
  FROM operations op
  JOIN portfolios pf ON pf.id = op.portfolio_id
  JOIN users u ON u.id = pf.user_id
  WHERE u.email = 'demo@carteirab3.dev' AND pf.name = 'Longo prazo'
), s AS (
  SELECT asset_id, rn, type, q, q AS qty, q * p + f AS cost FROM o WHERE rn = 1
  UNION ALL
  SELECT o.asset_id, o.rn, o.type, o.q,
         CASE o.type WHEN 'BUY' THEN s.qty + o.q ELSE s.qty - o.q END,
         CASE WHEN o.type = 'BUY' THEN s.cost + o.q * o.p + o.f WHEN s.qty = o.q THEN 0 ELSE s.cost - o.q * s.cost / s.qty END
  FROM s JOIN o ON o.asset_id = s.asset_id AND o.rn = s.rn + 1
)
SELECT coalesce(a.ticker, t.name || ' ' || extract(year FROM fb.maturity_date)) AS ativo, a.type AS classe,
       count(*) AS operacoes,
       sum(CASE s.type WHEN 'BUY' THEN s.q ELSE -s.q END) AS quantidade,
       round((array_agg(s.cost / nullif(s.qty, 0) ORDER BY s.rn DESC))[1], 2) AS preco_medio,
       round((array_agg(s.cost ORDER BY s.rn DESC))[1], 2) AS custo,
       round(sum((array_agg(s.cost ORDER BY s.rn DESC))[1]) OVER (), 2) AS custo_total_carteira
FROM s
JOIN assets a ON a.id = s.asset_id
LEFT JOIN fixed_income_bonds fb ON fb.asset_id = a.id
LEFT JOIN fixed_income_types t ON t.id = fb.fixed_income_type_id
GROUP BY a.id, a.ticker, a.type, t.name, fb.maturity_date
HAVING sum(CASE s.type WHEN 'BUY' THEN s.q ELSE -s.q END) > 0
ORDER BY custo DESC;

-- Consulta 15. Quanto cada usuário recebeu de proventos em 2026, por tipo de provento? Só os totais de pelo menos
-- R$ 100,00 brutos, do maior para o menor valor líquido.
SELECT u.name AS usuario, d.type AS tipo_provento, count(*) AS recebimentos, sum(r.gross_amount) AS total_bruto,
       sum(r.withheld_tax) AS total_ir_retido, sum(r.gross_amount - r.withheld_tax) AS total_liquido
FROM received_income r
JOIN income_distributions d ON d.id = r.income_distribution_id
JOIN portfolios p ON p.id = r.portfolio_id
JOIN users u ON u.id = p.user_id
WHERE r.received_at BETWEEN DATE '2026-01-01' AND DATE '2026-12-31'
GROUP BY u.name, d.type
HAVING sum(r.gross_amount) >= 100
ORDER BY total_liquido DESC;

-- Consulta 16. Qual a vacância de cada fundo imobiliário no informe trimestral? Média da vacância dos imóveis para
-- renda acabados, ponderada pela área (modelo-er.md, 2.2); só fundos com área declarada nesses imóveis.
SELECT i.name AS fundo, r.reference_date AS data_referencia, count(*) AS imoveis_renda_acabados,
       sum(pr.area) AS area_total, round(sum(pr.area * pr.vacancy_rate) / sum(pr.area) * 100, 2) AS vacancia_pct
FROM fii_report_properties pr
JOIN fii_quarterly_reports r ON r.id = pr.fii_quarterly_report_id
JOIN issuers i ON i.id = r.issuer_id
WHERE pr.property_class = 'RENT_FINISHED' AND pr.vacancy_rate IS NOT NULL
GROUP BY i.name, r.reference_date
HAVING sum(pr.area) > 0
ORDER BY vacancia_pct DESC;

-- Consulta 17. Quais usuários tiveram resultado líquido positivo em 2026 em cada categoria de IR, somando as
-- apurações mensais? Meses apurados, total de vendas, resultado e prejuízo compensado, do maior resultado para o menor.
SELECT u.name AS usuario, c.name AS categoria, count(*) AS meses_apurados, sum(ta.total_sales) AS total_vendas,
       sum(ta.net_result) AS resultado_liquido, sum(ta.loss_offset) AS prejuizo_compensado
FROM tax_assessments ta
JOIN users u ON u.id = ta.user_id
JOIN tax_categories c ON c.id = ta.tax_category_id
WHERE ta.reference_month BETWEEN DATE '2026-01-01' AND DATE '2026-12-01'
GROUP BY u.name, c.name
HAVING sum(ta.net_result) > 0
ORDER BY resultado_liquido DESC;

-- Consulta 18. Quais carteiras têm a carteira ideal fechada em 100%, e como ela se divide entre renda variável
-- (ações, FIIs, ETFs e BDRs), renda fixa e cripto? Do maior percentual em renda variável para o menor.
SELECT u.name AS usuario, p.name AS carteira, count(*) AS classes,
       round(coalesce(sum(ta.target_percent) FILTER (WHERE ta.asset_class IN ('STOCK', 'FII', 'ETF', 'BDR')), 0) * 100, 2) AS renda_variavel_pct,
       round(coalesce(sum(ta.target_percent) FILTER (WHERE ta.asset_class = 'FIXED_INCOME'), 0) * 100, 2) AS renda_fixa_pct,
       round(coalesce(sum(ta.target_percent) FILTER (WHERE ta.asset_class = 'CRYPTO'), 0) * 100, 2) AS cripto_pct
FROM target_allocations ta
JOIN portfolios p ON p.id = ta.portfolio_id
JOIN users u ON u.id = p.user_id
GROUP BY u.name, p.name
HAVING sum(ta.target_percent) = 1
ORDER BY renda_variavel_pct DESC, u.name;
