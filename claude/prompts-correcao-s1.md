# Prompts de correção — revisão do S1 (12/11/2026; revistos no replanejamento de 12/11)

> Gerado a partir de `claude/revisao-es.md` (`main` em `f2f1dd2`). Cada bloco é um prompt pronto para colar no agente indicado (chat do projeto ou Claude Code). Um prompt por agente e por PR; todo achado da revisão está em um prompt ou na lista "Decisão do usuário". Ordem de execução no fim. **Revistos em 12/11/2026, depois do merge do BD-1 (PR #24), com as datas do replanejamento de `claude/plano-de-acao.md`; o P1-2 (segundo corte do seed) entrou como prompt novo.**

## Cobertura dos achados
| Achado | Onde é tratado |
|---|---|
| A1 (sem seed) | BD-1 (seed, concluído), P1-2 (restante do seed), BK-3 (teste do seed), FE-2 (README) |
| A2 (limite de login fixo) | BK-1 |
| M1 (`PATCH` esgota o pool) | BK-2 |
| M2 (isolamento só por mock) | BK-2 |
| M3 (ciclo entre módulos) | BK-4 |
| M4 (E2E fora do CI) | FE-1 |
| M5 (sem guarda de D5/D28 no front) | FE-1 |
| M6 (README) | FE-2 (raiz), BK-3 (backend) |
| M7 (sessões sem limpeza) | BK-4 |
| M8 (histórico de commits) | Regras permanentes dos três agentes; tags: usuário |
| B1, B3, B4 (documentos × código) | Decisão do usuário |
| B2, B5, B8 | BK-4 |
| B6 (limites de cobertura) | BK-4 (backend), FE-1 (frontend) |
| B7 (CI) | BK-1 (`cancel-in-progress`, `npm audit`), BD-1 (Node 24 no job `database`) |
| B9 (`environment.ts`) | Decisão do usuário (só com alvo de deploy) |

## Regras permanentes para os perfis
Cada agente acrescenta o bloco dele ao próprio perfil (`agentes/<agente>.md` e o espelho em `.claude/agents/`) no primeiro prompt abaixo. Título da seção: "Regras da revisão de 12/11/2026".

**Backend**
- Dentro de uma transação aberta (`store.write`, `prisma.$transaction`), nenhuma consulta por outra conexão: tudo pelo `tx`, ou lido antes de abrir a transação. Todo comando novo ganha um teste com 40 requisições simultâneas.
- Toda regra de isolamento (carteira, usuário) tem teste com banco real e **dados de dois usuários ao mesmo tempo**; conferir o `where` de um Prisma simulado não basta.
- Limite, prazo ou tamanho que um teste precise mudar vem de variável validada no zod, nunca de constante.
- Um módulo importa de outro só `application` e `domain`; tipo do catálogo mora em `reference-data` ou `shared`. Sem dependência circular entre módulos.
- Tabela técnica que só cresce nasce com a rotina de limpeza.
- Mudança de endpoint atualiza o `backend/README.md` no mesmo PR.
- Commits por passo dentro do PR (teste, implementação, contrato), todos em Conventional Commits; um PR por tarefa do plano.

**Frontend**
- Nenhuma conta nem conversão para `number` sobre dinheiro, quantidade ou percentual; a regra de lint do FE-1 não é desligada por comentário.
- Cada tela entra com o E2E do seu fluxo no job `e2e`, no mesmo PR; spec que só confere o título não conta como teste da tela.
- O E2E faz login por teste (o refresh rotativo impede sessão compartilhada, D39).
- O README da raiz ("Como rodar") é atualizado quando muda um passo de execução.
- Commits por passo dentro do PR, em Conventional Commits; um PR por tarefa do plano.

**Banco de dados**
- O seed (`database/sql/inserts.sql`) é idempotente, roda no job `database` e é entregue em cortes: o catálogo que a aplicação da etapa precisa vem antes das demais tabelas.
- Mudança no seed avisa o backend, que mantém o teste que carrega o seed e confere as posições.
- Commits por passo, em Conventional Commits; um PR por tarefa do plano.

---

## BD-1 — Seed mínimo do S1 (A1, B7)
**Concluído em 12/11/2026 (PR #24, com o complemento de documentação no commit `c9af31d`).** Catálogo do S1, `economic_indexes`, `fixed_income_types` e as linhas de mercado da PF; `npm run db:seed`; seed rodado 2× no CI com Node 24. O prompt original fica no histórico do Git.

## P1-2 — Segundo corte do seed (P1 completo)
```
Agente: banco de dados. Tarefa P1, segundo corte (replanejamento de 12/11/2026). Janela 13/11–18/11; gatilho G-P1 em 18/11.
Leia: claude/plano-de-acao.md (BD Parte 2, "Dependências do P1", G-P1), claude/enunciadoBancoDeDados.md (item 2), database/docs/fontes-poc.md (seções 5 e 6), database/docs/memoria-calculo.md, claude/handoff-ux.md (massa do handoff e massa das telas 3 e 4, D48) e as regras do seu perfil.
Estado: database/sql/inserts.sql já tem a seção 1 (catálogo, BD-1) e a 2 (mercado da PF). Faltam as ~26 tabelas restantes do public; ops fica fora (D22).
Faça, no mesmo arquivo e com as mesmas regras (UUID fixo por faixa, ON CONFLICT pela chave natural ou NOT EXISTS quando a chave pode ser nula, pai achado pela chave natural com LEFT JOIN para falhar em vez de pular):
1. Tabelas de mercado com arquivo real (baixe o que faltar para data/raw e registre URL, data, hash e contagem na seção 6 do fontes-poc.md): quotes (COTAHIST de 30/10/2026, já em data/raw/b3-cotahist/), fii_monthly_reports (informe mensal da CVM), fixed_income_prices (CSV do Tesouro), corporate_events (stockDividends do listedCompaniesProxy), corporate_filings (IPE da CVM), financial_statements e statement_lines (DFP/ITR da CVM), crypto_prices (JSON do Mercado Bitcoin em data/raw/fontes-poc/ se o usuário o baixar até 14/11; senão, candles diários da API pública da Foxbit, decisão de 12/11), e as demais de mercado do schema.
2. Tabelas do usuário (fictícias, coerentes entre si): ≥ 10 usuários; o usuário de demonstração com e-mail demo@carteirab3.dev e a carteira "Longo prazo" da massa das telas 3 e 4 (11 operações, custo total R$ 16.151,27, lucro realizado R$ 693,87), mais as outras carteiras que a Lista do Figma mostra; um segundo usuário com o mesmo ativo em outra carteira (isolamento, BK-2/BK-3); operações nas 6 classes, com datas que não passam de hoje (D54); import_batches, watchlist, alertas, telas salvas e critérios, metas e carteira ideal.
3. Senha: users.password_hash em argon2id gerado com o pacote e os parâmetros de backend/src/modules/users/infrastructure/argon2-password-hasher.ts; a senha de demonstração (só de desenvolvimento) vai num comentário do inserts.sql e no README da raiz pelo FE-2, nunca em .env.
4. Tabelas derivadas, calculadas e conferidas na memória de cálculo: received_income (posição na data-com × income_distributions), tax_categories e tax_rules (normas do P0; 4 categorias reais, mesmo critério da D60d), tax_assessments e darfs (apuração das vendas do seed, com isenção e compensação de prejuízo), indicators.
5. Casos variados para o P2: ao menos uma linha que só aparece com LEFT JOIN em cada consulta planejada (usuário sem carteira, carteira sem operação, ativo sem cotação, provento sem recebimento).
6. database/tests/seed-check.sql: acrescente ±10 por tabela (com as exceções da D60d escritas), posições nunca negativas por (carteira, ativo) em ordem de data, proventos recebidos iguais à posição na data-com, apurações iguais às vendas.
Pronto quando: npm run db:seed num banco migrado do zero passa no seed-check; rodar 2× não muda nenhuma contagem (job database); POST /api/v1/auth/login com o usuário de demonstração responde 200 e GET /portfolios/:id/summary da "Longo prazo" devolve custo 16.151,27 e lucro realizado 693,87; PR com a tabela de contagens por tabela.
Não faça: inventar dado de mercado sem fonte; mexer em backend/ ou frontend/; mudar schema (mudança vira decisão registrada).
Se em 18/11 faltar tabela (G-P1): abra o PR com as prontas e liste as que faltam com o motivo, para o relatório.
Ao terminar: avise o backend (BK-3 confere a carteira de demonstração) e o frontend (FE-2 usa o usuário de demonstração).
Prazo: 18/11. Esforço: 8–12 h.
```

## BK-1 — Limite de login configurável e ajustes do CI (A2, B7)
```
Agente: backend. Tarefa BK-1 (PR à parte, antes do W2 e do FE-1): correção da revisão de 12/11/2026. Janela 13/11–14/11.
Leia claude/revisao-es.md (achados A2 e B7) e a seção "Regras permanentes" de claude/prompts-correcao-s1.md; acrescente o bloco "Backend" ao seu perfil (agentes/agente-backend.md e .claude/agents/backend.md).
Problema: AUTH_RATE_LIMIT é constante (backend/src/modules/auth/auth.module.ts:33, usado em ThrottlerModule.forRoot na linha 47; 5 por minuto por IP). Cinco E2E (auth, operations, portfolios, positions, reference-data) trocam o valor por overrideProvider(getOptionsToken()) para rodar, e o E2E do frontend, que faz login por teste por causa do refresh rotativo, vai receber 429.
Faça:
1. Variável AUTH_RATE_LIMIT_MAX (inteiro, 1 a 10.000, padrão 5) no apiEnvSchema (backend/src/config/env.ts) e no .env.example da raiz, lida pelo ThrottlerModule.forRootAsync. Em produção, recuse valor acima de 20 (no mesmo refine que já trata NODE_ENV=production).
2. Os E2E que hoje fazem overrideProvider(getOptionsToken()) passam a subir o app com AUTH_RATE_LIMIT_MAX alto. Os dois testes de 429 (auth.e2e-spec.ts, "after 5 login attempts" e "after 5 sign-up attempts") sobem um app próprio com o padrão 5, para não depender da ordem dos testes.
3. .github/workflows/ci.yml: cancel-in-progress só em pull_request (hoje é true para tudo, linhas 10–12; ex.: ${{ github.event_name == 'pull_request' }}) e passo npm audit --omit=dev --audit-level=high no job backend. Se o audit falhar hoje, atualize a dependência; se não houver versão corrigida, registre a exceção no PR em vez de tirar o passo.
4. Avise o frontend do nome da variável (FE-1).
Pronto quando: teste de env cobre padrão, limite e recusa em produção; os testes de 429 passam com o padrão; nenhum E2E sobrescreve o provider do throttler (grep getOptionsToken em backend/test sem resultado); openapi.json sem diferença.
Não faça: tirar o rate limit; mudar o limite padrão.
Prazo: 14/11. Esforço: 1–2 h.
```

## BK-2 — Transação do PATCH e isolamento entre usuários (M1, M2)
```
Agente: backend. Tarefa K4, junto do PR 3 (prévia): correção da revisão de 12/11/2026. Janela 15/11–19/11 (o K5 começa em 21/11 e depende deste PR).
Leia claude/revisao-es.md, achados M1 e M2, e a seção "Sonda de concorrência".
Problema 1 (M1): UpdateOperation chama this.drafts.edit dentro de store.write (update-operation.use-case.ts:50,58), e o rascunho consulta ativo e corretora por outra conexão do pool (operation-drafts.ts:53,76). Com 40 PATCH simultâneos, 27 a 34 voltam 500 em 5 s (P2028 e "timeout exceeded when trying to connect"); POST e DELETE no mesmo volume não falham.
Problema 2 (M2): o isolamento entre carteiras no histórico, na linha do tempo e nas posições só é conferido pelo where de um Prisma simulado (operations.infrastructure.spec.ts:177–190, 276–293). Tirar o portfolioId de prisma-operation-history.ts:24, prisma-operation-store.ts:48 ou prisma-timeline-reader.ts:20 não quebra nenhum dos 96 testes com banco.
Faça:
1. Nenhuma consulta fora do tx dentro da transação: leia a operação e resolva ativo e corretora antes de abrir a transação (como o CreateOperation) e, sob o lock, só confirme que a operação não mudou; ou passe o tx às consultas do catálogo. A prévia (PR 3) usa o mesmo caminho e não grava.
2. E2E de concorrência: 40 PATCH simultâneos de operações da mesma carteira respondem 200, sem 500.
3. E2E de isolamento com dois usuários e o mesmo ativo em carteiras diferentes, com operações nas duas ao mesmo tempo: histórico, posições, totais e assetCount de cada carteira só com as próprias operações; venda na carteira sem unidades é RN07 (422), mesmo com saldo na carteira do outro usuário.
Pronto quando: os dois E2E existem e falham sem a correção (o de isolamento falha ao remover o portfolioId de cada uma das três consultas); lint, unitários e E2E verdes; "Pronto quando" do K4 no plano atendido (prévia D42, 6 classes D55, códigos D56).
Não faça: aumentar o pool ou os tempos limite para esconder o problema; mudar o contrato da API.
Prazo: 19/11 (limite do G-K4: 25/11). Esforço: 4–5 h.
```

## BK-3 — Teste do seed e README do backend (A1, M6)
```
Agente: backend. Tarefa BK-3 (PR à parte, depois do BD-1): correção da revisão de 12/11/2026. Data: 20/11.
Leia claude/revisao-es.md (achados A1 e M6), claude/handoff-ux.md (massa do handoff) e database/tests/seed-check.sql.
Problema: o perfil exige um teste de integração que carrega o seed e confere o resultado; ele não existe. O backend/README.md (seção "Endpoints") lista só health e auth, embora K3 e K4 tenham entregado catálogo, carteiras, operações, posições e totais.
Faça:
1. Teste de integração que aplica database/sql/inserts.sql (npm run db:seed ou o mesmo arquivo pelo Testcontainers) num banco migrado, cria um usuário próprio pela API (e-mail único, sem colidir com os do seed), lança as 9 operações da massa do handoff com os ativos e corretoras do seed e confere posições e totais: custo total 10.051,27, lucro realizado 693,87, assetCount 4, operationCount 9 (arredondados na asserção).
2. Se o segundo corte do P1 (P1-2) já estiver na main: confira também a carteira "Longo prazo" do usuário de demonstração semeado (custo total 16.151,27, lucro realizado 693,87, 6 posições abertas e WEGE3 encerrada). Se ainda não estiver, deixe o caso com it.todo e o nome da tarefa.
3. backend/README.md: troque a lista de endpoints por um resumo por grupo com link para o Swagger (/api/docs) e para backend/openapi/openapi.json.
Pronto quando: o teste falha se um ativo ou corretora da massa sair do seed; README sem endpoint faltando.
Não faça: editar o seed (peça ao agente de banco).
Prazo: 20/11. Esforço: 2–3 h.
```

## BK-4 — Fronteira entre módulos e dívidas menores (M3, M7, B2, B5, B6, B8)
```
Agente: backend. Tarefa BK-4, depois de 06/12 e antes do S2: correção da revisão de 12/11/2026.
Leia claude/revisao-es.md, achados M3, M7, B2, B5, B6 e B8.
Faça, em PRs pequenos e nesta ordem:
1. M3 e B2: mova AssetType para reference-data/domain (ou shared/domain) e DerivedValue para shared/domain; acrescente ao eslint-plugin-boundaries a regra de que um módulo só importa application e domain de outro, nunca infrastructure, com teste em layer-boundaries.spec.ts. Registre no PR como ficou a dependência entre operations e portfolios (hoje circular: count-open-positions de um lado, get-owned-portfolio do outro) e elimine o ciclo de arquivos.
2. M7: apague sessões de ops.user_sessions expiradas ou revogadas há mais de 30 dias, no login do próprio usuário ou em rotina diária do worker; teste com relógio falso.
3. B5: um filtro (ou função única) que mapeia erro de domínio para problem+json por tabela erro → status, no lugar das 5 cópias de toProblem/rethrowAsProblem; Clock provido num módulo compartilhado.
4. B6: coverageThreshold global de ramos em 80 no jest.config.ts.
5. B8: registre em warn o erro engolido em shared/presentation/api-fastify-adapter.ts:75.
Pronto quando: lint falha num import de infrastructure de outro módulo; nenhum ciclo entre módulos; respostas de erro idênticas às atuais (E2E sem mudança); openapi.json sem diferença.
Não faça: mudar contrato, regra de negócio ou schema; juntar tudo num PR.
Prazo: antes do início do S2. Esforço: 8–10 h.
```

## FE-1 — Job e2e desde o W2, guarda de D5/D28 e cobertura (M4, M5, B6)
```
Agente: frontend. Tarefa FE-1, no primeiro PR do W2: correção da revisão de 12/11/2026. Janela 13/11–16/11; depende do BK-1 (AUTH_RATE_LIMIT_MAX).
Leia claude/revisao-es.md (achados M4, M5 e B6) e a seção "Regras permanentes" de claude/prompts-correcao-s1.md; acrescente o bloco "Frontend" ao seu perfil (agentes/agente-frontend.md e .claude/agents/frontend.md).
Problema: frontend/e2e/shell.spec.ts não roda em nenhum job e o job e2e só nasceria no R1 (03–06/12), sem folga. O eslint.config.js não impede conta com dinheiro (D5, D28, RN11), e as 7 telas serão escritas em três semanas. O limite de cobertura (coverageThresholds no angular.json) só olha linhas.
Faça:
1. Job e2e no .github/workflows/ci.yml agora: PostgreSQL de serviço com a mesma imagem fixada por digest do job database (postgres:16.15@sha256:…), psql de dentro do contêiner (PG_CONTAINER, como o job database), npm run db:migrate e npm run db:seed (o seed do BD-1 já existe), API com AUTH_RATE_LIMIT_MAX=10000, frontend servido, npx playwright install --with-deps chromium e npm run e2e. Comece com o spec do shell e o fluxo de cadastro e login do W2; acrescente @axe-core/playwright já nessas telas (claro e escuro).
2. Regra de lint em src/app (fora de api/): proibir Number(), parseFloat(), parseInt(), + unário e operadores aritméticos sobre campos de valor da API; exceção única, com comentário, para dados de gráfico. Inclua um teste da regra (arquivo de sonda), como o backend faz com as camadas.
3. coverageThresholds: acrescente ramos em 80.
4. Ao implementar Login, Carteiras e Ativos, substitua os 3 specs que só conferem o título.
Pronto quando: job e2e verde no PR do W2 e pedido ao usuário para torná-lo obrigatório na main (PL3); lint falha num arquivo de sonda com Number(valor) e passa no código atual.
Não faça: mock de API no E2E; desligar a regra por comentário fora da exceção de gráfico.
Prazo: 16/11 (fim do W2). Esforço: 5–7 h.
```

## FE-2 — "Como rodar" no README da raiz (M6, A1)
```
Agente: frontend. Tarefa FE-2 (parte antecipada do R1): correção da revisão de 12/11/2026. Data: 27/11, depois do BK-3 e do K5 (ou do G-K5 em 26/11).
Leia claude/revisao-es.md, achados M6 e A1.
Problema: o README.md da raiz (41 linhas) não cita o frontend, o seed nem a ordem para subir banco, API e tela; um terceiro não chega a usar o sistema.
Faça: seção única "Como rodar" com pré-requisitos (Docker, Node 24), .env a partir do .env.example, banco, migrations, npm run db:seed, carga do catálogo completo pelo comando do K5 (se o G-K5 cortou o K5, diga que o catálogo fica com os ativos do seed), API (Docker ou npm), frontend (npm start em http://localhost:4200), entrada com o usuário de demonstração do seed (demo@carteirab3.dev, senha do comentário do inserts.sql) ou cadastro de um usuário novo, e onde estão os testes de cada pacote. Siga os passos numa pasta limpa antes de abrir o PR e cole a saída na descrição.
Pronto quando: seguindo só o README num clone novo, dá para entrar, criar carteira e lançar uma compra pela tela. Atualize a seção a cada tela entregue depois disso; o roteiro de demonstração continua no R1.
Não faça: duplicar o conteúdo de backend/README.md e frontend/README.md; aponte para eles.
Prazo: 27/11. Esforço: 2–3 h.
```

---

## Decisão do usuário (não vira prompt de agente sem a sua resposta)
| Achado | O que decidir | Proposta |
|---|---|---|
| B1 | Quantidade da posição, `assetCount` e `operationCount` saem sem `DerivedValue`, contra a letra do D26 e da invariante 8 | Registrar no contexto a exceção: contagens e quantidade não têm trace (o handoff já trata assim) |
| B3 | A arquitetura 6.1 diz que o 201 do lançamento devolve a posição recalculada; a API devolve só a operação | Corrigir o diagrama da arquitetura; o contrato fica como está |
| B4 | `portfolios` conta `operations` por SQL e o histórico filtra por `assets.type`, sem exceção escrita na regra 7.2 | Registrar na 7.2 que query service de leitura pode juntar tabela de outro módulo |
| B9 | `environment.ts` único aponta para `localhost:3000` | Deixar como está até existir alvo de deploy; registrar como pendência |
| M8 | Sem tag nem release; calendário de entregas da disciplina não obtido | Criar uma tag por marco já entregue (K2, K3, W1) e a cada tarefa daqui em diante; obter o calendário |

Com a sua resposta, o registro em `claude/contexto-projeto.md` e `claude/arquitetura.md` é feito no chat do projeto, na mesma tarefa.

## A verificar pelo usuário (GitHub)
1. ~~Checks do PR #19 e regra de proteção da `main`.~~ Confirmado em 12/11: `database`, `backend` e `frontend` obrigatórios; incluir `e2e` depois do FE-1 (PL3).
2. Descrições dos PRs com o resultado do `/review-pr`.
3. Papel da Fernanda Italiano (4 merges no histórico, nenhum commit de autoria) para corrigir a linha "desenvolvimento em equipe" da matriz.

## Ordem de execução
| Ordem | Prompt | Agente | Depende de | Janela |
|---|---|---|---|---|
| — | BD-1 | banco de dados | — | **Concluído (12/11)** |
| 1 | BK-1 | backend | — | 13/11–14/11 |
| 1 | P1-2 | banco de dados | BD-1; preço de cripto até 14/11 | 13/11–18/11 |
| 1 | U7 parte A (`claude/verificacao-plano-figma.md`) | UX/UI | — | 13/11–17/11 |
| 2 | FE-1 (com o W2) | frontend | BK-1 | 13/11–16/11 |
| 3 | BK-2 (com o PR 3 do K4) | backend | BK-1 | 15/11–19/11 |
| 4 | BK-3 | backend | BD-1 (P1-2 opcional) | 20/11 |
| 5 | K5 (`claude/fontes-de-dados.md`, seção 8) | backend | BK-2, PR 3 do K4 | 21/11–26/11 |
| 6 | FE-2 | frontend | BK-3, K5 ou G-K5 | 27/11 |
| 7 | BK-4 | backend | K4 concluído | depois de 06/12, antes do S2 |

Agentes diferentes correm em paralelo; cada agente faz os seus prompts na ordem da tabela. Esforço restante antes de 06/12: 22 a 33 horas (BK-4 fica para depois).
