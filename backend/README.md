# Carteira B3 — backend

API NestJS (adapter Fastify) e worker, a partir do mesmo código (D24, D52). Arquitetura: `claude/arquitetura.md`, seção 7; testes e CI: seção 9.

## Pré-requisitos
- Node 24 ou mais recente e Docker (os testes de integração e E2E sobem um PostgreSQL 16 com Testcontainers).
- Na raiz do repositório: `npm install` e `npm run db:generate` (gera o Prisma Client em `src/generated/prisma`).
- `.env` na raiz, criado a partir do `.env.example`, com `DATABASE_URL`, `CORS_ORIGIN`, `API_PORT`, `NODE_ENV`, `LOG_LEVEL` e `JWT_ACCESS_SECRET` (mais `JWT_ACCESS_TTL_SECONDS`, `REFRESH_TOKEN_TTL_DAYS` e `AUTH_RATE_LIMIT_MAX`, opcionais). Sem uma variável válida, a API e o worker não sobem.

## Comandos (dentro de `backend/`)
| Comando | O que faz |
|---|---|
| `npm install` | instala as dependências do backend |
| `npm run start:dev` | API em modo watch (`main.api.ts`); Swagger UI em `http://localhost:<API_PORT>/api/docs` fora de produção |
| `npm run start:worker:dev` | worker em modo watch (`main.worker.ts`) |
| `npm run typecheck` | confere os tipos de `src/`, dos `.spec.ts` e de `test/` (o ts-jest só transpila) |
| `npm run lint` | ESLint, incluindo a fronteira entre camadas `domain` / `application` / `infrastructure` / `presentation` |
| `npm test` / `npm run test:cov` | testes unitários (sem banco, em paralelo); com cobertura mínima de 90% de linhas |
| `npm run test:e2e` | integração e E2E com Testcontainers, em série; migrations aplicadas pelo Prisma da raiz |
| `npm run build` | compila para `dist/` |
| `npm run openapi:generate` | regenera `openapi/openapi.json`; commite o arquivo junto com toda mudança de contrato (o CI confere) |

## Docker
Na raiz: `docker compose --profile app up -d --build` sobe PostgreSQL, `migrate` (aplica as migrations existentes e termina), `api` e `worker` com a imagem de `backend/Dockerfile` (estágios `migrate`, `build` e `runtime`; contexto de build = raiz do repositório). Os serviços leem o `.env` da raiz; `DATABASE_HOST=postgres` faz o `docker/db-host-entrypoint.sh` trocar só o host do `DATABASE_URL`. Na imagem, os logs saem em JSON (o `pino-pretty` só é usado num terminal interativo). O CI constrói a imagem e testa o stack.

## Endpoints
Contrato completo, com corpos, códigos de erro e exemplos: Swagger UI em `http://localhost:<API_PORT>/api/docs` (fora de produção) e [`openapi/openapi.json`](openapi/openapi.json), versionado. Todas as rotas ficam sob `/api/v1`.

| Grupo | Rotas | Observações |
|---|---|---|
| Saúde | `GET /health` | Pública. 200 com o PostgreSQL respondendo; 503 quando não responde. |
| Autenticação (A1, A2) | `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout` | Cadastro e login são públicos, com limite por minuto e por IP (`AUTH_RATE_LIMIT_MAX`, padrão 5; no máximo 20 em produção) e devolvem o access token; o refresh token vai num cookie `httpOnly` (`refresh_token`, `Path=/api/v1/auth`), rotacionado no `refresh` (401 = entrar de novo). |
| Catálogo (C1) | `GET /assets?search=&page=&pageSize=`, `GET /assets/:ticker`, `GET /brokers` | Só leitura; dados do seed e da carga do catálogo da B3 (abaixo). |
| Carteiras (B1, RN02) | `GET /portfolios`, `GET /portfolios/:id`, `POST /portfolios`, `DELETE /portfolios/:id` | Cada carteira traz `operationCount`, `assetCount` e `lastTradeDate`; excluir apaga as operações (D41). |
| Operações (B2–B5, RN04–RN12) | `GET`, `POST /portfolios/:id/operations` (filtros `assetId`, `brokerId`, `assetType`); `GET`, `PATCH`, `DELETE /portfolios/:id/operations/:operationId`; `POST /portfolios/:id/operations/preview` | Venda acima da posição ou alteração retroativa que a deixa negativa: 422 com a operação infratora (RN07, RN10). A prévia (D42) recebe o mesmo corpo, mais `replacesOperationId` no modo editar, e nunca grava. |
| Posições e totais (B6, B7, B13) | `GET /portfolios/:id/positions`, `GET /portfolios/:id/summary` | Posições abertas e encerradas (`status`); valores derivados em `DerivedValue` (D26). |

