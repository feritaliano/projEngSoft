# Checklist de pendências — S1 e S1+ (atualizado em 25/11/2026)

> Estado da `main` em `fb595cc` (PR #59, D63). Plano: `claude/plano-de-acao.md` (seção "S1+ (D64)"); prompts desta rodada: `claude/prompts-s1-plus-d64.md`; correções: `claude/prompts-correcao-s1-auditoria-final.md` e `claude/prompts-correcao-s1-revisao-final.md` (23/11), além das decisões ainda abertas de `claude/prompts-correcao-s1.md` (12/11). O código do S1 está completo (R1 concluído); a D64 (25/11) acrescenta o S1+ antes de 06/12: valor de mercado, alocação, evolução, rentabilidade e página do ativo com cotação.

## 1. Já feito
- [x] ~~Documentos da revisão (#21), hotfix do CI (#22), replanejamento (#25), D62 (#31)~~.
- [x] ~~BD: PF (#23), BD-1 (#24), P1-2 (#26), D61 (#27), P2 + B7 (#34), P3 (#41)~~.
- [x] ~~Backend: BK-1 (#28), BK-2 (#32), K4 PR 3 (#37), BK-3 (#43), K5 (#45); backend do S1 completo~~.
- [x] ~~Frontend: W1 (#19), FE-1 (#30), FE-2a (#33), W2 (#38), aviso do 429 (#39), W3 (#40), W4a (#44), W4b + FE-2b (#48), R1 (#49–#56: jornada, axe, teclado, clone limpo, roteiro)~~.
- [x] ~~UX: U7 parte A (#35, #36)~~.
- [x] ~~Você: check `e2e` exigido na proteção da `main` (PL3, 18/11)~~.
- [x] ~~Agente revisor: auditoria e revisão final do S1 (#57): 0 crítico, 0 alto, 3 médios, 16 baixos~~.
- [x] ~~Backend e frontend: D63, ordem das classes no Detalhe pelo patrimônio (#58, #59)~~.

## 2. Caminho crítico do S1+ (D64; prioridade do backend até 30/11 e do banco até 27/11)
- [ ] **Você: DOC** (25/11): mesclar o PR da D64.
- [ ] **Agentes de banco e de backend: BD-2 + BK-5** (25–26/11), um PR: seed depois do K5 (A-1), teste trocado, imagem fixa (N6), actions (N7).
- [ ] **Agente de banco: BD-3** (25–26/11): domínio de `share_class` para as 62 ações rejeitadas pelo K5 e `ops.ingestion_runs`.
- [ ] **Agente de banco: BD-4** (26–27/11): histórico de cotações e de CDI, IPCA e IBOV no seed.
- [ ] **Agente de backend: K6** (25–27/11): ingestão diária no worker (COTAHIST, BCB, IBOV) e K5 com as 62 ações.
- [ ] **Agente de backend: contrato da API** do K7 e do K8, **mesclado até 26/11**. Se não sair, você é avisado no mesmo dia.
- [ ] **Agente de backend: K7** (B8, B9, B10, B11) e **K8** (C2, C3), 26–30/11. **K7 mesclado até 30/11**; senão, aviso no mesmo dia.
## 2. Agora (até 30/11)
- [x] ~~Agente de banco: P4 (relatório da Parte 2)~~, gerado em 24/11 (`database/entrega/`).
- [ ] **Você: enviar a Parte 2 até 30/11** (prazo da disciplina: 07/12): `BD_Parte2_CarteiraB3.pdf` e os dois `.sql` de `database/entrega/`.
- [ ] **Agente de frontend e de backend: D63**, a ordem das classes no Detalhe pelo patrimônio. O backend ordena; o frontend agrupa na ordem recebida.
- [ ] **Você: PL1**, o calendário de entregas de ES (vencido em 19/11), e **PL2**, o retorno da Parte 1 de BD (se não chegar até 26/11, o P4 segue com uma nota).

## 3. Em paralelo (não passa na frente do caminho crítico)
- [ ] **Agente de UX/UI: UX-2** (25–27/11): Lista e Detalhe no handoff até 26/11, página do ativo até 27/11, microcopy dos `formulaCode` novos.
- [ ] **Agente de frontend: FE-3** (25–26/11): E2E local contra `carteira_test` documentado (N1), N2–N5, actions dos jobs `frontend` e `e2e` (N7), checklist dos PRs (N8).
- [ ] **Agente de frontend: R1-b** (25–26/11): estados mobile com teste, projeto Playwright em 390 px com axe, checagem a 320 px (A-2, A-4).
- [ ] **Agente de frontend: W5** (27/11–02/12): Lista e Detalhe com valor de mercado, alocação, evolução e rentabilidade (ngx-echarts).
- [ ] **Agente de frontend: W6** (30/11–03/12): página do ativo só com C2 e C3.
- [ ] **Agente de banco: P4 (relatório da Parte 2)**, 28/11–30/11, depois do DADOS. **Enviar a Parte 2 até 30/11** (prazo da disciplina: 07/12).
- [ ] **Agente de UX/UI: U7c** (até 05/12): handoff e tokens alinhados ao que foi entregue (A-5).
- [ ] **Você: PL1**, o calendário de entregas de ES (vencido em 19/11), e **PL2**, o retorno da Parte 1 de BD (se não chegar até 26/11, o P4 segue com uma nota).

## 3a. Gatilhos e fechamento
- [ ] **01/12, G-S2a:** TWR não conferido → sai o B10 (ficam B8, B9 e B11).
- [ ] **03/12, G-S2b:** gráficos não prontos → ficam os números.
- [ ] **04/12:** nada do S1 muda depois desta data.
- [ ] **FECHO** (04–06/12): E2E, axe e teclado nas telas novas, README, roteiro de demonstração, tag `s1`.
- [ ] **Você:** se o BD-4 ou o K7 listarem desdobramento ou grupamento na janela do histórico de algum ativo do seed, decidir no mesmo dia (sem o E1, o evento distorce valor e rentabilidade).

## 4. Decisões e conferências suas (antes de 06/12)
- [ ] Responder às decisões B1, B3, B4, B9 e M8 de `claude/prompts-correcao-s1.md` (PL4).
- [ ] Criar a tag `s1` no merge final do S1 (e, se quiser, as dos marcos anteriores).
- [ ] Registrar a equipe e o papel de cada conta do GitHub (`MiguelVelosoGarcia` e `feritaliano`), e corrigir no contexto o "uma pessoa" (A-6).
- [ ] Corrigir no contexto a linha "Produto completo no Figma" (seção 10): 30 de 47 itens com tela.
- [ ] Sincronizar com o projeto no claude.ai os documentos de `claude/` alterados no R1 e na auditoria final.

## 5. Apresentação (09/12)
- [ ] **Você: ensaio em 08/12** por `docs/roteiro-demonstracao.md` (atualizado no FECHO): banco do zero, carga do K5, histórico e atualização do dia pelo worker, ensaio cronometrado e gravado (plano B).
- [ ] **Você: 30 min antes**, as checagens do roteiro (`docker compose --profile app ps -a`, `/api/v1/health`, frontend, data do último fechamento na tela).

## 6. Depois do S1
- [ ] **Backend: BK-4** (M3, M7, B2, B5, B6, B8), antes do S2. **UX: U7 parte B**, uma etapa por vez, na ordem da D49.
