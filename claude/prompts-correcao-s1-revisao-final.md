# Prompts de correção — revisão final do S1 (23/11/2026)

> Gerado a partir de `claude/revisao-s1-final.md` (`main` em `e8e001c`). Cada bloco é um prompt pronto para colar no agente indicado. Há um prompt por agente e por PR. Todo achado aberto aparece em exatamente um prompt ou na lista "Decisão do usuário". Os achados da auditoria paralela (A-1 a A-7) estão em `claude/prompts-correcao-s1-auditoria-final.md` e não se repetem aqui. Prazos: o plano (`claude/plano-de-acao.md`) não tem mais tarefa de código antes de 06/12; o P4 tem prioridade até 30/11 (G-P4). Por isso as correções ocupam a janela original do R1 (03–06/12), com limite em 04/12 para sobrar folga até a entrega de 06/12.

> **Mesmo PR que a auditoria:** BK-5 e BD-2 têm o mesmo ID, agente e prazo em `claude/prompts-correcao-s1-auditoria-final.md`. Cada agente faz **um PR por ID**, juntando os dois prompts: BD-2 = A-1 (seed depois do K5) + N7 (actions do job `database`); BK-5 = A-1 (teste do seed depois da carga) + N6 e N7 (imagem dos testes e actions do job `backend`). No frontend, R1-b (auditoria) e FE-3 (abaixo) continuam PRs separados.

## Cobertura dos achados
| Achado | Onde é tratado |
|---|---|
| N1 (E2E local sem `carteira_test`) | FE-3 |
| N2 (falha inesperada da Lista não reportada) | FE-3 |
| N3 ("−0,00" no explicador) | FE-3 |
| N4 (data de hoje sem spec) | FE-3 |
| N5 (textos desatualizados) | FE-3 |
| N6 (imagem do Testcontainers sem versão fixa) | BK-5 |
| N7 (actions em Node 20) | FE-3 (jobs `frontend` e `e2e`), BK-5 (job `backend`), BD-2 (job `database`) |
| N8 (PR com checklist em branco) | FE-3 (regra e descrições); conferência no GitHub: usuário |
| M3, M7, B2, B5, B6 (backend), B8 | BK-4 (atualizado abaixo; depois de 06/12) |
| B1, B3, B4, B9, M8 (tags) | Decisão do usuário (PL4) |

## Regras permanentes para os perfis
Cada agente acrescenta o seu bloco ao próprio perfil (`agentes/<agente>.md` e o espelho em `.claude/agents/`) no prompt abaixo, com o título "Regras da revisão final do S1 (23/11/2026)".

**Frontend**
- Toda falha de carregamento passa pela mesma regra: falha esperada (`expectedFailure`) só aparece na tela; qualquer outra também vai ao `ErrorHandler`. Um bloco `error: () => …` que ignora o erro não passa na revisão.
- Valor com sinal (ganho, perda, parcela de soma) tem o sinal decidido depois do arredondamento, nunca pela string crua.
- Cada validador de limite (data, casas decimais, mínimo) tem spec com o valor exato da fronteira dos dois lados.
- Comando de teste documentado diz contra qual banco roda; o E2E na máquina só roda contra `carteira_test` (D40).
- PR só é mesclado com a descrição preenchida e o checklist da definição de pronto marcado; item que não se aplica leva o motivo.

**Backend**
- A imagem do PostgreSQL dos testes com banco (Testcontainers) é a mesma fixada por digest no CI e no `docker-compose.yml`; quem atualiza uma atualiza todas.

**Banco de dados**
- Mudança de versão de action ou de imagem no job `database` acompanha a dos outros jobs no mesmo dia (avisar no PR).

---

