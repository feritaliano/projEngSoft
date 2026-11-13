# Prompts de correção — revisão do S1 (12/11/2026)

> Gerado a partir de `claude/revisao-es.md` (`main` em `f2f1dd2`). Cada bloco é um prompt pronto para colar no agente indicado (chat do projeto ou Claude Code). Um prompt por agente e por PR; todo achado da revisão está em um prompt ou na lista "Decisão do usuário". Ordem de execução no fim.

## Cobertura dos achados
| Achado | Onde é tratado |
|---|---|
| A1 (sem seed) | BD-1 (seed), BK-3 (teste do seed), FE-2 (README) |
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
```
Agente: banco de dados. Tarefa P1 (primeiro corte): correção da revisão de 12/11/2026.
Leia claude/revisao-es.md (achados A1 e B7) e a seção "Regras permanentes" de claude/prompts-correcao-s1.md; acrescente o bloco "Banco de dados" ao seu perfil (agentes/agente-banco-de-dados.md e .claude/agents/database.md).
Problema: database/sql só tem ddl.sql e o package.json da raiz não tem script de seed. O catálogo é só leitura na API, então o sistema sobe vazio e ninguém consegue lançar operação. O P1 venceu em 07/11.
Faça:
1. Primeiro corte de database/sql/inserts.sql, só com o que o S1 lê: sectors, issuers, assets das 6 classes (ações, FIIs, ETFs, BDRs com bdr_program, títulos do Tesouro com fixed_income_types e fixed_income_bonds, criptos com crypto_assets) e brokers (ao menos uma exchange sem CNPJ). Dados reais das fontes já baixadas em data/raw; inclua PETR4, WEGE3, MXRF11, ITSA4, BOVA11 e as corretoras XP Investimentos, NuInvest e Rico, usados na massa do handoff. Sem cotações nem preços (S2/S11).
2. Idempotente (ON CONFLICT pela chave natural); rodar duas vezes não muda nada.
3. Script npm run db:seed na raiz e passo no job database do CI (roda duas vezes e confere a contagem). Aproveite e passe o job database para Node 24.
4. Informe ao backend os identificadores estáveis (ticker, nome da corretora) para o teste do seed (BK-3).
Pronto quando: num banco migrado do zero, npm run db:seed deixa GET /api/v1/assets com as 6 classes e GET /api/v1/brokers com as corretoras; o job database fica verde com o passo novo.
Não faça: inventar dado sem fonte; mexer em backend/ ou frontend/; esperar o restante do P1 (as demais tabelas entram nos cortes seguintes, no mesmo arquivo).
Prazo: 19/11 (antes do W3 testar contra a API real; limite 25/11). Esforço: 4–8 h.
```

## BK-1 — Limite de login configurável e ajustes do CI (A2, B7)
```
Agente: backend. Tarefa K4 (PR à parte, antes do W2 fechar): correção da revisão de 12/11/2026.
Leia claude/revisao-es.md (achados A2 e B7) e a seção "Regras permanentes" de claude/prompts-correcao-s1.md; acrescente o bloco "Backend" ao seu perfil (agentes/agente-backend.md e .claude/agents/backend.md).
Problema: AUTH_RATE_LIMIT é constante (backend/src/modules/auth/auth.module.ts:33,47; 5 por minuto por IP). Os 5 E2E do backend trocam o valor por 10.000 para rodar, e o E2E do frontend, que faz login por teste por causa do refresh rotativo, vai receber 429.
Faça:
1. Variável AUTH_RATE_LIMIT_MAX (inteiro, 1 a 10.000, padrão 5) no apiEnvSchema (backend/src/config/env.ts) e no .env.example, lida pelo ThrottlerModule.forRootAsync. Em produção, recuse valor acima de 20.
2. Os E2E que hoje fazem overrideProvider(getOptionsToken()) passam a usar a variável; os dois testes de 429 continuam com o padrão 5.
3. .github/workflows/ci.yml: cancel-in-progress só em pull_request (hoje cancela execução da main, linhas 10–12) e passo npm audit --omit=dev --audit-level=high no job backend.
4. Avise o frontend do nome da variável (FE-1).
Pronto quando: teste de env cobre padrão, limite e recusa em produção; E2E de 429 passa com o padrão; nenhum E2E sobrescreve o provider do throttler; openapi.json sem diferença.
Não faça: tirar o rate limit; mudar o limite padrão.
Prazo: 18/11. Esforço: 1–2 h.
```

