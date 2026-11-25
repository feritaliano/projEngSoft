# Prompts de correção — auditoria final do S1 (23/11/2026, `main` em `e8e001c`)

> **Datas e prioridades revistas pela D64 (25/11/2026):** BD-2, BK-5, FE-3 e R1-b passam para 25–26/11, no caminho crítico do S1+, e o P4 para 28/11–30/11; onde este arquivo disser "até 04/12", "até 05/12" ou "depois do P4", vale `claude/prompts-s1-plus-d64.md` e a seção "S1+ (D64)" de `claude/plano-de-acao.md`.

Relatório: `claude/rastreabilidade-s1-final.md`, seção "Achados". Prazo do S1: código entregue até 06/12/2026 (apresentação em 09/12; ensaio em 07–08/12). O P4 (relatório de BD, 25/11–30/11) tem prioridade sobre qualquer outra frente (G-P4); por isso o prompt do banco vem depois dele.

## Cobertura dos achados
| Achado | Gravidade | Onde é tratado |
|---|---|---|
| A-1 (seed depois do K5 falha; critério do K5) | média | BD-2 (banco de dados) + BK-5 (backend), no mesmo PR; R1-b (frontend) só se o PR não entrar até 04/12 |
| A-2 (estados mobile sem teste; sem E2E/axe em 390 px) | média | R1-b (frontend) |
| A-3 (ordem das classes diverge entre camadas e documentos) | baixa | Decisão do usuário |
| A-4 (prompt do frontend desatualizado) | baixa | R1-b (frontend) |
| A-5 (handoff e tokens desatualizados) | baixa | U7c (UX/UI) |
| A-6 (equipe) | a verificar | Lista "A verificar pelo usuário" |
| A-7 (tags, PL1, PL4, checklist e pendências do contexto) | baixa | Decisão do usuário |

Os IDs BD-2, BK-5, R1-b e U7c são propostos para o plano; entram em `claude/plano-de-acao.md` (e no checklist interativo) quando o usuário aprovar.

## BD-2 — Seed que roda depois da carga do K5 (A-1)

```
Agente: banco de dados. Tarefa BD-2 (nova; fecha o critério de pronto do K5 "seed e K5 em qualquer ordem sem duplicar"): correção da auditoria final de 23/11/2026.
Leia claude/rastreabilidade-s1-final.md, achado A-1.
Problema: com o catálogo do K5 já carregado, `npm run db:seed` falha com `violates foreign key constraint "assets_issuer_id_fkey"`. Os emissores entram com `ON CONFLICT (cnpj) DO NOTHING` (database/sql/inserts.sql:112-168): se o K5 já criou o emissor com o mesmo CNPJ e outro id, a linha do seed é pulada, e os ativos depois apontam para o UUID fixo do seed (ex.: AXIA ENERGIA 00000000-0000-0000-0000-000000000412 em :126, usado por AXIA3 em :218 e ELET3 em :254). O teste backend/test/catalog-ingestion.e2e-spec.ts:107-116 fixa essa falha. O README da raiz (linha 48) diz que o seed "pode rodar mais de uma vez sem duplicar nada".
Faça: (1) no inserts.sql, resolva a FK de assets (e de qualquer outra tabela que aponte para emissor, setor ou corretora que a carga possa criar antes) pela chave natural (CNPJ do emissor; nome quando não houver CNPJ), sem depender do UUID fixo quando a linha já existir; (2) mantenha a idempotência (2 execuções seguidas sem mudança) e o seed-check.sql passando; (3) rode a sequência carga → seed → seed num banco limpo e registre no PR as contagens de issuers e assets antes e depois; (4) peça ao agente de backend, no mesmo PR, a troca do teste fixado (prompt BK-5) — sem isso o job `backend` fica vermelho, porque o teste espera a falha; (5) acrescente ao seu perfil (agentes/agente-banco-de-dados.md e .claude/agents/database.md) a regra permanente abaixo.
Regra permanente: "Linha do seed que referencia dado de referência que outra carga também grava (emissor, setor, corretora, ativo) resolve a FK pela chave natural, nunca só pelo UUID fixo; todo seed é testado nas duas ordens com a carga correspondente."
Pronto quando: no job `database`, seed → seed continua idêntico; no job `backend`, o teste de BK-5 (carga → seed sem erro, sem emissor nem ativo duplicado) passa e falharia com o inserts.sql de hoje; npm run db:ddl sem diferença (nenhuma mudança de schema).
Não faça: migration nem mudança de schema; edição de arquivos em backend/ (o teste é do agente de backend); mudança de valores da massa do handoff ou da carteira "Longo prazo" (BK-3 e P1-2 conferem esses números).
Prazo: 04/12/2026 (depois do envio do P4 em 30/11, G-P4). Esforço estimado: 2 h.
```

