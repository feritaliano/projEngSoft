# Matriz de rastreabilidade do S1

> Auditoria de requisitos de 12/11/2026. Código conferido na `main` em `f2f1dd2` (merge do PR #19, W1; inclui o PR 2 do K4). Grafo do código gerado com o Graphify 0.9.105 (`graphify extract . --code-only`, 2.049 nós) e consultado antes da busca textual (D53); os nomes de teste são strings de `it(...)`, que o AST não extrai, por isso vieram de leitura literal dos `.spec.ts`. Estado dos frames lido no Figma só para o Histórico (19:548). **Nenhum teste foi executado nesta auditoria**: "testado" significa que existe teste com o nome citado que exercita o requisito; resultado de CI e cobertura não foram reconferidos aqui.

Fontes: `claude/contexto-projeto.md` (seções 4, 5, 6, 11), `projetoEngSoftware.md`, `claude/plano-de-acao.md`, `agentes/agente-backend.md`, `agentes/agente-frontend.md`, `claude/handoff-ux.md`, `backend/openapi/openapi.json`.

## Como ler
- **Status por camada** (`BE` = backend, `FE` = frontend): implementado e testado / implementado sem teste / só planejado / sem tarefa / n/a (a camada não tem papel no requisito).
- **Status consolidado** = o pior entre as camadas aplicáveis (sem tarefa < só planejado < implementado sem teste < implementado e testado). Um requisito com tela só fica "implementado e testado" quando a tela também está.
- **Frame**: número da tela do handoff e `node-id` do Figma (arquivo `71YUqOEoUNi1HIPcLZd0qo`).
- **Teste**: `[código]` do arquivo (legenda no fim) + nome do teste entre crases, como está no código (`%s` = `it.each`).
- Requisitos compostos foram quebrados em linhas (ex.: B13a/B13b) quando uma parte está feita e outra não.

## 1. Itens do produto do S1

| ID | Requisito | Backend | Endpoint | Frontend | Frame | Teste que cobre | Status |
|---|---|---|---|---|---|---|---|
| A1 | Cadastro (nome, e-mail único, senha ≥ 8) | K2 | `POST /auth/register` | W2 | 2 (5-153) | BE: [T1] `signs up: 201, logged in, password stored only as an argon2id hash, refresh token only as SHA-256 (RN01, D39)`; [T1] `sign-up rejects %s: 400 problem+json with errors[].field and code (RN01, D56)`. FE: não encontrado (não há página de cadastro; rota inexistente em `app.routes.ts`) | **só planejado** (BE: implementado e testado; FE: só planejado) |
| A2 | Login com JWT | K2 | `POST /auth/login`, `/refresh`, `/logout` | W2 (tela); W1 (sessão) | 1 (5-42) | BE: [T1] `logs in with the e-mail in any casing and the token opens protected routes (A2)`; [T1] `answers the same 401 for a wrong password and an unknown e-mail (A2)`. FE: sessão em [F1] `starts signed out and keeps the session given by login or register`; tela: só [F12] `shows the page title` (placeholder: `login-page.ts` comentado como atalho do W1) | **só planejado** (BE: implementado e testado; FE: só planejado) |
| B1 | Várias carteiras: criar, listar, excluir; nome único | K3 | `GET\|POST /portfolios`, `GET\|DELETE /portfolios/{id}` | W3 | 3 (6-77), C3 (3-178) | BE: [T2] `sign-up → login → create → list → delete (B1)`; [T2] `rejects a duplicated name with 409 field "name", only for the same user (RN02)`. FE: só [F13] `shows the page title` (placeholder) | **só planejado** (BE: implementado e testado; FE: só planejado) |
| B2 | Lançamento de compra e venda (data, quantidade, preço, custos, corretora) | K4 PR1 | `POST /portfolios/{id}/operations` | W4 | 5 (17-288) | BE: [T3] `enters an operation (201) and reads it back for the edit form (B2, D41)`. FE: não encontrado | **só planejado** (BE: implementado e testado; FE: só planejado) |
| B3 | Bloqueio de venda acima da posição | K0, K4 PR1 | `POST /portfolios/{id}/operations` (422) | W4 | 5 RN07 (17-457), C2 (3-148) | BE: [U1] `rejects a sell above the position and identifies it (RN07)`; [T3] `rejects a sell above the position (RN07) with the offending operation, and saves nothing`. FE: não encontrado | **só planejado** (BE: implementado e testado; FE: só planejado) |
| B4 | Edição e exclusão retroativa com recálculo; bloqueio se a posição ficar negativa | K0, K4 PR1 | `GET\|PATCH\|DELETE /portfolios/{id}/operations/{operationId}` | W4 | 5 editar (110-2268), 5 editar RN10 (17-549), 6 exclusão (19-822), 6 RN10 (19-1061), C3 | BE: [T3] `edits only the fields sent, keeps the entry order and recalculates (B4)`; [T3] `rejects an edit that leaves a later sell without units (RN10), naming the later sell, and changes nothing`; [T3] `rejects deleting a buy that a later sell needs (RN10, frame 6)`. FE: não encontrado | **só planejado** (BE: implementado e testado; FE: só planejado) |
| B5 | Histórico com filtro por ativo e corretora | K4 PR1 | `GET /portfolios/{id}/operations?assetId=&brokerId=&assetType=` | W4 | 6 (19-547); campos de filtro 19:576 e 19:581 | BE: [T3] `enters the 9 operations of the handoff and lists them most recent first, 50 per page (B5, frame 6)`; [T3] `filters the history in the query, on every page (D45)` (cobre `assetId`, `brokerId`, `assetType`). FE: não encontrado | **só planejado** (BE: implementado e testado; FE: só planejado) |
| B6 | Posição por ativo: quantidade, PM, custo total, lucro realizado | K0, K4 PR2 | `GET /portfolios/{id}/positions` | W4 | 4 (7-188) | BE: [U1] `%s matches the screens` (massa de 9 operações); [T4] `buy → sell → position: PM kept by the sell, realized profit with its trace (RN05, RN06, D26)`. FE: não encontrado | **só planejado** (BE: implementado e testado; FE: só planejado) |
| B7 | Totais da carteira | K4 PR2 | `GET /portfolios/{id}/summary` | W4 | 4 indicadores (44-1178) | BE: [T4] `totals the massa of the frames and matches the sum of the rows (D41)`; [U7] `totals the rows of the positions table: realized profit equals their sum`. FE: não encontrado | **só planejado** (BE: implementado e testado; FE: só planejado) |
| B13a | "Como foi calculado" nas posições e nos totais (`DerivedValue`) | K4 PR2 | `positions`, `summary` (`FormulaCode`: AVG_PRICE_BUY, TOTAL_COST, REALIZED_PROFIT, POSITION_REALIZED_PROFIT, PORTFOLIO_TOTAL_COST, PORTFOLIO_REALIZED_PROFIT) | W4 (`DerivedValueExplainer`) | C1 (3-112), 4 (87-1881) | BE: [U2] `traces an open position: AVG_PRICE_BUY by the buy and TOTAL_COST = quantity × PM (RN05)`; [U2] `makes the realized profit the sum of the rows with profit ≠ 0, open and closed, each linking to its trace (D41)`. FE: não encontrado | **só planejado** (BE: implementado e testado; FE: só planejado) |
| B13b | "Como foi calculado" no Resumo da operação (OPERATION_GROSS, OPERATION_TOTAL_BUY, OPERATION_NET_SELL) | K4 PR3 | `POST /portfolios/{id}/operations/preview` — **ausente do `openapi.json`**; os 3 códigos **ausentes** do enum `FormulaCode` | W4 | 5 (27-1086, 27-1218) | não encontrado | **só planejado** (BE: só planejado; FE: só planejado) |
| C1 | Catálogo de ativos com emissor e setor; busca por ticker ou nome | K3 | `GET /assets`, `GET /assets/{ticker}` | W4 | 7 (20-706); 5 busca (17-289) | BE: [T5] `searches by ticker ignoring case (C1)`; [T5] `searches by issuer name ignoring case and accents (C1, unaccent)`. FE: só [F14] `shows the page title` (placeholder) | **só planejado** (BE: implementado e testado; FE: só planejado) |
| I1 (D55) | Renda fixa sem preço: catálogo, operações (múltiplo de 0,01), posição pelo custo, totais, histórico | K3, K4 PR1, K4 PR2 | `/assets`, `/operations`, `/positions`, `/summary` | W4 | 6 RF e cripto (45-1212), 5 erros RF (142-2336) | BE: [T5] `finds fixed income, which has no ticker, by the issuer name (D50)`; [T3] `accepts fractional quantities of crypto (8 places) and fixed income (0.01), D44`; [T4] `lists fixed income and crypto by display name and asset class, quantities as decimal strings (D55)`; [U8] `accepts the asset type %s (D45, D50)`. FE: não encontrado | **só planejado** (BE: implementado e testado; FE: só planejado) |
| I2 (D55) | Cripto sem preço: catálogo, operações (até 8 casas), posição pelo custo, totais, histórico | K3, K4 PR1, K4 PR2 | `/assets`, `/operations`, `/positions`, `/summary` | W4 | 6 RF e cripto (45-1212), 5 erros cripto (142-2429) | BE: [U11] `shows the name of a crypto asset`; [T3] `accepts fractional quantities of crypto (8 places) and fixed income (0.01), D44`; [U1] `sells part of a fractional position and rejects selling 0.00000001 more than held (RN07, D44)`; [T4] `lists fixed income and crypto by display name and asset class, quantities as decimal strings (D55)`. FE: não encontrado | **só planejado** (BE: implementado e testado; FE: só planejado) |

## 2. Regras de negócio RN01–RN12

| ID | Requisito | Backend | Endpoint | Frontend | Frame | Teste que cobre | Status |
|---|---|---|---|---|---|---|---|
| RN01 | Cadastro: e-mail único sem diferenciar maiúsculas, senha ≥ 8 só como hash | K2 | `POST /auth/register` | W2 | 2 erro de campo (5-185) | BE: [T1] `rejects the same e-mail with other casing: 409 with field "email" (RN01)`; [U9] `rejects fewer than 8 characters (RN01)`; [U10b] `hashes with argon2id and verifies only the right password`. FE: não encontrado | **só planejado** (BE: implementado e testado; FE: só planejado) |
| RN02 | N carteiras; nome único por usuário; acesso só às próprias | K3 | `/portfolios*` (404 para alheia) | W3 | 3 nome duplicado (86-1869) | BE: [T2] `answers 404 to GET and DELETE of another user's portfolio and keeps it (RN02)`; [T3] `answers 404 for a portfolio of another user, a missing one and malformed ids (RN02)`; [T4] `answers 404 for a portfolio of another user, on positions and summary (RN02)`. FE: não encontrado | **só planejado** (BE: implementado e testado; FE: só planejado) |
| RN03 | Ativo: tipo nas 6 classes; ticker por classe; emissor/setor; catálogo só leitura | K3 | `GET /assets` | W4 | 7 | BE: [U4] `recognizes %s` (describe `isAssetType (RN03)`); [U11] `%s → %s` (describe `isTicker (RN03)`); [T5] `lists the active catalog by ticker, fixed income last, with display name, issuer and sector (D50)`. FE: não encontrado | **só planejado** (BE: implementado e testado; FE: só planejado) |
| RN04 | Operação: tipo, corretora obrigatória, data não futura, quantidade por classe, preço > 0, custos ≥ 0 | K4 PR1 | `POST\|PATCH /operations` | W4 | 5 erro de campo (17-382), 142-2336, 142-2429 | BE: [U3] `rejects a %s quantity of %s against the rule of its class with %s (RN04, D50, D56)`; [U3] `rejects an invalid %s with its field and code %s (RN04, D56)`; [T3] `rejects an invalid %s with its field (400, RN04)`. FE: não encontrado | **só planejado** (BE: implementado e testado; FE: só planejado) |
| RN05 | PM da compra inclui custos | K0 | `positions` | n/a (cálculo só no backend) | 4 | BE: [U1] `includes the fees in the average price of the first buy`; [U1] `averages a second buy with the units already held` | **implementado e testado** (BE: implementado e testado; FE: n/a) |
| RN06 | Venda não altera PM; lucro = qtd × preço − custos − qtd × PM | K0 | `positions` | n/a | 4 | BE: [U1] `keeps the average price and realizes qty × price − fees − qty × PM (RN06)`; [U1] `realizes a loss when selling below the average price (RN06)` | **implementado e testado** (BE: implementado e testado; FE: n/a) |
| RN07 | Venda maior que a posição é rejeitada | K0, K4 PR1 | `POST /operations` (422 `violation`) | W4 (`BusinessRuleError`) | 5 (17-457), C2 | BE: [U1] `rejects a sell before any buy (RN07)`; [T3] `serializes two concurrent sells of the same asset: one is saved, the other is RN07 (lock per portfolio and asset)`. FE: não encontrado | **só planejado** (BE: implementado e testado; FE: só planejado) |
| RN08 | Posição zerada zera o PM; recompra reinicia | K0 | `positions` | n/a | 4 (87-1881) | BE: [U1] `restarts the average price on a buy after the position was closed (RN08)`; [T4] `shows a fully sold asset as CLOSED with its realized profit and no PM nor cost (D41, RN08)` | **implementado e testado** (BE: implementado e testado; FE: n/a) |
| RN09 | Posição derivada, ordem cronológica (data, sequence), nunca gravada | K0 | — | n/a | — | BE: [U1] `sorts the timeline by date, whatever the input order`; [U1] `orders operations of the same date by sequence`; [U4] `orders by date, then events before operations, then sequence, then event id` | **implementado e testado** (BE: implementado e testado; FE: n/a) |
| RN10 | Alteração retroativa que deixa posição negativa é rejeitada inteira | K0, K4 PR1 | `POST\|PATCH\|DELETE /operations` (422) | W4 (`BusinessRuleError` com 4 origens) | 5 (17-549), 6 (19-1061), C2 | BE: [U1] `rejects a retroactive sell that invalidates a later sell, pointing at the later one (RN10)`; [T3] `rejects a retroactive sell that makes a later sell exceed the position (RN10)`; [T3] `moves an operation to another asset validating both timelines (RN10)`. FE: não encontrado | **só planejado** (BE: implementado e testado; FE: só planejado) |
| RN11 | Dinheiro em Decimal em todas as camadas; string na API; arredondar só na apresentação | K0–K4 | todos os valores como string | W2–W4 (formatação pt-BR a partir da string) | todos | BE: [U12] `serializes as the full-precision decimal string (RN11)`; [U1] `keeps prices with many decimal places exact`; [U3] `rejects a %s the column would round or overflow (RN11, D56)`. FE: não encontrado (não há pipe de moeda/quantidade em `shared/`) | **só planejado** (BE: implementado e testado; FE: só planejado) |
| RN12 | Posição e PM por carteira e ativo, somando corretoras | K0, K4 PR2 | `positions` | n/a | 4 | BE: [U1] `adds up the same asset bought in different brokers of the portfolio (RN12)`; [T4] `sums the brokers of the portfolio in one position (RN12)` | **implementado e testado** (BE: implementado e testado; FE: n/a) |

## 3. Decisões com comportamento verificável

| ID | Requisito | Backend | Endpoint | Frontend | Frame | Teste que cobre | Status |
|---|---|---|---|---|---|---|---|
| D41-a | Contrato: `operationCount`, posições `CLOSED`, `GET` da operação para editar | K3, K4 PR1, K4 PR2 | `GET /portfolios`, `/positions`, `GET /operations/{operationId}` | W3, W4 | 3, 4, 5 | BE: [T2] `counts operations in the query and open positions from the timeline, then cascades the deletion (D41, RN09)`; [T4] `leaves out a closed position with realized profit exactly 0, in the table and in the totals (D41)`; [T3] `enters an operation (201) and reads it back for the edit form (B2, D41)`. FE: não encontrado | **só planejado** (BE: implementado e testado; FE: só planejado) |
| D41-b | Excluir carteira mostra quantas operações e exige digitar o nome | K3 | `GET /portfolios` (`operationCount`), `DELETE /portfolios/{id}` | W3 | 3 (86-1943), C3 | BE: [T2] `counts operations in the query ... cascades the deletion (D41, RN09)`. FE: não encontrado | **só planejado** (BE: implementado e testado; FE: só planejado) |
| D41-c | Posições encerradas recolhidas no Detalhe | K4 PR2 | `positions` (`status`) | W4 | 4 (87-1881) | BE: [T4] `shows a fully sold asset as CLOSED with its realized profit and no PM nor cost (D41, RN08)`. FE: não encontrado | **só planejado** (BE: implementado e testado; FE: só planejado) |
| D41-d | Navegação só com o que funciona (Carteiras, Ativos), sem "em breve" | — | — | W1 | L (21-818) | FE: [F3] `has a main navigation with only the S1 items: Carteiras and Ativos` | **implementado e testado** (BE: n/a; FE: implementado e testado) |
| D41-e | Catálogo leva a "Lançar operação" com o ativo preenchido | K3 | `GET /assets`, `GET /portfolios` | W4 | 7 escolher carteira (20-1008) | BE: [T5] `lists the active catalog ...`; [T2] `lists only the portfolios of the user, in creation order (RN02)`. FE: não encontrado | **só planejado** (BE: implementado e testado; FE: só planejado) |
| D42 | Prévia da operação calculada no backend, sem gravar; violação antes de salvar | K4 PR3 | `POST /portfolios/{id}/operations/preview` — **ausente do `openapi.json`** | W4 | 5 (27-1086, 27-1218, 17-457) | não encontrado (nem o teste de E2E "prévia não altera o banco" exigido no prompt de backend) | **só planejado** (BE: só planejado; FE: só planejado) |
| D45-a | Filtro do Histórico por tipo de ativo (`assetType`, 6 valores) | K4 PR1 | `GET /operations?assetType=` | W4 (7 chips) | 6 (43-1231, 19-776) | BE: [T3] `filters the history in the query, on every page (D45)`; [T3] `rejects an invalid filter %s with its field (400)`. FE: não encontrado | **só planejado** (BE: implementado e testado; FE: só planejado) |
| D45-b | Posições agrupadas por classe, ordem do frame | K4 PR2 | `positions` (ordem por classe) | W4 | 4 (44-1178) | BE: [U7] `lists open and closed positions by asset class, then display name, leaving out closed with profit 0 (D41, D55)`. FE: não encontrado | **só planejado** (BE: implementado e testado; FE: só planejado) |
| D45-c | Guias Resumo e Histórico (`PortfolioTabs`) | — | — | W4 | 4, 6 (41-1110) | FE: não encontrado | **só planejado** (BE: n/a; FE: só planejado) |
| D45-d | `AssetAvatar` com duas letras e cor da classe | — | — | W4 | 41-1063 | FE: não encontrado | **só planejado** (BE: n/a; FE: só planejado) |
| D54 | "Hoje" = data em America/Sao_Paulo (RN04 e `asOf`) | K4 PR1 | `POST\|PATCH /operations` (`FUTURE_DATE`, `params.today`) | W4 (texto "Até hoje, {data}") | 5 | BE: [U13] `gives today in São Paulo whatever the server time zone (D54)`; [U3] `rejects a trade date after today in São Paulo (RN04, D54)` (confere `params.today`); [U7] `dates the trace with today in São Paulo and names the broker (D54, RN12)`. FE: não encontrado | **só planejado** (BE: implementado e testado; FE: só planejado) |
| D55 | Ativo sem ticker pelo `displayName`; 6 classes no agrupamento e no filtro | K3, K4 | `/assets`, `/operations`, `/positions` | W4 | 6 (45-1212) | BE: [U11] `shows the bond type and the maturity year of fixed income`; [U2] `sends the asset of a fixed income position with ticker null and its display name (D55)`. FE: não encontrado | **só planejado** (BE: implementado e testado; FE: só planejado) |
| D56-a | 400/409 com `errors[{field, code, params}]` em cadastro, login, carteira, operação | K4 PR1 | todos os formulários; enum `FieldErrorCode` no OpenAPI | W2–W4 | 1, 2, 3, 5 | BE: [T1] `sign-up rejects %s: 400 problem+json with errors[].field and code (RN01, D56)`; [T2] `rejects %s with 400 errors[].field and code (D56)`; [U16] `answers 400 with field, code and params for a domain rule (RN04, D56)`; [U15] `reads the limit of the decorator into params (D56)`. FE: [F8] `returns the field errors of a 400 (D56)` só lê o corpo; mapeamento `field`+`code` → microcopy não encontrado | **só planejado** (BE: implementado e testado; FE: só planejado) |
| D56-b | Mesmos códigos na prévia; `replacesOperationId` com `NOT_FOUND` | K4 PR3 | `preview` (ausente) | W4 | 5 (142-2522) | não encontrado | **só planejado** (BE: só planejado; FE: só planejado) |
| D56-c | Operação que não existe mais no modo editar vira aviso no topo | K4 PR1 | 404 em `GET\|PATCH\|DELETE /operations/{operationId}` | W4 | 5 (142-2522) | BE: [U6] `answers not found for a malformed id without touching the store, and for a missing operation`; [T3] `answers 404 for an operation of another portfolio of the same user`. FE: não encontrado | **só planejado** (BE: implementado e testado; FE: só planejado) |

## 4. Estados de tela do handoff (`claude/handoff-ux.md`)

| ID | Requisito | Backend | Endpoint | Frontend | Frame | Teste que cobre | Status |
|---|---|---|---|---|---|---|---|
| H1.1 | Login — padrão | K2 | `POST /auth/login` | W2 | 5-43 | BE: [T1] `logs in with the e-mail in any casing ...`. FE: não encontrado | **só planejado** (BE: implementado e testado; FE: só planejado) |
| H1.2 | Login — credencial inválida | K2 | `POST /auth/login` (401) | W2 | 5-69 | BE: [T1] `answers the same 401 for a wrong password and an unknown e-mail (A2)`. FE: não encontrado | **só planejado** (BE: implementado e testado; FE: só planejado) |
| H1.3 | Login — sessão expirada | K2 | `POST /auth/refresh` (401) | W1 (redirecionamento), W2 (aviso na tela) | 5-98 | BE: [T1] `answers 401 to a refresh without cookie`. FE: redirecionamento em [F1] `expire clears the session and opens the login with the expired-session notice` e [F2] `when the refresh is refused (401), ends the session and goes to the login`; o aviso na tela não encontrado (`login-page.ts` só tem o título) | **só planejado** (BE: implementado e testado; FE: só planejado) |
| H1.4 | Login — carregando | — | — | W2 | 5-127 | FE: não encontrado | **só planejado** (BE: n/a; FE: só planejado) |
| H2.1 | Cadastro — padrão | K2 | `POST /auth/register` | W2 | 5-154 | BE: [T1] `signs up: 201 ...`. FE: não encontrado | **só planejado** (BE: implementado e testado; FE: só planejado) |
| H2.2 | Cadastro — erro de campo | K2, K4 PR1 | 400/409 com `code` | W2 | 5-185 | BE: [T1] `sign-up rejects %s ... (RN01, D56)`. FE: não encontrado | **só planejado** (BE: implementado e testado; FE: só planejado) |
| H2.3 | Cadastro — carregando | — | — | W2 | 5-216 | FE: não encontrado | **só planejado** (BE: n/a; FE: só planejado) |
| H3.1 | Lista — com dados | K3 | `GET /portfolios` | W3 | 47-1470 | BE: [T2] `lists only the portfolios of the user, in creation order (RN02)`. FE: não encontrado | **só planejado** (BE: implementado e testado; FE: só planejado) |
| H3.2 | Lista — vazio | K3 | `GET /portfolios` | W3 | 6-78 | BE: [U18] `lists only the portfolios of the user, with operationCount and assetCount`. FE: não encontrado | **só planejado** (BE: implementado e testado; FE: só planejado) |
| H3.3 | Lista — criar, nome duplicado | K3 | `POST /portfolios` (409) | W3 | 86-1869 | BE: [T2] `rejects a duplicated name with 409 field "name" ...`. FE: não encontrado | **só planejado** (BE: implementado e testado; FE: só planejado) |
| H3.4 | Lista — confirmação de exclusão | K3 | `DELETE /portfolios/{id}` | W3 | 86-1943 | BE: [T2] `counts operations ... cascades the deletion (D41, RN09)`. FE: não encontrado | **só planejado** (BE: implementado e testado; FE: só planejado) |
| H3.5 | Lista — carregando | — | — | W3 | 6-288 | FE: não encontrado | **só planejado** (BE: n/a; FE: só planejado) |
| H3.6 | Lista — mobile | — | — | W3 | 95-1858 | FE: não encontrado | **só planejado** (BE: n/a; FE: só planejado) |
| H3.7 | Lista — tooltip no ícone Excluir (D51) | — | — | W3 | 110-2514 | FE: não encontrado | **só planejado** (BE: n/a; FE: só planejado) |
| H4.1 | Detalhe — Resumo com dados | K3, K4 PR2 | `GET /portfolios/{id}`, `/summary`, `/positions` | W4 | 44-1178 | BE: [T4] `totals the massa of the frames and matches the sum of the rows (D41)`. FE: não encontrado | **só planejado** (BE: implementado e testado; FE: só planejado) |
| H4.2 | Detalhe — encerradas + como foi calculado | K4 PR2 | `/positions` | W4 | 87-1881 | BE: [T4] `shows a fully sold asset as CLOSED ...`. FE: não encontrado | **só planejado** (BE: implementado e testado; FE: só planejado) |
| H4.3 | Detalhe — vazio | K4 PR2 | `/summary`, `/positions` | W4 | 87-2387 | BE: [U2] `gives zero totals with no inputs for a portfolio without positions (B7)`. FE: não encontrado | **só planejado** (BE: implementado e testado; FE: só planejado) |
| H4.4 | Detalhe — mobile | — | — | W4 | 88-2026 | FE: não encontrado | **só planejado** (BE: n/a; FE: só planejado) |
| H4.5 | Detalhe — carregando | — | — | W4 | 87-2819 | FE: não encontrado | **só planejado** (BE: n/a; FE: só planejado) |
| H5.1 | Formulário — criar, busca de ativo | K3 | `GET /assets`, `GET /brokers` | W4 | 17-289 | BE: [T5] `searches by ticker ignoring case (C1)`; [T5] `lists the brokers by name, CNPJ null for an exchange (RN04, D50)`. FE: não encontrado | **só planejado** (BE: implementado e testado; FE: só planejado) |
| H5.2 | Formulário — compra preenchida, Resumo | K4 PR3 | `preview` (ausente) | W4 | 27-1086 | não encontrado | **só planejado** (BE: só planejado; FE: só planejado) |
| H5.3 | Formulário — venda, lucro estimado | K4 PR3 | `preview` (ausente) | W4 | 27-1218 | não encontrado | **só planejado** (BE: só planejado; FE: só planejado) |
| H5.4 | Formulário — erro de campo | K4 PR1 | 400 com `code` | W4 | 17-382 | BE: [T3] `rejects an invalid %s with its field (400, RN04)`. FE: não encontrado | **só planejado** (BE: implementado e testado; FE: só planejado) |
| H5.5 | Formulário — rejeição RN07 (no Resumo, antes de salvar) | K4 PR3 (prévia); PR1 (422 ao salvar) | `preview` (ausente); `POST /operations` 422 | W4 | 17-457 | BE: 422 ao salvar em [T3] `rejects a sell above the position (RN07) ...`; prévia não encontrada. FE: não encontrado | **só planejado** (BE: só planejado; FE: só planejado) |
| H5.6 | Formulário — editar operação | K4 PR1 | `GET\|PATCH /operations/{operationId}` | W4 | 110-2268 | BE: [T3] `edits only the fields sent, keeps the entry order and recalculates (B4)`. FE: não encontrado | **só planejado** (BE: implementado e testado; FE: só planejado) |
| H5.7 | Formulário — editar, rejeição RN10 | K4 PR1 (422); PR3 (prévia com `replacesOperationId`) | `PATCH` 422; `preview` (ausente) | W4 | 17-549 | BE: [T3] `rejects an edit that leaves a later sell without units (RN10) ...`; prévia não encontrada. FE: não encontrado | **só planejado** (BE: só planejado; FE: só planejado) |
| H5.8 | Formulário — sucesso | K4 PR1 | `POST /operations` 201 | W4 | 17-644 | BE: [T3] `enters an operation (201) ...`. FE: não encontrado | **só planejado** (BE: implementado e testado; FE: só planejado) |
| H5.9 | Formulário — erros de campo, renda fixa | K4 PR1 | 400 `INVALID_STEP` | W4 | 142-2336 | BE: [U3] `rejects a %s quantity of %s against the rule of its class with %s (RN04, D50, D56)`. FE: não encontrado | **só planejado** (BE: implementado e testado; FE: só planejado) |
| H5.10 | Formulário — erros de campo, cripto | K4 PR1 | 400 `TOO_MANY_DECIMALS` | W4 | 142-2429 | BE: [U4] `rejects %s quantity %s with %s (D56)`. FE: não encontrado | **só planejado** (BE: implementado e testado; FE: só planejado) |
| H5.11 | Formulário — editar, operação não existe mais | K4 PR1 (404); PR3 (`NOT_FOUND` na prévia) | 404 em `PATCH`; `preview` (ausente) | W4 | 142-2522 | BE: 404 em [U6] `answers not found for a malformed id without touching the store, and for a missing operation`; prévia não encontrada. FE: não encontrado | **só planejado** (BE: só planejado; FE: só planejado) |
| H5.12 | Formulário — mobile | — | — | W4 | 17-725 | FE: não encontrado | **só planejado** (BE: n/a; FE: só planejado) |
| H6.1 | Histórico — com dados | K4 PR1 | `GET /operations`, `GET /portfolios/{id}` (`lastTradeDate`) | W4 | 19-548 | BE: [T3] `enters the 9 operations of the handoff ... (B5, frame 6)`; [U23] `lists the portfolios of the user by creation, with the count and last date of the operations in one query (D41)`. FE: não encontrado | **só planejado** (BE: implementado e testado; FE: só planejado) |
| H6.2 | Histórico — vazio | K4 PR1 | `lastTradeDate` null | W4 | 139-2338 | BE: [U23] idem. FE: não encontrado | **só planejado** (BE: implementado e testado; FE: só planejado) |
| H6.3 | Histórico — com renda fixa e cripto | K4 PR1 | `GET /operations` | W4 | 45-1212 | BE: [T3] `accepts fractional quantities of crypto (8 places) and fixed income (0.01), D44`. FE: não encontrado | **só planejado** (BE: implementado e testado; FE: só planejado) |
| H6.4 | Histórico — filtrado por tipo (FIIs) | K4 PR1 | `?assetType=FII` | W4 | 43-1231 | BE: [T3] `filters the history in the query, on every page (D45)`. FE: não encontrado | **só planejado** (BE: implementado e testado; FE: só planejado) |
| H6.5 | Histórico — filtro sem resultado | K4 PR1 | `?assetType=CRYPTO` → total 0 | W4 | 19-776 | BE: [T3] idem (confere `total` 0). FE: não encontrado | **só planejado** (BE: implementado e testado; FE: só planejado) |
| H6.6 | Histórico — confirmação de exclusão | K4 PR1 | `DELETE /operations/{operationId}` | W4 | 19-822 | BE: [T3] `deletes an operation (204) and the counts of the portfolio follow (K3, D41)`. FE: não encontrado | **só planejado** (BE: implementado e testado; FE: só planejado) |
| H6.7 | Histórico — rejeição RN10 | K4 PR1 | `DELETE` 422 | W4 | 19-1061 | BE: [T3] `rejects deleting a buy that a later sell needs (RN10, frame 6)`. FE: não encontrado | **só planejado** (BE: implementado e testado; FE: só planejado) |
| H6.8 | Histórico — mobile | — | — | W4 | 19-1307 | FE: não encontrado | **só planejado** (BE: n/a; FE: só planejado) |
| H7.1 | Catálogo — inicial | K3 | `GET /assets` | W4 | 20-707 | BE: [T5] `lists the active catalog by ticker ...`. FE: só [F14] `shows the page title` (placeholder) | **só planejado** (BE: implementado e testado; FE: só planejado) |
| H7.2 | Catálogo — com resultado | K3 | `GET /assets?search=` | W4 | 20-875 | BE: [T5] `searches by issuer name ignoring case and accents (C1, unaccent)`. FE: não encontrado | **só planejado** (BE: implementado e testado; FE: só planejado) |
| H7.3 | Catálogo — sem resultado | K3 | `GET /assets?search=` → `{items: [], total: 0}` | W4 | 20-968 | BE: [T5] `treats LIKE wildcards in the search as plain text` (espera lista vazia). FE: não encontrado | **só planejado** (BE: implementado e testado; FE: só planejado) |
| H7.4 | Catálogo — escolher carteira | K3 | `GET /portfolios` | W4 | 20-1008 | BE: [T2] `lists only the portfolios of the user ...`. FE: não encontrado | **só planejado** (BE: implementado e testado; FE: só planejado) |
| H7.5 | Catálogo — mobile | — | — | W4 | 20-1125 | FE: não encontrado | **só planejado** (BE: n/a; FE: só planejado) |
| HC1 | `DerivedValueExplainer` (variantes AVG_PRICE_BUY, TOTAL_COST, REALIZED_PROFIT) | K4 PR2 | `DerivedValue` | W4 | 3-112 | BE: ver B13a. FE: não encontrado | **só planejado** (BE: implementado e testado; FE: só planejado) |
| HC2 | `BusinessRuleError` (RN07, RN10) | K4 PR1 | 422 `violation` | W4 | 3-148 | BE: ver RN07/RN10. FE: não encontrado | **só planejado** (BE: implementado e testado; FE: só planejado) |
| HC3 | `ConfirmDialog` (excluir carteira, editar e excluir operação) | — | — | W3, W4 | 3-178 | FE: não encontrado | **só planejado** (BE: n/a; FE: só planejado) |
| HL.1 | Shell — 404 | K1 | rota inexistente → 404 problem+json | W1 | 21-819 | BE: [T6] `an unknown route answers 404 in problem+json`. FE: [F5] `explains the page does not exist and links back to Carteiras`; [F6] `shows the 404 page inside the shell for an unknown address`; [F7] `opens the shell with the 404 page for an unknown address` | **implementado e testado** (BE: implementado e testado; FE: implementado e testado) |
| HL.2 | Shell — falha de conexão | K1 | `GET /health` | W1 | 21-840 | BE: [T6] `GET /api/v1/health answers 200 with the database up`. FE: [F4] `shows the connection failure in a status region when the server is unreachable`; [F8] `10 s without a response turns on the connection failure (handoff U5)`; [F9] `retry pings the health check and goes back online when the server answers` | **implementado e testado** (BE: implementado e testado; FE: implementado e testado) |
| HL.3 | Shell — menu mobile aberto | — | — | W1 | 21-867 | FE: [F3] `the mobile menu opens a sheet with the same items and closes on navigation`; [F3] `Esc closes the mobile menu and returns the focus to its button` | **implementado e testado** (BE: n/a; FE: implementado e testado) |
| HL.4 | Shell — menu do usuário (Sair) | K2 | `POST /auth/logout` | W1 | 21-890 | BE: [T1] `logs out: 204, cookie cleared, and the refresh token no longer works`. FE: [F3] `opens the user menu with name, e-mail and Sair, and Sair signs out` | **implementado e testado** (BE: implementado e testado; FE: implementado e testado) |
| HU5 | Acessibilidade do handoff (axe claro/escuro, fluxo só com teclado) | — | — | R1 | todos | FE: não encontrado (`@axe-core/playwright` não está no `frontend/package.json`; job `e2e` não existe no CI) | **só planejado** (BE: n/a; FE: só planejado) |

## (a) Requisitos sem tarefa no plano
Nenhum requisito da matriz (itens do S1, RN, decisões, estados do handoff) está sem tarefa: todos têm K0–K4, W1–W4 ou R1. Ficam sem tarefa, fora da matriz principal:

| Requisito | Origem | Evidência | Observação |
|---|---|---|---|
| Teste de integração que carrega o seed e confere as posições esperadas | `agentes/agente-backend.md`, seção Testes | não encontrado (nenhum teste referencia `inserts.sql`) | Não está no critério de pronto do K4; depende do P1 |
| Calendário de entregas incrementais de ES, com K2, K4 e R1 como marcos | `claude/plano-de-acao.md`, "Planejamento (pendente)"; contexto, seção 11 | não encontrado | Item pendente sem ID, data nem dono |
| Desenvolvimento em equipe | `projetoEngSoftware.md` ("desenvolvimento, em equipe") | contexto, seção 1: "1 pessoa, com eventual ajuda de uma segunda" | Nenhuma tarefa ou decisão registra o tratamento dessa exigência com o professor |

Dependência com tarefa fora da trilha de ES e atrasada: o catálogo de referência (setores, emissores, ativos, corretoras, títulos e cripto) que C1, I1 e I2 precisam para funcionar fora dos testes vem do **P1** (BD, prazo 07/11). `database/sql/inserts.sql` **não existe** na `main` (só `ddl.sql`). Sem ele, quem seguir o README sobe o sistema com o catálogo vazio e não consegue lançar operação.

## (b) Tarefas sem requisito do S1
| Tarefa | O que entrega sem requisito da lista | Origem |
|---|---|---|
| K1 (inteira) | `GET /health`, logs estruturados, CORS, helmet, problem+json, Dockerfile e Compose | D52 (fora da lista de decisões pedida); sustenta "arquitetura organizada" de `projetoEngSoftware.md`. Único uso por tela: o shell (HL.2) |
| K2 (parte) | Rotação do refresh token com revogação da família, rate limit de 5/min | D39 e segurança; sem item A1/A2 nem RN correspondente |
| K3 (parte) | `GET /assets/{ticker}` | Sem tela no S1 (ver c) |
| K0 (parte) | Eventos corporativos (desdobramento, grupamento, bonificação) na linha do tempo | D29, etapa S2; testados em [U1] `corporate events (D29)` |

## (c) Endpoints sem tela e telas sem endpoint
**Endpoints do `openapi.json` sem tela que os use no S1:**
- `GET /api/v1/assets/{ticker}`: nenhum frame do S1 consome; a linha do Catálogo leva à página do ativo, que é do S2 em diante.
- `GET /api/v1/health` e `POST /api/v1/auth/refresh` não têm frame próprio, mas são usados pelo shell (falha de conexão, HL.2) e pelo interceptor (sessão expirada, H1.3).

**Telas e estados do handoff sem endpoint no `openapi.json`:**
- Resumo da operação (frame 5: 27-1086, 27-1218; violação antes de salvar em 17-457 e 17-549; aviso de operação inexistente em 142-2522): `POST /portfolios/{id}/operations/preview` não existe (K4 PR3).
- `DerivedValueExplainer` no Resumo: `OPERATION_GROSS`, `OPERATION_TOTAL_BUY` e `OPERATION_NET_SELL` não estão no enum `FormulaCode`.
- Divergência de frame, não de endpoint: o componente C1 (3-112) tem variantes só para AVG_PRICE_BUY, TOTAL_COST e REALIZED_PROFIT; os outros 6 `formulaCode` do S1 existem só em `claude/microcopy.md`.

## (d) Exigências de `projetoEngSoftware.md`
| Exigência | Onde é atendida | Evidência | Situação |
|---|---|---|---|
| Sistema minimamente complexo, além de CRUD | Regras RN04–RN12 no domínio (`backend/src/modules/operations/domain/`) | [U1] 43 declarações de teste do `calculatePosition`; [T3] concorrência com lock por (carteira, ativo) | Atendida no backend |
| Desenvolvimento em equipe | — | contexto, seção 1: 1 pessoa | Não atendida; sem tarefa (ver a) |
| Backend com arquitetura organizada | Camadas domain/application/infrastructure/presentation, CQRS leve | `backend/src/layer-boundaries.spec.ts` `domain imports neither application nor infrastructure` e mais 6; lint de camadas no job `backend` do CI | Atendida |
| Frontend que se comunica com o backend | W1: sessão, refresh, health | [F1], [F2], [F9]; nenhuma tela de feature chama a API (Carteiras, Ativos e Login são placeholders) | Parcial; telas em W2–W4 |
| Interface de usuário interativa | W1: shell, menus, 404, falha de conexão | [F3], [F4], [F5] | Parcial; 7 telas do S1 em W2–W4 |
| Regras de negócio implementadas e testadas | K0, K4 | seções 1–3 desta matriz | Atendida no backend, exceto a prévia (D42) |
| Testes automatizados | Jest (backend), Vitest e Playwright (frontend) | 448 declarações `it`/`it.each` em `backend/src`, 67 em `backend/test`, 56 em `frontend/src`, 1 em `frontend/e2e` (contagem de declarações, não de casos expandidos); não executados nesta auditoria | Atendida; E2E ponta a ponta do frontend só no R1 |
| Git/GitHub | `feritaliano/projEngSoft`, `main` protegida (D38) | 20 PRs (`refs/pull/1` a `20`); CI com jobs `database`, `backend`, `frontend` em `.github/workflows/ci.yml`; job `e2e` não existe | Atendida |
| Documentação para terceiros entenderem e executarem | `README.md` (banco e backend no Docker), `backend/README.md`, `frontend/README.md` | Não há instrução única para subir banco + API + frontend juntos, nem seed para ter catálogo; roteiro de demonstração não existe | Parcial; README de execução e roteiro no R1 (03–06/12), sujeito ao P1 |
| Entregas incrementais e frequentes | PRs por tarefa (K0–K4, W1, D2, D3) | 20 PRs; nenhuma tag nem release no GitHub; calendário de entregas da disciplina não obtido | Parcial: há incrementos no Git, mas nenhum marco de entrega definido nem versão identificável |

## Contagem final por status
Total de linhas: **93**.

| Status | Consolidado | Backend | Frontend |
|---|---|---|---|
| implementado e testado | 10 | 69 | 5 |
| implementado sem teste | 0 | 0 | 0 |
| só planejado | 83 | 8 | 83 |
| sem tarefa | 0 | 0 | 0 |
| n/a | — | 16 | 5 |

Por seção (consolidado):

| Seção | implementado e testado | implementado sem teste | só planejado | sem tarefa |
|---|---|---|---|---|
| 1. Itens do produto do S1 | 0 | 0 | 14 | 0 |
| 2. Regras de negócio RN01–RN12 | 5 | 0 | 7 | 0 |
| 3. Decisões com comportamento verificável | 1 | 0 | 14 | 0 |
| 4. Estados de tela do handoff (`claude/handoff-ux.md`) | 4 | 0 | 48 | 0 |

## Legenda dos arquivos de teste
| Código | Arquivo |
|---|---|
| T1 | `backend/test/auth.e2e-spec.ts` |
| T2 | `backend/test/portfolios.e2e-spec.ts` |
| T3 | `backend/test/operations.e2e-spec.ts` |
| T4 | `backend/test/positions.e2e-spec.ts` |
| T5 | `backend/test/reference-data.e2e-spec.ts` |
| T6 | `backend/test/health.e2e-spec.ts` |
| U1 | `backend/src/modules/operations/domain/position-calculator.spec.ts` |
| U2 | `backend/src/modules/operations/domain/position-trace.spec.ts` |
| U3 | `backend/src/modules/operations/domain/operation.spec.ts` |
| U4 | `backend/src/modules/operations/domain/timeline.spec.ts` |
| U6 | `backend/src/modules/operations/application/operations.use-cases.spec.ts` |
| U7 | `backend/src/modules/operations/application/positions.use-cases.spec.ts` |
| U8 | `backend/src/modules/operations/domain/operation-history.spec.ts` |
| U9 | `backend/src/modules/users/domain/credentials.spec.ts` |
| U10b | `backend/src/modules/users/infrastructure/users.infrastructure.spec.ts` |
| U11 | `backend/src/modules/reference-data/domain/catalog.spec.ts` |
| U12 | `backend/src/shared/domain/money.spec.ts` |
| U13 | `backend/src/shared/domain/clock.spec.ts` |
| U15 | `backend/src/shared/presentation/request-validation.spec.ts` |
| U16 | `backend/src/modules/operations/presentation/operations.controller.spec.ts` |
| U18 | `backend/src/modules/portfolios/application/portfolios.use-cases.spec.ts` |
| U23 | `backend/src/modules/portfolios/infrastructure/prisma-portfolio.repository.spec.ts` |
| F1 | `frontend/src/app/core/auth/auth.service.spec.ts` |
| F2 | `frontend/src/app/core/auth/auth.interceptor.spec.ts` |
| F3 | `frontend/src/app/core/layout/app-header.spec.ts` |
| F4 | `frontend/src/app/core/layout/connection-banner.spec.ts` |
| F5 | `frontend/src/app/core/layout/not-found-page.spec.ts` |
| F6 | `frontend/src/app/app.spec.ts` |
| F7 | `frontend/e2e/shell.spec.ts` |
| F8 | `frontend/src/app/core/http/error.interceptor.spec.ts` |
| F9 | `frontend/src/app/core/http/connection.service.spec.ts` |
| F12 | `frontend/src/app/features/auth/login-page.spec.ts` |
| F13 | `frontend/src/app/features/portfolios/portfolios-page.spec.ts` |
| F14 | `frontend/src/app/features/assets/assets-page.spec.ts` |
