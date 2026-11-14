# Plano de ação — Carteira B3 (replanejado em 24/10/2026; ajustado em 26/10/2026; conferido em 11/11/2026; ajustado e replanejado em 12/11/2026)

**Situação em 24/10/2026:** BD Parte 1 enviada em 19/10; banco criado e validado (P0, G1, D1). Nenhuma tarefa das outras frentes andou entre 06/10 e 23/10, e o usuário retomou o projeto geral em 24/10: todas as datas abaixo foram refeitas a partir de 25/10.

**Ajuste de 26/10/2026 (D38):** ferramentas do Claude Code definidas por frente (`claude/convencoes-equipe.md`); U5 passa a entregar `claude/handoff-ux.md` com o link do frame de cada tela no Figma; R1 usa `@playwright/test` para o E2E; F3 inclui `gh auth login` e a proteção da `main` sem aprovação obrigatória enquanto o projeto tiver uma pessoa. Datas inalteradas.

**Ajuste de 26/10/2026 (D40):** estratégia de testes e CI definida (`claude/arquitetura.md`, seção 9). O job `database` do CI já existe; K1, W1 e R1 acrescentam os jobs `backend`, `frontend` e `e2e`; o F3 passa a exigir o job `database` na proteção da `main`. Permissões do Claude Code revistas em `.claude/settings.json`. Datas inalteradas.

**Ajuste de 26/10/2026 (U0, D41):** lista de telas do S1 aprovada: 7 telas, 3 componentes com frame próprio (`DerivedValueExplainer`, `BusinessRuleError`, `ConfirmDialog`) e o shell, em `agentes/agente-ux-ui.md` e `claude/handoff-ux.md`. Efeitos no plano: U2 e U3 cobrem os 11 frames; W1 inclui os estados globais do shell; W3 inclui a exclusão com confirmação; W4 inclui o formulário em modo editar, a seção de posições encerradas e a ação "Lançar operação" do catálogo; K3 devolve `operationCount` em `GET /portfolios`; K4 devolve as posições encerradas. Datas inalteradas.

**Ajuste de 30/10/2026 (UX):** U1 e U2 concluídos e U3 com os frames prontos no Figma (https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo, time educacional ProjetosUnifesp): variáveis com modos Light e Dark, componentes, 7 telas e o shell com 39 frames de estado, protótipo navegável e prévia do tema escuro; links em `claude/handoff-ux.md`, tokens em `claude/design-tokens.md`. U1 terminou 1 dia depois da data (limite de chamadas do plano Starter do Figma, resolvido com o plano Education). O U3 espera a revisão do usuário; U4 e U5 mantêm as datas.

**Ajuste de 30/10/2026 (D42):** prévia da operação calculada no backend. K4 ganha `POST /portfolios/:id/operations/preview` (0,5–1 dia dentro da janela); W4 ganha o Resumo da operação no formulário; U4 ganha os textos dos 3 novos `formulaCode`; a prévia é o primeiro corte do G-K4. Datas inalteradas.

**Ajuste de 30/10/2026 (D43–D45):** carteira ideal e metas entram no ER (D43); renda fixa e cripto entram no escopo do produto, na etapa nova S11 (D44); ajustes de UX no S1 e página de roadmap no Figma (D45). Nova tarefa **D3** do agente de banco (31/10–04/11), antes do fim do P1, com o gatilho G-D3. K4 ganha o filtro `assetType`; W4 ganha guias, filtro por tipo, agrupamento por classe e avatar. Datas das demais tarefas inalteradas.

**Ajuste de 30/10/2026 (D46, D47):** o Figma passa a ter uma página só, organizada por tela (S1 à esquerda, próximas etapas à direita); a D3 recebe os requisitos de dados das telas do produto completo, com prioridade A/B, e o G-D3 corta primeiro as linhas B. Datas inalteradas.

**Ajuste de 31/10/2026 (D48):** Lista e Detalhe da carteira têm versão única no Figma; W3 e W4 implementam esse layout mostrando só o que tem dado no S1 (lista no `claude/handoff-ux.md`). Tabela de posições com custo total e lucro realizado por ativo. Datas inalteradas.

**Ajuste de 31/10/2026 (U3–U5):** U3 aprovado, U4 (`claude/microcopy.md`) e U5 (especificação de handoff e revisão WCAG/Nielsen em `claude/handoff-ux.md`) concluídos; a trilha de UX do S1 está fechada antes das datas. O W2 já não depende do gatilho G-U3 e o W4 já tem o U5. O R1 ganha a verificação de acessibilidade. Datas inalteradas.

**Ajuste de 31/10/2026 (D51):** ações de linha e de cartão viram ícones com tooltip (`IconButton` + `Tooltip`) e botões de criar ganham o ícone +; o W3 (Lista) e o W4 (Histórico) usam o `IconButton` compartilhado, sem mudança de datas. Protótipo revisto com todo botão do fluxo ligado.

**Ajuste de 01/11/2026 (D52, K1):** o `openapi.json` passa a ser versionado e conferido no CI desde o K1 (antes, K4); o K1 inclui logs estruturados e `GET /api/v1/health`. O `backend/Dockerfile` e os serviços `api` e `worker` do `docker-compose.yml`, que a estrutura previa para o K1, ficaram fora do escopo pedido e passam para antes do R1 (pendência no contexto). Datas inalteradas.

