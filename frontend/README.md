# Frontend — Carteira B3

Angular 22 + Tailwind CSS 4 (D58). Comandos dentro de `frontend/`, com Node 24:

| Comando | O que faz |
|---|---|
| `npm ci` | Instala as dependências |
| `npm run api:generate` | Gera o cliente da API em `src/app/api/` a partir de `../backend/openapi/openapi.json` (fora do Git; roda sozinho antes de `start`, `build` e `test`) |
| `npm start` | Sobe em `http://localhost:4200`, chamando a API em `http://localhost:3000` (`src/environments/environment.ts`; o `CORS_ORIGIN` do `.env` da raiz deve ser `http://localhost:4200`) |
| `npm test` | Specs com Vitest |
| `npm run test:cov` | Specs com cobertura (mínimo de 80% de linhas) |
| `npm run lint` | angular-eslint e a checagem de tokens (nenhum valor arbitrário do Tailwind) |
| `npm run build` | Build de produção em `dist/` |
| `npm run e2e` | E2E com `@playwright/test` (`e2e/`), menos o do limite de login; na primeira vez, `npx playwright install chromium`. Cada teste faz login: suba a API com `AUTH_RATE_LIMIT_MAX` alto (ex.: 10000), como no CI |
| `npm run e2e:rate-limit` | Só o E2E do aviso do 429 (`e2e/rate-limit.spec.ts`), com a API no limite padrão (`AUTH_RATE_LIMIT_MAX=5`) |

Tokens do design system: `src/styles.css` (`@theme`), espelho de `claude/design-tokens.md` e das variáveis do Figma.
