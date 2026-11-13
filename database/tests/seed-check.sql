-- Conferência do seed (database/sql/inserts.sql), num banco migrado depois de npm run db:seed.
-- Uso no CI: roda depois de cada uma das duas execuções do seed e as contagens têm de ser iguais (idempotência).
-- Aborta (RAISE) se faltar uma regra do seed; no fim, lista as contagens de todas as tabelas de public.
-- As contas de posição, preço médio e IR seguem database/docs/memoria-calculo.md (seções 4 e 7).
-- As conferências de IR, proventos recebidos, eventos e telas salvas olham só os usuários do seed (demo@carteirab3.dev
-- e @example.com), para não falhar num banco de desenvolvimento com usuários criados pela tela.

-- 1. Catálogo (BD-1): 6 classes, especializações, massa do handoff e corretoras sem nome repetido.
DO $$
BEGIN
  IF (SELECT count(DISTINCT type) FROM assets WHERE is_active) <> 6 THEN
    RAISE EXCEPTION 'seed: o catálogo ativo não tem as 6 classes de ativo';
  END IF;
  IF EXISTS (SELECT 1 FROM assets a LEFT JOIN fixed_income_bonds b ON b.asset_id = a.id
             WHERE a.type = 'FIXED_INCOME' AND b.asset_id IS NULL)
     OR EXISTS (SELECT 1 FROM assets a LEFT JOIN crypto_assets c ON c.asset_id = a.id
                WHERE a.type = 'CRYPTO' AND c.asset_id IS NULL) THEN
    RAISE EXCEPTION 'seed: título de renda fixa ou cripto sem a especialização';
  END IF;
  IF (SELECT count(*) FROM assets
      WHERE ticker IN ('PETR4', 'WEGE3', 'MXRF11', 'ITSA4', 'BOVA11', 'BBDC4', 'HGLG11') AND is_active) <> 7
     OR (SELECT count(*) FROM brokers WHERE name IN ('XP Investimentos', 'NuInvest', 'Rico')) <> 3 THEN
    RAISE EXCEPTION 'seed: falta ativo ou corretora da massa do handoff ou da seção de mercado';
  END IF;
  -- O seed acha a corretora pelo nome (brokers.name não é único): nome repetido ligaria a operação a qualquer uma.
  IF EXISTS (SELECT 1 FROM brokers GROUP BY name HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'seed: duas corretoras com o mesmo nome';
  END IF;
END $$;

-- 2. ±10 tuplas por tabela de public (enunciado de BD, item 2). Exceções de domínio fechado (D60d):
-- economic_indexes (5 códigos), fixed_income_types (8 tipos do Tesouro), tax_categories (4 categorias) e
-- tax_rules (a regra vigente de cada categoria, desde 2005; memoria-calculo.md, seção 3).
DO $$
DECLARE t text; n bigint; c bigint;
BEGIN
  FOR t IN SELECT table_name FROM information_schema.tables
           WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name <> '_prisma_migrations'
             AND table_name NOT IN ('economic_indexes', 'fixed_income_types', 'tax_categories', 'tax_rules') LOOP
    EXECUTE format('SELECT count(*) FROM public.%I', t) INTO n;
    IF n < 10 THEN RAISE EXCEPTION 'seed: % tem % linhas (mínimo 10)', t, n; END IF;
  END LOOP;
  -- Linhas que o seed grava em cada tabela: uma linha repetida no VALUES some no ON CONFLICT DO NOTHING; com o mínimo
  -- abaixo, a perda aparece. É mínimo, não igualdade, porque a carga do K5 e o uso da tela acrescentam linhas.
  FOR t, n IN SELECT * FROM (VALUES
      ('assets', 72), ('brokers', 11), ('corporate_events', 11), ('corporate_filings', 14), ('crypto_assets', 12),
      ('crypto_prices', 25), ('darfs', 10), ('economic_indexes', 5), ('fii_monthly_reports', 16),
      ('fii_quarterly_reports', 17), ('fii_report_properties', 14), ('financial_statements', 11),
      ('fixed_income_bonds', 10), ('fixed_income_prices', 50), ('fixed_income_types', 8), ('import_batches', 10),
      ('income_distributions', 26), ('index_values', 13), ('indicators', 15), ('issuers', 49), ('operations', 68),
      ('portfolio_goals', 12), ('portfolios', 12), ('price_alerts', 13), ('quotes', 97), ('received_income', 29),
      ('saved_screens', 11), ('screen_criteria', 15), ('sectors', 37), ('statement_lines', 44),
      ('target_allocations', 15), ('tax_assessments', 19), ('tax_categories', 4), ('tax_rules', 4), ('users', 10),
      ('watchlist_items', 13)) AS v (tabela, minimo) LOOP
    EXECUTE format('SELECT count(*) FROM public.%I', t) INTO c;
    IF c < n THEN RAISE EXCEPTION 'seed: % tem % linhas (o seed grava %)', t, c, n; END IF;
  END LOOP;
END $$;

-- 3. Uma linha que só aparece com LEFT JOIN em cada consulta planejada do P2.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM users u LEFT JOIN portfolios p ON p.user_id = u.id WHERE p.id IS NULL) THEN
    RAISE EXCEPTION 'seed: falta usuário sem carteira'; END IF;
  IF NOT EXISTS (SELECT 1 FROM portfolios p LEFT JOIN operations o ON o.portfolio_id = p.id WHERE o.id IS NULL) THEN
    RAISE EXCEPTION 'seed: falta carteira sem operações'; END IF;
  IF NOT EXISTS (SELECT 1 FROM assets a LEFT JOIN quotes q ON q.asset_id = a.id
                 WHERE q.asset_id IS NULL AND a.type IN ('STOCK', 'FII', 'ETF', 'BDR')) THEN
    RAISE EXCEPTION 'seed: falta ativo da B3 sem cotação'; END IF;
  IF NOT EXISTS (SELECT 1 FROM income_distributions d LEFT JOIN received_income r ON r.income_distribution_id = d.id
                 WHERE r.id IS NULL) THEN
    RAISE EXCEPTION 'seed: falta provento sem recebimento'; END IF;
  IF NOT EXISTS (SELECT 1 FROM assets a LEFT JOIN income_distributions d ON d.asset_id = a.id WHERE d.id IS NULL) THEN
    RAISE EXCEPTION 'seed: falta ativo sem provento'; END IF;
  IF NOT EXISTS (SELECT 1 FROM issuers i LEFT JOIN assets a ON a.issuer_id = i.id WHERE a.id IS NULL)
     OR NOT EXISTS (SELECT 1 FROM issuers WHERE sector_id IS NULL) THEN
    RAISE EXCEPTION 'seed: falta emissor sem ativo ou emissor sem setor'; END IF;
  IF NOT EXISTS (SELECT 1 FROM assets WHERE NOT is_active) THEN
    RAISE EXCEPTION 'seed: falta ativo fora de negociação'; END IF;
  IF NOT EXISTS (SELECT 1 FROM saved_screens WHERE sort_indicator_id IS NULL)
     OR NOT EXISTS (SELECT 1 FROM saved_screens WHERE sort_indicator_id IS NOT NULL)
     OR NOT EXISTS (SELECT 1 FROM saved_screens s LEFT JOIN screen_criteria c ON c.saved_screen_id = s.id
                    WHERE c.saved_screen_id IS NULL) THEN
    RAISE EXCEPTION 'seed: faltam telas salvas com e sem ordenação, ou tela sem critérios'; END IF;
  -- O indicador de ordenação é achado pelo código com LEFT JOIN (a FK aceita nulo): só estas três telas ficam sem.
  IF EXISTS (SELECT 1 FROM saved_screens s JOIN users u ON u.id = s.user_id
             WHERE (u.email = 'demo@carteirab3.dev' OR u.email LIKE '%@example.com') AND s.sort_indicator_id IS NULL
               AND (u.email, s.name) NOT IN (('bruno.almeida@example.com', 'Valor'),
                                             ('diego.ferreira@example.com', 'Lucro por ação'),
                                             ('henrique.costa@example.com', 'Sem critério'))) THEN
    RAISE EXCEPTION 'seed: tela salva sem o indicador de ordenação previsto'; END IF;
  IF NOT EXISTS (SELECT 1 FROM portfolios p LEFT JOIN target_allocations t ON t.portfolio_id = p.id
                 WHERE t.portfolio_id IS NULL) THEN
    RAISE EXCEPTION 'seed: falta carteira sem carteira ideal'; END IF;
  IF NOT EXISTS (SELECT 1 FROM fii_quarterly_reports r LEFT JOIN fii_report_properties p ON p.fii_quarterly_report_id = r.id
                 WHERE p.fii_quarterly_report_id IS NULL) THEN
    RAISE EXCEPTION 'seed: falta informe trimestral sem imóveis (KNCR11, de papel, e o recorte da seção 2.7)'; END IF;
  IF (SELECT count(DISTINCT property_class) FROM fii_report_properties) <> 4
     OR (SELECT count(DISTINCT type) FROM corporate_events) <> 3
     OR (SELECT count(DISTINCT type) FROM portfolio_goals) <> 2
     OR NOT EXISTS (SELECT 1 FROM portfolio_goals WHERE target_month IS NULL)
     OR NOT EXISTS (SELECT 1 FROM portfolio_goals WHERE target_month IS NOT NULL)
     OR (SELECT count(DISTINCT status) FROM import_batches) <> 3 THEN
    RAISE EXCEPTION 'seed: falta variedade (classe de imóvel, tipo de evento, tipo de meta, prazo, situação de lote)'; END IF;
  IF NOT EXISTS (SELECT 1 FROM operations WHERE import_batch_id IS NULL)
     OR NOT EXISTS (SELECT 1 FROM operations WHERE import_batch_id IS NOT NULL)
     OR (SELECT count(DISTINCT a.type) FROM operations o JOIN assets a ON a.id = o.asset_id) <> 6 THEN
    RAISE EXCEPTION 'seed: faltam operações importadas e lançadas à mão, ou operações nas 6 classes'; END IF;