**Ajuste de 09/11/2026 (auditoria K0–K2, agente de backend):** `main` em `cfd1018` conferida: lint e fronteira de camadas, typecheck, 316 testes unitários (98,8% de linhas; 100% de ramos em `domain/`, limite do Jest), 19 testes de integração e E2E contra PostgreSQL 16 (migrations do zero), build e `openapi.json` igual ao regerado. K0, K1 e K2 cumprem os critérios de pronto; K2 mesclado no PR #11. A API do S1 para o frontend tem hoje 5 rotas (`health` e as 4 de `auth`): bastam para o W1 e o W2; as do W3 e do W4 são do K3 e do K4, nas datas. Três defeitos de contrato entram no K3, antes do W2: `openapi.json` referencia o esquema `refresh_token` sem defini-lo (e não declara o `bearer` das rotas protegidas); o 400 de validação traz `errors: string[]` sem o campo; as respostas de erro não têm schema. O K4 ganha `GET /portfolios/:id/summary` (totais, B7), que faltava na lista de endpoints. Datas inalteradas.

**Ajuste de 10/11/2026 (D55, D56):** renda fixa e cripto entram no S1 sem preço (catálogo, operações, posição, totais e Histórico com 6 classes), sem tarefa nova: o K3 já tem o catálogo, o K4 e o W4 passam a cobrir as duas classes. Erros de validação ganham código (`errors[].code`, D56): entra no PR 1 do K4 e no W2–W4. Datas inalteradas.

