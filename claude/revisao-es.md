# Revisão de Engenharia de Software — S1

> Revisão independente de 12/11/2026 sobre a `main` em `f2f1dd2` (conferida de novo às 15h40: sem commits novos). Escopo: `backend/`, `frontend/`, testes e `.github/workflows/ci.yml`. Nenhum arquivo do repositório foi alterado; mutações e sondas rodaram em cópia fora dele. Grafo do Graphify consultado antes da busca textual (D53). As decisões da seção 6 do contexto foram tratadas como premissas.

## Resumo
1. **O que rodou:** lint, typecheck, testes e build dos dois pacotes passam (backend: 654 unitários e 96 de integração/E2E; frontend: 56 specs). Não rodaram o E2E do Playwright, o smoke test do Docker e a consulta ao CI do GitHub (motivos na seção "Execução").
2. **Regras de negócio:** nenhuma violação de RN01–RN12 encontrada no backend. De 44 mutantes injetados, os unitários mataram todos; 3 mutantes de isolamento entre carteiras passam ilesos pela suíte com banco real (achado M2).
3. **Defeito reproduzido:** 40 edições simultâneas de operação (`PATCH`) devolvem de 27 a 34 respostas 500 depois de 5 s; criar e excluir, no mesmo volume, não falham (M1).
4. **Bloqueios do S1:** não existe seed, então o sistema sobe com o catálogo vazio e ninguém consegue lançar operação (A1); o limite fixo de 5 cadastros/logins por minuto derruba o E2E do R1 assim que a suíte passar de 5 logins por minuto (A2); o frontend tem 613 linhas (só o shell) e 83 dos 93 requisitos da matriz dependem dele.
5. **Processo:** CI com 3 jobs e nenhum E2E de frontend; histórico de um commit por tarefa, de até 14,5 mil linhas; o README não leva um terceiro a usar o sistema.

Contagem: 0 críticos, 2 altos, 8 médios, 9 baixos, 9 itens a verificar.

## Execução (evidência)
Node 24.22.3, PostgreSQL 16.15 local.

| Comando | Resultado |
|---|---|
| backend `npm run lint` (inclui fronteira de camadas) | exit 0 |
| backend `npm run typecheck` | exit 0 |
| backend `npm run test:cov` | 48 suítes, 654 testes, todos passam; linhas 99,02%, ramos 85,8% (901/1050) |
| backend integração e E2E (96 testes, 6 suítes) | todos passam, **contra PostgreSQL 16 local**, não Testcontainers |
| backend, os mesmos testes com `TZ=America/Sao_Paulo` e `TZ=Pacific/Kiritimati` | 654 + 96 passam nos dois fusos |
| backend `npm run build`, `openapi:generate`, `openapi:lint` | sem erro; `openapi.json` igual ao regerado; contrato válido |
| backend `npm audit --omit=dev` | 3 vulnerabilidades moderadas (`glob`, `minimatch`, via `@fastify/static`) |
| frontend `npm run api:generate`, `npm run lint` | exit 0 |
| frontend `npm run test:cov` | 14 arquivos, 56 testes, todos passam; linhas 97,48% (194/199) |
| frontend `npm run build`, `tsc --noEmit` (app e specs) | sem erro |
| frontend `npm audit --omit=dev` | 0 vulnerabilidades |

**Não rodou:**
- **E2E do frontend (`frontend/e2e/shell.spec.ts`):** `npx playwright install chromium` não completa; a rede do ambiente bloqueia o download do navegador.
- **Smoke test do Docker (passo do job `backend`) e Testcontainers:** não há daemon do Docker no ambiente. A integração rodou com um global setup substituto, fora do repositório, que aponta para o PostgreSQL local e roda o mesmo `prisma migrate deploy`.
- **CI no GitHub (checks, proteção da `main`, descrições de PR):** a API do GitHub não está liberada para esta sessão.

**Mutação (44 mutantes, em cópia do backend):**
- 20 de domínio (RN04–RN10, D29, D41, D54, RN01, D39, RN11), só unitários: 20 mortos.
- 24 de aplicação e infraestrutura (propriedade da carteira, lock, RN07/RN10 nos casos de uso, filtros, auth), unitários e E2E: os unitários mataram os 24; o E2E matou 18.
- Os 6 que o E2E não matou: `lockOperation` sem conferir a carteira (equivalente: a leitura seguinte confere); cookie sem `httpOnly` e refresh expirado aceito (cobertos por unitário de comportamento); e os 3 de isolamento descritos em M2.