END $$;

-- 4. Operações: data não futura (D54); lote confirmado tem tantas operações quanto linhas, os demais nenhuma;
-- nenhuma posição atravessa um evento corporativo (o seed-check não aplica eventos); sem day trade (fora do seed).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM operations WHERE trade_date > (now() AT TIME ZONE 'America/Sao_Paulo')::date) THEN
    RAISE EXCEPTION 'seed: operação com data futura'; END IF;
  IF EXISTS (SELECT 1 FROM import_batches b
             WHERE (SELECT count(*) FROM operations o WHERE o.import_batch_id = b.id)
                   <> CASE WHEN b.status = 'CONFIRMED' THEN b.row_count ELSE 0 END) THEN
    RAISE EXCEPTION 'seed: lote de importação com número de operações diferente do esperado'; END IF;
  IF EXISTS (SELECT 1 FROM corporate_events e JOIN operations o ON o.asset_id = e.asset_id AND o.trade_date < e.ex_date
             JOIN portfolios pf ON pf.id = o.portfolio_id JOIN users u ON u.id = pf.user_id WHERE (u.email = 'demo@carteirab3.dev' OR u.email LIKE '%@example.com')) THEN
    RAISE EXCEPTION 'seed: posição atravessa evento corporativo'; END IF;
  IF EXISTS (SELECT 1 FROM operations b JOIN portfolios pb ON pb.id = b.portfolio_id
             JOIN operations s ON s.asset_id = b.asset_id AND s.trade_date = b.trade_date AND s.type = 'SELL'
             JOIN portfolios ps ON ps.id = s.portfolio_id AND ps.user_id = pb.user_id
             JOIN users u ON u.id = pb.user_id
             WHERE b.type = 'BUY' AND (u.email = 'demo@carteirab3.dev' OR u.email LIKE '%@example.com')) THEN
    RAISE EXCEPTION 'seed: day trade no seed (a memória de cálculo não o cobre)'; END IF;
