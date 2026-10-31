# Estrutura do repositório — Carteira B3

> Criado em 26/10/2026 (F3); atualizado no mesmo dia com o handoff de UX e o E2E do frontend (D38). Define onde cada arquivo fica, quem é dono de cada pasta e o que vai ou não para o Git. Vale para todos os agentes; mudança de estrutura só com registro em `claude/contexto-projeto.md` (D37).

## 1. Princípios
- **Um repositório (monorepo), três pacotes Node:** a raiz guarda as ferramentas de banco (Prisma) e a orquestração local (Docker); `backend/` e `frontend/` têm `package.json` próprio.
- **Um único `.env`, na raiz.** O Docker Compose, o Prisma (`prisma.config.ts`) e o backend (`@nestjs/config` com `envFilePath: '../.env'`) leem o mesmo arquivo. O `.env` nunca vai para o Git; o `.env.example` vai, sem segredos.
- **Arquivo gerado nunca é editado à mão** (marcado como *gerado* abaixo). Gerado e versionado: `ddl.sql`, `openapi.json`. Gerado e fora do Git: Prisma Client, cliente da API no frontend, `node_modules/`, builds.
- **`backend/` e `frontend/` são criados pelos CLIs** (Nest CLI no K1, Angular CLI no W1). Não crie essas pastas à mão antes: o Git não versiona pasta vazia e o `ng new` exige que a pasta de destino não exista.
- Pasta que precisa existir vazia no Git leva um `.gitkeep`.

## 2. Árvore
Legenda: **[ok]** já existe no pacote do repositório · **[K1]**, **[W1]** etc. criado nessa tarefa do plano · *gerado* · *fora do Git*.