## BK-5 — Teste do seed depois da carga (A-1)

```
Agente: backend. Tarefa BK-5 (nova; no mesmo PR do BD-2): correção da auditoria final de 23/11/2026.
Leia claude/rastreabilidade-s1-final.md, achado A-1.
Problema: backend/test/catalog-ingestion.e2e-spec.ts:107-116 (`pins the seed failure after the load until the seed reuses existing issuers (K5 → seed)`) espera que o seed falhe depois da carga; o K5 foi marcado "Concluído" com esse critério de pronto em aberto; backend/README.md:53 manda rodar o seed antes da carga.
Faça: quando o agente de banco abrir o PR do BD-2, troque esse teste por um que rode carga → seed e confira: o seed termina sem erro, nenhum emissor com nome repetido (`duplicatedIssuerNames()` vazio), nenhum ticker repetido, e as linhas da carga continuam com o mesmo id; tire a nota de ordem do backend/README.md:53. Acrescente ao seu perfil (agentes/agente-backend.md e .claude/agents/backend.md) a regra permanente abaixo.
Regra permanente: "Teste que fixa um defeito conhecido só entra com tarefa no plano, dono e data; tarefa com critério de pronto fixado como falha não é marcada como concluída."
Pronto quando: o teste novo passa com o inserts.sql do BD-2 e falha com o inserts.sql de e8e001c (rodar uma vez com o arquivo antigo e registrar a saída no PR); job `backend` verde.
Não faça: edição de database/sql/inserts.sql (é do agente de banco); mudança na lógica da carga do K5.
Prazo: 04/12/2026, no PR do BD-2. Esforço estimado: 0,5 h.
```

## R1-b — Estados mobile com teste e perfil do frontend (A-2, A-4; README de A-1 se preciso)

