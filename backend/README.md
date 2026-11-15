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
- `GET /api/v1/health` (público): 200 com o PostgreSQL respondendo; 503 em `application/problem+json` quando não responde.
- `POST /api/v1/auth/register`, `/login` (públicos, limite por minuto e por IP em `AUTH_RATE_LIMIT_MAX`, padrão 5; no máximo 20 em produção): devolvem `{ accessToken, tokenType, expiresIn, user }` e gravam o refresh token num cookie `httpOnly` (`refresh_token`, `Path=/api/v1/auth`).
- `POST /api/v1/auth/refresh` (cookie): novo access token e cookie rotacionado; 401 = sessão encerrada, entrar de novo. `POST /api/v1/auth/logout`: 204.
- Demais rotas exigem `Authorization: Bearer <accessToken>` (401 sem token válido).
- `POST /api/v1/portfolios/:id/operations/preview` (D42): Resumo da operação sem gravar nada. Mesmo corpo e mesmas validações do `POST .../operations` (400 com `errors[].field` e `code`), mais `replacesOperationId` no modo editar (operação inexistente ou de outra carteira: 400 `NOT_FOUND` nesse campo). Responde 200 com `grossAmount`, `netAmount`, `positionBefore`, `positionAfter`, `averagePriceBefore`, `averagePriceAfter`, `realizedProfit` (só na venda) e, se salvar seria rejeitado, `violation` com o mesmo corpo do 422 (RN07/RN10). Contrato completo no Swagger (`/api/docs`) e em `openapi/openapi.json`.
- Qualquer erro (inclusive rota inexistente) volta em RFC 7807 (`application/problem+json`).