```
carteira-b3/
├── .claude/
│   ├── agents/
│   │   ├── database.md              [ok] subagente do Claude Code (espelho de agentes/agente-banco-de-dados.md)
│   │   ├── backend.md               [ok] espelho de agentes/agente-backend.md
│   │   └── frontend.md              [ok] espelho de agentes/agente-frontend.md
│   ├── settings.json                [ok] permissões (allow / ask / deny, D40) e plugins do projeto (enabledPlugins, D38)
│   └── settings.local.json          configurações pessoais (fora do Git)
├── .github/
│   ├── pull_request_template.md     [ok]
│   └── workflows/
│       └── ci.yml                   [ok] job `database` (migrations, drift, testes de restrição, ddl.sql); K1 acrescenta `backend`, W1 `frontend`, R1 `e2e` (D40)
├── agentes/                         [ok] prompts-fonte dos agentes
│   ├── agente-banco-de-dados.md
│   ├── agente-backend.md
│   ├── agente-frontend.md
│   └── agente-ux-ui.md              (o UX/UI roda no chat do projeto no claude.ai, não no Claude Code)
├── claude/                          [ok] documentação do projeto
│   ├── contexto-projeto.md          documento-mestre
│   ├── arquitetura.md
│   ├── plano-de-acao.md
│   ├── convencoes-equipe.md
│   ├── estrutura-repositorio.md     este documento
│   ├── handoff-ux.md                [U2/U3] link do arquivo Figma e do frame de cada tela (preenchido em 30/10)
│   ├── design-tokens.md             [U1] tabela de tokens do design system (espelho das variáveis do Figma)
│   ├── microcopy.md                 [U4] textos do "como foi calculado", indexados por formulaCode
│   └── enunciadoBancoDeDados.md
├── projetoEngSoftware.md            [ok] enunciado de Engenharia de Software
│
├── prisma/                          dono: agente database
│   ├── schema.prisma                [ok]
│   └── migrations/
│       ├── migration_lock.toml      [ok]
│       ├── 20261024000000_init/
│       │   └── migration.sql        [ok] gerada pelo Prisma + CHECKs e citext escritos à mão no fim
│       └── 20261026000000_ops_user_sessions/
│           └── migration.sql        [ok] D2: schema ops e ops.user_sessions + 2 CHECK à mão (D39)
├── prisma.config.ts                 [ok] lê DATABASE_URL e SHADOW_DATABASE_URL do .env da raiz
├── database/                        dono: agente database (entregáveis de BD)
│   ├── docs/
│   │   ├── descricao-problema.md    [ok] Parte 1
│   │   ├── modelo-er.md             [ok] ER congelado (D14), revisto na D3 (D50)
│   │   ├── mapeamento.md            [ok]
│   │   ├── glossario.md             [ok] G1
│   │   ├── memoria-calculo.md       [ok] P0; o P1 acrescenta a conferência do seed
│   │   ├── diagrama-er.svg, .png    [ok] conceitual do brModelo (D50)
│   │   └── diagrama-logico.svg, .png [ok] lógico do brModelo (D50)
│   ├── scripts/
│   │   ├── export-ddl.mjs           [ok] npm run db:ddl
│   │   └── run-sql.mjs              [ok] npm run db:test
│   ├── tests/
│   │   ├── constraints.sql          [ok] 25 testes das restrições de public
│   │   ├── ops-constraints.sql      [ok] 10 testes das restrições de ops (D2)
│   │   └── full-product-constraints.sql [ok] 35 testes das restrições da D3 (D50)
│   ├── sql/
│   │   ├── ddl.sql                  [ok] gerado (pg_dump --schema-only --schema=public)
│   │   ├── inserts.sql              [P1] seed
│   │   └── queries.sql              [P2] 18 consultas com enunciado
│   └── results/                     [P3] resultados das consultas e listagens (.gitkeep até lá)
├── data/
│   └── raw/                         arquivos brutos das fontes externas (bronze); só o .gitkeep vai para o Git
├── docker/
│   └── postgres/
│       └── init/
│           └── 01-create-test-db.sql   [ok] cria carteira_test e carteira_shadow na primeira subida
├── docker-compose.yml               [ok] serviço postgres; o K1 acrescenta api e worker
│
├── backend/                         [K1] criado pelo Nest CLI; dono: agente backend
│   ├── package.json
│   ├── nest-cli.json
│   ├── tsconfig.json
│   ├── tsconfig.build.json
│   ├── eslint.config.mjs            inclui a regra de fronteira entre camadas
│   ├── jest.config.ts               unitários (em paralelo), com os limites de cobertura
│   ├── Dockerfile                   imagem única; api e worker mudam só o entrypoint
│   ├── openapi/
│   │   └── openapi.json             [K4] gerado pelo @nestjs/swagger e versionado; o frontend gera o cliente a partir dele
│   ├── src/
│   │   ├── main.api.ts              processo HTTP (D24)
│   │   ├── main.worker.ts           agendador, ingestão, refresh do ouro (D24)
│   │   ├── config/                  schema zod do env, validado no boot
│   │   ├── generated/prisma/        gerado por npm run db:generate (fora do Git)
│   │   ├── shared/                  módulo shared: Money/Decimal, Ticker, DerivedValue, erros, problem+json, paginação
│   │   └── modules/
│   │       └── <modulo>/            auth, users, reference-data, portfolios, operations (S1); demais por etapa
│   │           ├── domain/
│   │           ├── application/
│   │           ├── infrastructure/
│   │           └── presentation/
│   └── test/
│       ├── jest-e2e.config.ts       integração e E2E, em série (--runInBand)
│       ├── global-setup.ts          sobe o PostgreSQL do Testcontainers e roda `prisma migrate deploy` a partir da raiz (D40)
│       ├── factories/               builders de dados de teste
│       └── *.e2e-spec.ts            E2E e integração (Testcontainers)
│
├── frontend/                        [W1] criado pelo Angular CLI; dono: agente frontend
│   ├── package.json
│   ├── angular.json
│   ├── tsconfig.json
│   ├── tsconfig.app.json
│   ├── tsconfig.spec.json           specs com Vitest (executor padrão do Angular CLI, D40)
│   ├── playwright.config.ts         [W1] configuração do @playwright/test (D38)
│   ├── (configuração do Tailwind)   tokens do design system; o arquivo depende da versão do Tailwind (ver W1)
│   ├── src/
│   │   ├── environments/            URLs e configuração por ambiente
│   │   ├── styles.css
│   │   └── app/
│   │       ├── core/                auth, interceptors, layout
│   │       ├── shared/              componentes de apresentação, DerivedValueExplainer, pipes pt-BR
│   │       ├── api/                 gerado a partir de backend/openapi/openapi.json (fora do Git)
│   │       └── features/            auth, portfolios, operations, assets (S1); demais por etapa
│   └── e2e/
│       └── *.spec.ts                [R1] E2E ponta a ponta do S1 com @playwright/test, no CI (D38)
│
├── .env                             fora do Git: credenciais locais (copiado do .env.example)
├── .env.example                     [ok] modelo do .env, sem segredos
├── .gitignore                       [ok]
├── .gitattributes                   [ok] `* text=auto eol=lf`: texto sempre com quebra de linha LF no Git, mesmo editado no Windows (31/10/2026)
├── package.json                     [ok] scripts db:* e Prisma
├── package-lock.json                [ok]
├── CLAUDE.md                        [ok] instruções para o Claude Code, incluindo a seção de ferramentas (D38)
└── README.md                        [ok] como subir o ambiente; o R1 completa com backend e frontend
```

