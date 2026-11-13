# Checklist de pendências — revisão do S1 (12/11/2026)

> Atualizado em 12/11/2026, 23h50, com o replanejamento aprovado (`claude/plano-de-acao.md`) e os prompts revistos (`claude/prompts-correcao-s1.md`). Feito hoje: PR dos documentos (#21), hotfix do CI (#22), PF (#23), BD-1 (#24), replanejamento.
> Ordem de execução por data. Agentes diferentes correm em paralelo; cada agente segue a ordem da sua trilha.

## 1. Já feito
- [x] ~~Subir os documentos da revisão para o GitHub~~ (PR #21).
- [x] ~~Substituir o contexto no projeto do claude.ai~~ (arquivo da raiz; `claude/contexto-projeto.md` aponta para ele).
- [x] ~~Decidir as fontes de dados~~ (D59) e ~~PF~~ (PR #23).
- [x] ~~BD-1, primeiro corte do seed~~ (PR #24, com D60).
- [x] ~~Corrigir o plano (P1–P11)~~ (replanejamento de 12/11, PR `docs/plano-12-11`).

## 2. 13/11–14/11
- [ ] **Você: mesclar o PR `docs/plano-12-11`** (plano, prompts, perfis, checklist).
- [ ] **Você: baixar o JSON de candles do Mercado Bitcoin pelo navegador** (URL no achado F1 de `database/docs/fontes-poc.md`) para `data/raw/fontes-poc/MB_candles_BTC-BRL_1d.json`, até 14/11. Se o navegador também for bloqueado, o P1-2 usa a Foxbit (aprovado).
- [ ] **Agente de banco: P1-2** (segundo corte do seed), 13/11–18/11. Gatilho G-P1 em 18/11.
- [ ] **Agente de backend: BK-1**, 13/11–14/11.
- [ ] **Agente de frontend: W2 + FE-1**, 13/11–16/11 (o FE-1 usa a variável do BK-1).
- [ ] **Agente de UX/UI: U7 parte A**, 13/11–17/11.

## 3. 15/11–20/11
- [ ] **Agente de backend: K4 PR 3 (prévia) + BK-2**, 15/11–19/11.
- [ ] **Você: exigir o check `e2e` na proteção da `main`** quando o job do FE-1 ficar verde (PL3).
- [ ] **Agente de frontend: W3**, 17/11–20/11.
- [ ] **Agente de banco: P2 + B7**, 19/11–22/11.
- [ ] **Agente de backend: BK-3**, 20/11.
- [ ] **Você: pedir às professoras** o calendário de entregas de ES (PL1) e o retorno da Parte 1 de BD (PL2), até 19/11.

## 4. 21/11–02/12
- [ ] **Agente de backend: K5** (catálogo completo), 21/11–26/11. Gatilho G-K5 em 26/11.
- [ ] **Agente de frontend: W4a**, 21/11–26/11.
- [ ] **Agente de banco: P3**, 23/11–24/11; **P4 (relatório)**, 25/11–30/11. **Enviar a Parte 2 até 30/11.**
- [ ] **Agente de frontend: FE-2**, 27/11; **W4b**, 27/11–02/12. Gatilho G-W4 em 02/12.

## 5. Decisões e conferências suas (antes de 06/12)
- [ ] Responder às 5 decisões de `claude/prompts-correcao-s1.md` (B1, B3, B4, B9, M8) (PL4). Depois, pedir no chat do projeto o registro no contexto e na arquitetura.
- [ ] Criar tags dos marcos já entregues (ex.: `k2`, `k3`, `w1`, `bd1`) e uma a cada tarefa concluída.
- [ ] Conferir se as descrições dos PRs trazem o resultado do `/review-pr`.
- [ ] Confirmar o papel da Fernanda Italiano (4 merges, nenhum commit) e pedir a correção da linha "desenvolvimento em equipe" na matriz.
- [ ] Pedir no chat do projeto a correção da linha "Produto completo no Figma" (seção 10 do contexto): 30 de 47 itens com tela.

## 6. 03–06/12 — fechamento do S1 (apresentação em 09/12)
- [ ] **Agente de frontend: R1** (E2E completo, axe, teclado, roteiro de demonstração).
- [ ] **Agente revisor: nova auditoria e revisão** do S1 antes da entrega (`Agente: revisor. Modo: revisão`), com os prompts de correção do que sobrar.
- [ ] **Você: ensaio da apresentação em 07–08/12.** Demonstração do S1 ao vivo com o usuário de demonstração do seed e depois o protótipo do produto completo no Figma.

## 7. Depois do S1
- [ ] **Agente de backend: BK-4** (ciclo entre módulos, limpeza de sessões, filtro de erros único), antes do S2.
- [ ] **Agente de UX/UI: U7 parte B**, uma etapa por vez, na ordem da D49.