```
Agente: frontend. Tarefa R1-b (complemento do R1, dentro da janela 03/12–06/12): correção da auditoria final de 23/11/2026.
Leia claude/rastreabilidade-s1-final.md, achados A-2 e A-4.
Problema: (A-2) os estados mobile da Lista (frame 95-1858), do Formulário (17-725) e do Histórico (19-1307) estão implementados sem teste: nenhum spec troca o `matchMedia` do `wide` (operation-form-page.ts:452-470) nem lê os cartões do Histórico (operation-history-page.ts:280, `md:hidden`); frontend/playwright.config.ts só tem o projeto `Desktop Chrome` (1280 px), então nenhum E2E nem axe roda abaixo de 768 px e o critério do handoff U5 (reflow a 320 px e zoom de 200% sem rolagem horizontal da página; área de toque de 44 px no mobile) não tem verificação. (A-4) agentes/agente-frontend.md:57 diz que o filtro do Histórico tem "Todos, Ações, FIIs, ETFs, BDRs" (são 7 chips, D55) e a tabela de tarefas (linhas 38–46) não traz o status de W2–R1; o espelho .claude/agents/frontend.md:64 repete o texto.
Faça: (1) specs: Formulário com `matchMedia` falso (< 768 px) mostrando o Resumo dentro do formulário, antes dos botões; Histórico conferindo os cartões (ativo, tipo, data, quantidade pela classe, ícones Editar e Excluir com o nome da microcopy); Lista conferindo o botão "Nova carteira" em largura total e o alvo de toque de 44 px; (2) E2E: um projeto Playwright mobile (390 × 844, ex.: `devices['Pixel 7']` ou viewport explícito) que rode ao menos a jornada principal e o axe nas 7 telas, mais uma checagem de `document.documentElement.scrollWidth <= innerWidth` a 320 px nas telas com tabela; (3) atualize as linhas apontadas do seu perfil e do espelho, na mesma tarefa; (4) só se o PR do BD-2 não estiver na `main` em 04/12: acrescente ao README.md (seção 4) que o seed deve rodar antes da carga do K5 e que reexecutá-lo depois dela falha até a correção do banco; (5) acrescente ao perfil a regra permanente abaixo.
Regra permanente: "Todo estado mobile do handoff tem spec e entra no projeto mobile do Playwright com axe; spec que só passa em 1280 px não cobre frame mobile."
Pronto quando: os specs novos falham se o template mobile for removido (conferir apagando o bloco `md:hidden` do Histórico e o ramo `!wide()` do Formulário numa cópia); job `e2e` verde com o projeto mobile; sem violação séria ou crítica do axe em 390 px; perfil e espelho iguais (`diff agentes/agente-frontend.md .claude/agents/frontend.md` só com as diferenças de cabeçalho que já existiam).
Não faça: mudar layout, tokens ou textos dos frames (pedido ao UX se algo não couber); mexer na ordem das classes (A-3 depende de decisão do usuário); editar backend/ ou database/.
Prazo: 05/12/2026 (antes do ensaio de 07–08/12). Esforço estimado: 4 h.
```

## U7c — Handoff e tokens alinhados ao que foi entregue (A-5)

```
Agente: UX/UI. Tarefa U7c (nova, documental): correção da auditoria final de 23/11/2026.
Leia claude/rastreabilidade-s1-final.md, achado A-5.
Problema: claude/handoff-ux.md:25 (linha C1 da tabela "Frames do S1") lista só as variantes AVG_PRICE_BUY, TOTAL_COST e REALIZED_PROFIT, mas o cabeçalho do mesmo arquivo (linha 3) registra os 9 formulaCode do U7a; handoff-ux.md:8 e claude/design-tokens.md:3 citam o `tailwind.config`, que no Tailwind 4 virou `@theme` em frontend/src/styles.css (D58); design-tokens.md:91 diz que `elevation/overlay` é "preto 16%", e o efeito no Figma é #14171F a 16% (pendência "UX (W1)" da seção 11 do contexto, aberta desde 11/11 sem tarefa).
Faça: corrija as três linhas no handoff e nos tokens, conferindo no Figma (arquivo 71YUqOEoUNi1HIPcLZd0qo, conjunto 3-112 e estilo de efeito `elevation/overlay`) e deixando o link de cada variante nova na linha C1; peça ao usuário que marque a pendência "UX (W1)" da seção 11 do contexto como feita. Acrescente ao seu perfil (agentes/agente-ux-ui.md) a regra permanente abaixo.
Regra permanente: "Variante ou estado novo entra, na mesma tarefa, na tabela 'Frames do S1' do handoff, com link; nenhuma linha da tabela fica com menos estados do que o Figma."
Pronto quando: `grep -n "tailwind.config" claude/handoff-ux.md claude/design-tokens.md` não encontra nada; a linha C1 lista os 9 códigos; o valor de `elevation/overlay` na tabela é igual ao do Figma.
Não faça: mudar frames, tokens ou textos já implementados (o código do S1 está fechado); decidir a ordem das classes (A-3 é decisão do usuário); editar frontend/.
Prazo: 05/12/2026. Esforço estimado: 0,5 h.
```