- Fora `health`, `register`, `login`, `refresh` e `logout`, toda rota exige `Authorization: Bearer <accessToken>` (401 sem token válido). Carteira de outro usuário responde 404.
- Erros em RFC 7807 (`application/problem+json`); 400 e 409 de formulário trazem `errors[]` com `field` e `code` (D56).

## Catálogo completo da B3 (K5, D59)
Carga única, no ambiente do worker, dos emissores e ativos do mercado à vista (ações, units, FIIs, ETFs e BDRs) a partir do Cadastro de Instrumentos da B3, com o COTAHIST do mesmo dia para separar os FIIs dos outros fundos (F7). Rode, na raiz do repositório, antes ou depois do `npm run db:seed`:

```
npm --prefix backend run ingest:catalog -- --file data/raw/b3-instrumentos/InstrumentsConsolidatedFile_AAAAMMDD.csv --cotahist data/raw/b3-cotahist/COTAHIST_DDDMMAAAA.TXT
```

- Os caminhos são relativos ao diretório de onde o `npm` foi chamado (da pasta `backend`, `../data/raw/...`). Os dois arquivos ficam em `data/raw/` (fora do Git; URLs em `database/docs/fontes-poc.md`).
- Só aceita o Cadastro com "Status do Arquivo: Final" (F5) e arquivos do mesmo dia. Os arquivos vêm em Latin-1 e são lidos assim (F9).
- Upsert por chave natural, uma transação por lote de 500: emissor pelo nome (só criado, nunca alterado: CNPJ, código CVM e setor do seed ficam), ativo pelo ticker. Rodar de novo com os mesmos arquivos não muda nenhuma linha.
- Linha inválida (campos faltando, classe fora de `share_class`, ticker ou ISIN fora do formato) é registrada no log e ignorada; ativo cujo ISIN já pertence a outro ticker é pulado e registrado. O "*" depois da classe (cotação por lote de mil, ex.: `PNA*`) é a mesma classe; linhas da categoria de ações que não são ações (CEPAC, recibo de subscrição, título perpétuo e as taxas de financiamento `TAXA*`) ficam fora sem rejeição (D64).
- Fora do K5 (S2): cotações, desativar ativos que saíram do arquivo, `ops.ingestion_runs` e agendamento. FII sem negócio no dia do COTAHIST fica fora.
- Seed e carga rodam em qualquer ordem (BD-2): o seed reaproveita o emissor que a carga criou (pelo nome), sem mudar o id, e preenche nele CNPJ, código CVM e setor; o ativo que a carga criou (pelo ticker) fica como está. `test/catalog-ingestion.e2e-spec.ts` testa as duas ordens.

## Dados de demonstração
`npm run db:seed` (na raiz) carrega o catálogo e usuários fictícios. Usuário `demo@carteirab3.dev`, senha `demo-carteira-2026` (só desenvolvimento), com as carteiras "Longo prazo", "Dividendos" e "Testes FII". O teste `test/seed.e2e-spec.ts` carrega o seed num banco do Testcontainers e confere essas carteiras pela API.