**Sonda de concorrência (40 requisições simultâneas, 1 carteira, 1 ativo):**

| Operação | Respostas | Tempo máximo |
|---|---|---|
| `POST` (criar) | 40 × 201 | 0,49 s |
| `DELETE` | 40 × 204 | 0,39 s |
| `PATCH` (1ª rodada) | 13 × 200, 27 × 500 | 5,28 s |
| `PATCH` (2ª rodada) | 6 × 200, 34 × 500 | 5,25 s |

Com 12 e 20 `PATCH` simultâneos, todos responderam 200.

## Achados
Severidade: crítico = regra de negócio, dado ou segurança; alto = viola decisão registrada ou bloqueia a etapa seguinte; médio = dívida que encarece mudança; baixo = estilo. Caminho sem prefixo é relativo a `backend/src/modules/` (ou a `backend/src/` quando começa por `shared/`).

| # | Sev. | Eixo | Achado | Evidência | Correção | h |
|---|---|---|---|---|---|---|
| A1 | Alto | 4 | Não existe seed. O catálogo (ativos, emissores, corretoras) é só leitura na API, então o sistema sobe vazio e não é possível lançar operação. Bloqueia o teste do W4 contra a API real e o critério do R1 ("alguém de fora sobe e usa"). O teste de integração do seed, exigido no prompt de backend, também não existe. | `ls database/sql` → só `ddl.sql`; `package.json` da raiz sem script de seed; nenhum `create` em `reference-data` (busca por escrita em `backend/src` lista só `users`, `userSession`, `portfolio`, `operation`); P1 venceu em 07/11 no plano | Seed idempotente mínimo do S1 (setores, emissores, ativos das 6 classes, corretoras) com script `db:seed`, passo no README e teste que carrega o seed. Não esperar o P1 completo | 4–8 |
| A2 | Alto | 3, 4 | O limite de cadastro e login é fixo em 5 por minuto por IP, sem configuração. Com o refresh rotativo, o E2E do R1 não pode reaproveitar sessão entre testes: cada teste faz login, e o 6º no mesmo minuto recebe 429. Os 5 E2E do backend já precisaram trocar o limite por 10.000 para rodar. | `backend/src/modules/auth/auth.module.ts:33,47`; nenhuma variável em `backend/src/config/env.ts`; override em `backend/test/auth.e2e-spec.ts:53`, `portfolios:37`, `reference-data:35`, `operations:93`, `positions:117`; 429 provado em `auth.e2e-spec.ts:361`; revogação da família no reuso em `auth.e2e-spec.ts:280` | Ler o limite de uma variável validada no zod (padrão 5); o job `e2e` e o `.env` de teste usam valor alto | 1–2 |
| M1 | Médio | 2 | `UpdateOperation` consulta o catálogo (ativo e corretora) por outra conexão do pool **dentro** da transação aberta. Com muitas edições simultâneas, as transações seguram todas as conexões e as consultas internas esperam até estourar o tempo: 500 para a maioria. Nenhum dado é corrompido (a transação desfaz), mas qualquer cliente autenticado consegue provocar. Criar e excluir não têm o problema, porque não consultam nada fora da transação. | Sonda acima: 27 e 34 de 40 `PATCH` com 500; numa terceira rodada, com log ligado (29 falhas), os erros foram `P2028 Unable to start a transaction in the given time` (16) e `timeout exceeded when trying to connect` (13). Código: `backend/src/modules/operations/application/update-operation.use-case.ts:50,58`; `operation-drafts.ts:53,76`; limites em `prisma-operation-store.ts:25` e `shared/infrastructure/prisma/prisma.service.ts:23` | Ler a operação e montar o rascunho antes de abrir a transação (como o `CreateOperation`), revalidando só a existência sob o lock; ou passar o `tx` às consultas. Acrescentar o teste de 40 edições simultâneas | 2–3 |
| M2 | Médio | 3 | O isolamento entre carteiras (e entre usuários) no histórico, na linha do tempo dos comandos e nas posições só é verificado por teste que confere o formato do `where` passado a um Prisma simulado. Nenhum teste com banco real tem operações em duas carteiras ao mesmo tempo. Se a consulta mudar para SQL direto (D25), esses unitários deixam de valer e um vazamento entre usuários passa no CI. | 3 mutantes passam nos 96 testes com banco: histórico sem `portfolioId` (`prisma-operation-history.ts:24`), linha do tempo sem `portfolioId` (`prisma-operation-store.ts:48`), posições com `where: {}` (`prisma-timeline-reader.ts:20`). Mortos só por `operations.infrastructure.spec.ts:177–190` e `:276–293` (mock) | Um E2E com dois usuários e o mesmo ativo em carteiras diferentes: histórico, posições e totais de cada um só com as próprias operações, e venda na carteira sem unidades rejeitada (RN07) | 2 |
| M3 | Médio | 1, 2 | Dependência circular entre módulos: `operations` ↔ `portfolios` e `operations` ↔ `reference-data`. O tipo `AssetType`, que descreve o catálogo, mora em `operations/domain` e é importado pelo dono do catálogo. O lint confere camadas, mas não fronteira entre módulos: qualquer `infrastructure` pode importar a de outro módulo, o que a arquitetura 7.2 proíbe. | `portfolios/application/{list-portfolios,get-owned-portfolio,portfolio-summary}.ts` importam `operations/application/count-open-positions`; 6 casos de uso de `operations` importam `portfolios/application/get-owned-portfolio.use-case`; `reference-data/domain/catalog.ts:6` e `infrastructure/prisma-asset-catalog.ts:4` importam `operations/domain/asset-type`; `backend/eslint.config.mjs:102–111` | Mover `AssetType` para `reference-data/domain` (ou `shared/domain`); acrescentar ao `eslint-plugin-boundaries` a regra de que um módulo só importa `application`/`domain` de outro, nunca `infrastructure` | 2–3 |
| M4 | Médio | 4 | O E2E versionado do frontend não roda em nenhum job, e o job `e2e` (API + PostgreSQL + Playwright + axe) só nasce no R1, de 03 a 06/12, sem folga. O conjunto nunca foi exercitado; nesta revisão também não rodou. | `.github/workflows/ci.yml:2` (comentário) e ausência do job; `frontend/e2e/shell.spec.ts` existe; `@axe-core/playwright` ausente do `frontend/package.json`; plano: "Folga final zero" | Criar o job `e2e` já no W2, com o spec do shell e o fluxo de cadastro e login, e ampliar a cada tela | 3–4 |
| M5 | Médio | 1 | O frontend não tem verificação automática de D5, D28 e RN11 (nenhuma conta com dinheiro, nenhum `Number()` sobre valor monetário). Hoje não há violação porque não há tela; W2–W4 vão escrever as 7 telas em três semanas. | `frontend/eslint.config.js` (só angular-eslint e seletores); `frontend/src/app` com 613 linhas, 3 páginas de título (`features/*/…-page.ts`, comentários `shortcut`) | Regra `no-restricted-syntax` proibindo `Number(`, `parseFloat(`, `+valor` e operadores aritméticos sobre campos de valor em `src/app/features` e `shared`, antes da primeira tela com valor monetário (W4) | 1–2 |
| M6 | Médio | 4 | Documentação desatualizada frente à definição de pronto (item 5). O README da raiz não cita o frontend, o seed nem a ordem para subir banco, API e tela; o do backend lista só `health` e `auth`, embora K3 e K4 tenham entregado catálogo, carteiras, operações, posições e totais. | `README.md` (41 linhas; "frontend" não aparece fora da linha da stack); `backend/README.md:26` (seção Endpoints sem `portfolios`, `assets`, `operations`); `claude/convencoes-equipe.md`, "Definição de pronto", item 5 | Seção única "Como rodar" no README da raiz (pré-requisitos, `.env`, banco, migrations, seed, API, frontend, usuário de teste) e link para o Swagger no lugar da lista de endpoints | 2–3 |
| M7 | Médio | 2 | `ops.user_sessions` só cresce: cada refresh grava uma linha e nada apaga as expiradas ou revogadas. O worker do S1 só tem o heartbeat. | `auth/infrastructure/prisma-session.repository.ts` (54 linhas; só `create`, `findUnique`, `updateMany`); `backend/src/worker/worker-heartbeat.ts:8` | Apagar sessões expiradas ou revogadas há mais de N dias no login do próprio usuário, ou num job diário do worker | 2 |
| M8 | Médio | 4 | O histórico mostra entregas por PR, não incrementos pequenos: cada tarefa é um commit de 2 a 14,5 mil linhas; 7 dos 32 commits fogem do Conventional Commits; a atividade se concentra em 7 dias; não há tag nem release; o PR #19 levou duas tarefas (W1 e o PR 2 do K4). | `git log --no-merges --shortstat`: K1 14.519 linhas, W1 12.299, K4 6.217, K3 3.976, K2 3.601; datas: 26/10, 30/10, 31/10, 01/11, 09/11, 10/11, 11/11; `git tag` vazio; merge `e94f5a1` dentro do PR #19; mensagens como "Minor changes", "first commit" | Commits por passo (teste, implementação, contrato) dentro do PR; uma tag por marco (K2, K4, W2…) para a disciplina; um PR por tarefa | 1 + hábito |
| B1 | Baixo | 1 | Quantidade da posição, `assetCount` e `operationCount` são números derivados e saem sem `DerivedValue`. O handoff aceita ("sem ⓘ"), mas a invariante 8 da arquitetura e o D26 dizem "todo número derivado". | `operations/domain/position-trace.ts:34,57`; `claude/arquitetura.md`, seção 8, item 8 | Registrar a exceção (contagens e quantidade) no contexto, ou dar trace à quantidade | 0,5 |
| B2 | Baixo | 1 | `DerivedValue` está em `operations/domain`; a arquitetura 7.2 o coloca em `shared`. O próprio arquivo adia a mudança para o S3. | `operations/domain/derived-value.ts:6`; `claude/arquitetura.md:244` | Mover para `shared/domain` junto com o M3 | 0,5 |
| B3 | Baixo | 1 | A arquitetura 6.1 diz que o 201 do lançamento devolve a posição recalculada com `DerivedValue`; a API devolve só a operação. O handoff não pede a posição nessa resposta. | `claude/arquitetura.md:163`; `operations/application/create-operation.use-case.ts:63` | Corrigir o diagrama da arquitetura | 0,25 |
| B4 | Baixo | 1 | Duas leituras cruzam o dono da tabela por SQL: `portfolios` conta `operations`, e o histórico de `operations` filtra por `assets.type`. D41 e D25 permitem, mas a regra 7.2 ("só lê via serviço exportado") não registra a exceção. | `portfolios/infrastructure/prisma-portfolio.repository.ts:24`; `operations/infrastructure/prisma-operation-history.ts:27` | Registrar na 7.2 que query service de leitura pode juntar tabelas de outro módulo | 0,25 |
| B5 | Baixo | 2 | Duplicação: o mapeamento erro de domínio → problem+json é repetido em 5 controllers, e o provider do `Clock` em 2 módulos. Cada módulo novo (S2 em diante) copia o padrão. | `toProblem`/`rethrowAsProblem` em `auth.controller.ts:52`, `portfolios.controller.ts:44`, `reference-data.controller.ts:21`, `operations.controller.ts:58`, `positions.controller.ts:18`; `auth.module.ts:59`, `operations.module.ts:42` | Um filtro de exceção de domínio com tabela erro → status, e o `Clock` num módulo compartilhado | 2 |
| B6 | Baixo | 3 | Os limites de cobertura só olham linhas. No backend, ramos globais ficam em 85,8% sem limite; no frontend, 80% de linhas é atingível com specs que só conferem o título da página (há 3 assim). | `backend/jest.config.ts:29–32`; saída do `test:cov`; `frontend/angular.json:84–86`; `features/*/…-page.spec.ts` ("shows the page title") | Limite de ramos no backend (80) e no frontend; trocar os 3 specs de título quando as telas entrarem | 0,5 |
| B7 | Baixo | 4 | CI: `cancel-in-progress` também vale para a `main`, então dois merges seguidos deixam o primeiro commit sem execução completa; o job `database` usa Node 22 e os outros, 24; não há `npm audit`. | `.github/workflows/ci.yml:10–12`, `:42` | `cancel-in-progress: ${{ github.event_name == 'pull_request' }}`; Node 24 nos três; `npm audit --omit=dev --audit-level=high` | 0,5 |
| B8 | Baixo | 2 | `catch` vazio no tratamento de erro do roteador: se o hook de segurança lançar, a causa se perde. | `shared/presentation/api-fastify-adapter.ts:75` | Registrar o erro em nível `warn` | 0,25 |
| B9 | Baixo | 2 | `environment.ts` único com `http://localhost:3000` fixo: o build de produção aponta para a máquina local. | `frontend/src/environments/environment.ts:1–4` | `environment.production.ts` ou origem relativa, quando houver alvo de deploy | 0,5 |

