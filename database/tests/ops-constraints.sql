-- Teste das restrições de integridade do schema ops (D2, D39). Fora da entrega de BD (D22).
-- Uso: npm run db:test  (num banco migrado; roda depois de constraints.sql). UUIDs ffffffff-… não colidem com o seed.
-- Roda tudo numa transação e desfaz no fim: não deixa dados no banco.
-- Cada caso inválido precisa falhar com o SQLSTATE esperado; caso contrário o script aborta.
--   23514 = CHECK, 23505 = UNIQUE, 23503 = FK, 23502 = NOT NULL, 22001 = texto maior que a coluna

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
-- token_hash como o backend grava: SHA-256 do refresh token em hexadecimal minúsculo
INSERT INTO public.users (id, name, email, password_hash) VALUES
  ('ffffffff-0000-0000-0000-000000000001', 'Teste ops', 'teste.ops@exemplo.invalid', 'hash');
-- rotação: a sessão 1 foi revogada e substituída pela 2, na mesma família
INSERT INTO ops.user_sessions (id, user_id, family_id, token_hash, expires_at, revoked_at) VALUES
  ('ffffffff-0000-0000-0000-000000000901', 'ffffffff-0000-0000-0000-000000000001', 'ffffffff-0000-0000-0000-000000000951',
   encode(sha256('refresh-1'::bytea), 'hex'), now() + interval '7 days', now()),
  ('ffffffff-0000-0000-0000-000000000902', 'ffffffff-0000-0000-0000-000000000001', 'ffffffff-0000-0000-0000-000000000951',
   encode(sha256('refresh-2'::bytea), 'hex'), now() + interval '7 days', NULL);

DO $$ BEGIN
  IF (SELECT count(*) FROM ops.user_sessions WHERE family_id = 'ffffffff-0000-0000-0000-000000000951') <> 2 THEN
    RAISE EXCEPTION 'FALHOU família com mais de uma sessão';
  END IF;
  RAISE NOTICE 'ok  família de rotação aceita várias sessões; revoked_at opcional';
END $$;

-- ---------------------------------------------------------------- casos inválidos
SELECT pg_temp.expect_error('hash de token único',
  $q$INSERT INTO ops.user_sessions (user_id, family_id, token_hash, expires_at) VALUES ('ffffffff-0000-0000-0000-000000000001', gen_random_uuid(), encode(sha256('refresh-2'::bytea), 'hex'), now() + interval '7 days')$q$, '23505');
SELECT pg_temp.expect_error('hash de token em maiúsculas',
  $q$INSERT INTO ops.user_sessions (user_id, family_id, token_hash, expires_at) VALUES ('ffffffff-0000-0000-0000-000000000001', gen_random_uuid(), upper(encode(sha256('refresh-3'::bytea), 'hex')), now() + interval '7 days')$q$, '23514');
SELECT pg_temp.expect_error('hash de token com menos de 64 caracteres',
  $q$INSERT INTO ops.user_sessions (user_id, family_id, token_hash, expires_at) VALUES ('ffffffff-0000-0000-0000-000000000001', gen_random_uuid(), left(encode(sha256('refresh-3'::bytea), 'hex'), 63), now() + interval '7 days')$q$, '23514');
