# Carteira B3 — backend

API NestJS (adapter Fastify) e worker, a partir do mesmo código (D24, D52). Arquitetura: `claude/arquitetura.md`, seção 7; testes e CI: seção 9.

## Pré-requisitos
- Node 24 ou mais recente e Docker (os testes de integração e E2E sobem um PostgreSQL 16 com Testcontainers).
- Na raiz do repositório: `npm install` e `npm run db:generate` (gera o Prisma Client em `src/generated/prisma`).
- `.env` na raiz, criado a partir do `.env.example`, com `DATABASE_URL`, `CORS_ORIGIN`, `API_PORT`, `NODE_ENV` e `LOG_LEVEL`. Sem uma variável válida, a API e o worker não sobem.

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

## Endpoints do K1
- `GET /api/v1/health`: 200 com o PostgreSQL respondendo; 503 em `application/problem+json` quando não responde.
- Qualquer erro (inclusive rota inexistente) volta em RFC 7807 (`application/problem+json`).
