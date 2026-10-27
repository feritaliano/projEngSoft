# Handoff UX/UI → Frontend — Carteira B3

> Criado em 26/10/2026 (D38) como modelo; lista de frames atualizada no mesmo dia com as telas aprovadas no U0 (D41). **Preenchido pelo agente de UX/UI no U5** (ou no G-U3, em 12/11, com os wireframes do U2). O agente de frontend lê cada frame no Figma pelo link desta tabela, com o plugin Figma do Claude Code. Frame sem link aqui não é implementado.

## Arquivo Figma
- Arquivo do design system e das telas: _(link registrado no U1)_
- Variáveis do Figma: mesmos nomes dos tokens do `tailwind.config` (claro e escuro).

## Frames do S1
Tela = rota própria. Componente = um único frame reutilizado pelas telas, implementado uma vez em `shared/`. Shell = layout global (`core/`).

| # | Frame | Tipo | Itens do produto | Link do frame (URL com `node-id`) | Estados (links) | Componentes do design system | Tarefa do frontend |
|---|---|---|---|---|---|---|---|
| 1 | Login | Tela | A2 | _(U3)_ | padrão, credencial inválida, carregando, sessão expirada | | W2 |
| 2 | Cadastro | Tela | A1 | _(U3)_ | padrão, erro de campo (e-mail já cadastrado), carregando | | W2 |
| 3 | Lista de carteiras | Tela | B1 | _(U3)_ | vazio, carregando, erro, com dados, confirmação de exclusão (C3) | | W3 |
| 4 | Detalhe da carteira | Tela | B6, B7, B13 | _(U3)_ | vazio, carregando, erro, com dados, posições encerradas expandidas, mobile (cards) | | W4 |
| 5 | Formulário de operação | Tela | B2, B3, B4, C1 | _(U3)_ | criar, editar, erro de campo, rejeição RN07 (C2), rejeição RN10 (C2), sucesso | | W4 |
| 6 | Histórico de operações | Tela | B4, B5 | _(U3)_ | vazio, filtro sem resultado, carregando, erro, confirmação (C3), rejeição RN10 (C2) | | W4 |
| 7 | Catálogo de ativos | Tela | C1 | _(U3)_ | inicial, carregando, sem resultado, com resultado, erro, escolha de carteira ao lançar | | W4 |
| C1 | `DerivedValueExplainer` | Componente | B13 | _(U3)_ | `AVG_PRICE_BUY`, `TOTAL_COST`, `REALIZED_PROFIT` | | W4 |
| C2 | `BusinessRuleError` | Componente | B3, B4 | _(U3)_ | RN07, RN10 | | W4 |
| C3 | `ConfirmDialog` | Componente | B1, B4 | _(U3)_ | excluir carteira (contagem de operações + nome digitado), editar operação, excluir operação | | W3, W4 |
| L | Layout e navegação | Shell | — | _(U3)_ | desktop, mobile, 404, falha de conexão | | W1 |

## Dependências do contrato da API
| Frame | O que precisa do backend | Tarefa do backend |
|---|---|---|
| 3, C3 | `GET /portfolios` devolve `operationCount` de cada carteira | K3 |
| 4 | `GET /portfolios/:id/positions` devolve também as posições encerradas (quantidade 0 e lucro realizado ≠ 0) | K4 |

## Divergências conhecidas entre o Figma e o design system
Nenhuma. _(Se houver, liste aqui com a decisão tomada.)_