## BK-2 — Transação do PATCH e isolamento entre usuários (M1, M2)
```
Agente: backend. Tarefa K4, junto do PR 3 (prévia): correção da revisão de 12/11/2026.
Leia claude/revisao-es.md, achados M1 e M2, e a seção "Sonda de concorrência".
Problema 1 (M1): UpdateOperation chama this.drafts.edit dentro de store.write (update-operation.use-case.ts:50,58), e o rascunho consulta ativo e corretora por outra conexão do pool (operation-drafts.ts:53,76). Com 40 PATCH simultâneos, 27 a 34 voltam 500 em 5 s (P2028 e "timeout exceeded when trying to connect"); POST e DELETE no mesmo volume não falham.
Problema 2 (M2): o isolamento entre carteiras no histórico, na linha do tempo e nas posições só é conferido pelo where de um Prisma simulado (operations.infrastructure.spec.ts:177–190, 276–293). Tirar o portfolioId de prisma-operation-history.ts:24, prisma-operation-store.ts:48 ou prisma-timeline-reader.ts:20 não quebra nenhum dos 96 testes com banco.
Faça:
1. Nenhuma consulta fora do tx dentro da transação: leia a operação e resolva ativo e corretora antes de abrir a transação (como o CreateOperation) e, sob o lock, só confirme que a operação não mudou; ou passe o tx às consultas do catálogo. A prévia (PR 3) usa o mesmo caminho.
2. E2E de concorrência: 40 PATCH simultâneos de operações da mesma carteira respondem 200, sem 500.
3. E2E de isolamento com dois usuários e o mesmo ativo em carteiras diferentes, com operações nas duas ao mesmo tempo: histórico, posições, totais e assetCount de cada carteira só com as próprias operações; venda na carteira sem unidades é RN07 (422), mesmo com saldo na carteira do outro usuário.
Pronto quando: os dois E2E existem e falham sem a correção (o de isolamento falha ao remover o portfolioId de cada uma das três consultas); lint, unitários e E2E verdes.
Não faça: aumentar o pool ou os tempos limite para esconder o problema; mudar o contrato da API.
Prazo: 25/11 (fim do K4). Esforço: 4–5 h.
```

## BK-3 — Teste do seed e README do backend (A1, M6)
```
Agente: backend. Tarefa K4 (PR à parte, depois do BD-1): correção da revisão de 12/11/2026.
Leia claude/revisao-es.md, achados A1 e M6.
Problema: o perfil exige um teste de integração que carrega o seed e confere o resultado; ele não existe. O backend/README.md (linha 26, "Endpoints") lista só health e auth, embora K3 e K4 tenham entregado catálogo, carteiras, operações, posições e totais (definição de pronto, item 5).
Faça:
1. Teste de integração que aplica database/sql/inserts.sql (do BD-1) num banco migrado, lança pela API as 9 operações da massa do handoff com os ativos e corretoras do seed e confere posições e totais (custo total 10.051,27 e lucro realizado 693,87, arredondados na asserção).
2. backend/README.md: troque a lista de endpoints por um resumo por grupo com link para o Swagger (/api/docs) e para backend/openapi/openapi.json.
Pronto quando: o teste falha se um ativo ou corretora da massa sair do seed; README sem endpoint faltando.
Não faça: editar o seed (peça ao agente de banco).
Prazo: 25/11. Esforço: 2–3 h.
```

