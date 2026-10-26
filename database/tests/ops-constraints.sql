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

ROLLBACK;
\echo 'Todos os testes de restrição de ops passaram.'
