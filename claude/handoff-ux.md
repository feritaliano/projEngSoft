# Handoff UX/UI → Frontend — Carteira B3

> Criado em 26/10/2026 (D38) como modelo; **preenchido pelo agente de UX/UI no U5** (ou no G-U3, em 12/11, com os wireframes do U2). O agente de frontend lê cada tela no Figma pelo link desta tabela, com o plugin Figma do Claude Code. Tela sem link aqui não é implementada.

## Arquivo Figma
- Arquivo do design system e das telas: _(link registrado no U1)_
- Variáveis do Figma: mesmos nomes dos tokens do `tailwind.config` (claro e escuro).

## Telas do S1
| # | Tela | Itens do produto | Link do frame (URL com `node-id`) | Estados (links) | Componentes do design system | Tarefa do frontend |
|---|---|---|---|---|---|---|
| 1 | Login e cadastro | A1–A2 | _(U3)_ | padrão, erro de campo, carregando | | W2 |
| 2 | Lista de carteiras | B1 | _(U3)_ | vazio, carregando, erro, com dados, confirmação de exclusão | | W3 |
| 3 | Detalhe da carteira (posição e totais) | B6, B7, B13 | _(U3)_ | vazio, carregando, erro, com dados | | W4 |
| 4 | Lançamento de operação | B2, B3, C1 | _(U3)_ | padrão, erro de campo, rejeição RN07 | | W4 |
| 5 | Histórico de operações | B4, B5 | _(U3)_ | vazio, filtrado, confirmação de edição/exclusão, rejeição RN10 | | W4 |
| 6 | Fluxos de erro de negócio | B3, B4 | _(U3)_ | RN07, RN10 | | W4 |
| 7 | Busca de ativos | C1 | _(U3)_ | vazio, carregando, sem resultado, com resultado | | W4 |
| 8 | Painel "como foi calculado" | B13 | _(U3)_ | PM, custo total, lucro realizado | | W4 |
| 9 | Layout e navegação | — | _(U3)_ | desktop, mobile | | W1 |

## Divergências conhecidas entre o Figma e o design system
Nenhuma. _(Se houver, liste aqui com a decisão tomada.)_
