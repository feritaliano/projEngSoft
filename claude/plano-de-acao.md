# Plano de ação — Carteira B3 (replanejado em 24/10/2026; ajustado em 26/10/2026)

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

**Frentes ativas:** todas.
- 25–27/10: fundação (usuário).
- 28/10 a meados de novembro: BD (P1–P2), UX/UI (U1–U5) e backend (K0–K3).
- A partir de 10/11: frontend (W1–R1); backend termina em 25/11; BD envia a Parte 2 até 30/11.

**Prazos fixos:** BD Parte 1 em **19/10/2026** · BD Parte 2 em **07/12/2026** (Google Classroom).
**Alvos:** BD Parte 1 enviada em 19/10 (feito) · handoff de UX em 16/11 · BD Parte 2 enviada até 30/11 · S1 (núcleo da carteira) pronto em 06/12.

**Escopo de Engenharia de Software nestas datas:** só o **S1** (A1–A2, B1–B7, B13, C1), aprovado em 31/10/2026 (D49). Depois de 06/12: S2 → S6 → S9 → S10 → S3 → S4 → S5 → S7 → S8 → S11.

**Prompts dos agentes:** os quatro em `agentes/` foram reescritos em 05/10/2026 e trazem as tarefas e datas da própria frente; mudança neste plano atualiza também o prompt da frente afetada.