SELECT pg_temp.expect_error('token gravado em claro (maior que 64 caracteres)',
  $q$INSERT INTO ops.user_sessions (user_id, family_id, token_hash, expires_at) VALUES ('ffffffff-0000-0000-0000-000000000001', gen_random_uuid(), 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.c2lnbmF0dXJlLWRvLXRva2VuLWZha2UtcGFyYS10ZXN0ZQ', now() + interval '7 days')$q$, '22001');
SELECT pg_temp.expect_error('sessão que expira antes de ser criada',
  $q$INSERT INTO ops.user_sessions (user_id, family_id, token_hash, expires_at) VALUES ('ffffffff-0000-0000-0000-000000000001', gen_random_uuid(), encode(sha256('refresh-4'::bytea), 'hex'), now() - interval '1 second')$q$, '23514');
SELECT pg_temp.expect_error('sessão de usuário inexistente',
  $q$INSERT INTO ops.user_sessions (user_id, family_id, token_hash, expires_at) VALUES ('ffffffff-0000-0000-0000-0000000000ff', gen_random_uuid(), encode(sha256('refresh-5'::bytea), 'hex'), now() + interval '7 days')$q$, '23503');
SELECT pg_temp.expect_error('sessão sem família',
  $q$INSERT INTO ops.user_sessions (user_id, token_hash, expires_at) VALUES ('ffffffff-0000-0000-0000-000000000001', encode(sha256('refresh-6'::bytea), 'hex'), now() + interval '7 days')$q$, '23502');
SELECT pg_temp.expect_error('sessão sem expiração',
  $q$INSERT INTO ops.user_sessions (user_id, family_id, token_hash) VALUES ('ffffffff-0000-0000-0000-000000000001', gen_random_uuid(), encode(sha256('refresh-7'::bytea), 'hex'))$q$, '23502');

-- ---------------------------------------------------------------- comportamento da FK
-- excluir o usuário remove as sessões dele (CASCADE)
DELETE FROM public.users WHERE id = 'ffffffff-0000-0000-0000-000000000001';
DO $$ BEGIN
  IF (SELECT count(*) FROM ops.user_sessions WHERE user_id = 'ffffffff-0000-0000-0000-000000000001') <> 0 THEN RAISE EXCEPTION 'FALHOU cascata da exclusão de usuário nas sessões'; END IF;
  RAISE NOTICE 'ok  exclusão de usuário remove as sessões';
END $$;

-- ---------------------------------------------------------------- ingestion_runs (BD-3, D64)
-- execução em andamento, uma com sucesso do mesmo arquivo (o hash não é único: recarga a partir do bronze) e uma que
-- falhou antes de baixar o arquivo
INSERT INTO ops.ingestion_runs (id, source, file_name, file_sha256, reference_date) VALUES
  ('ffffffff-0000-0000-0000-000000000a01', 'B3_COTAHIST', 'COTAHIST_D30102026.ZIP', encode(sha256('cotahist-3010'::bytea), 'hex'), '2026-10-30');
INSERT INTO ops.ingestion_runs (source, file_name, file_sha256, reference_date, status, rows_read, rows_written, rows_rejected, finished_at) VALUES
  ('B3_COTAHIST', 'COTAHIST_D30102026.ZIP', encode(sha256('cotahist-3010'::bytea), 'hex'), '2026-10-30', 'SUCCEEDED', 10, 8, 2, now());
INSERT INTO ops.ingestion_runs (source, status, error, finished_at) VALUES
  ('B3_INSTRUMENTS', 'FAILED', 'HTTP 404: file not published yet', now());

DO $$ DECLARE r ops.ingestion_runs; BEGIN
  SELECT * INTO r FROM ops.ingestion_runs WHERE id = 'ffffffff-0000-0000-0000-000000000a01';
  IF r.status <> 'RUNNING' OR r.rows_read <> 0 OR r.finished_at IS NOT NULL OR r.started_at IS NULL THEN
    RAISE EXCEPTION 'FALHOU padrões da execução nova';
  END IF;
  RAISE NOTICE 'ok  execução nova começa RUNNING, com contagens zeradas e início do banco';
END $$;

SELECT pg_temp.expect_error('duas execuções em andamento da mesma fonte',
  $q$INSERT INTO ops.ingestion_runs (source) VALUES ('B3_COTAHIST')$q$, '23505');
SELECT pg_temp.expect_error('fonte fora do formato de código',
  $q$INSERT INTO ops.ingestion_runs (source) VALUES ('b3 cotahist')$q$, '23514');
SELECT pg_temp.expect_error('hash de arquivo em maiúsculas',
  $q$INSERT INTO ops.ingestion_runs (source, file_sha256) VALUES ('BCB_SGS', upper(encode(sha256('x'::bytea), 'hex')))$q$, '23514');
SELECT pg_temp.expect_error('contagem de linhas negativa',
  $q$INSERT INTO ops.ingestion_runs (source, rows_rejected) VALUES ('BCB_SGS', -1)$q$, '23514');
SELECT pg_temp.expect_error('execução em andamento com fim',
  $q$INSERT INTO ops.ingestion_runs (source, finished_at) VALUES ('BCB_SGS', now())$q$, '23514');
SELECT pg_temp.expect_error('execução encerrada sem fim',
  $q$INSERT INTO ops.ingestion_runs (source, status, error) VALUES ('BCB_SGS', 'FAILED', 'erro')$q$, '23514');
SELECT pg_temp.expect_error('falha sem erro',
  $q$INSERT INTO ops.ingestion_runs (source, status, finished_at) VALUES ('BCB_SGS', 'FAILED', now())$q$, '23514');
SELECT pg_temp.expect_error('sucesso com erro',
  $q$INSERT INTO ops.ingestion_runs (source, file_name, file_sha256, reference_date, status, error, finished_at) VALUES ('BCB_SGS', 'a.json', encode(sha256('y'::bytea), 'hex'), '2026-10-30', 'SUCCEEDED', 'erro', now())$q$, '23514');
SELECT pg_temp.expect_error('sucesso sem hash do arquivo',
  $q$INSERT INTO ops.ingestion_runs (source, file_name, reference_date, status, finished_at) VALUES ('BCB_SGS', 'a.json', '2026-10-30', 'SUCCEEDED', now())$q$, '23514');
SELECT pg_temp.expect_error('status fora do domínio',
  $q$INSERT INTO ops.ingestion_runs (source, status) VALUES ('BCB_SGS', 'SKIPPED')$q$, '22P02');

-- a órfã de um worker que caiu é fechada como FAILED; depois a fonte aceita nova execução
UPDATE ops.ingestion_runs SET status = 'FAILED', error = 'interrupted', finished_at = now()
  WHERE id = 'ffffffff-0000-0000-0000-000000000a01';
INSERT INTO ops.ingestion_runs (source) VALUES ('B3_COTAHIST');
DO $$ BEGIN RAISE NOTICE 'ok  fonte aceita nova execução depois de fechar a anterior'; END $$;

ROLLBACK;
\echo 'Todos os testes de restrição de ops passaram.'