Sem achado em: domínio sem Nest ou Prisma (lint e 7 testes de fronteira); dono único de escrita por tabela (4 tabelas, 4 módulos); Decimal em todas as camadas do backend (nenhum `Number`, `parseFloat` ou `toNumber` sobre valor); SQL parametrizado; `catch` que engula erro de negócio; propriedade da carteira nos casos de uso; segredo, e-mail ou token em log de requisição; fuso do servidor.

## A verificar (sem evidência nesta revisão)
1. **CI como portão:** resultado dos checks do PR #19 e a regra de proteção da `main` (jobs obrigatórios, push direto bloqueado). O plano já registra que o resultado do #19 não foi conferido.
2. **Revisão dos PRs:** se as descrições trazem o resultado do `/review-pr`, como as convenções exigem.
3. **E2E do Playwright e stack do Docker:** não rodaram aqui (seção "Execução").
4. **Integração na imagem `postgres:16`:** os 96 testes rodaram em PostgreSQL 16.15 local com autenticação `trust`.
5. **Equipe:** o `git log` tem 4 merges de "Fernanda Italiano" (PRs #9, #10 e #11 e o merge `62f6fb6`) e nenhum commit de autoria dela. A matriz `claude/rastreabilidade-s1.md`, seção (d), diz "desenvolvimento em equipe: não atendida" com base só no contexto; confirmar o papel dela e corrigir a matriz.
6. **Dado pessoal em log de erro inesperado:** o filtro só remove a mensagem de `PrismaClientValidationError` (`shared/presentation/problem-details.filter.ts:13–25`). Um erro do driver com o valor da chave no detalhe não foi reproduzido.
7. **M1 com usuários e ativos distintos:** a sonda usou 1 usuário e 1 ativo. A causa não depende disso, mas não foi medido; o limiar fica entre 20 e 40 requisições simultâneas.
8. **Rate limit atrás de proxy:** sem `trustProxy`, todos os clientes teriam o IP do proxy. Só importa quando houver deploy.
9. **Eixo 1 no frontend:** D28 e D52 quase não têm código para avaliar; repetir a revisão depois do W4.

## Os 5 itens a corrigir antes de 06/12
Ordem pelo plano: W2 pode começar agora, K4 fecha em 25/11, W4 vai de 26/11 a 02/12, R1 de 03 a 06/12.

| # | Item | Achados | Quando | h |
|---|---|---|---|---|
| 1 | Seed mínimo do catálogo e seção "Como rodar" no README da raiz | A1, M6 | Antes do W4 (até 25/11); sem isso o W4 não testa contra a API real | 6–11 |
| 2 | Limite de login configurável e job `e2e` criado já no W2 | A2, M4 | No W2 (até 18/11); deixa só o crescimento da suíte para o R1 | 4–6 |
| 3 | Tirar as consultas ao catálogo de dentro da transação do `PATCH`, com teste de concorrência | M1 | Junto do PR 3 do K4 (até 25/11), que mexe no mesmo rascunho de operação | 2–3 |
| 4 | E2E de isolamento entre dois usuários com o mesmo ativo | M2 | Junto do PR 3 do K4 (até 25/11) | 2 |
| 5 | Regra de lint que impede conta com dinheiro no frontend | M5 | Antes do W4 (26/11), a primeira tela com valor monetário | 1–2 |

Total: 15 a 24 horas. O M3 (ciclo entre módulos) é o próximo da fila e fica mais caro a cada módulo novo; convém fazê-lo antes do S2.
