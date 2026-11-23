# Revisão de Engenharia de Software — S1, revisão final (depois do R1)

> Revisão independente de 23/11/2026 sobre a `main` em `e8e001c` (merge do PR #56), no worktree `.claude/worktrees/s1-audit` (checkout destacado). Escopo: `backend/`, `frontend/`, testes e `.github/workflows/ci.yml`. Nenhum arquivo do repositório foi alterado: os mutantes rodaram no worktree e cada arquivo foi restaurado com `git checkout --` (`git status` limpo no fim, fora os arquivos novos desta revisão e da auditoria paralela). Grafo do Graphify (gerado no `e8e001c`) consultado antes da busca textual (D53). Matriz da etapa: `claude/rastreabilidade-s1-final.md` (auditoria paralela). Revisão anterior: `claude/revisao-es.md` (12/11, `f2f1dd2`).

## Resumo
1. **O que rodou:** lint, typecheck, unitários, build e `npm audit` dos dois pacotes passam (backend: 725 testes, 98,1% de linhas, 86,6% de ramos; frontend: 263 specs, 98,6% de linhas, 94,3% de ramos). Integração e E2E do backend (121) e E2E do frontend (42) passaram no CI do `e8e001c` (run 45256177592, 4 jobs verdes); na máquina não rodaram (seção "Execução").
2. **Revisão de 12/11:** dos 19 achados, 10 resolvidos com evidência (A1, A2, M1, M2, M4, M5, M6, B7, a parte de frontend do B6 e quase todo o M8); 6 continuam no BK-4, marcado para depois de 06/12 (M3, M7, B2, B5, B8 e a parte de backend do B6); 4 dependem da decisão do usuário, PL4 em aberto (B1, B3, B4, B9) e as tags do M8.
3. **Regras de negócio:** nenhuma violação de RN01–RN12, D5, D28 ou D52 encontrada. 16 mutantes: os 7 do backend morreram nos unitários; 8 dos 9 do frontend morreram nas specs; o que sobreviveu aceita a data de hoje (D54, achado N4).
4. **Achado novo de maior peso (médio):** a documentação não diz como rodar o E2E do frontend na máquina contra `carteira_test` (D40). Quem segue o README roda o E2E contra a API do Docker, que usa `carteira_dev` (N1).
5. **Processo:** o CI é portão real (4 checks exigidos) e os commits agora seguem passos pequenos em Conventional Commits (o maior tem 2.329 linhas; eram até 14,5 mil). Dois PRs do R1 foram mesclados com o checklist da definição de pronto em branco (N8).

Contagem dos achados abertos: **0 críticos, 0 altos, 3 médios, 16 baixos**, mais 7 itens "a verificar". 8 achados são novos (N1 a N8) e 11 continuam da revisão de 12/11.

## Execução (evidência)
Node 24, Windows 11. Instalação por `npm ci` na raiz, em `backend/` e em `frontend/`; `npm run db:generate` na raiz com `DATABASE_URL` de mentira (o worktree não tem `.env`; o `.env` não foi lido).

| Comando | Resultado |
|---|---|
| backend `npm run lint` (inclui fronteira de camadas) | exit 0 |
| backend `npm run typecheck` | exit 0 |
| backend `npm run test:cov` | 52 suítes, 725 testes passando; linhas 98,09% (2058/2098), ramos 86,6% (1060/1224) |
| backend `npm audit --omit=dev --audit-level=high` | exit 0; 3 moderadas (as mesmas de 12/11, via `@fastify/static`) |
| frontend `npm run lint` (angular-eslint, `check-tokens`, `check-money-lint`) | exit 0, "All files pass linting" |
| frontend `npm run test:cov` | 41 arquivos, 263 testes passando; linhas 98,64% (2189/2219), ramos 94,25% (1050/1114) |
| frontend `npm run build` | exit 0; bundle inicial de 324 kB (86 kB transferidos) |
| frontend `npm audit --omit=dev` | 0 vulnerabilidades |
| CI do `e8e001c` (`gh run view 45256177592`) | `database` 40 s, `backend` 3 min 9 s (725 unitários; **11 suítes e 121 testes de integração/E2E**; smoke test do Docker), `frontend` 1 min 7 s, `e2e` 9 min 39 s (**41 + 1 testes Playwright**, com axe) |

**Não rodou:**
- **Integração e E2E do backend na máquina:** a primeira execução falhou no global setup com `socket hang up`; logo depois o daemon do Docker deixou de responder (`docker info` → "failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine"). É problema de ambiente; não reiniciei o Docker para não afetar a outra sessão. A evidência é o job `backend` do CI acima.
- **Mutantes de isolamento com banco real (M2):** dependem do Docker. Em vez de rodar, li `backend/test/isolation.e2e-spec.ts:103-150`: tirar o `portfolioId` de qualquer das três consultas muda `history.total` (1 → 3), a lista de posições do Bruno (passa a ter ITSA4) ou o 422 da venda de ITSA4 (passaria a 201). As asserções falhariam nos três casos.
- **Sonda de concorrência do `PATCH` (M1):** pelo mesmo motivo, não repeti as 40 requisições. A evidência é o teste `operations.e2e-spec.ts:481` ("edits 40 operations of the portfolio at the same time without a server error"), verde no CI.
- **E2E do frontend (Playwright) na máquina:** não rodei por instrução. A API local usa `carteira_dev` e a D40 só permite `carteira_test` (ver N1). Evidência: o job `e2e` do CI.

**Mutação (16 mutantes, só testes sem banco):**

| ID | Mutante | Resultado |
|---|---|---|
| BM1 | `UpdateOperation` sem conferir se ativo e corretora mudaram entre a leitura e o lock | morto (2 testes de `UpdateOperation`) |
| BM2 | Prévia ignora `replacesOperationId` | morto (3 testes de `PreviewOperation`) |
| BM3 | Prévia avalia a linha do tempo errada (`!== 'remove'` → `=== 'remove'`) | morto (11 testes) |
| BM4 | Edição não confere a corretora nova no catálogo | morto ("rejects a change to a broker not in the catalog") |
| BM5 | K5 classifica fundo como FII ao contrário | morto (2 testes de `parseInstrumentsFile`) |
| BM6 | K5 aceita Cadastro e COTAHIST de dias diferentes | morto ("refuses files of different days") |
| BM7 | `UpdateOperation` só trava a linha do tempo antiga ao mudar de ativo | morto ("locking both pairs") |
| F1 | Ganho pintado como perda (`formatSignedMoney`) | morto (`pt-br.spec.ts`) |
| F2 | Data de hoje recusada (`value > today` → `>=`) | **sobreviveu** às 263 specs (N4) |
| F3 | Casas decimais no limite recusadas | morto |
| F4 | 500 tratado como falha inesperada | morto |
| F5 | Refresh recusado não encerra a sessão | morto |
| F6 | Sinal trocado na soma do explicador | morto |
| F7 | Operação apagada em outro lugar não detectada na prévia | morto |
| F8 | RN07/RN10 mostra a quantidade vendida no lugar da disponível | morto |
| F9 | 404 na exclusão de carteira não tratado como "já excluída" | morto |

## Achados da revisão de 12/11: o que foi resolvido
| # | Situação em 23/11 | Evidência |
|---|---|---|
| A1 (sem seed) | **Resolvido** | `database/sql/inserts.sql` e `npm run db:seed`; seed rodado 2× no job `database` (`ci.yml:65-73`) e carregado no job `e2e` (`ci.yml:260-263`); `backend/test/seed.e2e-spec.ts` (BK-3, PR #43) |
| A2 (limite de login fixo) | **Resolvido** | `backend/src/config/env.ts:59` (`AUTH_RATE_LIMIT_MAX`, padrão 5, no máximo 20 em produção, `:70`); `auth.module.ts:50`; nenhum `getOptionsToken` em `backend/test`; suíte própria `auth-rate-limit.e2e-spec.ts`; passo de 429 no job `e2e` (`ci.yml:302-320`) |
| M1 (`PATCH` esgota o pool) | **Resolvido** | `update-operation.use-case.ts:57-63` (catálogo conferido antes de `store.write`); `operations.e2e-spec.ts:481` e `:504` verdes no CI; BM1 e BM7 mortos |
| M2 (isolamento só por mock) | **Resolvido** (análise estática; mutantes com banco não rodaram) | `backend/test/isolation.e2e-spec.ts:103`, `:138`, `:152`, `:175` |
| M3 (ciclo entre módulos) | **Continua** (BK-4, depois de 06/12). Piorou: o K5 acrescentou mais um import de `operations/domain/asset-type` em `reference-data` | `graphify explain "AssetType"`: importado por `reference-data/domain/catalog.ts:6`, `catalog-entry.ts:1` (novo), `reference-data.dto.ts:11-12`, `prisma-asset-catalog.ts:4`; `portfolios` ↔ `operations` como antes |
| M4 (E2E fora do CI) | **Resolvido** | job `e2e` (`ci.yml:221-333`), exigido na `main` desde 18/11 (PL3); 42 testes verdes no run 45256177592 |
| M5 (sem guarda de D5/D28 no front) | **Resolvido** | `frontend/eslint.config.js:47-88` e `scripts/check-money-lint.mjs` no `npm run lint`; nenhum `Number(`/`parseFloat` em `src/app` |
| M6 (README) | **Resolvido** (falta o E2E local, ver N1) | `README.md:14-96` ("Como rodar" em 7 passos, conferido num clone limpo no PR #53); `backend/README.md` com resumo por grupo e link do contrato |
| M7 (sessões sem limpeza) | **Continua** (BK-4) | `auth/infrastructure/prisma-session.repository.ts` e `worker/` sem `deleteMany` |
| M8 (histórico) | **Resolvido em parte** | 112 commits desde `f2f1dd2`, 111 em Conventional Commits (fora: `14f4092` "Fixing UX/UI ignored situations U7 implement"); maior commit com 2.329 linhas (`de6cc99`); um PR por tarefa. **Continua:** nenhuma tag (`git tag` vazio); depende da decisão do usuário (PL4; também no A-7 da auditoria) |
| B1, B3, B4, B9 | **Continuam** (decisão do usuário, PL4 sem resposta) | ex.: `claude/arquitetura.md:163` ainda diz "201 + posição recalculada"; `frontend/src/environments/environment.ts` com `localhost:3000` fixo |
| B2, B5, B8 | **Continuam** (BK-4) | `operations/domain/derived-value.ts`; `toProblem`/`rethrowAsProblem` nos 5 controllers; `Clock` provido em `auth.module.ts:65` e `operations.module.ts:44`; `catch {}` em `shared/presentation/api-fastify-adapter.ts:75` |
| B6 (limite só de linhas) | **Resolvido no frontend** (`angular.json:84-87`, ramos 80; medido 94,25%); **continua no backend** (BK-4) | `backend/jest.config.ts:29-32` sem limite global de ramos; medido 86,6% |
| B7 (CI) | **Resolvido** | `ci.yml:13` (`cancel-in-progress` só em PR), `:43` (Node 24 no job `database`), `:132-133` (`npm audit`) |

## Achados abertos
Severidade: crítico = regra de negócio, dado ou segurança; alto = viola decisão registrada ou bloqueia a etapa seguinte; médio = dívida que encarece mudança; baixo = estilo. Ordem: severidade, depois novos antes dos que continuam.

| # | Sev. | Eixo | Achado | Evidência | Correção | h |
|---|---|---|---|---|---|---|
| N1 | Médio | 4 (D40) | A documentação não dá caminho para rodar o E2E do frontend na máquina contra `carteira_test`. O README do frontend só pede "suba a API com `AUTH_RATE_LIMIT_MAX` alto". A API do passo 3 do README da raiz lê o `.env` (`DATABASE_URL` → `carteira_dev`), então quem segue os dois READMEs roda o E2E sobre o banco de desenvolvimento: grava usuários e carteiras de teste e depende do estado do seed ali. Não é alto porque o CI cumpre a D40; o risco é de quem roda na máquina | `frontend/README.md:14`; `README.md:95-96` (aponta para o README do frontend); `docker-compose.yml:53` (`env_file: .env` na `api`); `claude/arquitetura.md:338` ("Na máquina: API apontando para `carteira_test` … (`DATABASE_URL_TEST`)"); `.env.example:9` | Seção "E2E na máquina" no `frontend/README.md`: `db:migrate` e `db:seed` com `DATABASE_URL` = `DATABASE_URL_TEST`; API fora do Docker com esse banco e `AUTH_RATE_LIMIT_MAX=10000`; depois `npm run e2e`. O caminho é conferido de verdade antes do PR | 1–2 |
| M3 | Médio | 1, 2 | Continua (ver tabela acima): ciclo `operations` ↔ `portfolios`, `AssetType` em `operations/domain` usado por `reference-data`, e o lint não confere a fronteira entre módulos | idem | BK-4 (prompt atualizado) | 2–3 |
| M7 | Médio | 2 | Continua: `ops.user_sessions` só cresce | idem | BK-4 | 2 |
| N2 | Baixo | 2 | Estado de carregamento copiado em 4 páginas, e uma cópia já divergiu: a Lista de carteiras não manda falha inesperada (400, erro de parse) ao `ErrorHandler`, embora o commit `c627a8b` tenha posto essa regra nas outras 3 páginas | `features/portfolios/portfolios-page.ts:339` (`error: () => {` sem `expectedFailure`); compare `assets-page.ts:328`, `operation-history-page.ts:596`, `portfolio-detail-page.ts:521`; `setTimeout(() => this.slow.set(true), SKELETON_DELAY_MS)` em 4 arquivos | Aplicar `expectedFailure` + `errors.handleError` na Lista, com spec; extrair o padrão (timer do esqueleto + falha) num helper só se a próxima tela precisar dele | 0,5–1 |
| N3 | Baixo | 1 (RN11, U5) | O explicador ("Conta") decide o sinal pela string crua: um valor negativo que arredonda a zero aparece como "−0,00", enquanto o cartão, que usa `formatSignedMoney`, mostra "R$ 0,00" para o mesmo valor | `shared/derived-value/explanation.ts:77` (`signedAmount`) e `:83` (`sum`); `node -e` com `Intl.NumberFormat('pt-BR',{min/maxFractionDigits:2}).format('-0.004')` → `-0,00`; a regra do cartão está em `shared/format/pt-br.spec.ts:31` | Decidir o sinal depois de arredondar (`formatToParts` com `signDisplay: 'exceptZero'`, como `formatSignedMoney`), com spec para `-0.004` | 0,5 |
| N4 | Baixo | 3 (D54) | Nenhuma spec garante que a data de hoje é aceita. O mutante F2 (`value > today` → `>=`) passa nas 263 specs. Provavelmente o E2E o mata, porque o formulário abre com a data de hoje (`e2e/support.ts:78`), mas isso não rodou aqui | `features/operations/operation-fields.ts:89`; `operation-fields.spec.ts:72-74` (só `''`, `2026-01-08` e `9999-12-31`) | Spec com relógio controlado: hoje (em São Paulo) aceito e amanhã recusado; ela deve falhar com o mutante | 0,25 |
| N5 | Baixo | 4 | Descrições desatualizadas: o `lint` do frontend também roda a sonda de dinheiro e o `test:cov` exige 80% de ramos, mas o README e os nomes dos passos do CI não dizem isso | `frontend/README.md:11-12`; `.github/workflows/ci.yml:210` ("angular-eslint and design tokens only") e `:213` ("at least 80% of lines") | Atualizar os 4 textos | 0,25 |
| N6 | Baixo | 4 | A integração do backend usa `postgres:16` sem versão fixa, enquanto o compose e o CI fixam `16.15` por digest porque a 16.16 mudou o `ddl.sql`. O comentário que manda "atualizar os três juntos" esquece este quarto lugar | `backend/test/global-setup.ts:33`; `ci.yml:21-23`, `:226` | Mesma imagem fixada no global setup e comentário com os quatro lugares | 0,25 |
| N7 | Baixo | 4 | As actions rodam em Node 20, já depreciado: o GitHub força Node 24 e avisa nos 4 jobs | run 45256177592, anotações "Node.js 20 is deprecated … actions/checkout@v4, actions/setup-node@v4"; `ci.yml:39-41`, `:110-112`, `:196-198`, `:243-245`, `:329` | Subir `checkout`, `setup-node` e `upload-artifact` para versões que rodem em Node 24 | 0,25 |
| N8 | Baixo | 4 | PRs mesclados com o checklist da definição de pronto em branco: o #56 tem o template inteiro vazio (Tarefa, O que muda, Como testar) e `[ ] /review-pr`; o #49 está com `[ ] /review-pr` e `[ ] Lint e build sem erro no CI`. O #49 teve revisão depois, no commit `a4e23f9` ("review of #49"); para o #56 não há evidência | `gh pr view 56` e `gh pr view 49 --json body`; `claude/convencoes-equipe.md`, "Definição de pronto" | Completar as descrições dos dois PRs no GitHub e rodar o `/review-pr` sobre o diff do #56; regra no perfil: não mesclar com checklist em branco | 0,5 |
| M8 | Baixo | 4 | Continua só a parte das tags (nenhuma) | `git tag` vazio | Decisão do usuário (PL4) | 0,25 |
| B1 | Baixo | 1 | Continua: contagens e quantidade sem `DerivedValue` | `claude/revisao-es.md` | Decisão do usuário (PL4) | 0,5 |
| B2 | Baixo | 1 | Continua: `DerivedValue` em `operations/domain` | idem | BK-4 | 0,5 |
| B3 | Baixo | 1 | Continua: arquitetura 6.1 diz que o 201 devolve a posição | `claude/arquitetura.md:163` | Decisão do usuário (PL4) | 0,25 |
| B4 | Baixo | 1 | Continua: leituras SQL que juntam tabela de outro módulo, sem exceção escrita na 7.2 | idem | Decisão do usuário (PL4) | 0,25 |
| B5 | Baixo | 2 | Continua: `toProblem` em 5 controllers; `Clock` em 2 módulos | idem | BK-4 | 2 |
| B6 | Baixo | 3 | Continua só no backend: sem limite global de ramos (86,6%) | `backend/jest.config.ts:29-32` | BK-4 | 0,25 |
| B8 | Baixo | 2 | Continua: `catch {}` no adaptador | `shared/presentation/api-fastify-adapter.ts:75` | BK-4 | 0,25 |
| B9 | Baixo | 2 | Continua: `environment.ts` único | `frontend/src/environments/environment.ts` | Decisão do usuário (PL4) | 0,5 |

**Achados da auditoria paralela no mesmo escopo, com prompt próprio** (`claude/rastreabilidade-s1-final.md`, prompts em `claude/prompts-correcao-s1-auditoria-final.md`), não repetidos aqui para não gerar dois prompts para o mesmo defeito:
- A-1: o seed falha com FK depois da carga do K5 e o teste do backend fixa essa falha (`backend/test/catalog-ingestion.e2e-spec.ts:107-116`);
- A-2: nenhum E2E nem axe abaixo de 768 px;
- A-7: sem tags, e o PL4 sem resposta.

**Sem achado em:** domínio sem Nest/Prisma (lint de camadas); dono único de escrita (o K5 grava pelo `CatalogWriter` de `reference-data`, `ingestion.module.ts:5-14`); Decimal em todas as camadas (backend sem `Number`/`parseFloat` sobre valor; frontend formata a string decimal com `Intl` sem converter, `shared/format/pt-br.ts:5`); cálculo só no backend (o Resumo do formulário vem da prévia D42; nenhuma conta em template); front só via `/api/v1` (cliente gerado do `openapi.json`); token só em memória (`core/auth/auth.service.ts:23`; nenhum `localStorage` nem `innerHTML`); prévia sem consulta fora do snapshot (`preview-operation.use-case.ts:72-85`, `RepeatableRead` em `prisma-operation-store.ts:149-154`); `catch` que engula erro de negócio no backend.

## A verificar (sem evidência nesta revisão)
1. **Integração e E2E do backend na máquina:** o Docker caiu durante a revisão. Basta rodar `npm run test:e2e` em `backend/` com o Docker de pé (o CI está verde).
2. **Mutantes de isolamento com banco (M2):** rodar os 3 mutantes de 12/11 contra `isolation.e2e-spec.ts`. A análise estática diz que morrem.
3. **N4 morto pelo E2E:** confirmar no job `e2e` que o mutante F2 faz a jornada falhar.
4. **`/review-pr` do PR #56:** se rodou e só não foi registrado (N8).
5. **Dado pessoal em log de erro inesperado** (item 6 de 12/11): continua sem reprodução.
6. **Rate limit atrás de proxy** (item 8 de 12/11): só importa quando houver deploy.
7. **Equipe:** papel de cada conta no histórico (103 commits de "Miguel Veloso Garcia" e 9 de "Fernanda Italiano" desde `f2f1dd2`; PRs abertos e mesclados por `feritaliano`). Está com o usuário, A-6 da auditoria.

## Os 5 itens a corrigir antes de 06/12
Situação do plano em 23/11: código do S1 pronto (R1 antecipado); o P4 (relatório de BD) tem prioridade até 30/11 (G-P4); a janela original do R1 (03–06/12) fica livre para estas correções; apresentação em 09/12.

| # | Item | Achados | Quem | Quando | h |
|---|---|---|---|---|---|
| 1 | Caminho documentado e conferido do E2E local contra `carteira_test` | N1 | frontend | até 04/12 | 1–2 |
| 2 | Correções pequenas do frontend com spec que falha sem elas: falha inesperada na Lista, "−0,00" no explicador, data de hoje aceita | N2, N3, N4 | frontend | até 04/12 (mesmo PR do item 1) | 1,5 |
| 3 | Decisões pendentes do PL4 (B1, B3, B4, B9) e tag por marco (M8) antes da apresentação | B1, B3, B4, B9, M8 | usuário | antes de 06/12 (prazo do PL4) | 1 |
| 4 | Higiene do CI e do teste com banco: imagem fixada no Testcontainers, actions em Node 24 | N6, N7 | backend | até 04/12 | 0,5 |
| 5 | Descrições do #49 e do #56 completadas, `/review-pr` do #56 e textos desatualizados | N8, N5 | frontend (e usuário no GitHub) | até 04/12 | 0,75 |

Total: 4,75 a 5,75 horas. M3, M7, B2, B5, B6 (backend) e B8 seguem no BK-4, depois de 06/12 e antes do S2, como o plano já prevê. O M3 cresceu com o K5 e deve ser o primeiro PR do BK-4.