## FE-3 — Correções da revisão final no frontend (N1, N2, N3, N4, N5, N7, N8)
```
Agente: frontend. Tarefa FE-3 (correção da revisão final do S1 de 23/11/2026), um PR, na janela original do R1.
Leia claude/revisao-s1-final.md, achados N1, N2, N3, N4, N5, N7 e N8, e a seção "Regras permanentes" de claude/prompts-correcao-s1-revisao-final.md; acrescente o bloco "Frontend" ao seu perfil (agentes/agente-frontend.md e .claude/agents/frontend.md).
Problema:
- N1: frontend/README.md:14 manda rodar npm run e2e com a API de AUTH_RATE_LIMIT_MAX alto, mas não diz qual banco; a API do passo 3 do README da raiz lê o .env (DATABASE_URL → carteira_dev, docker-compose.yml:53). A D40 (claude/arquitetura.md:338) exige carteira_test (DATABASE_URL_TEST, .env.example:9).
- N2: features/portfolios/portfolios-page.ts:339 ignora o erro do carregamento (error: () => {}); as outras 3 páginas mandam ao ErrorHandler a falha que não é esperada (expectedFailure, commit c627a8b).
- N3: shared/derived-value/explanation.ts:77 e :83 decidem o sinal pela string crua: '-0.004' vira "−0,00" no explicador e "R$ 0,00" no cartão (pt-br.spec.ts:31).
- N4: o mutante value > today → value >= today em features/operations/operation-fields.ts:89 passa nas 263 specs (operation-fields.spec.ts:72-74 não testa hoje).
- N5: frontend/README.md:11-12 e .github/workflows/ci.yml:210 e :213 não citam a sonda de dinheiro (check-money-lint) nem o limite de 80% de ramos.
- N7: actions/checkout@v4, actions/setup-node@v4 e actions/upload-artifact@v4 rodam em Node 20, já depreciado (anotações do run 45256177592).
- N8: os PRs #56 (template em branco) e #49 ([ ] /review-pr) foram mesclados com o checklist da definição de pronto vazio.
Faça:
1. N1: seção "E2E na máquina" no frontend/README.md: (a) com o PostgreSQL do compose de pé, rodar na raiz DATABASE_URL=<valor de DATABASE_URL_TEST> npm run db:migrate e npm run db:seed; (b) subir a API fora do Docker com DATABASE_URL apontando para carteira_test e AUTH_RATE_LIMIT_MAX=10000 (npm run start:dev em backend/), parando antes a api do compose (porta 3000); (c) npm run e2e; (d) para o 429, a API com AUTH_RATE_LIMIT_MAX=5 e npm run e2e:rate-limit. Siga os passos numa máquina com o stack do README e cole na descrição do PR a saída do psql mostrando que os usuários do E2E foram para carteira_test e que carteira_dev não mudou (count de users antes e depois).
2. N2: na Lista, a mesma regra das outras páginas (if (!expectedFailure(error)) this.errors.handleError(error)), com spec. Extraia um helper do carregamento só se ele deixar as 4 páginas menores; não é obrigatório.
3. N3: sinal decidido depois do arredondamento em signedAmount e sum (formatToParts com signDisplay 'exceptZero', como formatSignedMoney), com spec para '-0.004' (sem sinal) e '-12.4' (com "−").
4. N4: spec com relógio controlado (vi.setSystemTime): a data de hoje em America/Sao_Paulo é aceita e a de amanhã recusa com FUTURE_DATE; incluir um horário em que UTC já virou o dia e São Paulo não.
5. N5: atualizar as duas linhas do frontend/README.md e os nomes dos passos de lint e de specs dos jobs frontend em ci.yml.
6. N7: nos jobs frontend e e2e do ci.yml, subir checkout, setup-node e upload-artifact para versões que rodem em Node 24; o job backend é do BK-5 e o database do BD-2 (avise os dois no PR).
7. N8: complete no GitHub a descrição dos PRs #56 e #49 (tarefa, o que muda, como testar, checklist marcado); rode o /review-pr sobre o diff do #56 (commit 3ddab83) e registre o resultado no PR desta tarefa.
Pronto quando: as specs novas de N2, N3 e N4 falham com o código atual e passam com a correção (cole a saída das duas execuções); o mutante F2 é morto pela spec; npm run lint, npm run test:cov e npm run build verdes; jobs frontend e e2e verdes sem a anotação "Node.js 20 is deprecated"; o passo do README conferido como no item 1.
Não faça: mexer em backend/ ou em database/ (pedido ao dono); mudar a regra de lint de dinheiro; mock de API no E2E; rodar o E2E contra carteira_dev.
Prazo: 04/12/2026 (janela original do R1, 03–06/12; o P4 tem prioridade até 30/11). Esforço estimado: 3,5–4,5 h.
```

## BK-5 — Imagem do PostgreSQL dos testes e actions do job `backend` (N6, N7)
```
Agente: backend. Tarefa BK-5 (correção da revisão final do S1 de 23/11/2026), PR pequeno.
Leia claude/revisao-s1-final.md, achados N6 e N7, e a seção "Regras permanentes" de claude/prompts-correcao-s1-revisao-final.md; acrescente o bloco "Backend" ao seu perfil (agentes/agente-backend.md e .claude/agents/backend.md).
Problema:
- N6: backend/test/global-setup.ts:33 sobe new PostgreSqlContainer('postgres:16'), sem versão fixa; o CI e o docker-compose.yml usam postgres:16.15@sha256:f9a7b9eb… porque a 16.16 mudou o ddl.sql (comentário em .github/workflows/ci.yml:21-23, que fala em "os três" e esquece este quarto lugar).
- N7: actions/checkout@v4 e actions/setup-node@v4 do job backend rodam em Node 20, já depreciado (anotação do run 45256177592).
Faça:
1. Use no global setup a mesma imagem fixada por digest; atualize o comentário de ci.yml:21-23 e :226 para listar os quatro lugares (job database, job e2e, docker-compose.yml, backend/test/global-setup.ts).
2. Suba, só no job backend, checkout e setup-node para versões que rodem em Node 24; os jobs frontend/e2e são do FE-3 e o database do BD-2.
Pronto quando: npm run test:e2e verde com a imagem fixada (log do Testcontainers mostra postgres:16.15); grep "postgres:16'" em backend/test sem resultado; job backend verde sem a anotação de Node 20.
Não faça: mudar testes, migrations ou o schema; mexer nos outros jobs.
Prazo: 04/12/2026. Esforço estimado: 0,5 h.
```