END $$;

-- 5. Posição nunca negativa por (carteira, ativo) e por (carteira, ativo, corretora), em ordem de data e sequência.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM (
      SELECT sum(CASE type WHEN 'BUY' THEN quantity ELSE -quantity END)
               OVER (PARTITION BY portfolio_id, asset_id ORDER BY trade_date, sequence) AS by_asset,
             sum(CASE type WHEN 'BUY' THEN quantity ELSE -quantity END)
               OVER (PARTITION BY portfolio_id, asset_id, broker_id ORDER BY trade_date, sequence) AS by_broker
      FROM operations) x WHERE by_asset < 0 OR by_broker < 0) THEN
    RAISE EXCEPTION 'seed: posição negativa'; END IF;
END $$;

-- 6. Carteira "Longo prazo" do usuário de demonstração (massa das telas 3 e 4, D48): custo das posições abertas
-- R$ 16.151,27 e lucro realizado R$ 693,87, somas exatas arredondadas só no fim (como o GET /summary); PM sem
-- arredondar entre os passos.
DO $$
DECLARE cost numeric; realized numeric;
BEGIN
  WITH RECURSIVE o AS (
    SELECT op.asset_id, op.type, op.quantity::numeric AS q, op.unit_price::numeric AS p, op.fees::numeric AS f,
           row_number() OVER (PARTITION BY op.asset_id ORDER BY op.trade_date, op.sequence) AS rn
    FROM operations op JOIN portfolios pf ON pf.id = op.portfolio_id JOIN users u ON u.id = pf.user_id
    WHERE u.email = 'demo@carteirab3.dev' AND pf.name = 'Longo prazo'
  ), s AS (
    SELECT asset_id, rn, q AS qty, q * p + f AS cost, 0::numeric AS realized FROM o WHERE rn = 1
    UNION ALL
    SELECT o.asset_id, o.rn,
           CASE o.type WHEN 'BUY' THEN s.qty + o.q ELSE s.qty - o.q END,
           CASE WHEN o.type = 'BUY' THEN s.cost + o.q * o.p + o.f WHEN s.qty = o.q THEN 0 ELSE s.cost - o.q * s.cost / s.qty END,
           s.realized + CASE o.type WHEN 'SELL' THEN o.q * o.p - o.f - o.q * s.cost / s.qty ELSE 0 END
    FROM s JOIN o ON o.asset_id = s.asset_id AND o.rn = s.rn + 1
  ), last AS (SELECT DISTINCT ON (asset_id) * FROM s ORDER BY asset_id, rn DESC)
  SELECT round(sum(last.cost), 2), round(sum(last.realized), 2) INTO cost, realized FROM last;
  IF cost IS DISTINCT FROM 16151.27 OR realized IS DISTINCT FROM 693.87 THEN
    RAISE EXCEPTION 'seed: Longo prazo com custo % e lucro realizado % (esperado 16151.27 e 693.87)', cost, realized; END IF;
