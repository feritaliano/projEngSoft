# Matriz de rastreabilidade do S1 — auditoria final

> Auditoria final de requisitos do S1, 23/11/2026, depois do R1. Código conferido na `main` em `e8e001c` (merge do PR #56), num worktree destacado. Ponto de partida: `claude/rastreabilidade-s1.md` (12/11, `f2f1dd2`), que não foi alterada; a coluna "Antes" diz o status consolidado daquela auditoria. Grafo do Graphify gerado no mesmo `e8e001c` ("Built from commit: `e8e001c5`" no `GRAPH_REPORT.md`), consultado antes da busca textual (D53); os nomes de teste são strings de `it(...)`/`test(...)`, que o AST não extrai, e vieram de leitura literal dos `.spec.ts`. Os 100 nomes de teste do backend citados na auditoria de 12/11 foram procurados de novo, um a um, e todos existem.
>
> **Nenhum teste foi executado nesta auditoria** (outro agente roda os testes no mesmo worktree; instalar ao mesmo tempo quebraria). "Testado" = existe teste com o nome citado que exercita o requisito. Resultado de CI conferido no GitHub: run `45256177592` da `main` em `e8e001c`, jobs `database`, `backend`, `frontend` e `e2e` com `success` (`gh run view 45256177592 --json jobs`). Proteção da `main` conferida (`gh api .../branches/main/protection`): checks exigidos `database`, `backend`, `frontend`, `e2e`; 0 aprovações; `enforce_admins` ligado.
>
> **Não visto:** frames do Figma (não abertos nesta auditoria; o estado de tela foi conferido pelo `claude/handoff-ux.md`); trabalho local sem push (a pasta principal tem `frontend/angular.json` modificado, fora da `main`); cobertura numérica (vem do CI, não reconferida).

Fontes: `claude/contexto-projeto.md` (seções 4, 5, 6, 11), `projetoEngSoftware.md`, `claude/plano-de-acao.md`, `agentes/agente-backend.md`, `agentes/agente-frontend.md`, `claude/handoff-ux.md`, `backend/openapi/openapi.json`.

## Como ler
- **Status por camada** (`BE` = backend, `FE` = frontend, `BD` = banco): implementado e testado (**IT**) / implementado sem teste (**IST**) / só planejado (**SP**) / sem tarefa (**ST**) / n/a.
- **Status consolidado** = o pior entre as camadas aplicáveis.
- **Teste**: `[código]` do arquivo (legenda no fim) + nome do teste entre crases, como está no código (`%s` e `${…}` = parametrizado). E2E do frontend roda no job `e2e` contra a API real e PostgreSQL com migrations e seed.
- Linhas novas em relação a 12/11 estão marcadas "nova" na coluna Antes (estados do U7a, 429 e D59).

## 1. Itens do produto do S1

| ID | Requisito | Backend | Endpoint | Frontend | Teste que cobre | Status | Antes |
|---|---|---|---|---|---|---|---|
| A1 | Cadastro (nome, e-mail único, senha ≥ 8) | K2 | `POST /auth/register` | W2 | BE: [T1] `signs up: 201, logged in, password stored only as an argon2id hash, refresh token only as SHA-256 (RN01, D39)`. FE: [F11] `shows the loading state, then enters signed in on the portfolios`; [E1] `creates an account and enters signed in (RN01)` | **IT** | SP |
| A2 | Login com JWT | K2 | `POST /auth/login`, `/refresh`, `/logout` | W1, W2 | BE: [T1] `logs in with the e-mail in any casing and the token opens protected routes (A2)`. FE: [F10] `shows the loading state while signing in, then opens the portfolios`; [F2] `on 401 refreshes once for two simultaneous requests and repeats both with the new token (D39)`; [E1] `signs in the demo user and opens the portfolios` | **IT** | SP |
| B1 | Várias carteiras: criar, listar, excluir; nome único | K3 | `GET\|POST /portfolios`, `GET\|DELETE /portfolios/{id}` | W3 | BE: [T2] `sign-up → login → create → list → delete (B1)`. FE: [F12] `adds the new portfolio at the end and closes the panel`; [F12] `deletes the portfolio and its card, with the focus back on the title`; [E2] `creates a portfolio, refuses a repeated name and deletes it after typing the name (RN02)` | **IT** | SP |
| B2 | Lançamento de compra e venda | K4 PR1 | `POST /portfolios/{id}/operations` | W4b | BE: [T3] `enters an operation (201) and reads it back for the edit form (B2, D41)`. FE: [F16] `saves, shows the notice and starts a new operation keeping type and broker (frame "sucesso")`; [E4] `launches a buy and a sell with profit through the form and sees the position (RN05, RN06, D42)` | **IT** | SP |
| B3 | Bloqueio de venda acima da posição | K0, K4 PR1/PR3 | `POST /operations` (422), `POST /operations/preview` (`violation`) | W4b | BE: [U1] `rejects a sell above the position and identifies it (RN07)`; [T7] `answers a sell above the position with 200 and the violation of the 422, saving nothing (RN07)`. FE: [F16] `blocks the save while the preview shows a violation (RN07), politely, with the field help`; [E4] `the preview of a sell above the position blocks the button (RN07, D42)` | **IT** | SP |
| B4 | Edição e exclusão retroativa com recálculo; bloqueio se a posição ficar negativa | K0, K4 PR1 | `GET\|PATCH\|DELETE /operations/{operationId}` | W4b | BE: [T3] `edits only the fields sent, keeps the entry order and recalculates (B4)`; [T3] `rejects deleting a buy that a later sell needs (RN10, frame 6)`. FE: [F16] `edits: fills the form from the GET, previews replacing it, confirms and goes to the History`; [F15] `deletes after the confirmation and loads the list again`; [E6] `a new user registers, trades PETR4, edits and deletes an operation, closes the position and finds it all after signing in again` | **IT** | SP |
| B5 | Histórico com filtro por ativo e corretora | K4 PR1 | `GET /operations?assetId=&brokerId=&assetType=` | W4a | BE: [T3] `filters the history in the query, on every page (D45)`. FE: [F15] `filters by asset and broker and names both when nothing matches`; [E3] `the History lists the operations and filters them by class and broker on the backend (B5, D45)` | **IT** | SP |
| B6 | Posição por ativo: quantidade, PM, custo total, lucro realizado | K0, K4 PR2 | `GET /portfolios/{id}/positions` | W4a | BE: [T4] `buy → sell → position: PM kept by the sell, realized profit with its trace (RN05, RN06, D26)`. FE: [F13] `groups the open positions by class in the order of the frame, with the quantity of each class`; [E3] `shows the totals and the positions of "Longo prazo" as the API computes them (B6, B7)` | **IT** | SP |
| B7 | Totais da carteira | K4 PR2 | `GET /portfolios/{id}/summary` | W4a | BE: [T4] `totals the massa of the frames and matches the sum of the rows (D41)`. FE: [F13] `shows the totals of the API formatted in pt-BR, with the sign of the realized profit (B7, RN11)`; [E3] idem B6 | **IT** | SP |
| B13a | "Como foi calculado" nas posições e nos totais | K4 PR2 | `positions`, `summary` (6 `FormulaCode`) | W4a, W4b | BE: [U2] `traces an open position: AVG_PRICE_BUY by the buy and TOTAL_COST = quantity × PM (RN05)`. FE: [F20] `has the texts of every formulaCode of the API`; [F21] `opens the panel with the focus on its title, as a dialog named by it`; [E6] `the demo user sees "Longo prazo" with its totals and how the open total was calculated` | **IT** | SP |
| B13b | "Como foi calculado" no Resumo da operação (OPERATION_GROSS, OPERATION_TOTAL_BUY, OPERATION_NET_SELL) | K4 PR3 | `POST /operations/preview`; os 3 códigos no enum `FormulaCode` | W4b | BE: [U2] `previews a first buy: gross, total with fees and the PM after it, linked to the unsaved operation (id null)`; [U2] `previews a sell with profit: net of fees, the PM kept and the estimated REALIZED_PROFIT (RN06)`. FE: [F17] `shows the values of a buy as the API sends them, each with its ⓘ`; [F20] `OPERATION_GROSS and OPERATION_TOTAL_BUY of the preview: the form values are not saved yet` | **IT** | SP |
| C1 | Catálogo com emissor e setor; busca por ticker ou nome | K3 | `GET /assets` | W4a | BE: [T5] `searches by issuer name ignoring case and accents (C1, unaccent)`. FE: [F14] `searches by ticker or issuer after a pause in typing, counting what it found`; [E5] `searches the catalog by issuer or ticker and clears the search (C1)` | **IT** | SP |
| I1 (D55) | Renda fixa sem preço: catálogo, operações (múltiplo de 0,01), posição pelo custo, totais, histórico | K3, K4 | `/assets`, `/operations`, `/positions`, `/summary` | W4a, W4b | BE: [T3] `accepts fractional quantities of crypto (8 places) and fixed income (0.01), D44`; [T4] `lists fixed income and crypto by display name and asset class, quantities as decimal strings (D55)`. FE: [F19] `quantity by class: whole for stocks, steps of 0,01 for fixed income, 8 places for crypto (D55)`; [F13] `groups the open positions by class ...` (linha "Tesouro IPCA+ 2035 Renda fixa 0,52"); [F26] `uses the display name when the asset has no ticker (fixed income, D50)` | **IT** | SP |
| I2 (D55) | Cripto sem preço: catálogo, operações (até 8 casas), posição pelo custo, totais, histórico | K3, K4 | idem | W4a, W4b | BE: [U1] `sells part of a fractional position and rejects selling 0.00000001 more than held (RN07, D44)`; [T4] idem I1. FE: [F19] idem I1; [F24] `formats the quantity by asset class (handoff U5)`; [F13] (linha "BTC Cripto 0,0125") | **IT** | SP |

## 2. Regras de negócio RN01–RN12

| ID | Requisito | Backend | Frontend | Teste que cobre | Status | Antes |
|---|---|---|---|---|---|---|
| RN01 | E-mail único sem diferenciar maiúsculas, senha ≥ 8 só como hash | K2 | W2 | BE: [T1] `rejects the same e-mail with other casing: 409 with field "email" (RN01)`; [U9] `rejects fewer than 8 characters (RN01)`. FE: [F11] `shows a short password after leaving the field, with the characters missing (RN01)`; [F25] `counts characters as the API does: an emoji is one (RN01)` | **IT** | SP |
| RN02 | N carteiras; nome único por usuário; acesso só às próprias | K3, BK-2 | W3, W4 | BE: [T2] `answers 404 to GET and DELETE of another user's portfolio and keeps it (RN02)`; [T8] `shows in the history, positions, totals and counts of each portfolio only its own operations`. FE: [F12] `shows a repeated name (409 ALREADY_EXISTS) in the field and keeps the panel (RN02)`; [F13] `shows the 404 page for a portfolio that does not exist or belongs to another user (RN02)`; [E3] `another user's portfolio answers as not found (RN02)` | **IT** | SP |
| RN03 | Ativo nas 6 classes; ticker por classe; emissor/setor; catálogo só leitura | K3 | W4a | BE: [U4] `recognizes %s`; [T5] `lists the active catalog by ticker, fixed income last, with display name, issuer and sector (D50)`. FE: [F14] `lists the catalog with code, name, sector and class; ticker or name when there is none (D50)` | **IT** | SP |
| RN04 | Operação: tipo, corretora, data não futura, quantidade por classe, preço > 0, custos ≥ 0 | K4 PR1 | W4b | BE: [U3] `rejects a %s quantity of %s against the rule of its class with %s (RN04, D50, D56)`; [T3] `rejects an invalid %s with its field (400, RN04)`. FE: [F19] `fees may be zero but not negative nor with more than 2 places`; [F16] `checks the quantity again by the class of the new asset (RN04, D55)` | **IT** | SP |
| RN05 | PM da compra inclui custos | K0 | n/a | BE: [U1] `includes the fees in the average price of the first buy` | **IT** | IT |
| RN06 | Venda não altera PM; lucro = qtd × preço − custos − qtd × PM | K0 | n/a | BE: [U1] `keeps the average price and realizes qty × price − fees − qty × PM (RN06)` | **IT** | IT |
| RN07 | Venda maior que a posição é rejeitada | K0, K4 | W4b | BE: [T3] `serializes two concurrent sells of the same asset: one is saved, the other is RN07 (lock per portfolio and asset)`; [T8] `rejects a sell in a portfolio without units of the asset (RN07), even with units in the other user’s portfolio`. FE: [F22] `RN07: the sale of the form passes the position, without link`; [E4] `the preview of a sell above the position blocks the button (RN07, D42)` | **IT** | SP |
| RN08 | Posição zerada zera o PM; recompra reinicia | K0 | n/a | BE: [U1] `restarts the average price on a buy after the position was closed (RN08)` | **IT** | IT |
| RN09 | Posição derivada, ordem (data, sequence), nunca gravada | K0 | n/a | BE: [U1] `orders operations of the same date by sequence` | **IT** | IT |
| RN10 | Alteração retroativa que deixa posição negativa é rejeitada inteira | K0, K4 | W4b | BE: [T3] `rejects a retroactive sell that makes a later sell exceed the position (RN10)`; [T7] `previews an edit with replacesOperationId: a buy turned into a sell leaves a later sell above the position (RN10), nothing changes`. FE: [F15] `shows the RN10 of a refused deletion and puts the purchase in evidence`; [E4] `editing the MXRF11 buy of 08/01 to 40 units shows the RN10 and saves nothing`; [E4] `refuses to delete a buy a later sell needs (RN10) and deletes after the confirmation (C3)` | **IT** | SP |
| RN11 | Decimal em todas as camadas; string na API; arredondar só na apresentação | K0–K4 | W1–W4 | BE: [U12] `serializes as the full-precision decimal string (RN11)`. FE: [F24] `keeps digits beyond the precision of a double`; [F19] `turns the pt-BR typing into the decimal string of the API, without number`; lint contra conta com dinheiro (`frontend/scripts/check-money-lint.mjs`, FE-1) no job `frontend` | **IT** | SP |
| RN12 | Posição e PM por carteira e ativo, somando corretoras | K0 | n/a | BE: [T4] `sums the brokers of the portfolio in one position (RN12)` | **IT** | IT |

## 3. Decisões com comportamento verificável

| ID | Requisito | Backend | Frontend | Teste que cobre | Status | Antes |
|---|---|---|---|---|---|---|
| D41-a | `operationCount`, posições `CLOSED`, `GET` da operação para editar | K3, K4 | W3, W4 | BE: [T2] `counts operations in the query and open positions from the timeline, then cascades the deletion (D41, RN09)`. FE: [F12] `shows each portfolio with its assets and operations, only the S1 data (D48)`; [F16] `edits: fills the form from the GET, ...` | **IT** | SP |
| D41-b | Excluir carteira mostra quantas operações e exige digitar o nome | K3 | W3 | FE: [F12] `says how many operations are deleted and enables "Excluir carteira" only with the name typed`; [F23] `focuses the name field and enables "Excluir carteira" only when the typed name is equal` | **IT** | SP |
| D41-c | Posições encerradas recolhidas | K4 PR2 | W4a | BE: [T4] `shows a fully sold asset as CLOSED with its realized profit and no PM nor cost (D41, RN08)`. FE: [F13] `keeps the closed positions collapsed until "Mostrar", with "—" for average price and cost (RN08, D41)` | **IT** | SP |
| D41-d | Navegação só com Carteiras e Ativos | — | W1 | FE: [F3] `has a main navigation with only the S1 items: Carteiras and Ativos` | **IT** | IT |
| D41-e | Catálogo leva a "Lançar operação" com o ativo preenchido | K3 | W4b | FE: [F14] `asks which portfolio when there are more, the first one chosen`; [F30] `emits the chosen portfolio on Continuar`; [E4] `the catalog opens the form with the asset, asking the portfolio (frame 7, D51)` | **IT** | SP |
| D42 | Prévia no backend, sem gravar; violação antes de salvar | K4 PR3 | W4b | BE: [T7] `answers 40 concurrent previews with 200 and changes no row of operations (D42)`; [T7] `gives the same position and PM after a buy as saving it does (D42)`. FE: [F16] `previews the valid form with the decimal strings of the API and shows the values (D42)`; [F16] `cancels a preview that a newer one replaces (switchMap): the old answer never shows` | **IT** | SP |
| D45-a | Filtro do Histórico por `assetType` (6 valores, 7 chips) | K4 PR1 | W4a | BE: [T3] `rejects an invalid filter %s with its field (400)`. FE: [F15] `lists the operations most recent first, formatted by class, with the header and 7 fixed chips`; [F15] `filters by asset class on the backend and counts against all the operations (D45)` | **IT** | SP |
| D45-b | Posições agrupadas por classe, na ordem do frame | K4 PR2 | W4a | BE: [U7] `lists open and closed positions by asset class, then display name, leaving out closed with profit 0 (D41, D55)`. FE: [F31] `orders every class of the API exactly once, in the Detail groups and in the History chips`. **Divergência de ordem entre camadas e documentos: achado A-3** | **IT** | SP |
| D45-c | Guias Resumo e Histórico (`PortfolioTabs`) | — | W4a | FE: [F27] `shows the name, the line below it and the tabs as links, the current one with aria-current (U5)` | **IT** | SP |
| D45-d | `AssetAvatar` | — | W4a | FE: [F26] `shows the first two letters of the ticker with the border of the class, hidden from screen readers` | **IT** | SP |
| D54 | "Hoje" em America/Sao_Paulo | K4 PR1 | W4b | BE: [U13] `gives today in São Paulo whatever the server time zone (D54)`. FE: [F19] `refuses a date after today in São Paulo (D54)`; [F24] `tells today in São Paulo, not in UTC (D54)`; [F16] `opens the create mode with the portfolio, the brokers, today and the waiting summary` (confere "Até hoje, {data}.") | **IT** | SP |
| D55 | Ativo sem ticker pelo `displayName`; 6 classes | K3, K4 | W4 | BE: [U2] `sends the asset of a fixed income position with ticker null and its display name (D55)`. FE: [F31] `names the asset by the ticker, or by the display name without one (D50)`; [F18] `names an asset without issuer by its name alone (fixed income has no ticker, D50)` | **IT** | SP |
| D56-a | 400/409 com `errors[{field, code, params}]` mapeados para a microcopy | K4 PR1 | W2–W4 | BE: [T1] `sign-up rejects %s: 400 problem+json with errors[].field and code (RN01, D56)`. FE: [F25] `fills the placeholders with the params of the server error (D56)`; [F10] `shows the 400 errors under their fields by field + code (D56)`; [F12] `shows a too long name (400 TOO_LONG) with the limit from params (D56)` | **IT** | SP |
| D56-b | Mesmos códigos na prévia; `replacesOperationId` com `NOT_FOUND` | K4 PR3 | W4b | BE: [T7] `validates the body as POST operations does (400 with field and code, D56)`; [T7] `answers 400 NOT_FOUND on replacesOperationId for an operation that does not exist (D56)`. FE: [F16] `turns to "não existe mais" when the preview says replacesOperationId NOT_FOUND` | **IT** | SP |
| D56-c | Operação que não existe mais no modo editar vira aviso | K4 PR1 | W4b | BE: [U6] `answers not found for a malformed id without touching the store, and for a missing operation`. FE: [F16] `says the operation no longer exists when the GET answers 404, with the save disabled`; [F16] `PATCH 404: the operation no longer exists; PATCH 422: the RN10 of the edit as an alert` | **IT** | SP |
| D59-a | Catálogo completo da B3 carregado uma vez (K5), achado pela busca do C1 | K5 | n/a | BE: [T10] `finds a loaded asset that is not in the seed through GET /assets?search= (C1)`; [T10] `changes no row when the same files are loaded again, and ignores invalid lines without failing the batch (D27, arquitetura 6.3)`; [T10] `loads on top of the seed without duplicating issuers or assets and keeps the seed rows as they are (seed → K5, F9)` | **IT** | nova |
| D59-b | Seed e K5 em qualquer ordem sem duplicar (critério de pronto do K5) | K5 (feito) | n/a | BD: seed depois da carga **falha**; o próprio teste fixa a falha: [T10] `pins the seed failure after the load until the seed reuses existing issuers (K5 → seed)` (espera `violates foreign key constraint "assets_issuer_id_fkey"`). Nenhuma tarefa no plano corrige o seed (só a nota de `backend/README.md:53`). **Achado A-1** | **ST** (BD) | nova |

## 4. Estados de tela do handoff (`claude/handoff-ux.md`)

| ID | Estado | Endpoint | Frontend | Teste que cobre | Status | Antes |
|---|---|---|---|---|---|---|
| H1.1 | Login — padrão | `POST /auth/login` | W2 | BE: [T1] `logs in with the e-mail ...`. FE: [F10] `shows the default state: title, e-mail, password, "Entrar" and the link to sign up` | **IT** | SP |
| H1.2 | Login — credencial inválida | 401 | W2 | BE: [T1] `answers the same 401 for a wrong password and an unknown e-mail (A2)`. FE: [F10] `on 401 shows the invalid-credentials notice, keeps the e-mail and clears the password`; [E1] `shows the invalid-credentials notice on a wrong password` | **IT** | SP |
| H1.3 | Login — sessão expirada | `POST /auth/refresh` 401 | W1, W2 | BE: [T1] `answers 401 to a refresh without cookie`. FE: [F1] `expire clears the session and opens the login with the expired-session notice`; [F10] `shows the expired-session notice when the refresh was refused` | **IT** | SP |
| H1.4 | Login — carregando | — | W2 | FE: [F10] `shows the loading state while signing in, then opens the portfolios` | **IT** | SP |
| H1.5 | Login — muitas tentativas (429) | 429 | W2 | BE: [T11] `answers 429 problem+json after 5 login attempts per minute from the same client`. FE: [F10] `on 429 shows the too-many-attempts notice and keeps what was typed`; [E10] `the 6th wrong login in a minute shows the too-many-attempts notice` | **IT** | nova |
| H2.1 | Cadastro — padrão | `POST /auth/register` | W2 | FE: [F11] `shows the default state with the RN01 minimum as the password helper, before any error` | **IT** | SP |
| H2.2 | Cadastro — erro de campo | 400/409 | W2 | FE: [F11] `shows each 400 error under its field with the params of the API (D56)`; [E1] `shows the 409 of a registered e-mail under the e-mail field` | **IT** | SP |
| H2.3 | Cadastro — carregando | — | W2 | FE: [F11] `shows the loading state, then enters signed in on the portfolios` | **IT** | SP |
| H2.4 | Cadastro — muitas tentativas (429) | 429 | W2 | BE: [T11] `answers 429 after 5 sign-up attempts per minute from the same client`. FE: [F11] `on 429 shows the too-many-attempts notice and keeps what was typed` | **IT** | nova |
| H3.1 | Lista — com dados | `GET /portfolios` | W3 | FE: [F12] `shows each portfolio with its assets and operations, only the S1 data (D48)`; [E2] `lists the portfolios of the demo user and opens one from its card` | **IT** | SP |
| H3.2 | Lista — vazio | `GET /portfolios` | W3 | FE: [F12] `guides the creation of the first portfolio, without the "Nova carteira" button`; [E2] `a new account sees the empty state and creates its first portfolio there` | **IT** | SP |
| H3.3 | Lista — nome duplicado | 409 | W3 | FE: [F12] `shows a repeated name (409 ALREADY_EXISTS) in the field and keeps the panel (RN02)` | **IT** | SP |
| H3.4 | Lista — confirmação de exclusão | `DELETE` | W3 | FE: [F12] `says how many operations are deleted and enables "Excluir carteira" only with the name typed` | **IT** | SP |
| H3.5 | Lista — carregando | — | W3 | FE: [F12] `shows the skeleton only after 300 ms without an answer, with "Nova carteira" disabled`; [E2] `shows the skeleton while the list is slow and the error card when it fails (U7a)` | **IT** | SP |
| H3.6 | Lista — mobile | — | W3 | Implementado (`portfolios-page.ts`, classes `md:` nas linhas 74–207). Teste: **não encontrado** (nenhum spec nem E2E em largura < 768 px; `playwright.config.ts` só tem o projeto `Desktop Chrome`). **Achado A-2** | **IST** | SP |
| H3.7 | Lista — tooltip no ícone Excluir (D51) | — | W3 | FE: [F28] `shows the tooltip 300 ms after keyboard focus and hides it on Esc, keeping the focus`; [F12] `opens the portfolio from the name link, with the delete icon above it (D51)` | **IT** | SP |
| H3.8 | Lista — erro (U7a) | 5xx | W3 | FE: [F12] `shows the error card and "Tentar de novo" loads again, with the focus on the title` | **IT** | nova |
| H4.1 | Detalhe — Resumo com dados | `/portfolios/{id}`, `/summary`, `/positions` | W4a | FE: [F13] `shows the totals of the API formatted in pt-BR, ...`; [E3] `shows the totals and the positions of "Longo prazo" ...` | **IT** | SP |
| H4.2 | Detalhe — encerradas + como foi calculado | `/positions` | W4a | FE: [F13] `keeps the closed positions collapsed until "Mostrar", ...`; [E6] `the demo user sees "Longo prazo" with its totals and how the open total was calculated` | **IT** | SP |
| H4.3 | Detalhe — vazio | `/summary`, `/positions` | W4a | BE: [U2] `gives zero totals with no inputs for a portfolio without positions (B7)`. FE: [F13] `shows the empty state of a portfolio without operations`; [E3] `a portfolio without operations shows the empty Resumo and History` | **IT** | SP |
| H4.4 | Detalhe — mobile | — | W4a | FE: [F13] `shows the same values in the mobile cards, grouped by class with the count (handoff U5)` | **IT** | SP |
| H4.5 | Detalhe — carregando | — | W4a | FE: [F13] `shows the skeleton only after 300 ms without an answer (U5)` | **IT** | SP |
| H4.6 | Detalhe — erro (U7a) | 5xx | W4a | FE: [F13] `shows the whole error without the name when any call fails, and loads again on "Tentar de novo" (U7a)`; [E3] `shows the error card when a call of the Detail fails and loads again (U7a)` | **IT** | nova |
| H5.1 | Formulário — criar, busca de ativo | `GET /assets`, `GET /brokers` | W4b | FE: [F18] `searches the catalog as the user types and lists ticker, issuer and class`; [F18] `picks with the arrows and Enter, without sending the form` | **IT** | SP |
| H5.2 | Formulário — compra, Resumo | `preview` | W4b | BE: [T7] `gives the same position and PM after a buy as saving it does (D42)`. FE: [F17] `shows the values of a buy as the API sends them, each with its ⓘ` | **IT** | SP |
| H5.3 | Formulário — venda, lucro estimado | `preview` | W4b | BE: [T7] `gives the same position, PM and realized profit after a sell as saving it does (D42, RN06)`. FE: [F17] `shows the sell: net value, PM that does not change and the estimated profit (RN06)` | **IT** | SP |
| H5.4 | Formulário — erro de campo | 400 | W4b | FE: [F16] `shows the field errors by code on submit and focuses the first invalid field (D56)` | **IT** | SP |
| H5.5 | Formulário — RN07 no Resumo | `preview`; 422 | W4b | BE: [T7] RN07 (seção 2). FE: [F17] `RN07: negative border, position "→ —", no PM line, the note instead of the profit`; [E4] RN07 (seção 2) | **IT** | SP |
| H5.6 | Formulário — editar | `GET\|PATCH /operations/{operationId}` | W4b | FE: [F16] `edits: fills the form from the GET, previews replacing it, confirms and goes to the History` | **IT** | SP |
| H5.7 | Formulário — editar, RN10 | `PATCH` 422; `preview` | W4b | FE: [F16] `edits to 40 units: the RN10 of the preview names the edit and blocks the save`; [F17] `RN10 in the edit mode: all the values, the note and the heading with the asset`; [E4] `editing the MXRF11 buy of 08/01 to 40 units shows the RN10 and saves nothing` | **IT** | SP |
| H5.8 | Formulário — sucesso | 201 | W4b | FE: [F16] `saves, shows the notice and starts a new operation keeping type and broker (frame "sucesso")` | **IT** | SP |
| H5.9 | Formulário — erros, renda fixa | 400 `INVALID_STEP` | W4b | FE: [F19] `quantity by class: ...`; [F25] `shows today as dd/mm/aaaa and the step in pt-BR (RN04, D54, D56)` | **IT** | SP |
| H5.10 | Formulário — erros, cripto | 400 `TOO_MANY_DECIMALS` | W4b | FE: [F19] `quantity by class: ...`; [F16] `checks the quantity again by the class of the new asset (RN04, D55)` | **IT** | SP |
| H5.11 | Formulário — operação não existe mais | 404; `NOT_FOUND` na prévia | W4b | FE: [F16] `says the operation no longer exists when the GET answers 404, with the save disabled`; [F17] `says there is no summary when the operation no longer exists` | **IT** | SP |
| H5.12 | Formulário — mobile (Resumo dentro do formulário, antes dos botões) | — | W4b | Implementado (`operation-form-page.ts:452-470`, sinal `wide` por `matchMedia('(min-width: 768px)')`; template nas linhas 319 e 338). Teste: **não encontrado** (nenhum spec troca o `matchMedia`; nenhum E2E mobile). **Achado A-2** | **IST** | SP |
| H5.13 | Resumo — calculando (U7a) | — | W4b | FE: [F17] `shows "Calculando…" with the fixed labels and no values (U7a)`; [F16] `shows "Calculando…" only when the preview takes longer than 300 ms` | **IT** | nova |
| H5.14 | Resumo — prévia indisponível (U7a) | 5xx na prévia | W4b | FE: [F16] `keeps the save enabled when the preview fails, and calculates again on demand`; [F17] `offers "Calcular de novo" when the preview is unavailable` | **IT** | nova |
| H6.1 | Histórico — com dados | `GET /operations`, `lastTradeDate` | W4a | FE: [F15] `lists the operations most recent first, formatted by class, with the header and 7 fixed chips`; [F15] `loads the next 50 with "Carregar mais", keeping the filters` | **IT** | SP |
| H6.2 | Histórico — vazio | `lastTradeDate` null | W4a | FE: [F15] `shows the empty state of a portfolio without operations, without filters` | **IT** | SP |
| H6.3 | Histórico — renda fixa e cripto | `GET /operations` | W4a | FE: [F15] `lists the operations most recent first, formatted by class, ...` | **IT** | SP |
| H6.4 | Histórico — filtrado por tipo | `?assetType=FII` | W4a | FE: [F15] `filters by asset class on the backend and counts against all the operations (D45)` | **IT** | SP |
| H6.5 | Histórico — filtro sem resultado | total 0 | W4a | FE: [F15] `shows "filtro sem resultado" for a chip without operations and clears the filters` | **IT** | SP |
| H6.6 | Histórico — confirmação de exclusão | `DELETE` | W4b | FE: [F15] `deletes after the confirmation and loads the list again`; [F15] `sends nothing when the confirmation is cancelled (C3)` | **IT** | SP |
| H6.7 | Histórico — rejeição RN10 | `DELETE` 422 | W4b | FE: [F15] `shows the RN10 of a refused deletion and puts the purchase in evidence`; [E4] `refuses to delete a buy a later sell needs (RN10) ...` | **IT** | SP |
| H6.8 | Histórico — mobile (cartões) | — | W4a | Implementado (`operation-history-page.ts:280`, `<ul class="... md:hidden">`). Teste: **não encontrado** (nenhum spec lê a lista de cartões; nenhum E2E mobile). **Achado A-2** | **IST** | SP |
| H6.9 | Histórico — carregando | — | W4a | FE: [F15] `shows the skeleton only after 300 ms without an answer (U5)` | **IT** | nova |
| H6.10 | Histórico — erro (U7a) | 5xx | W4a | FE: [F15] `keeps the header and replaces filters and list by the error card, then loads again (U7a)` | **IT** | nova |
| H7.1 | Catálogo — inicial | `GET /assets` | W4a | FE: [F14] `lists the catalog with code, name, sector and class; ticker or name when there is none (D50)` | **IT** | SP |
| H7.2 | Catálogo — com resultado | `?search=` | W4a | FE: [F14] `searches by ticker or issuer after a pause in typing, counting what it found` | **IT** | SP |
| H7.3 | Catálogo — sem resultado | `{items: [], total: 0}` | W4a | FE: [F14] `shows "sem resultado" with the search and clears it back to the catalog` | **IT** | SP |
| H7.4 | Catálogo — escolher carteira | `GET /portfolios` | W4b | FE: [F14] `asks which portfolio when there are more, the first one chosen`; [F30] `opens as a dialog named by its question, with the focus on the first portfolio` | **IT** | SP |
| H7.5 | Catálogo — mobile | — | W4a | FE: [F14] `has the + of each row named by the asset, and the text button on the mobile cards` | **IT** | SP |
| H7.6 | Catálogo — carregando | — | W4a | FE: [F14] `shows the skeleton only after 300 ms without an answer (U5)` | **IT** | nova |
| H7.7 | Catálogo — erro (U7a) | 5xx | W4a | FE: [F14] `keeps the search in the field on error and searches again on "Tentar de novo" (U7a)` | **IT** | nova |
| HC1 | `DerivedValueExplainer` (9 `formulaCode`, U7a) | `DerivedValue` | W4 | FE: [F20] `has the texts of every formulaCode of the API`; [F21] `closes on Esc (the cancel event of the dialog)` | **IT** | SP |
| HC2 | `BusinessRuleError` (RN07; RN10 com 4 origens) | 422 / `violation` | W4b | FE: [F22] `RN10 by the 4 actions of the user: same table and link, the text of each action`; [F22] `is polite in the preview (D42) and has no link on RN07` | **IT** | SP |
| HC3 | `ConfirmDialog` (excluir carteira, editar e excluir operação) | — | W3, W4 | FE: [F23] `opens as a modal alertdialog named by its title and described by its text`; [F23] `Esc cancels and the focus goes back to the button that opened it` | **IT** | SP |
| HL.1 | Shell — 404 | 404 problem+json | W1 | BE: [T6] `an unknown route answers 404 in problem+json`. FE: [F5] `explains the page does not exist and links back to Carteiras`; [E9] `opens the shell with the 404 page for an unknown address` | **IT** | IT |
| HL.2 | Shell — falha de conexão | `GET /health` | W1 | BE: [T6] `GET /api/v1/health answers 200 with the database up`. FE: [F4] `shows the connection failure in a status region when the server is unreachable`; [F8] `10 s without a response turns on the connection failure (handoff U5)` | **IT** | IT |
| HL.3 | Shell — menu mobile | — | W1 | FE: [F3] `the mobile menu opens a sheet with the same items and closes on navigation` | **IT** | IT |
| HL.4 | Shell — menu do usuário (Sair) | `POST /auth/logout` | W1 | BE: [T1] `logs out: 204, cookie cleared, and the refresh token no longer works`. FE: [F3] `opens the user menu with name, e-mail and Sair, and Sair signs out` | **IT** | IT |
| HU5 | Acessibilidade (axe claro/escuro, fluxo só com teclado) | — | R1 | FE: [E8] `form with Resumo, edit mode with RN10 and the confirmation dialogs have no serious or critical WCAG 2.1 AA violation (${colorScheme})` e os demais testes com axe em [E1]–[E5], [E9] (19 no total, contados nesta auditoria); [E7] `the main flow works with the keyboard only, with visible focus and the focus back after each dialog (U5)`. Só em 1280 px de largura (Desktop Chrome): reflow a 320 px e zoom de 200% sem teste (achado A-2) | **IT** | SP |

## (a) Requisitos sem tarefa no plano

| Requisito | Origem | Evidência | Situação desde 12/11 |
|---|---|---|---|
| Seed depois da carga do K5 sem falhar ("seed e K5 em qualquer ordem") | Critério de pronto do K5 (`claude/plano-de-acao.md`, linha do K5); `claude/fontes-de-dados.md:170` | [T10] fixa a falha (`backend/test/catalog-ingestion.e2e-spec.ts:107-116`); causa no seed: emissores com `ON CONFLICT (cnpj) DO NOTHING` e ativos com o UUID fixo do emissor do seed (`database/sql/inserts.sql:126`, `:218`, `:254`). O K5 consta "Concluído"; nenhuma tarefa do agente de banco no plano; só a nota de `backend/README.md:53`. O `README.md:48` da raiz diz que o seed "pode rodar mais de uma vez sem duplicar nada", sem a ressalva | **Nova** (achado A-1) |
| Desenvolvimento em equipe | `projetoEngSoftware.md` | Contexto, seção 1: "1 pessoa, com eventual ajuda de uma segunda"; o histórico mostra duas contas (seção d). Nenhuma decisão registra quem compõe a equipe | Continua sem tarefa; a verificar com o usuário |
| Calendário de entregas incrementais | `projetoEngSoftware.md`; PL1 do plano (até 19/11, dono: usuário) | PL1 sem conclusão no plano; contexto, seção 11: "[ ] Obter o calendário" | Ganhou ID e data em 12/11 (PL1); **vencido** |
| ~~Teste de integração que carrega o seed~~ | `agentes/agente-backend.md` | [T9] `enters the 9 operations of the handoff massa with the seed catalog and gets the expected positions and totals (A1, RN05–RN12)` (BK-3, PR #43) | **Resolvido** |

Todos os demais requisitos das seções 1–4 têm tarefa (K0–K5, BK-1–BK-3, W1–W4b, FE-1, FE-2, R1).

## (b) Tarefas sem requisito do S1

| Tarefa | O que entrega sem requisito da lista | Origem |
|---|---|---|
| K1 | `GET /health`, logs estruturados, CORS, helmet, problem+json, Docker | D52; sustenta "arquitetura organizada"; único uso por tela: o shell (HL.2) |
| K2 (parte) | Rotação do refresh token com revogação da família | D39 (segurança). O limite de 5/min ganhou estado de tela (H1.5, H2.4) e deixou esta lista |
| K3 (parte) | `GET /assets/{ticker}` | Sem tela no S1 (página do ativo é do S2) |
| K0 (parte) | Eventos corporativos na linha do tempo | D29, S2; testados em [U1] |
| BK-1, BK-2, BK-3, FE-1, FE-2 | Correções da revisão de 12/11 | Achados A1, A2, M1–M6, B6, B7 de `claude/revisao-es.md`; sustentam exigências de `projetoEngSoftware.md` (testes, documentação) |
| BK-4 | Fronteira entre módulos e dívidas menores | Revisão de 12/11; depois de 06/12 |

## (c) Endpoints sem tela e telas sem endpoint
**Endpoints do `openapi.json` (15 caminhos) sem tela que os use no S1:** só `GET /api/v1/assets/{ticker}` (nenhum `api/fn` gerado é importado para ele em `frontend/src/app`; página do ativo é do S2). `GET /health` e `POST /auth/refresh` não têm frame próprio, mas são usados pelo shell e pelo interceptor. Os outros 14 caminhos são chamados por `frontend/src/app/**` (19 funções do cliente gerado importadas).

**Telas e estados do handoff sem endpoint:** nenhum. A prévia (`POST /portfolios/{id}/operations/preview`) e os 3 `formulaCode` do Resumo entraram no PR #37 e estão no `openapi.json` (enum `FormulaCode` com os 9 códigos).

**Divergência de documento, não de endpoint:** a linha C1 da tabela "Frames do S1" (`claude/handoff-ux.md:25`) ainda lista só 3 variantes, embora o cabeçalho do mesmo arquivo (linha 3) registre os 9 `formulaCode` do U7a; o arquivo e `claude/design-tokens.md:3` ainda citam o `tailwind.config`, que não existe no Tailwind 4 (D58). Achado A-5.

## (d) Exigências de `projetoEngSoftware.md`

| Exigência | Onde é atendida | Evidência | Situação |
|---|---|---|---|
| Sistema minimamente complexo, além de CRUD | Domínio de `backend/src/modules/operations/domain/` (RN04–RN12, prévia D42) | [U1], [U2], [T3], [T7]; concorrência com lock por (carteira, ativo) | Atendida |
| Desenvolvimento em equipe | Histórico do GitHub | **Commits** (`git log`, 223): "Miguel Veloso Garcia <garcia.miguel@unifesp.br>" 138 (26/10–23/11); "Fernanda Italiano" (noreply de `feritaliano`) 68, dos quais 59 com committer "GitHub" (merges pela web, 01/11–23/11) e 9 locais em 23/11; "MiguelVelosoGarcia" (noreply) 16, committer "GitHub" (26/10–11/11); "Claude" 1. **PRs mesclados** (`gh pr list`, 56): autor `MiguelVelosoGarcia` em #1–#8, #14, #15, #21–#24; autor `feritaliano` nos demais 42. **Merges:** `MiguelVelosoGarcia` em #1–#8, #12–#20; `feritaliano` em #9–#11 e #21–#56. Nenhuma aprovação em PR (proteção com 0 aprovações); comentários de outra conta só em #14 (`feritaliano`). A identidade local de commit mudou de "Miguel Veloso Garcia" para "Fernanda Italiano" em 23/11 a pedido do usuário; o histórico não diz quem é quem. Contexto, seção 1, continua com "1 pessoa" | **A verificar com o usuário** (achado A-6) |
| Backend com arquitetura organizada | Camadas e CQRS leve | `backend/src/layer-boundaries.spec.ts`; lint de camadas no job `backend` | Atendida |
| Frontend que se comunica com o backend | W1–W4b pelo cliente gerado do OpenAPI | 14 dos 15 caminhos chamados (seção c); E2E contra a API real em [E1]–[E10] | **Atendida** (era parcial) |
| Interface de usuário interativa | 7 telas, 3 componentes e o shell | 263 specs Vitest (contagem do plano, R1) em 41 arquivos; 42 testes E2E em 10 arquivos (contados nesta auditoria) | **Atendida** (era parcial); estados mobile de 3 telas sem teste (A-2) |
| Regras de negócio implementadas e testadas | K0, K4 (prévia inclusa) | Seções 1–3 | **Atendida** (a prévia faltava em 12/11) |
| Testes automatizados | Jest, Vitest, Playwright + axe | CI `e8e001c` verde nos 4 jobs; 4 checks exigidos na `main` | Atendida |
| Git/GitHub | `feritaliano/projEngSoft` | 56 PRs mesclados; `main` protegida com 4 checks | Atendida |
| Documentação para terceiros entenderem e executarem | `README.md` ("Como rodar", conferido num clone limpo no PR #53), `backend/README.md`, `frontend/README.md`, `docs/roteiro-demonstracao.md` (PR #52) | README cobre banco, API, seed, K5, frontend, uso pela tela e testes | **Atendida** (era parcial), com a afirmação errada sobre reexecutar o seed depois do K5 (A-1) |
| Entregas incrementais e frequentes | PRs por tarefa | 56 PRs entre 26/10 e 23/11; `git tag -l` vazio; `gh release list` vazio; PL1 (calendário) vencido em 19/11; PL4 (decisão M8 sobre tags) aberto | **Parcial** (achado A-7) |

## Correções da auditoria de 12/11
- A linha "Desenvolvimento em equipe" da seção (d) foi dada como "não atendida" só pelo texto do contexto, sem conferir o `git log` e os PRs, que a regra do modo auditoria exige; em 12/11 já havia PRs de duas contas (#9–#13, #16–#20 de `feritaliano`). Refeita acima.
- O código [F7] (E2E do shell) passou a [E9]; os códigos [F12]–[F14] apontavam para specs que só conferiam o título e hoje são outros arquivos (legenda abaixo).

## Achados

| ID | Gravidade | Achado | Evidência | Dono |
|---|---|---|---|---|
| A-1 | média | Seed depois da carga do K5 falha com FK; critério de pronto do K5 ("em qualquer ordem") não cumprido; sem tarefa; README da raiz diz que o seed pode rodar de novo | `backend/test/catalog-ingestion.e2e-spec.ts:107-116`; `database/sql/inserts.sql:112-168` (`ON CONFLICT (cnpj) DO NOTHING`), `:218`, `:254`; `backend/README.md:53`; `README.md:48` | banco de dados (seed); backend (teste fixado) |
| A-2 | média | Estados mobile da Lista, do Formulário e do Histórico sem teste; nenhum E2E nem axe abaixo de 768 px; reflow a 320 px e zoom de 200% (handoff U5) sem verificação | `frontend/playwright.config.ts` (projeto único `Desktop Chrome`); `operation-form-page.ts:452-470`; `operation-history-page.ts:280`; nomes de teste das seções H3.6, H5.12, H6.8 | frontend |
| A-3 | baixa | Ordem das classes diverge: backend FII antes de ETF; frontend ETF antes de FII; D45 e o texto do handoff com FII antes de ETF; prompt do frontend com ETF antes de FII | `backend/src/modules/operations/domain/asset-type.ts:2-9` (usado em `list-positions.use-case.ts:14`); `frontend/src/app/shared/assets/asset-type.ts:3-14` (comentário admite a divergência); `claude/contexto-projeto.md` D45; `claude/handoff-ux.md:34`; `agentes/agente-frontend.md:58` | decisão do usuário |
| A-4 | baixa | Prompt do frontend desatualizado: filtro do Histórico com 4 classes (contra D55) e tabela de tarefas sem o status de W2–R1 | `agentes/agente-frontend.md:38-46`, `:57` e o espelho `.claude/agents/frontend.md:64` | frontend (perfil) |
| A-5 | baixa | Handoff e tokens desatualizados: linha C1 com 3 variantes (são 9); `tailwind.config` citado; `elevation/overlay` "preto 16%" contra `#14171F` do Figma (pendência da seção 11 aberta desde o W1, sem tarefa) | `claude/handoff-ux.md:8`, `:25`; `claude/design-tokens.md:3`, `:91`; contexto, seção 11 ("UX (W1)") | UX/UI |
| A-6 | — (a verificar) | Equipe: histórico com duas contas e três identidades de commit; contexto diz 1 pessoa | Seção (d) | usuário |
| A-7 | baixa | Sem tag nem release; PL1 vencido; PL4 (B1, B3, B4, B9, M8 da revisão de 12/11) sem resposta; checklist de pendências parado em 15/11; pendências da seção 11 do contexto já feitas e ainda abertas (P1-2, preço de cripto, mapeamento D56 do frontend, check `frontend`, prévia no OpenAPI) | `git tag -l`; `gh release list`; `claude/plano-de-acao.md:169-172`; `claude/checklist-pendencias.md:1`; `claude/contexto-projeto.md:374-375`, `:407-408`, `:410` | usuário |

Prompts: `claude/prompts-correcao-s1-auditoria-final.md`.

## Contagem final por status
Total de linhas: **105** (93 em 12/11; +12 novas: 10 estados do U7a/429 e D59-a/b).

| Status | Consolidado | Backend | Frontend | Banco |
|---|---|---|---|---|
| implementado e testado | **101** | 80 | 95 | — |
| implementado sem teste | **3** | 0 | 3 | — |
| só planejado | **0** | 0 | 0 | — |
| sem tarefa | **1** | 0 | 0 | 1 |
| n/a | — | 25 | 7 | 104 |

Por seção (consolidado):

| Seção | IT | IST | SP | ST |
|---|---|---|---|---|
| 1. Itens do produto (14) | 14 | 0 | 0 | 0 |
| 2. RN01–RN12 (12) | 12 | 0 | 0 | 0 |
| 3. Decisões (17) | 16 | 0 | 0 | 1 |
| 4. Estados do handoff (62) | 59 | 3 | 0 | 0 |

Mudança desde 12/11: 83 linhas "só planejado" → 0; as 3 "implementado sem teste" são os estados mobile (A-2); a "sem tarefa" é o seed depois do K5 (A-1).

## Legenda dos arquivos de teste
| Código | Arquivo |
|---|---|
| T1 | `backend/test/auth.e2e-spec.ts` |
| T2 | `backend/test/portfolios.e2e-spec.ts` |
| T3 | `backend/test/operations.e2e-spec.ts` |
| T4 | `backend/test/positions.e2e-spec.ts` |
| T5 | `backend/test/reference-data.e2e-spec.ts` |
| T6 | `backend/test/health.e2e-spec.ts` |
| T7 | `backend/test/preview.e2e-spec.ts` |
| T8 | `backend/test/isolation.e2e-spec.ts` |
| T9 | `backend/test/seed.e2e-spec.ts` |
| T10 | `backend/test/catalog-ingestion.e2e-spec.ts` |
| T11 | `backend/test/auth-rate-limit.e2e-spec.ts` |
| U1 | `backend/src/modules/operations/domain/position-calculator.spec.ts` |
| U2 | `backend/src/modules/operations/domain/position-trace.spec.ts` |
| U3 | `backend/src/modules/operations/domain/operation.spec.ts` |
| U4 | `backend/src/modules/operations/domain/timeline.spec.ts` |
| U6 | `backend/src/modules/operations/application/operations.use-cases.spec.ts` |
| U7 | `backend/src/modules/operations/application/positions.use-cases.spec.ts` |
| U9 | `backend/src/modules/users/domain/credentials.spec.ts` |
| U12 | `backend/src/shared/domain/money.spec.ts` |
| U13 | `backend/src/shared/domain/clock.spec.ts` |
| F1 | `frontend/src/app/core/auth/auth.service.spec.ts` |
| F2 | `frontend/src/app/core/auth/auth.interceptor.spec.ts` |
| F3 | `frontend/src/app/core/layout/app-header.spec.ts` |
| F4 | `frontend/src/app/core/layout/connection-banner.spec.ts` |
| F5 | `frontend/src/app/core/layout/not-found-page.spec.ts` |
| F8 | `frontend/src/app/core/http/error.interceptor.spec.ts` |
| F10 | `frontend/src/app/features/auth/login-page.spec.ts` |
| F11 | `frontend/src/app/features/auth/register-page.spec.ts` |
| F12 | `frontend/src/app/features/portfolios/portfolios-page.spec.ts` |
| F13 | `frontend/src/app/features/portfolios/portfolio-detail-page.spec.ts` |
| F14 | `frontend/src/app/features/assets/assets-page.spec.ts` |
| F15 | `frontend/src/app/features/operations/operation-history-page.spec.ts` |
| F16 | `frontend/src/app/features/operations/operation-form-page.spec.ts` |
| F17 | `frontend/src/app/features/operations/operation-summary.spec.ts` |
| F18 | `frontend/src/app/features/operations/asset-combobox.spec.ts` |
| F19 | `frontend/src/app/features/operations/operation-fields.spec.ts` |
| F20 | `frontend/src/app/shared/derived-value/explanation.spec.ts` |
| F21 | `frontend/src/app/shared/derived-value/derived-value-explainer.spec.ts` |
| F22 | `frontend/src/app/shared/business-rule/business-rule-error.spec.ts` |
| F23 | `frontend/src/app/shared/ui/confirm-dialog.spec.ts` |
| F24 | `frontend/src/app/shared/format/pt-br.spec.ts` |
| F25 | `frontend/src/app/shared/forms/field-errors.pt-BR.spec.ts` |
| F26 | `frontend/src/app/shared/ui/asset-avatar.spec.ts` |
| F27 | `frontend/src/app/features/portfolios/portfolio-header.spec.ts` |
| F28 | `frontend/src/app/shared/ui/icon-button.spec.ts` |
| F30 | `frontend/src/app/features/assets/portfolio-picker.spec.ts` |
| F31 | `frontend/src/app/shared/assets/asset-type.spec.ts` |
| E1 | `frontend/e2e/auth.spec.ts` |
| E2 | `frontend/e2e/portfolios.spec.ts` |
| E3 | `frontend/e2e/portfolio-detail.spec.ts` |
| E4 | `frontend/e2e/operations.spec.ts` |
| E5 | `frontend/e2e/assets.spec.ts` |
| E6 | `frontend/e2e/journey.spec.ts` |
| E7 | `frontend/e2e/keyboard.spec.ts` |
| E8 | `frontend/e2e/a11y.spec.ts` |
| E9 | `frontend/e2e/shell.spec.ts` |
| E10 | `frontend/e2e/rate-limit.spec.ts` (roda em passo próprio do job `e2e`, `npm run e2e:rate-limit`, `.github/workflows/ci.yml:320`) |
