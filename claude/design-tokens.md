# Design tokens — Carteira B3

> Criado em 30/10/2026 (U1); cores de gráfico acrescentadas no mesmo dia (D45); `bg/inverse` passa a ser o fundo do tooltip em 31/10/2026 (D51). Fonte da verdade visual: variáveis do arquivo Figma (https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo, página Fundamentos). O `tailwind.config` do frontend (W1) espelha esta tabela 1:1; nenhum valor visual fora destes tokens. Dono: agente UX/UI; o frontend só lê. Mudança de token muda o Figma e esta tabela na mesma tarefa.

## Convenção de nomes
- Figma: `grupo/subgrupo/nome` (ex.: `color/bg/surface`). CSS: `var(--color-bg-surface)` (sintaxe web já gravada em cada variável). Tailwind: chave aninhada equivalente (ex.: `bg-surface`, `text-secondary`, `border-strong`, `p-4`, `rounded-md`).
- Tema: coleção `Color` com modos **Light** e **Dark**; no front, variáveis CSS trocadas por classe/atributo de tema. `Spacing` e `Radius` têm um valor só.

## Cores (`Color`)
| Token | Light | Dark | Uso |
|---|---|---|---|
| `color/bg/canvas` | #F5F7F9 | #0F1419 | Fundo da página |
| `color/bg/surface` | #FFFFFF | #171C23 | Cartões, tabelas, diálogos |
| `color/bg/subtle` | #EEF1F4 | #20262E | Cabeçalho de tabela, bloco de fórmula, skeleton |
| `color/bg/inverse` | #14181F | #E8ECF1 | Fundo do `Tooltip` (D51) |
| `color/border/default` | #D5DBE2 | #2C343E | Bordas de cartão e divisórias |
| `color/border/strong` | #7A8491 | #6B7684 | Borda de campo e de botão secundário (≥ 3:1) |
| `color/text/primary` | #14181F | #E8ECF1 | Texto principal |
| `color/text/secondary` | #566170 | #A3ADB9 | Texto de apoio, rótulos de coluna |
| `color/text/on-primary` | #FFFFFF | #0B1E24 | Texto sobre `primary/default`, `negative/default` e `bg/inverse` (tooltip) |
| `color/text/link` | #0B5C70 | #7CC7DA | Links e ações terciárias |
| `color/primary/default` | #0B5C70 | #5BB4CB | Botão principal, seleção |
| `color/primary/hover` | #08475A | #7CC7DA | Hover do botão principal |
| `color/primary/subtle` | #E2F0F3 | #12333C | Item selecionado, linha destacada |
| `color/positive/text` | #1A6B3B | #6FCF97 | Ganho (sempre com sinal +) |
| `color/positive/subtle` | #E5F4EB | #12291C | Fundo de sucesso |
| `color/negative/text` | #B3261E | #F28B82 | Perda (sempre com sinal −), erro, ação destrutiva em texto |
| `color/negative/subtle` | #FCEBE9 | #3A1714 | Fundo do `BusinessRuleError` |
| `color/negative/default` | #B3261E | #E5675C | Botão Danger, borda de erro |
| `color/warning/text` | #8A5100 | #F0B35A | Aviso, badge Venda |
| `color/warning/subtle` | #FFF3DD | #33240A | Fundo de aviso (sessão expirada) |
| `color/focus/ring` | #2563EB | #6EA8FE | Anel de foco (teclado) |
| `color/overlay/scrim` | #14181F | #000000 | Fundo de diálogo, com 55% de opacidade |

Contraste conferido por cálculo em 30/10/2026 (WCAG 2.1): todos os pares de texto ≥ 5,2:1 nos dois temas (mínimo AA 4,5:1); bordas de campo e anel de foco ≥ 3,3:1 (mínimo 3:1). A auditoria completa é do U5.

## Cores de gráfico (`Color`, D45)
Uma cor por classe de ativo e por série, sempre na mesma ordem (nunca reatribuída por posição). Validadas com o validador de paleta (diferença para daltonismo ≥ 8 entre cores vizinhas; visão normal ≥ 19). No claro, `chart/3`, `chart/4` e `chart/5` ficam abaixo de 3:1 sobre o branco: todo gráfico tem legenda e rótulos visíveis, e a cor nunca é o único sinal.

| Token | Light | Dark | Classe / série |
|---|---|---|---|
| `color/chart/1` | #2A78D6 | #3987E5 | Ações · Carteira |
| `color/chart/2` | #EB6834 | #D95926 | FIIs · CDI · Valor aplicado |
| `color/chart/3` | #1BAF7A | #199E70 | ETFs · Ibovespa |
| `color/chart/4` | #EDA100 | #C98500 | BDRs · IPCA (linha tracejada) |
| `color/chart/5` | #E87BA4 | #D55181 | Renda fixa |
| `color/chart/6` | #008300 | #008300 | Cripto |

## Espaçamento (`Spacing`)
| Token | px | Tailwind |
|---|---|---|
| `spacing/1` | 4 | `1` |
| `spacing/2` | 8 | `2` |
| `spacing/3` | 12 | `3` |
| `spacing/4` | 16 | `4` |
| `spacing/5` | 20 | `5` |
| `spacing/6` | 24 | `6` |
| `spacing/8` | 32 | `8` |
| `spacing/10` | 40 | `10` |
| `spacing/12` | 48 | `12` |

## Raio (`Radius`)
| Token | px | Uso |
|---|---|---|
| `radius/sm` | 4 | Itens internos (opção de menu, segmento) |
| `radius/md` | 6 | Botões, campos, banners |
| `radius/lg` | 8 | Cartões e tabelas |
| `radius/xl` | 12 | Diálogos |
| `radius/full` | 9999 | Badges, chips |

## Tipografia (estilos de texto, fonte Inter)
| Estilo | Peso | Tamanho / altura de linha (px) | Uso |
|---|---|---|---|
| `heading/xl` | Semi Bold | 28 / 36 | Título da página (desktop) |
| `heading/lg` | Semi Bold | 22 / 30 | Título da página (mobile), estado vazio |
| `heading/md` | Semi Bold | 18 / 26 | Título de cartão, diálogo |
| `heading/sm` | Semi Bold | 15 / 22 | Título de bloco |
| `body/md` | Regular | 14 / 20 | Texto corrido, valores de campo |
| `body/sm` | Regular | 13 / 18 | Texto de apoio |
| `label/md` | Medium | 14 / 20 | Botões, rótulos, links |
| `label/sm` | Medium | 12 / 16 (+2% tracking) | Cabeçalho de coluna, rótulos pequenos |
| `caption` | Regular | 12 / 16 | Fonte e data, texto de ajuda |
| `numeric/lg` | Semi Bold | 24 / 32 | Totais em destaque |
| `numeric/md` | Medium | 14 / 20 | Números em tabela |

Números sempre com `font-variant-numeric: tabular-nums`.

## Efeitos
| Estilo | Valor | Uso |
|---|---|---|
| `elevation/overlay` | sombra 0 8 24, preto 16% | Painel "como foi calculado", diálogos, menus suspensos |