END $$;

-- 7. Proventos recebidos = posição da carteira na corretora no fim da data-com × valor por cota; IRRF de 17,5% sobre
-- JCP (LC 224/2025) e zero nos demais; recebido na data de pagamento. E o contrário: todo provento pago até a data
-- de corte do seed (13/11/2026) a uma posição existente tem a linha recebida.
DO $$
BEGIN
  IF EXISTS (
      SELECT 1 FROM received_income r JOIN income_distributions d ON d.id = r.income_distribution_id
      JOIN portfolios pf ON pf.id = r.portfolio_id JOIN users u ON u.id = pf.user_id
      WHERE (u.email = 'demo@carteirab3.dev' OR u.email LIKE '%@example.com') AND (r.received_at IS DISTINCT FROM d.payment_date
         OR r.base_quantity <> (SELECT coalesce(sum(CASE o.type WHEN 'BUY' THEN o.quantity ELSE -o.quantity END), 0)
                                FROM operations o
                                WHERE o.portfolio_id = r.portfolio_id AND o.broker_id = r.broker_id
                                  AND o.asset_id = d.asset_id AND o.trade_date <= d.record_date)
         OR r.gross_amount <> round(r.base_quantity * d.amount_per_share, 2)
         OR r.withheld_tax <> CASE d.type WHEN 'JCP' THEN round(r.gross_amount * 0.175, 2) ELSE 0 END)) THEN
    RAISE EXCEPTION 'seed: provento recebido diferente da posição na data-com'; END IF;
  IF EXISTS (
      SELECT 1 FROM income_distributions d
      JOIN operations o ON o.asset_id = d.asset_id AND o.trade_date <= d.record_date
      JOIN portfolios pf ON pf.id = o.portfolio_id JOIN users u ON u.id = pf.user_id
      WHERE d.payment_date <= DATE '2026-11-13' AND (u.email = 'demo@carteirab3.dev' OR u.email LIKE '%@example.com')
      GROUP BY d.id, o.portfolio_id, o.broker_id
      HAVING sum(CASE o.type WHEN 'BUY' THEN o.quantity ELSE -o.quantity END) > 0
         AND NOT EXISTS (SELECT 1 FROM received_income r WHERE r.income_distribution_id = d.id
                         AND r.portfolio_id = o.portfolio_id AND r.broker_id = o.broker_id)) THEN
    RAISE EXCEPTION 'seed: provento pago a uma posição sem a linha recebida'; END IF;
