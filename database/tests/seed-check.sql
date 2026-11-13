-- Conferência do seed (database/sql/inserts.sql), num banco migrado depois de npm run db:seed.
-- Uso no CI: roda depois de cada uma das duas execuções do seed e as contagens têm de ser iguais (idempotência).
-- Aborta se faltar uma das 6 classes de ativo, a especialização de um título ou cripto, ou um ativo ou
-- corretora da massa do handoff (usados pelo teste do seed do backend, BK-3).

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
  IF (SELECT count(*) FROM assets WHERE ticker IN ('PETR4', 'WEGE3', 'MXRF11', 'ITSA4', 'BOVA11')) <> 5
     OR (SELECT count(*) FROM brokers WHERE name IN ('XP Investimentos', 'NuInvest', 'Rico')) <> 3 THEN
    RAISE EXCEPTION 'seed: falta ativo ou corretora da massa do handoff';
  END IF;
END $$;

SELECT 'assets' AS tabela, count(*) FROM assets
UNION ALL SELECT 'brokers', count(*) FROM brokers
UNION ALL SELECT 'crypto_assets', count(*) FROM crypto_assets
UNION ALL SELECT 'economic_indexes', count(*) FROM economic_indexes
UNION ALL SELECT 'fixed_income_bonds', count(*) FROM fixed_income_bonds
UNION ALL SELECT 'fixed_income_types', count(*) FROM fixed_income_types
UNION ALL SELECT 'income_distributions', count(*) FROM income_distributions
UNION ALL SELECT 'index_values', count(*) FROM index_values
UNION ALL SELECT 'issuers', count(*) FROM issuers
UNION ALL SELECT 'sectors', count(*) FROM sectors
ORDER BY 1;