## 3. Onde fica cada coisa
| Item | Local | Git |
|---|---|---|
| Credenciais (`POSTGRES_*`, `DATABASE_URL`, `SHADOW_DATABASE_URL`, `DATABASE_URL_TEST`; a partir do K1, segredos do JWT) | `.env` na raiz | Não |
| Modelo das variáveis | `.env.example` na raiz | Sim |
| Banco local | `docker-compose.yml` na raiz + `docker/postgres/init/` | Sim |
| Imagem da API e do worker | `backend/Dockerfile` (K1) | Sim |
| CI (GitHub Actions) | `.github/workflows/ci.yml`; banco do CI é um serviço PostgreSQL 16 descartável, com senha fixa só do CI | Sim |
| Relatórios do Playwright e cobertura | `playwright-report/`, `test-results/`, `coverage/` | Não |
| Schema e migrations | `prisma/` | Sim |
| Prisma Client | `backend/src/generated/prisma/` | Não (gerado) |
| DDL da entrega de BD | `database/sql/ddl.sql` | Sim (gerado) |
| Contrato da API | `backend/openapi/openapi.json` | Sim (gerado) |
| Cliente da API no frontend | `frontend/src/app/api/` | Não (gerado) |
| Handoff do UX (links do Figma) | `claude/handoff-ux.md` | Sim |
| Tokens do design system | `claude/design-tokens.md` | Sim |
| Microcopy do "como foi calculado" | `claude/microcopy.md` | Sim |
| Testes E2E | `frontend/e2e/*.spec.ts` (+ `frontend/playwright.config.ts`) | Sim |
| Plugins do Claude Code do projeto | `.claude/settings.json` (`enabledPlugins`) | Sim |
| Arquivos brutos das fontes | `data/raw/` | Não |
| Configuração pessoal do Claude Code | `.claude/settings.local.json` | Não |

## 4. Donos por pasta
| Pasta | Dono | Outros agentes |
|---|---|---|
| `prisma/`, `database/`, `docker/postgres/` | agente database | pedem mudança ao agente database |
| `backend/` | agente backend | o frontend consome só o `openapi.json` |
| `frontend/` | agente frontend | — |
| `claude/handoff-ux.md` | agente UX/UI | o frontend só lê |
| `claude/design-tokens.md` | agente UX/UI | o frontend só lê; o `tailwind.config` espelha a tabela |
| `claude/microcopy.md` | agente UX/UI | o frontend só lê e gera o dicionário `microcopy.pt-BR.ts`; o backend usa as chaves `name` dos insumos |
| `agentes/`, `.claude/agents/`, `claude/` | usuário (atualizados pelos agentes no chat do projeto) | `.claude/agents/*.md` e `agentes/*.md` mudam juntos |
| `docker-compose.yml` | agente database (serviço postgres); agente backend (api e worker, a partir do K1) | — |
| `.github/workflows/ci.yml` | um job por dono (D40): `database` → agente database; `backend` → agente backend; `frontend` e `e2e` → agente frontend | um agente não altera o job de outro |
| `.claude/settings.json` | usuário (permissões e plugins, D38, D40) | ajuste pessoal em `.claude/settings.local.json` |