END $$;

-- 8. IR (memoria-calculo.md, seção 4): cada apuração bate com as vendas do usuário no mês e na categoria (preço médio
-- fiscal por usuário, consolidando carteiras e corretoras), e cada mês com venda tem a apuração (renda fixa e cripto
-- ficam fora, D44); prejuízo compensado = menor entre o ganho tributável e o saldo de prejuízo do grupo; DARF = soma
-- do imposto devido das apurações que ele quita, >= R$ 10,00 (R17), com o pagamento informado igual a essa soma.
DO $$
BEGIN
  IF EXISTS (
    WITH RECURSIVE o AS (
      SELECT pf.user_id, op.asset_id, op.type, op.trade_date, op.quantity::numeric AS q, op.unit_price::numeric AS p, op.fees::numeric AS f,
             row_number() OVER (PARTITION BY pf.user_id, op.asset_id ORDER BY op.trade_date, op.sequence) AS rn
      FROM operations op JOIN portfolios pf ON pf.id = op.portfolio_id JOIN users u ON u.id = pf.user_id
      WHERE (u.email = 'demo@carteirab3.dev' OR u.email LIKE '%@example.com')
    ), s AS (
      SELECT user_id, asset_id, rn, q AS qty, q * p + f AS cost, NULL::numeric AS result FROM o WHERE rn = 1
      UNION ALL
      SELECT o.user_id, o.asset_id, o.rn,
             CASE o.type WHEN 'BUY' THEN s.qty + o.q ELSE s.qty - o.q END,
             CASE WHEN o.type = 'BUY' THEN s.cost + o.q * o.p + o.f WHEN s.qty = o.q THEN 0 ELSE s.cost - o.q * s.cost / s.qty END,
             CASE o.type WHEN 'SELL' THEN o.q * o.p - o.f - o.q * s.cost / s.qty END
      FROM s JOIN o ON o.user_id = s.user_id AND o.asset_id = s.asset_id AND o.rn = s.rn + 1
    ), sales AS (
      SELECT s.user_id, date_trunc('month', o.trade_date)::date AS m,
             CASE WHEN a.type = 'FII' THEN 'FII' WHEN a.type = 'STOCK' AND a.share_class IS DISTINCT FROM 'UNIT'
                  THEN 'COMMON_STOCK' ELSE 'COMMON_OTHER' END AS code,
             sum(o.q * o.p) AS total_sales, round(sum(s.result), 2) AS net_result
      FROM s JOIN o USING (user_id, asset_id, rn) JOIN assets a ON a.id = s.asset_id
      WHERE s.result IS NOT NULL AND a.type NOT IN ('FIXED_INCOME', 'CRYPTO')
      GROUP BY 1, 2, 3
    ), stored AS (
      SELECT t.user_id, t.reference_month AS m, c.code::text AS code, t.total_sales, t.net_result
      FROM tax_assessments t JOIN tax_categories c ON c.id = t.tax_category_id JOIN users u ON u.id = t.user_id
      WHERE (u.email = 'demo@carteirab3.dev' OR u.email LIKE '%@example.com')
    )
    SELECT 1 FROM sales FULL JOIN stored USING (user_id, m, code)
    WHERE sales.total_sales IS DISTINCT FROM stored.total_sales OR sales.net_result IS DISTINCT FROM stored.net_result) THEN
    RAISE EXCEPTION 'seed: apuração de IR diferente das vendas'; END IF;

  IF EXISTS (
    WITH t AS (
      SELECT t.*, c.code, r.rate,
             CASE WHEN c.code = 'COMMON_STOCK' AND t.total_sales <= r.sales_exemption_limit THEN 0
                  ELSE greatest(t.net_result, 0) END AS taxable,
             CASE WHEN c.code = 'FII' THEN 'FII' ELSE 'COMMON' END AS grp
      FROM tax_assessments t JOIN tax_categories c ON c.id = t.tax_category_id
      LEFT JOIN LATERAL (SELECT rate, sales_exemption_limit FROM tax_rules x
                    WHERE x.tax_category_id = t.tax_category_id AND x.effective_from <= t.reference_month
                    ORDER BY x.effective_from DESC LIMIT 1) r ON true
    ), b AS (
      SELECT t.*, coalesce(sum(greatest(-net_result, 0) - loss_offset) OVER w, 0) AS loss_balance
      FROM t WINDOW w AS (PARTITION BY user_id, grp ORDER BY reference_month, code
                          ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING)
    ), due AS (
      SELECT b.*, CASE WHEN taxable = 0 THEN 0
                       ELSE round((taxable - loss_offset) * rate, 2)
                            - CASE WHEN round(total_sales * 0.00005, 2) > 1 THEN round(total_sales * 0.00005, 2) ELSE 0 END
                  END AS tax_due
      FROM b
    )
    SELECT 1 FROM due
    WHERE rate IS NULL
       OR loss_offset <> least(taxable, loss_balance)
       OR tax_due < 0
       OR (tax_due > 0) <> (darf_id IS NOT NULL)
       OR darf_id IN (SELECT d.id FROM darfs d WHERE d.reference_month < due.reference_month)
    UNION ALL
    SELECT 1 FROM darfs d JOIN due ON due.darf_id = d.id
    GROUP BY d.id, d.amount_paid HAVING sum(due.tax_due) < 10 OR (d.amount_paid IS NOT NULL AND d.amount_paid <> sum(due.tax_due))
    UNION ALL
    SELECT 1 FROM darfs d WHERE NOT EXISTS (SELECT 1 FROM tax_assessments t WHERE t.darf_id = d.id)) THEN
    RAISE EXCEPTION 'seed: compensação de prejuízo, imposto ou DARF inconsistente'; END IF;