## BD-2 — Actions do job `database` (N7)
```
Agente: banco de dados. Tarefa BD-2 (correção da revisão final do S1 de 23/11/2026), PR de uma linha, depois do P4 (G-P4).
Leia claude/revisao-s1-final.md, achado N7, e a seção "Regras permanentes" de claude/prompts-correcao-s1-revisao-final.md; acrescente o bloco "Banco de dados" ao seu perfil (agentes/agente-banco-de-dados.md e .claude/agents/database.md).
Problema: actions/checkout@v4 e actions/setup-node@v4 do job database (.github/workflows/ci.yml:39-44) rodam em Node 20, já depreciado (anotação do run 45256177592).
Faça: suba as duas para versões que rodem em Node 24, as mesmas escolhidas pelo FE-3 e pelo BK-5.
Pronto quando: job database verde sem a anotação "Node.js 20 is deprecated"; seed 2× e db:results sem diferença como hoje.
Não faça: mudar passos, imagem ou scripts do job.
Prazo: 04/12/2026 (depois do envio do P4 em 30/11). Esforço estimado: 0,1 h.
```

## BK-4 — Fronteira entre módulos e dívidas menores (M3, M7, B2, B5, B6, B8), atualizado
O prompt BK-4 de `claude/prompts-correcao-s1.md` continua valendo. Mudam a evidência do M3 e a ordem dos PRs:
```
Agente: backend. Tarefa BK-4, depois de 06/12 e antes do S2: correção das revisões de 12/11/2026 e 23/11/2026.
Leia claude/revisao-es.md (M3, M7, B2, B5, B6, B8) e claude/revisao-s1-final.md (tabela "o que foi resolvido": M3 piorou).
Problema novo no M3: o K5 acrescentou mais um import de operations/domain/asset-type em reference-data (reference-data/domain/catalog-entry.ts:1). Hoje são 4 arquivos de reference-data: catalog.ts:6, catalog-entry.ts:1, reference-data.dto.ts:11-12, prisma-asset-catalog.ts:4 (graphify explain "AssetType"). E o módulo ingestion depende de reference-data/domain.
Faça: os 5 passos do prompt BK-4 original, com o M3 primeiro. Mova AssetType para reference-data/domain ou shared/domain, atualizando também ingestion e operations.
Pronto quando: o do prompt original; também graphify explain "AssetType" sem import de reference-data para operations; jest.config.ts com limite global de ramos em 80 (medido em 23/11: 86,6%).
Não faça: o do prompt original.
Prazo: antes do início do S2. Esforço estimado: 8–10 h.
```

---

## Decisão do usuário (PL4, antes de 06/12)
| Achado | O que decidir | Proposta |
|---|---|---|
| B1 | Quantidade da posição, `assetCount` e `operationCount` saem sem `DerivedValue`, contra a letra do D26 | Registrar no contexto a exceção para contagens e quantidade |
| B3 | `claude/arquitetura.md:163` diz que o 201 do lançamento devolve a posição recalculada; a API devolve a operação, e a posição vem da prévia (D42) | Corrigir o diagrama |
| B4 | Leituras SQL que juntam tabela de outro módulo, sem exceção escrita na 7.2 | Registrar a exceção para query service de leitura |
| B9 | `environment.ts` único com `localhost:3000` | Manter até existir alvo de deploy; registrar como pendência |
| M8 (tags) | Nenhuma tag nem release (`git tag` vazio) | Criar as tags dos marcos já entregues (K2, K4, W4b, R1) antes da apresentação de 09/12; também no A-7 da auditoria |

## A verificar pelo usuário
1. **Docker na máquina:** o daemon caiu durante a revisão. Com ele de pé, rodar `npm run test:e2e` em `backend/` no worktree ou na `main` (o CI está verde no `e8e001c`).
2. **PR #56:** se o `/review-pr` rodou e só não foi registrado (N8); o FE-3 completa a descrição.
3. **Equipe:** papel de cada conta no histórico (A-6 da auditoria).

## Ordem de execução
| Ordem | Prompt | Agente | Depende de | Janela |
|---|---|---|---|---|
| 1 | Decisões do PL4 | usuário | — | até 06/12 |
| 1 | FE-3 | frontend | — | 03/12–04/12 (pode antes, se o frontend estiver livre) |
| 1 | BK-5 | backend | — | 03/12–04/12 |
| 2 | BD-2 | banco de dados | P4 enviado (30/11) | 01/12–04/12 |
| 3 | BK-4 | backend | entrega do S1 (06/12) | depois de 06/12, antes do S2 |

Esforço antes de 06/12: 4,1 a 5,1 horas de agentes, mais as decisões do usuário.
