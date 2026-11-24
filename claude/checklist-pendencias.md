# Checklist de pendências — S1 (atualizado em 23/11/2026)

> Estado da `main` em `08f550d` (PR #57, auditoria final). Plano: `claude/plano-de-acao.md`; correções: `claude/prompts-correcao-s1-auditoria-final.md` e `claude/prompts-correcao-s1-revisao-final.md` (23/11), além das decisões ainda abertas de `claude/prompts-correcao-s1.md` (12/11). O código do S1 está completo (R1 concluído); o que segue é correção, documentação e a apresentação.

## 1. Já feito
- [x] ~~Documentos da revisão (#21), hotfix do CI (#22), replanejamento (#25), D62 (#31)~~.
- [x] ~~BD: PF (#23), BD-1 (#24), P1-2 (#26), D61 (#27), P2 + B7 (#34), P3 (#41)~~.
- [x] ~~Backend: BK-1 (#28), BK-2 (#32), K4 PR 3 (#37), BK-3 (#43), K5 (#45); backend do S1 completo~~.
- [x] ~~Frontend: W1 (#19), FE-1 (#30), FE-2a (#33), W2 (#38), aviso do 429 (#39), W3 (#40), W4a (#44), W4b + FE-2b (#48), R1 (#49–#56: jornada, axe, teclado, clone limpo, roteiro)~~.
- [x] ~~UX: U7 parte A (#35, #36)~~.
- [x] ~~Você: check `e2e` exigido na proteção da `main` (PL3, 18/11)~~.
- [x] ~~Agente revisor: auditoria e revisão final do S1 (#57): 0 crítico, 0 alto, 3 médios, 16 baixos~~.

## 2. Agora (até 30/11)
- [x] ~~Agente de banco: P4 (relatório da Parte 2)~~, gerado em 24/11 (`database/entrega/`).
- [ ] **Você: enviar a Parte 2 até 30/11** (prazo da disciplina: 07/12): `BD_Parte2_CarteiraB3.pdf` e os dois `.sql` de `database/entrega/`.
- [ ] **Agente de frontend e de backend: D63**, a ordem das classes no Detalhe pelo patrimônio. O backend ordena; o frontend agrupa na ordem recebida.
- [ ] **Você: PL1**, o calendário de entregas de ES (vencido em 19/11), e **PL2**, o retorno da Parte 1 de BD (se não chegar até 26/11, o P4 segue com uma nota).

## 3. Correções da auditoria final (até 05/12)
- [ ] **Agente de backend: BK-5** (até 04/12): teste do seed depois da carga do K5 (A-1), imagem do PostgreSQL fixa nos testes (N6), actions do job `backend` (N7). Mesmo PR do BD-2.
- [ ] **Agente de banco: BD-2** (até 04/12, depois do P4): seed que roda depois do K5 (A-1) e actions do job `database` (N7).
- [ ] **Agente de frontend: FE-3** (até 04/12): E2E local contra `carteira_test` documentado (N1), N2–N5, actions dos jobs `frontend` e `e2e` (N7), checklist dos PRs (N8).
- [ ] **Agente de frontend: R1-b** (até 05/12): estados mobile com teste, projeto Playwright em 390 px com axe, checagem a 320 px (A-2, A-4).
- [ ] **Agente de UX/UI: U7c** (até 05/12): handoff e tokens alinhados ao que foi entregue (A-5).

## 4. Decisões e conferências suas (antes de 06/12)
- [ ] Responder às decisões B1, B3, B4, B9 e M8 de `claude/prompts-correcao-s1.md` (PL4).
- [ ] Criar a tag `s1` no merge final do S1 (e, se quiser, as dos marcos anteriores).
- [ ] Registrar a equipe e o papel de cada conta do GitHub (`MiguelVelosoGarcia` e `feritaliano`), e corrigir no contexto o "uma pessoa" (A-6).
- [ ] Corrigir no contexto a linha "Produto completo no Figma" (seção 10): 30 de 47 itens com tela.
- [ ] Sincronizar com o projeto no claude.ai os documentos de `claude/` alterados no R1 e na auditoria final.

## 5. Apresentação (09/12)
- [ ] **Você: ensaio em 08/12** por `docs/roteiro-demonstracao.md`: banco do zero, carga do K5, ensaio cronometrado e gravado (plano B).
- [ ] **Você: 30 min antes**, as checagens do roteiro (`docker compose --profile app ps -a`, `/api/v1/health`, frontend).

## 6. Depois do S1
- [ ] **Backend: BK-4** (M3, M7, B2, B5, B6, B8), antes do S2. **UX: U7 parte B**, uma etapa por vez, na ordem da D49.