END $$;

-- 9. Planejamento e acompanhamento: carteira ideal soma 100%; alerta disparado só com fechamento que cruza o alvo.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM target_allocations GROUP BY portfolio_id HAVING sum(target_percent) <> 1) THEN
    RAISE EXCEPTION 'seed: carteira ideal com soma diferente de 100%%'; END IF;
  IF EXISTS (SELECT 1 FROM price_alerts a
             WHERE a.triggered_quote_date IS NOT NULL
               AND (a.triggered_quote_date < (a.created_at AT TIME ZONE 'America/Sao_Paulo')::date OR NOT EXISTS (SELECT 1 FROM quotes q
                               WHERE q.asset_id = a.asset_id AND q.quote_date = a.triggered_quote_date
                                 AND CASE a.direction WHEN 'ABOVE' THEN q.close >= a.target_price
                                                      ELSE q.close <= a.target_price END))) THEN
    RAISE EXCEPTION 'seed: alerta disparado sem cotação que cruze o alvo'; END IF;
END $$;

-- Contagens de todas as tabelas de public (o CI compara a saída das duas execuções do seed).
SELECT table_name AS tabela,
       (xpath('/row/n/text()', query_to_xml(format('SELECT count(*) AS n FROM public.%I', table_name), false, true, '')))[1]::text::int AS linhas
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE' AND table_name <> '_prisma_migrations'
ORDER BY 1;