## BK-4 — Fronteira entre módulos e dívidas menores (M3, M7, B2, B5, B6, B8)
```
Agente: backend. Tarefa nova, depois do K4 e antes do S2: correção da revisão de 12/11/2026.
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
Agente: frontend. Tarefa W2 (primeiro PR): correção da revisão de 12/11/2026.
Leia claude/revisao-es.md (achados M4, M5 e B6) e a seção "Regras permanentes" de claude/prompts-correcao-s1.md; acrescente o bloco "Frontend" ao seu perfil (agentes/agente-frontend.md e .claude/agents/frontend.md).
Problema: frontend/e2e/shell.spec.ts não roda em nenhum job e o job e2e só nasceria no R1 (03–06/12), sem folga. O eslint.config.js não impede conta com dinheiro (D5, D28, RN11), e as 7 telas serão escritas em três semanas. O limite de cobertura só olha linhas.
Faça:
1. Job e2e no .github/workflows/ci.yml agora: PostgreSQL de serviço, migrations e seed (BD-1, quando existir), API com AUTH_RATE_LIMIT_MAX alto (BK-1), frontend servido, npx playwright install chromium e npm run e2e. Comece com o spec do shell e o fluxo de cadastro e login do W2; acrescente @axe-core/playwright já nessas telas (claro e escuro).
2. Regra de lint em src/app (fora de api/): proibir Number(), parseFloat(), parseInt(), + unário e operadores aritméticos sobre campos de valor da API; exceção única, com comentário, para dados de gráfico. Inclua um teste da regra (arquivo de sonda), como o backend faz com as camadas.
3. coverageThresholds: acrescente ramos em 80.
4. Ao implementar Login, Carteiras e Ativos, substitua os 3 specs que só conferem o título.
Pronto quando: job e2e verde no PR do W2 e pedido ao usuário para torná-lo obrigatório na main; lint falha num arquivo de sonda com Number(valor) e passa no código atual.
Não faça: mock de API no E2E; desligar a regra por comentário fora da exceção de gráfico.
Prazo: 18/11 (fim do W2). Esforço: 5–7 h.
```

## FE-2 — "Como rodar" no README da raiz (M6, A1)
```
Agente: frontend. Tarefa R1 (parte antecipada), depois do BD-1: correção da revisão de 12/11/2026.
Leia claude/revisao-es.md, achados M6 e A1.
Problema: o README.md da raiz (41 linhas) não cita o frontend, o seed nem a ordem para subir banco, API e tela; um terceiro não chega a usar o sistema.
Faça: seção única "Como rodar" com pré-requisitos (Docker, Node 24), .env a partir do .env.example, banco, migrations, npm run db:seed, API (Docker ou npm), frontend (npm start em http://localhost:4200), como criar o primeiro usuário e onde estão os testes de cada pacote. Siga os passos numa pasta limpa antes de abrir o PR e cole a saída na descrição.
Pronto quando: seguindo só o README num clone novo, dá para cadastrar, criar carteira e lançar uma compra pela tela (ou pelo Swagger, enquanto a tela não existir, dito no texto). Atualize a seção a cada tela entregue; o roteiro de demonstração continua no R1.
Não faça: duplicar o conteúdo de backend/README.md e frontend/README.md; aponte para eles.
Prazo: 25/11. Esforço: 2–3 h.
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
1. Checks do PR #19 e regra de proteção da `main`: jobs `database`, `backend` e `frontend` obrigatórios; incluir `e2e` depois do FE-1.
2. Descrições dos PRs com o resultado do `/review-pr`.
3. Papel da Fernanda Italiano (4 merges no histórico, nenhum commit de autoria) para corrigir a linha "desenvolvimento em equipe" da matriz.

## Ordem de execução
| Ordem | Prompt | Agente | Depende de | Prazo |
|---|---|---|---|---|
| 1 | BK-1 | backend | — | 18/11 |
| 2 | FE-1 | frontend | BK-1 (variável do limite) | 18/11 |
| 3 | BD-1 | banco de dados | — | 19/11 |
| 4 | BK-2 | backend | — (junto do PR 3 do K4) | 25/11 |
| 5 | BK-3 | backend | BD-1 | 25/11 |
| 6 | FE-2 | frontend | BD-1 | 25/11 |
| 7 | BK-4 | backend | K4 concluído | antes do S2 |

BK-1, BD-1 e BK-2 não dependem um do outro e podem correr em paralelo. Esforço total: 26 a 38 horas, das quais 18 a 28 antes de 06/12 (BK-4 fica para depois do K4).