**Ajuste de 11/11/2026 (K4 PR 1, D54, D57):** o PR 1 do K4 foi mesclado antes da janela (PR #14): operações com recálculo transacional e lock por (carteira, ativo), RN04 por classe, RN07 e RN10 com a operação infratora (422), histórico com filtro `assetType` e paginação, `GET /portfolios/:id` com `lastTradeDate`, códigos de erro da D56 em todos os formulários e "hoje" em America/Sao_Paulo (D54, registrada no PR #17). A revisão do PR achou e corrigiu dois 500 (todo 400 de validação e corpo que não é objeto) e um código de tamanho errado (PR #17). Faltam no K4 o **PR 2** (posições abertas e encerradas, totais com `DerivedValue`, renda fixa e cripto da D55) e o **PR 3** (prévia, D42), dentro da janela até 25/11. Skills do Claude Code no projeto (D57, PR #16). O **W1 não começou** na data (a pasta `frontend/` não existe): passa para 12/11–14/11 e o W2 encolhe para 15/11–18/11, mantendo o fim. A API já tem tudo o que W1, W2 e W3 consomem; o W4 depende do PR 2 e do PR 3.

**Ajuste de 11/11/2026 (W1, D58):** o W1 foi feito um dia antes da janela (branch `feat/W1-angular-skeleton`): Angular 22, Tailwind 4 com os tokens em `@theme` (não há `tailwind.config`), cliente da API pelo `ng-openapi-gen`, sessão em memória com refresh único, shell do frame L com 404 e falha de conexão, 52 specs (97% de linhas), `@playwright/test` com um spec do shell e job `frontend` no CI. Depois do merge, o check `frontend` passa a ser exigido na `main`. O W2 pode começar antes de 15/11. Datas inalteradas.

**Ajuste de 12/11/2026 (conferência do W1, agente de frontend):** o W1 foi mesclado na `main` em 11/11 pelo PR #19 (merge `f2f1dd2`), que levou junto o PR 2 do K4 (a branch do K4 entrou na do W1 por merge; o PR #20 também consta como mesclado). Conferido em 12/11 no `f2f1dd2`, com os passos do job `frontend`: `api:generate` (36 modelos, 6 serviços), `lint` (angular-eslint e `check-tokens`) sem erro, 56 specs em 14 arquivos passando (97,5% de linhas, 98,7% de ramos; limite de 80%) e `build` sem erro; as 28 cores de `claude/design-tokens.md` batem com o `@theme` nos temas claro e escuro; rotas, interceptors (token com refresh único, erro e falha de conexão), shell, 404 e `environment` conforme a D58. **Não conferido aqui:** o resultado do CI do PR #19 no GitHub (sem acesso pela sessão) e o E2E do shell (o ambiente não baixa o navegador; o job `e2e` só entra no R1). O check `frontend` já é exigido na proteção da `main` (D40), confirmado pelo usuário em 12/11. O W2 pode começar em 12/11: K2 e os códigos da D56 de cadastro e login já estão na `main`. Datas inalteradas.

**Ajuste de 12/11/2026 (D59, fontes de dados):** aprovadas as fontes do mercado inteiro (`claude/fontes-de-dados.md`). Efeitos: (1) nova tarefa **K5** do backend, carga única do catálogo completo da B3 (sem cotações) dentro do S1, de 18/11 a 26/11, com o gatilho **G-K5**; (2) prova de conceito das fontes pelo agente de banco até 16/11 (um arquivo real de cada fonte em `data/raw/fontes-poc/`), que alimenta o K5 e o seed; (3) o P1 tira de arquivos reais as linhas de `assets` (~50 ativos), `crypto_prices`, `index_values` (IBOV) e `income_distributions`. O S2 inteiro continua depois de 06/12: não cabe na folga zero do W4 e do R1, e as cotações não aparecem nas telas do S1 (D41, D48). Código do S1 entregue em 06/12; apresentação em 09/12. Demais datas inalteradas.

**Replanejamento de 12/11/2026 (revisão do S1, `claude/verificacao-plano-figma.md` P1–P11; aprovado pelo usuário em 12/11):** (1) **atraso registrado:** o P1 venceu em 07/11 sem seed; o BD-1 (PR #24, 12/11) entregou o primeiro corte (10 das 36 tabelas: catálogo, índices, tipos de título, proventos e IBOV) e as ~26 restantes entram no segundo corte, 13/11–18/11, com o gatilho novo **G-P1**; P2, P3 e P4 foram refeitos em cadeia e o **envio da Parte 2 continua em 30/11** (prazo 07/12), sem esbarrar no R1; (2) as dependências do P1 ganharam data (preço de cripto: JSON do Mercado Bitcoin pelo navegador até 14/11; senão, candles da API pública da Foxbit) e `economic_indexes` (5) e `fixed_income_types` (8) ficam abaixo das ±10 tuplas com justificativa (D60d); (3) **W4 dividido** em W4a (Catálogo, Histórico, Detalhe: API toda na `main`) e W4b (formulário e prévia, depois do PR 3 do K4); W2 e W3 antecipados em 2 dias, já que o W1 terminou em 11/11; (4) as correções da revisão entram como tarefas com data: BK-1, BK-2, BK-3, BK-4, FE-1, FE-2 (`claude/prompts-correcao-s1.md`) e U7 parte A; o PR 3 do K4 com o BK-2 passa para 15–19/11 e o K5 para 21–26/11, e o backend termina em 26/11; (5) pendências sem tarefa ganharam ID, data e dono (B7, PL1–PL3); (6) datas, status de F2/F3, frase do catálogo e critério do K4 corrigidos. Escopo e ordem das etapas inalterados.

**Frentes ativas:** todas.
- 25–27/10: fundação (usuário).
- 28/10 a 11/11: UX/UI (U1–U6, concluídos em 31/10), backend (K0–K4 PR 2) e BD (D2, D3).
- 12/11 a 06/12: BD (PF, BD-1, P1–P4; Parte 2 enviada até 30/11), backend (BK-1, K4 PR 3 + BK-2, BK-3, K5; termina em 26/11), frontend (W1 concluído em 11/11; W2–R1) e UX/UI (U7 parte A, 13–17/11).

**Prazos fixos:** BD Parte 1 em **19/10/2026** · BD Parte 2 em **07/12/2026** (Google Classroom).
**Alvos:** BD Parte 1 enviada em 19/10 (feito) · handoff de UX (concluído em 31/10) · BD Parte 2 enviada até 30/11 · S1 (núcleo da carteira) pronto em 06/12 · apresentação de ES em 09/12.

**Escopo de Engenharia de Software nestas datas:** só o **S1** (A1–A2, B1–B7, B13, C1; renda fixa e cripto sem preço, D55), aprovado em 31/10/2026 (D49). Depois de 06/12: S2 → S6 → S9 → S10 → S3 → S4 → S5 → S7 → S8 → S11.

**Prompts dos agentes:** os quatro em `agentes/` foram reescritos em 05/10/2026 e trazem as tarefas e datas da própria frente; mudança neste plano atualiza também o prompt da frente afetada.

**Checklist interativo:** artifact "Plano de Ação Carteira B3" (https://claude.ai/artifact/MEKLYSKz6kRe1ff3nvop6U), atualizado em 12/11/2026 com este plano (replanejamento de 12/11: PF e BD-1 concluídos, P1–P4 com datas novas, G-P1, W4a/W4b, tarefas da revisão). O progresso (tarefas marcadas) vive no artifact; datas, dependências e critérios de pronto vivem neste documento. Toda mudança neste plano atualiza o artifact na mesma tarefa.

## BD Parte 1 — descrição do problema e modelo ER
| ID | Tarefa | Status | Resultado |
|---|---|---|---|
| B1 | Descrição do problema + ODS | **Concluído (05/10)** | `database/docs/descricao-problema.md` |
| B2 | ER completo (27 entidades, 33 relacionamentos) | **Concluído (05/10)** | `database/docs/modelo-er.md` |
| B3 | Revisão (3FN, fonte primária) e congelamento do ER (D14) | **Concluído (05/10)** | ER congelado |
| B4 | ER no brModelo Web + conversão para o lógico | **Concluído (05/10)** | `CarteiraB3_ER` e `CarteiraB3_Logico` |
| B5 | Mapeamento ER→relacional em texto | **Concluído (05/10)** | `database/docs/mapeamento.md` |
| B6 | PDF de entrega, revisão e envio | **Concluído (enviado em 19/10)** | `BD_Parte1_CarteiraB3.pdf` / `.docx` |

## BD Parte 2 — implementação
| ID | Tarefa | Datas | Depende de | Pronto quando |
|---|---|---|---|---|
| P0 | **Concluído (24/10).** Validar as regras de IR na legislação (Receita Federal): alíquotas, isenção de R$ 20 mil (só ações), compensação de prejuízo por categoria, código de receita, DARF mínimo, guias por mês | 06/10–10/10 | — | Regras com citação da norma em `database/docs/memoria-calculo.md`; `RegraIR` e `CategoriaIR` definidas |
| G1 | **Concluído (24/10).** Glossário PT↔EN de tabelas e colunas | 06/10–08/10 | B5 | `database/docs/glossario.md` cobre as 29 tabelas e 183 colunas |
| D1 | **Concluído (24/10; conferido com `prisma migrate diff` sem diferenças).** `schema.prisma` + migrations (29 tabelas, CHECK, UNIQUE, enums) + `ddl.sql` gerado | 13/10–24/10 (validação na nuvem, G-D1) | G1; PostgreSQL + Prisma (F4 ou ambiente de nuvem) | Migrations sobem do zero; `ddl.sql` bate 1:1 com `mapeamento.md` |
| D3 | **Concluído (31/10, D50), incluindo o brModelo (conceitual e lógico, imagens em `database/docs/`).** ER e schema das decisões D43 (carteira ideal, metas) e D44 (renda fixa, cripto), com os requisitos de dados das telas do D47 (prioridade A obrigatória; B se couber): brModelo, `modelo-er.md`, `mapeamento.md`, `glossario.md`, `schema.prisma` + migration, `ddl.sql` e testes de restrição | 31/10–04/11 | D1, D43, D44 | Migrations sobem do zero; `db:drift` sem diferenças; `ddl.sql` bate com o mapeamento novo; testes das novas restrições passando |
| PF | **Concluído (12/11), PR #23.** Prova de conceito das fontes (D59): um arquivo real de cada fonte em `data/raw/fontes-poc/` (COTAHIST, Cadastro de Instrumentos, índices da B3, proventos da B3, Mercado Bitcoin, Tesouro), com URL, data, hash, contagens e mapeamento para o glossário em `database/docs/fontes-poc.md`; agente de banco | 12/11–16/11 | D3 | Contagem de tickers por tipo; campos mapeados; base do P1 e do K5 |
| BD-1 | **Concluído (12/11), PR #24.** Primeiro corte do P1 (correção da revisão, A1/B7): catálogo do S1 (setores, emissores com CNPJ e código CVM, 72 ativos das 6 classes, 10 títulos, 12 criptos, 11 corretoras), `economic_indexes`, `fixed_income_types` e as linhas de mercado da PF (IBOV, proventos); `npm run db:seed`; seed rodado 2× no job `database` (Node 24) | 12/11 | PF | Feito: `seed-check.sql` confere as 6 classes, a massa do handoff e os casos de LEFT JOIN; contagens iguais nas duas execuções |
| P1 | **Atrasado (venceu em 07/11; replanejado em 12/11). Segundo corte entregue em 13/11 (PR do P1-2, aguardando revisão).** Segundo corte de `inserts.sql`: as ~26 tabelas restantes (usuários, carteiras, operações, proventos recebidos, IR, eventos e documentos, relatórios de FII, cotações, indicadores, alertas, telas salvas, metas, carteira ideal, preços de título e de cripto), com ±10 tuplas por tabela, mais a memória de cálculo. Inclui o usuário de demonstração com a carteira "Longo prazo" da massa do handoff (D48) | 13/11–18/11 | BD-1, P0, D3; preço de cripto (decisão até 14/11, tabela abaixo) | Seed idempotente; posições nunca negativas; proventos batem com a posição na data-com; apurações batem com as operações; `seed-check.sql` ampliado; login do usuário de demonstração funciona na API |
| P2 | **Concluído (13/11, antecipado), PR #34.** `queries.sql`: 10 com junção, 3 LEFT/RIGHT JOIN, 5 com agregação + GROUP BY/HAVING/ORDER BY, cada uma com enunciado | 19/11–22/11 | P1 (ou o que entrou pelo G-P1) | 18 consultas respondendo perguntas reais do domínio; nenhuma compara o preço de compra de operação com `fixed_income_prices` (o Tesouro da carteira de demonstração tem preço ilustrativo, D62b) |
| B7 | **Concluído (13/11, antecipado), PR #34.** Atualizar a descrição do problema (`database/docs/descricao-problema.md`) com carteira ideal, metas, renda fixa e cripto (D43, D44), para o relatório | 19/11–22/11 | D3 | Texto coerente com o ER da D3 |
| P3 | Script de resultados + listagem completa de cada tabela | 23/11–24/11 | P2 | Arquivos em `database/results/` |
| P4 | Relatório final: título, integrantes, SGBD (PostgreSQL, PostgreSQL Global Development Group), texto e ER corrigidos com o retorno da Parte 1, DDL + inserts (.sql), listagens, consultas com enunciado, SQL e resultado | 25/11–30/11 | P3, B7, retorno da Parte 1 (PL2) | Enviado até 30/11 (prazo 07/12) |

**Dependências do P1 (fontes):**
| Fonte | Situação | Decisão até | Se não sair |
|---|---|---|---|
| Proventos (`income_distributions`) | Resolvida (D59, PF) | — | — |
| Ibovespa (`index_values`) | Resolvida (D59, PF) | — | — |
| Preço de cripto (`crypto_prices`) | **Resolvida (13/11/2026):** o usuário confirmou o bloqueio do Mercado Bitcoin também no navegador (F1); candles diários da API pública da Foxbit (BTC e ETH), com URL, hash e contagem na seção 6.1 do `fontes-poc.md` | — | — |
| Tabelas de domínio fechado | `economic_indexes` 5 e `fixed_income_types` 8 aceitas (D60d); `tax_categories` 4 e `tax_rules` 4 (a regra vigente de cada categoria) no P1-2, pelo mesmo critério (aceito em 13/11/2026, D62a) | — | Justificado no relatório |

## Fundação
| ID | Tarefa | Datas | Depende de | Pronto quando |
|---|---|---|---|---|
| F1 | E-mails às professoras: ODS (BD) e reuso nas duas disciplinas | **Concluído (05/10)** | — | ODS confirmado; reuso registrado (D33) |
| F2 | **Concluído.** Comando `claude` no PATH e extensão do VS Code | 25/10–26/10 (usuário) | — | `claude --version` responde; `@database` aparece na lista |
| F3 | **Concluído; proteção da `main` com os checks `database`, `backend` e `frontend` exigidos confirmada em 12/11 (o `e2e` entra no PL3).** Repositório GitHub: estrutura de `claude/estrutura-repositorio.md` (conteúdo do pacote do repositório) no commit inicial; depois `main` protegida (PR obrigatório; 0 aprovações enquanto houver uma pessoa, D38), template de PR, Conventional Commits, GitHub Projects; `gh auth login` para os comandos `/commit-push-pr` | 26/10–27/10 (usuário) | F2 | Commit inicial na `main` sem `.env`; PR de teste mesclado pela regra de proteção, com o job `database` do CI como verificação obrigatória (D40); `gh auth status` responde |
| F4 | **Concluído (26/10, validado na máquina do usuário).** `docker-compose.yml` com PostgreSQL 16 (bancos dev, test e shadow) e `.env.example` | 27/10 (usuário) | F3 | `docker compose up` sobe os bancos; `npm run db:migrate` e `npm run db:test` passam |

## Banco do sistema (fora da entrega de BD)
O que o sistema precisa no banco além das 36 tabelas do ER (29 até a D3). Não entra no `ddl.sql` nem no relatório de BD (D22).

| ID | Tarefa | Datas | Depende de | Pronto quando |
|---|---|---|---|---|
| D2 | Schema técnico `ops` com `ops.user_sessions` (refresh tokens com hash, rotação por família, revogação), via `multiSchema` do Prisma; agente database | **Concluído (26/10)** | D1, F4 | Migration nova cria só `ops`; `ddl.sql` (só `public`) não muda; `db:drift` sem diferenças; testes de restrição de `ops` passando |

O catálogo de referência do S1 vem de duas fontes (D59): o seed do BD-1 (PR #24, 12/11: setores, emissores, corretoras e 72 ativos reais das 6 classes, tirados do Cadastro de Instrumentos da B3, do Tesouro e da Foxbit) e a carga do catálogo completo pelo K5 (todos os ativos de ação, unit, FII, ETF e BDR). Os testes de integração do backend criam os próprios dados; o BK-3 confere a massa do handoff sobre o seed.

## UX/UI
| ID | Tarefa | Datas | Depende de | Pronto quando |
|---|---|---|---|---|
| U0 | **Concluído (26/10), D41.** Aprovar a lista de telas do S1 proposta em `agentes/agente-ux-ui.md` | 25/10 | — | Lista aprovada pelo usuário e registrada no projeto (`agentes/agente-ux-ui.md`, `claude/handoff-ux.md`) |
| U1 | **Concluído (30/10).** Design system: cores claro/escuro, tipografia, espaçamento, componentes base como tokens Tailwind | 26/10–29/10 | U0, B3 | Tokens no Figma (variáveis com os nomes dos tokens) e em tabela no projeto; link do arquivo Figma na seção 10 do contexto |
| U2 | **Concluído (30/10).** Fluxos e wireframes dos 11 frames do S1 (7 telas, 3 componentes e o shell, D41) | 30/10–05/11 | U1 | Fluxo cadastro → carteira → compra → venda → posição completo, mais catálogo → lançar operação e edição pelo histórico |
| U3 | **Concluído (31/10), aprovado pelo usuário.** Alta fidelidade com os estados de `claude/handoff-ux.md`, um frame por tela, componente e estado | 06/11–12/11 | U2 | Estados de cada componente especificados |
| U4 | **Concluído (31/10).** Textos de ajuda: "como foi calculado" para PM, custo, lucro, totais da carteira e resumo da operação (D42), em `claude/microcopy.md` | 13/11–14/11 | U3 | Tabela salva no projeto |
| U6 | **Concluído (30/10), D45.** Ajustes de UX no S1 (guias, filtro por tipo, agrupamento por classe, avatar) e página "Produto completo (roadmap)" no Figma (hoje faixas da página única, D46), fora do handoff do S1 | 30/10 | U3 | Frames e protótipo navegável; links no `claude/handoff-ux.md` |
| U7a | U7 parte A (`claude/verificacao-plano-figma.md`, seção 2): estados de erro e carregando que faltam, Resumo "calculando" e "prévia indisponível", variantes da RN10 e do `DerivedValueExplainer` (9 códigos da microcopy), links no `claude/handoff-ux.md` | 13/11–17/11; **concluído em 13/11** (8 frames de estado, 3 variantes novas da RN10, 6 do `DerivedValueExplainer`; origem `FORM` da prévia para o K4 PR 3) | U5 | Frames e links no handoff antes do W3 e do W4b |
| U7b | U7 parte B: telas das funções do produto completo sem frame (16 de 47 itens), uma etapa por vez na ordem da D49 | depois de 06/12 | U7a | Cada etapa com tela antes de começar |
| U5 | **Concluído (31/10).** Revisão por Nielsen e WCAG AA (plugin Design: crítica de design e revisão de acessibilidade); handoff para o frontend em `claude/handoff-ux.md` | 15/11–16/11 | U4 | Sem pendência de contraste ou de foco; `claude/handoff-ux.md` com o link do frame de cada tela |

## Backend
| ID | Tarefa | Datas | Depende de | Pronto quando |
|---|---|---|---|---|
| K0 | **Concluído (01/11), PR #10.** `PositionCalculator` com TDD: domínio puro, sem banco (RN05–RN10, eventos corporativos), em segundo plano | 28/10–06/11 | F3 | 100% de ramos nos `.spec.ts`; casos de borda passando |
| K1 | **Concluído (01/11), PRs #8 e #9 (Docker); exigir o check `backend` na proteção da `main`.** Esqueleto NestJS com Fastify (api e worker): config validada com zod no boot dos dois processos, prefixo `/api/v1`, filtro RFC 7807, helmet, CORS restrito, logs com `nestjs-pino`, `GET /api/v1/health` (terminus), `openapi.json` exportado e conferido no CI, lint de camadas, Jest (unitário em paralelo; integração e E2E com Testcontainers em série, migrations pelo Prisma da raiz), job `backend` no `ci.yml` (D40) | 28/10–03/11 | F3, F4 | Jobs `database` e `backend` verdes em todo PR e exigidos na proteção da `main` |
| K2 | **Concluído (01/11), PR #11; conferido em 09/11.** Módulos auth e users (RN01), guard JWT, rate limit | 04/11–08/11 | D1, D2, K1 | E2E de cadastro e login passando |
| K3 | **Concluído (09/11), PRs #12 (contrato da auditoria) e #13 (catálogo e carteiras, com `operationCount` e `assetCount`).** reference-data (ativos, emissores, corretoras) e portfolios (RN02); `GET /portfolios` com `operationCount` (D41); correções de contrato da auditoria de 09/11 (esquemas `bearer` e `refresh_token` no OpenAPI, 400 com `errors[].field`, `ProblemDetails` nas respostas de erro), antes do W2 | 09/11–13/11 | K2 | Carteira de outro usuário retorna 404; `operationCount` coberto por teste; `openapi.json` sem erro estrutural; 400 de cadastro e login com o campo de cada erro |
| BK-1 | **Concluído (13/11), PR #28.** Limite de login por variável (`AUTH_RATE_LIMIT_MAX`), `cancel-in-progress` só em PR e `npm audit` no job `backend` (correção da revisão, A2/B7) | 13/11–14/11 | K2 | Teste de env cobre padrão, limite e recusa em produção; nenhum E2E sobrescreve o throttler |
| K4 | **Em andamento: PR 1 mesclado em 11/11 (PR #14); PR 2 (posições e totais) mesclado em 11/11 (PR #20); falta o PR 3 (prévia), feito junto com o BK-2.** operations com recálculo transacional (RN04–RN12); posições abertas e encerradas (D41) e totais em `GET /portfolios/:id/summary` (B7); prévia da operação sem gravar (D42); filtro `assetType` no histórico (D45); OpenAPI versionado | PR 3 + BK-2: 15/11–19/11 (limite do G-K4: 25/11) | K3, K0 | E2E compra → venda → posição; venda total aparece como posição encerrada com o lucro realizado; violação da RN10 identifica a operação; prévia sem gravar com o mesmo cálculo do lançamento (D42); as 6 classes na posição e nos totais (D55); códigos da D56 em todo 400/422 |
| BK-2 | Transação do `PATCH` sem consulta fora do `tx` e isolamento entre usuários com banco real (correção da revisão, M1/M2), no PR 3 do K4 ou logo depois | 15/11–19/11 | K4 PR 2 | E2E de 40 `PATCH` simultâneos sem 500; E2E de isolamento com dois usuários falha ao tirar o `portfolioId` de cada consulta |
| BK-3 | Teste do seed e README do backend (correção da revisão, A1/M6): massa de 9 operações do handoff pela API sobre o catálogo do seed; confere também a carteira de demonstração semeada pelo P1-2 (valores esperados no aviso do agente de banco, no fim do prompt BK-3) | 20/11 | BD-1, P1-2 | Teste falha se um ativo ou corretora da massa sair do seed; README sem endpoint faltando |
| K5 | Carga do catálogo completo (D59): comando do worker no módulo `ingestion` que lê o Cadastro de Instrumentos da B3 (arquivo do dia em `data/raw/`, em Latin-1, F9) e grava, por upsert na chave natural (ISIN; ticker), os emissores e os ativos de ação, unit, FII, ETF e BDR do mercado à vista; programa do BDR pelo `SpcfctnCd`; setor pela classificação setorial da B3 quando houver (nulo aceito); sem cotações e sem desativar ativos (isso é do S2) | 21/11–26/11 | K3, PF, BD-1, K4 PR 3, BK-2 | Teste de parse com trecho real do arquivo; rodar 2× não muda nada; seed e K5 em qualquer ordem sem duplicar; contagem por tipo no PR; a busca do C1 acha um ativo que não está no seed; comando no README |
| BK-4 | Fronteira entre módulos e dívidas menores (correção da revisão, M3, M7, B2, B5, B6, B8), em PRs pequenos | depois de 06/12, antes do S2 | K4 | Lint falha num import de `infrastructure` de outro módulo; sem ciclo entre módulos |

## Frontend
| ID | Tarefa | Datas | Depende de | Pronto quando |
|---|---|---|---|---|
| W1 | **Concluído (11/11), PR #19 (D58); conferido em 12/11; check `frontend` exigido na proteção da `main`.** Esqueleto Angular, tokens em `@theme` no `styles.css` (Tailwind 4, conferidos com as variáveis do Figma), interceptors, shell (frame L) com os estados globais (sessão expirada, 404, falha de conexão), specs com Vitest (limite de 80%), `@playwright/test` configurado, job `frontend` no `ci.yml` (D40) | 11/11 | U1, F3 | Job `frontend` (lint, specs, build) verde e exigido na proteção da `main` |
| W2 | **Feito em 13/11, com o FE-2b (passo "Entrar" do README pela tela); falta o texto do 429 (UX).** Login e cadastro (frames 1 e 2), com o FE-1 no primeiro PR | 13/11–16/11 | W1, K2, U3, BK-1 (para o FE-1) | Erros do backend exibidos no campo certo; E2E do cadastro e do login no job `e2e` |
| FE-1 | **Concluído (13/11), PR #30, antes do W2; falta o PL3.** Job `e2e` no CI (API real, PostgreSQL com migrations e seed, Playwright, axe claro e escuro no shell), regra de lint contra conta com dinheiro (D5, D28) com sonda no `npm run lint`, `strictTemplates`, limite de ramos (correção da revisão, M4/M5/B6); o E2E de cadastro e login entra no PR do W2 (critério do W2) | 13/11–16/11 | W1, BK-1 | Job `e2e` verde; lint falha no arquivo de sonda |
| W3 | Lista, criação e exclusão de carteiras, com estado vazio e `ConfirmDialog` (frames 3 e C3) | 17/11–20/11 | W2, K3 | Os 4 estados de dados e a confirmação de exclusão cobertos por spec e E2E |
| W4a | Detalhe da carteira com guias Resumo e Histórico, posições agrupadas por classe com `AssetAvatar` e posições encerradas (D45), histórico com filtro por tipo, catálogo (frames 4, 6 e 7; 18 frames de estado). A ação "Lançar operação" do catálogo entra no W4b | 21/11–26/11 | W3, K3, K4 PR 2, U5 | Detalhe, Histórico e Catálogo usando a API real, com E2E |
| W4b | Formulário de operação (criar e editar) com Resumo da operação (D42), "Lançar operação" do catálogo, `DerivedValueExplainer` e `BusinessRuleError` (frames 5, C1, C2; 12 frames de estado) | 27/11–02/12 | W4a, K4 PR 3, U7a | Fluxo completo usando a API real, com E2E |
| FE-2 | "Como rodar" no README da raiz, testado num clone limpo (correção da revisão, M6/A1) | 27/11 | BD-1, BK-3, K5 ou G-K5 | Seguindo só o README, alguém cadastra, cria carteira e lança uma compra |
| R1 | E2E ponta a ponta com `@playwright/test` (`frontend/e2e/*.spec.ts`, job `e2e` no CI contra a API e um PostgreSQL de serviço; na máquina, contra `carteira_test`), verificação de acessibilidade com `@axe-core/playwright` nas telas do S1 (temas claro e escuro, sem violação séria ou crítica) e fluxo principal só com teclado (U5), README de execução e roteiro de demonstração: S1 pronto | 03/12–06/12 | W4b | E2E do S1 passando no CI; alguém de fora sobe e usa o sistema seguindo só o README |

## Gatilhos de corte
| # | Data | Condição | Ação |
|---|---|---|---|
| G-P0 | 10/10 | Alguma regra de IR sem confirmação na norma | Registrar a regra com a citação disponível e marcar como "a confirmar" na memória de cálculo; o seed de IR usa só as regras confirmadas |
| G-D1 | 20/10 (**aplicado em 24/10**) | Sem PostgreSQL local (F4 não pronto) | O agente de banco valida schema, migrations e seed num PostgreSQL no ambiente de nuvem do chat e entrega os arquivos para versionar; o P1 não atrasa |
| G-K4 | 25/11 | K4 sem o E2E compra → venda → posição passando | Primeiro corte: sai a prévia (D42) e o formulário fica sem o Resumo da operação. Se não bastar, o W4b entra só com lançamento e posição; edição e exclusão retroativa ficam no backend (RN10 testada), fora da tela |
| G-U3 | 12/11 | Alta fidelidade (U3) não pronta | O W2 começa com os wireframes do U2 e os tokens do U1, com os links dos frames de wireframe já em `claude/handoff-ux.md`; o U3 vira ajuste visual depois |
| G-W4 | 02/12 | W4b não pronto | Saem do frontend o filtro do histórico, o "como foi calculado" do lucro e a ação "Lançar operação" do catálogo (o catálogo fica só como consulta); o R1 começa em 03/12 de qualquer forma |
| G-K5 | 26/11 | K5 sem os testes de parse e de idempotência passando | O catálogo do S1 fica com os ~50 ativos reais do seed; o K5 volta para o S2. Nada do W4 ou do R1 é cortado por causa do K5 |
| G-D3 | 04/11 | D3 não concluída | Primeiro saem as linhas B do D47 (o rótulo correspondente sai da tela). Se não bastar, renda fixa e cripto (D44) saem do ER da Parte 2 e ficam registradas só como escopo do produto; carteira ideal e metas (D43) continuam. O P1 não passa de 07/11 por causa da D3 |
| G-P1 | 18/11 | Segundo corte do P1 incompleto | O seed fica com as tabelas prontas e o P2 começa em 19/11 mesmo assim, só com consultas sobre tabelas semeadas; as que faltarem vão ao relatório como pendência justificada. O P4 não passa de 30/11 por causa do P1 |
| G-P4 | 30/11 | Sempre | O relatório de BD tem prioridade sobre qualquer outra frente |
| G-UX | Sempre | Uma tarefa de BD passou da data de término | O UX/UI pausa até a tarefa de BD voltar ao prazo |

## Planejamento (pendente)
- ~~Aprovar a entrega do semestre de ES.~~ Aprovada em 31/10/2026 (D49): S1 até 06/12; depois S2 → S6 → S9 → S10 → S3 → S4 → S5 → S7 → S8 → S11.

| ID | Pendência | Até | Dono |
|---|---|---|---|
| PL1 | Pedir à professora de ES o calendário de entregas incrementais e encaixar K2, K4 e R1 como marcos | 19/11 | usuário |
| PL2 | Pedir à professora de BD o retorno da Parte 1; se não chegar até 26/11, o P4 segue com o ER atual e uma nota no relatório | pedir até 19/11 | usuário |
| PL3 | Exigir o check `e2e` na proteção da `main` | quando o job do FE-1 ficar verde | usuário |
| PL4 | Responder às decisões B1, B3, B4, B9 e M8 de `claude/prompts-correcao-s1.md` | antes de 06/12 | usuário |

## Riscos
- **Quatro frentes em paralelo.** De 28/10 a meados de novembro correm BD, UX/UI e backend; de 11/11 em diante entra o frontend: o dobro do limite do D15. Prioridade: BD, backend, frontend, UX/UI; os gatilhos G-UX, G-U3, G-K4 e G-W4 cortam escopo em vez de mover datas.
- **Duas semanas perdidas em outubro.** O replanejamento de 24/10 absorveu o atraso comprimindo UX/UI (U1–U5 em três semanas) e sobrepondo backend e UX.
- **Folga final zero.** O R1 termina em 06/12. O BD tem 7 dias de reserva (envio em 30/11, prazo 07/12).
- **Fundação depende do usuário.** F2–F4 em 25–27/10; atraso no F3 atrasa K0, K1 e W1; o banco não depende mais do Docker (G-D1 aplicado).
- **Revisão sem segunda pessoa.** O `/review-pr` substitui o revisor humano (D38); ele não roda o sistema, então "rodar localmente o que o PR afirma" continua sendo tarefa do usuário antes do merge.
- **Seed com tabelas de poucos registros reais.** No BD-1, `economic_indexes` tem 5 linhas (os 5 valores do enum `index_code`) e `fixed_income_types` tem 8 (os 8 tipos do CSV do Tesouro), abaixo das ±10 tuplas do enunciado; o relatório justifica as duas pelo domínio fechado. **Aceito pelo usuário em 12/11/2026 (D60d).** `tax_categories` (4) e `tax_rules` (4, a regra vigente de cada categoria) seguem o mesmo critério (**D62a, aceito em 13/11/2026**).
- Mudança no ER depois do congelamento atrasa schema, seed e telas (D14). Ajustes do retorno da Parte 1 entram como decisão registrada e são aplicados antes do P1 se chegarem a tempo.
- Seed de IR sem regra validada gera apurações inconsistentes: por isso o P0 vem antes do P1.
- Volume do seed: 36 tabelas × 10 tuplas (29 do ER inicial + 7 da D3) coerentes entre si; por isso o P1 tem a janela mais longa de BD.