## Decisão do usuário (não vira prompt de agente sem a sua resposta)
| Achado | O que decidir | Evidência | Proposta |
|---|---|---|---|
| A-3 | Ordem dos grupos de classe no Detalhe: FII antes de ETF (D45, texto do handoff, backend) ou ETF antes de FII (frame, segundo o comentário do frontend, e prompt do frontend) | `backend/src/modules/operations/domain/asset-type.ts:2-9`; `frontend/src/app/shared/assets/asset-type.ts:3-14`; contexto D45; `claude/handoff-ux.md:34`; `agentes/agente-frontend.md:58` | Conferir o frame 44-1178 no Figma e registrar a ordem no D45; depois, o dono de cada texto alinha o seu (UX no handoff, frontend no perfil). O código só muda se a decisão contrariar o que a tela já mostra |
| A-7 | (1) Tags e release dos marcos (M8 da revisão de 12/11): nenhuma tag, nenhum release. (2) PL1, calendário de entregas de ES, vencido em 19/11. (3) PL4: decisões B1, B3, B4, B9 e M8 de `claude/prompts-correcao-s1.md`, antes de 06/12. (4) Documentos de sua responsabilidade desatualizados: `claude/checklist-pendencias.md` parado em 15/11 (R1 ainda como 03–06/12 e auditoria final como pendente); seção 11 do contexto com P1-2 (`:374`), preço de cripto (`:375`), mapeamento D56 do frontend (`:407`), check `frontend` (`:408`) e prévia no OpenAPI (`:410`) ainda abertos, embora feitos; `claude/convencoes-equipe.md:66` e `:75` citam "D1–D56" (há até D62) | `git tag -l` e `gh release list` vazios; `claude/plano-de-acao.md:169-172` | Criar ao menos a tag `s1` no merge final antes de 06/12 (e, se quiser, as dos marcos já mesclados); responder PL1 e PL4; atualizar o checklist e a seção 11 no mesmo PR da resposta ao PL4 |

## A verificar pelo usuário
| Item | O que conferir | Onde |
|---|---|---|
| A-6 — equipe | Quem compõe a equipe e o papel de cada conta. O histórico mostra: PRs abertos por `MiguelVelosoGarcia` (14) e `feritaliano` (42); merges por `MiguelVelosoGarcia` (#1–#8, #12–#20) e `feritaliano` (#9–#11, #21–#56); commits com as identidades "Miguel Veloso Garcia" (138), "Fernanda Italiano" (68) e "MiguelVelosoGarcia" (16); nenhuma aprovação em PR. O contexto (seção 1) diz "1 pessoa, com eventual ajuda de uma segunda", e o D38 fixa 0 aprovações "enquanto houver uma pessoa". Se houver duas pessoas, registrar no contexto e decidir se a proteção da `main` passa a exigir 1 aprovação | `git log --format='%an <%ae>'`; `gh pr list --repo feritaliano/projEngSoft --state merged --limit 60 --json number,author,mergedBy`; `claude/contexto-projeto.md`, seção 1; D38 |
| Ordem do frame 4 | Qual é a ordem dos grupos no frame 44-1178 (insumo da decisão A-3) | Figma, arquivo 71YUqOEoUNi1HIPcLZd0qo |
| Testes desta auditoria | Nenhum teste foi rodado aqui; o status vem da leitura dos `.spec.ts` e do CI verde do `e8e001c` (run 45256177592). O modo revisão roda os testes no mesmo worktree | `claude/revisao-*.md` do modo revisão |

## Ordem de execução
1. Usuário: decisão A-3 e a conferência de A-6 (não bloqueiam os prompts).
2. 25/11–30/11: P4 (prioridade, G-P4); nenhum prompt desta lista concorre com ele.
3. 01/12–04/12: BD-2 + BK-5 no mesmo PR.
4. 03/12–05/12: R1-b (frontend) e U7c (UX), em paralelo.
5. Antes de 06/12: tag `s1` e PL4 (usuário).
