# Checklist de pendências — revisão do S1 (12/11/2026)

> Atualizado em 12/11/2026, 21h40: D59 aprovada (fontes de dados; `claude/fontes-de-dados.md`). O item das fontes do seed foi resolvido e entraram a prova de conceito das fontes (PF) e a carga do catálogo completo (K5). Contexto, plano, arquitetura, prompts de banco e de backend e o checklist interativo já foram atualizados.
> Junta o que saiu de `claude/rastreabilidade-s1.md`, `claude/revisao-es.md`, `claude/prompts-correcao-s1.md`, `claude/verificacao-plano-figma.md` e `claude/fontes-de-dados.md`, em ordem de execução. A `main` continua em `f2f1dd2`. Já feito: proteção da `main` com os jobs `database`, `backend` e `frontend` obrigatórios.

## 1. Hoje — destravar o resto (você, ~1 h)
- [ ] **Subir os documentos novos e alterados para o GitHub.** Estão no repositório local, sem commit:
  - novos: `claude/rastreabilidade-s1.md`, `revisao-es.md`, `prompts-correcao-s1.md`, `verificacao-plano-figma.md`, `checklist-pendencias.md`, `fontes-de-dados.md`, `agentes/agente-revisor.md`, `.claude/agents/agente-revisor.md`;
  - alterados: `claude/contexto-projeto.md`, `plano-de-acao.md`, `arquitetura.md`, `convencoes-equipe.md`, `agentes/agente-backend.md`, `agentes/agente-banco-de-dados.md`, `.claude/agents/backend.md`, `.claude/agents/database.md`.

  Falta criar a branch `docs/revisao-s1`, commitar, abrir o PR e fazer o merge. Os prompts mandam os agentes do Claude Code ler esses arquivos no repositório.
- [ ] **Substituir no projeto do claude.ai o `claude/contexto-projeto.md` pelo do repositório.** A cópia do projeto está atrasada (sem a D58 e a D59) e o arquivo passou do tamanho que o chat consegue regravar.
- [x] ~~Decidir de onde vêm os dados do seed.~~ **Resolvido pela D59 (12/11):** `crypto_prices` vem do Mercado Bitcoin, o Ibovespa da página de índices da B3, proventos do endpoint da B3 e ~50 ativos do Cadastro de Instrumentos, todos de arquivos reais da PF.

## 2. Esta semana — prioridade máxima (BD e plano)
- [ ] **Agente de banco: PF — prova de conceito das fontes (D59).** Prompt em `claude/fontes-de-dados.md`, seção 8. Prazo 16/11. É a base do seed e do K5.
- [ ] **Chat do projeto: corrigir o plano** com o prompt "Para o chat do projeto (plano)" de `claude/verificacao-plano-figma.md` (P1–P11: replanejar P1–P4, gatilho G-P1, dividir o W4, incluir as tarefas de correção). Aprovar o plano revisto antes de gravar. A PF e o K5 já entraram no plano; P6 (frase sobre o catálogo) já foi corrigido.
- [ ] **Agente de banco: BD-1** (seed mínimo do catálogo + `db:seed` + Node 24 no job `database`), usando os arquivos da PF. Prazo 19/11.
- [ ] **Agente de banco: retomar P1 completo → P2 → P3 → P4** nas datas novas do plano. Relatório de BD tem prioridade sobre tudo (G-P4).

## 3. Até 18/11 — antes do W3
- [ ] **Agente de backend: BK-1** (limite de login por variável, `cancel-in-progress` só em PR, `npm audit` no CI). Ele também acrescenta ao próprio perfil o bloco "Regras permanentes — Backend".
- [ ] **Agente de frontend: FE-1** junto com o W2 (job `e2e` no CI, lint contra conta com dinheiro, limite de ramos). Ele acrescenta ao perfil o bloco "Regras permanentes — Frontend".
- [ ] **Você: exigir o check `e2e` na proteção da `main`** assim que o job do FE-1 ficar verde.
- [ ] **Agente de UX/UI: U7 parte A** (prompt em `claude/verificacao-plano-figma.md`): estados de erro e carregando que faltam, Resumo "calculando" e "prévia indisponível", variantes da RN10 e do `DerivedValueExplainer`, links no handoff.
- [ ] **Agente de frontend: W2** (login e cadastro), que já pode começar.

## 4. Até 26/11 — fim do K4 e do K5
- [ ] **Agente de backend: K4 PR 3 (prévia) + BK-2** no mesmo PR ou em seguida (consultas fora da transação do `PATCH`, E2E de 40 edições simultâneas, E2E de isolamento com dois usuários). Até 25/11.
- [ ] **Agente de backend: K5 — catálogo completo da B3 (D59)**, depois da PF, do PR 3 e do BK-2. Prompt em `claude/fontes-de-dados.md`, seção 8. Gatilho G-K5 em 26/11: sem a carga testada, ficam os ~50 ativos do seed.
- [ ] **Agente de backend: BK-3**, depois do BD-1 (teste que carrega o seed, README do backend).
- [ ] **Agente de frontend: FE-2**, depois do BD-1 ("Como rodar" no README da raiz, testado num clone limpo).
- [ ] **Agente de frontend: W3**, e o W4 dividido conforme o plano revisto.

## 5. Decisões e conferências suas (sem prazo crítico, antes de 06/12)
- [ ] Responder às 5 decisões da lista "Decisão do usuário" de `claude/prompts-correcao-s1.md` (B1, B3, B4, B9, M8). Depois, pedir no chat do projeto o registro no contexto e na arquitetura.
- [ ] Criar tags dos marcos já entregues (ex.: `k2`, `k3`, `w1`) e uma a cada tarefa concluída.
- [ ] Conferir se as descrições dos PRs trazem o resultado do `/review-pr`.
- [ ] Confirmar o papel da Fernanda Italiano (4 merges, nenhum commit) e pedir a correção da linha "desenvolvimento em equipe" na matriz.
- [ ] Obter o calendário de entregas incrementais de ES.
- [ ] Pedir no chat do projeto a correção da linha "Produto completo no Figma" (seção 10 do contexto): 30 de 47 itens com tela.

## 6. 03–06/12 — fechamento do S1 (apresentação em 09/12)
- [ ] **Agente de frontend: R1** (E2E completo, axe, teclado, roteiro de demonstração).
- [ ] **Agente revisor: nova auditoria e revisão** do S1 antes da entrega (`Agente: revisor. Modo: revisão`), com os prompts de correção do que sobrar.
- [ ] **Você: ensaio da apresentação em 07–08/12.** Demonstração do S1 ao vivo e depois o protótipo do produto completo no Figma.

## 7. Depois do S1
- [ ] **Agente de backend: BK-4** (ciclo entre módulos, limpeza de sessões, filtro de erros único), antes do S2.
- [ ] **Agente de UX/UI: U7 parte B**, uma etapa por vez, na ordem do D49 (eventos corporativos, importação, observação e alertas, ranking, calculadoras, IR).