**Checklist interativo:** artifact "Plano de Ação Carteira B3" (https://claude.ai/artifact/MEKLYSKz6kRe1ff3nvop6U), atualizado em 26/10/2026 com este plano. O progresso (tarefas marcadas) vive no artifact; datas, dependências e critérios de pronto vivem neste documento. Toda mudança neste plano atualiza o artifact na mesma tarefa.

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
| P1 | `inserts.sql` (≥ 10 tuplas por tabela, ≥ 290 no total, mais as tabelas da D3) + memória de cálculo | 25/10–07/11 | D1, P0, D3 (para as tabelas novas) (K0 opcional, para conferir posições) | Seed idempotente; posições nunca negativas; proventos batem com a posição na data-com; apurações batem com as operações |
| P2 | `queries.sql`: 10 com junção, 3 LEFT/RIGHT JOIN, 5 com agregação + GROUP BY/HAVING/ORDER BY, cada uma com enunciado | 08/11–14/11 | P1 | 18 consultas respondendo perguntas reais do domínio |
| P3 | Script de resultados + listagem completa de cada tabela | 15/11–17/11 | P2 | Arquivos em `database/results/` |
| P4 | Relatório final: título, integrantes, SGBD (PostgreSQL, PostgreSQL Global Development Group), texto e ER corrigidos com o retorno da Parte 1, DDL + inserts (.sql), listagens, consultas com enunciado, SQL e resultado | 18/11–28/11 | P3, retorno da Parte 1 | Enviado até 30/11 (prazo 07/12) |

## Fundação
| ID | Tarefa | Datas | Depende de | Pronto quando |
|---|---|---|---|---|
| F1 | E-mails às professoras: ODS (BD) e reuso nas duas disciplinas | **Concluído (05/10)** | — | ODS confirmado; reuso registrado (D33) |
| F2 | Comando `claude` no PATH e extensão do VS Code | 25/10–26/10 (usuário) | — | `claude --version` responde; `@database` aparece na lista |
| F3 | Repositório GitHub: estrutura de `claude/estrutura-repositorio.md` (conteúdo do pacote do repositório) no commit inicial; depois `main` protegida (PR obrigatório; 0 aprovações enquanto houver uma pessoa, D38), template de PR, Conventional Commits, GitHub Projects; `gh auth login` para os comandos `/commit-push-pr` | 26/10–27/10 (usuário) | F2 | Commit inicial na `main` sem `.env`; PR de teste mesclado pela regra de proteção, com o job `database` do CI como verificação obrigatória (D40); `gh auth status` responde |
| F4 | **Concluído (26/10, validado na máquina do usuário).** `docker-compose.yml` com PostgreSQL 16 (bancos dev, test e shadow) e `.env.example` | 27/10 (usuário) | F3 | `docker compose up` sobe os bancos; `npm run db:migrate` e `npm run db:test` passam |

## Banco do sistema (fora da entrega de BD)
O que o sistema precisa no banco além das 36 tabelas do ER (29 até a D3). Não entra no `ddl.sql` nem no relatório de BD (D22).

| ID | Tarefa | Datas | Depende de | Pronto quando |
|---|---|---|---|---|
| D2 | Schema técnico `ops` com `ops.user_sessions` (refresh tokens com hash, rotação por família, revogação), via `multiSchema` do Prisma; agente database | **Concluído (26/10)** | D1, F4 | Migration nova cria só `ops`; `ddl.sql` (só `public`) não muda; `db:drift` sem diferenças; testes de restrição de `ops` passando |

O catálogo de referência do S1 (setores, emissores, ativos, corretoras) vem do seed do P1 (termina em 07/11, antes do K3); os testes de integração do backend criam os próprios dados.

## UX/UI
| ID | Tarefa | Datas | Depende de | Pronto quando |
|---|---|---|---|---|
| U0 | **Concluído (26/10), D41.** Aprovar a lista de telas do S1 proposta em `agentes/agente-ux-ui.md` | 25/10 | — | Lista aprovada pelo usuário e registrada no projeto (`agentes/agente-ux-ui.md`, `claude/handoff-ux.md`) |
| U1 | **Concluído (30/10).** Design system: cores claro/escuro, tipografia, espaçamento, componentes base como tokens Tailwind | 26/10–29/10 | U0, B3 | Tokens no Figma (variáveis com os nomes dos tokens) e em tabela no projeto; link do arquivo Figma na seção 10 do contexto |
| U2 | **Concluído (30/10).** Fluxos e wireframes dos 11 frames do S1 (7 telas, 3 componentes e o shell, D41) | 30/10–05/11 | U1 | Fluxo cadastro → carteira → compra → venda → posição completo, mais catálogo → lançar operação e edição pelo histórico |
| U3 | **Concluído (31/10), aprovado pelo usuário.** Alta fidelidade com os estados de `claude/handoff-ux.md`, um frame por tela, componente e estado | 06/11–12/11 | U2 | Estados de cada componente especificados |
| U4 | **Concluído (31/10).** Textos de ajuda: "como foi calculado" para PM, custo, lucro, totais da carteira e resumo da operação (D42), em `claude/microcopy.md` | 13/11–14/11 | U3 | Tabela salva no projeto |
| U6 | **Concluído (30/10), D45.** Ajustes de UX no S1 (guias, filtro por tipo, agrupamento por classe, avatar) e página "Produto completo (roadmap)" no Figma (hoje faixas da página única, D46), fora do handoff do S1 | 30/10 | U3 | Frames e protótipo navegável; links no `claude/handoff-ux.md` |
| U5 | **Concluído (31/10).** Revisão por Nielsen e WCAG AA (plugin Design: crítica de design e revisão de acessibilidade); handoff para o frontend em `claude/handoff-ux.md` | 15/11–16/11 | U4 | Sem pendência de contraste ou de foco; `claude/handoff-ux.md` com o link do frame de cada tela |

## Backend
| ID | Tarefa | Datas | Depende de | Pronto quando |
|---|---|---|---|---|
| K0 | `PositionCalculator` com TDD: domínio puro, sem banco (RN05–RN10, eventos corporativos), em segundo plano | 28/10–06/11 | F3 | 100% de ramos nos `.spec.ts`; casos de borda passando |
| K1 | **Implementado (01/11), D52; jobs `database` e `backend` verdes no PR #8; falta o merge e exigir o check `backend` na proteção da `main`.** Esqueleto NestJS com Fastify (api e worker): config validada com zod no boot dos dois processos, prefixo `/api/v1`, filtro RFC 7807, helmet, CORS restrito, logs com `nestjs-pino`, `GET /api/v1/health` (terminus), `openapi.json` exportado e conferido no CI, lint de camadas, Jest (unitário em paralelo; integração e E2E com Testcontainers em série, migrations pelo Prisma da raiz), job `backend` no `ci.yml` (D40) | 28/10–03/11 | F3, F4 | Jobs `database` e `backend` verdes em todo PR e exigidos na proteção da `main` |
| K2 | Módulos auth e users (RN01), guard JWT, rate limit | 04/11–08/11 | D1, D2, K1 | E2E de cadastro e login passando |
| K3 | reference-data (ativos, emissores, corretoras) e portfolios (RN02); `GET /portfolios` com `operationCount` (D41) | 09/11–13/11 | K2 | Carteira de outro usuário retorna 404; `operationCount` coberto por teste |
| K4 | operations com recálculo transacional (RN04–RN12); posições abertas e encerradas (D41); prévia da operação sem gravar (D42); filtro `assetType` no histórico (D45); OpenAPI versionado | 16/11–25/11 | K3, K0 | E2E compra → venda → posição; venda total aparece como posição encerrada com o lucro realizado; violação da RN10 identifica a operação |

## Frontend
| ID | Tarefa | Datas | Depende de | Pronto quando |
|---|---|---|---|---|
| W1 | Esqueleto Angular, tokens no `tailwind.config` (conferidos com as variáveis do Figma), interceptors, shell (frame L) com os estados globais (sessão expirada, 404, falha de conexão), specs com Vitest (limite de 80%), `@playwright/test` configurado, job `frontend` no `ci.yml` (D40) | 10/11–13/11 | U1, F3 | Job `frontend` (lint, specs, build) verde e exigido na proteção da `main` |
| W2 | Login e cadastro (frames 1 e 2) | 14/11–18/11 | W1, K2, U3 | Erros do backend exibidos no campo certo |
| W3 | Lista, criação e exclusão de carteiras, com estado vazio e `ConfirmDialog` (frames 3 e C3) | 19/11–23/11 | W2, K3 | Os 4 estados de dados e a confirmação de exclusão cobertos por spec |
| W4 | Detalhe da carteira com guias Resumo e Histórico, posições agrupadas por classe com `AssetAvatar` e posições encerradas (D45), formulário de operação (criar e editar) com Resumo da operação (D42), histórico com filtro por tipo, catálogo com "Lançar operação", `DerivedValueExplainer` e `BusinessRuleError` (frames 4–7, C1–C3) | 26/11–02/12 | W3, K4, U5 | Fluxo completo usando a API real |
| R1 | E2E ponta a ponta com `@playwright/test` (`frontend/e2e/*.spec.ts`, job `e2e` no CI contra a API e um PostgreSQL de serviço; na máquina, contra `carteira_test`), verificação de acessibilidade com `@axe-core/playwright` nas telas do S1 (temas claro e escuro, sem violação séria ou crítica) e fluxo principal só com teclado (U5), README de execução e roteiro de demonstração: S1 pronto | 03/12–06/12 | W4 | E2E do S1 passando no CI; alguém de fora sobe e usa o sistema seguindo só o README |

## Gatilhos de corte
| # | Data | Condição | Ação |
|---|---|---|---|
| G-P0 | 10/10 | Alguma regra de IR sem confirmação na norma | Registrar a regra com a citação disponível e marcar como "a confirmar" na memória de cálculo; o seed de IR usa só as regras confirmadas |
| G-D1 | 20/10 (**aplicado em 24/10**) | Sem PostgreSQL local (F4 não pronto) | O agente de banco valida schema, migrations e seed num PostgreSQL no ambiente de nuvem do chat e entrega os arquivos para versionar; o P1 não atrasa |
| G-K4 | 25/11 | K4 sem o E2E compra → venda → posição passando | Primeiro corte: sai a prévia (D42) e o formulário fica sem o Resumo da operação. Se não bastar, o W4 entra só com lançamento e posição; edição e exclusão retroativa ficam no backend (RN10 testada), fora da tela |
| G-U3 | 12/11 | Alta fidelidade (U3) não pronta | O W2 começa com os wireframes do U2 e os tokens do U1, com os links dos frames de wireframe já em `claude/handoff-ux.md`; o U3 vira ajuste visual depois |
| G-W4 | 02/12 | W4 não pronto | Saem do frontend o filtro do histórico, o "como foi calculado" do lucro e a ação "Lançar operação" do catálogo (o catálogo fica só como consulta); o R1 começa em 03/12 de qualquer forma |
| G-D3 | 04/11 | D3 não concluída | Primeiro saem as linhas B do D47 (o rótulo correspondente sai da tela). Se não bastar, renda fixa e cripto (D44) saem do ER da Parte 2 e ficam registradas só como escopo do produto; carteira ideal e metas (D43) continuam. O P1 não passa de 07/11 por causa da D3 |
| G-P4 | 30/11 | Sempre | O relatório de BD tem prioridade sobre qualquer outra frente |
| G-UX | Sempre | Uma tarefa de BD passou da data de término | O UX/UI pausa até a tarefa de BD voltar ao prazo |

## Planejamento (pendente)
- ~~Aprovar a entrega do semestre de ES.~~ Aprovada em 31/10/2026 (D49): S1 até 06/12; depois S2 → S6 → S9 → S10 → S3 → S4 → S5 → S7 → S8 → S11.
- Obter o calendário de entregas incrementais de ES e encaixar K2, K4 e R1 como marcos.

## Riscos
- **Quatro frentes em paralelo.** De 28/10 a meados de novembro correm BD, UX/UI e backend; de 10/11 em diante entra o frontend: o dobro do limite do D15. Prioridade: BD, backend, frontend, UX/UI; os gatilhos G-UX, G-U3, G-K4 e G-W4 cortam escopo em vez de mover datas.
- **Duas semanas perdidas em outubro.** O replanejamento de 24/10 absorveu o atraso comprimindo UX/UI (U1–U5 em três semanas) e sobrepondo backend e UX.
- **Folga final zero.** O R1 termina em 06/12.
- **Fundação depende do usuário.** F2–F4 em 25–27/10; atraso no F3 atrasa K0, K1 e W1; o banco não depende mais do Docker (G-D1 aplicado).
- **Revisão sem segunda pessoa.** O `/review-pr` substitui o revisor humano (D38); ele não roda o sistema, então "rodar localmente o que o PR afirma" continua sendo tarefa do usuário antes do merge.
- **Seed com tabelas de poucos registros reais.** `tax_categories` e `economic_indexes` têm 4 registros reais cada, abaixo das ±10 tuplas do enunciado; decisão do usuário pendente antes do fim do P1.
- Mudança no ER depois do congelamento atrasa schema, seed e telas (D14). Ajustes do retorno da Parte 1 entram como decisão registrada e são aplicados antes do P1 se chegarem a tempo.
- Seed de IR sem regra validada gera apurações inconsistentes: por isso o P0 vem antes do P1.
- Volume do seed: 36 tabelas × 10 tuplas (29 do ER inicial + 7 da D3) coerentes entre si; por isso o P1 tem a janela mais longa de BD.
