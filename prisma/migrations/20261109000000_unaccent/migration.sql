-- Extensão unaccent para a busca de ativos sem diferenciar acentos (K3, C1):
-- GET /api/v1/assets?search= compara unaccent(lower(...)) sobre assets.ticker e issuers.name.
-- Escrita à mão, como a citext: o Prisma não expressa extensões. Sem tabela, coluna ou índice novo;
-- um índice futuro exige um wrapper IMMUTABLE, porque unaccent() é STABLE.
-- unaccent é extensão confiável (trusted) desde o PostgreSQL 13 e vem no contrib da imagem postgres:16.
CREATE EXTENSION IF NOT EXISTS unaccent;
