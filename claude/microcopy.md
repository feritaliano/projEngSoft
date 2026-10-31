# Microcopy — "como foi calculado" (U4)

> Criado em 31/10/2026 pelo agente de UX/UI (tarefa U4). Fonte única dos textos do `DerivedValueExplainer` (C1) e dos ⓘ do S1. O frontend gera a partir desta tabela um dicionário indexado por `formulaCode` (`frontend/src/app/shared/derived-value/microcopy.pt-BR.ts`) e não escreve esses textos nos templates (D26, arquitetura 7.5). Mudança de texto = mudança neste arquivo.

## 1. Como o componente monta o painel
O backend devolve todo número derivado como `DerivedValue` = `{ value, formulaCode, inputs: [{ name, value, source, referenceDate }], asOf }` (arquitetura, seção 7). O painel é sempre o mesmo, de cima para baixo:

| Parte do painel | De onde vem |
|---|---|
| Título "Como foi calculado" e botão "Fechar" | fixo (seção 2) |
| Rótulo do número + ativo (ex.: "Preço médio (PM) · PETR4") | **Rótulo** da tabela da seção 3 + ticker do contexto |
| Valor | `value`, formatado em pt-BR (R$ com 2 casas; quantidade sem casas no S1) |
| "Fórmula" | **Fórmula** da seção 3 |
| "Valores usados" | um item por `inputs[]`: rótulo pela **chave** `name` (seção 3), valor formatado, linha de origem montada de `source` + `referenceDate` (seção 2) |
| "Conta" | **Conta** da seção 3 com os valores dos insumos; preço médio intermediário com 4 casas, resultado com 2 |
| Texto explicativo | **Explicação** da seção 3 (no máximo 2 frases) |
| Rodapé | fixo (seção 2) com `asOf` |

O botão ⓘ ao lado de um número tem `aria-label` = "Como foi calculado: {Rótulo}". A chave `name` de cada insumo é contrato com o backend (K4): o backend usa exatamente as chaves da seção 3.

## 2. Textos fixos

| Elemento | Texto |
|---|---|
| Título do painel | Como foi calculado |
| Botão de fechar | Fechar |
| Seções | Fórmula · Valores usados · Conta |
| Rodapé | Calculado em {asOf dd/MM/aaaa} a partir das suas operações nesta carteira. |
| Origem: posição até uma data | Suas operações até {dd/MM/aaaa} |
| Origem: uma operação | {Compra \| Venda} de {dd/MM/aaaa} · {corretora} |
| Origem: outro número derivado | Ver cálculo do {rótulo em minúsculas} (link que troca o painel para o `DerivedValue` do insumo) |
| Origem: posição de um ativo (somas da carteira) | {ticker} · {aberta \| encerrada} |
| Resumo da operação, sem campos válidos | Preencha ativo, data, quantidade e preço para ver o resumo. |
| Resumo da operação, cabeçalho | Calculado pelo servidor a partir das suas operações. Nada foi salvo ainda. |
| Resumo da operação, prévia indisponível | Não deu para calcular o resumo agora. Você ainda pode salvar: o servidor confere tudo de novo ao salvar. |
| Insumo indisponível (valor ausente) | — |

## 3. Tabela por `formulaCode`

| `formulaCode` | Onde aparece | Rótulo | Fórmula | Valores usados (chave `name` → rótulo) | Conta | Explicação |
|---|---|---|---|---|---|---|
| `AVG_PRICE_BUY` | Detalhe (coluna Preço médio); Formulário (Resumo, PM depois da compra) | Preço médio (PM) | PM = (qtd. anterior × PM anterior + qtd. comprada × preço + custos) ÷ (qtd. anterior + qtd. comprada) | `quantityBefore` → Quantidade antes da compra; `avgPriceBefore` → PM antes da compra; `quantityBought` → Quantidade comprada; `unitPrice` → Preço unitário; `fees` → Custos (corretagem e taxas) | ({quantityBefore} × {avgPriceBefore} + {quantityBought} × {unitPrice} + {fees}) ÷ {quantityBefore + quantityBought} = {value} | É quanto cada unidade custou para você, em média, já somando corretagem e taxas. Vender não muda o preço médio; ele só muda quando você compra mais. |
| `TOTAL_COST` | Detalhe (coluna Custo total) | Custo total | Custo total = quantidade em carteira × preço médio | `quantity` → Quantidade em carteira; `avgPrice` → Preço médio (origem: "Ver cálculo do preço médio") | {quantity} × {avgPrice} = {value} | É quanto você investiu nas unidades que ainda tem, incluindo custos. Quando você vende parte, o custo total cai na mesma proporção. |
| `REALIZED_PROFIT` | Explicação de uma venda; Formulário (venda, "Lucro realizado estimado") | Lucro realizado (na prévia: Lucro realizado estimado) | Lucro realizado = qtd. vendida × preço de venda − custos − qtd. vendida × PM na data da venda | `quantitySold` → Quantidade vendida; `unitPrice` → Preço de venda; `fees` → Custos (corretagem e taxas); `avgPriceAtSale` → PM na data da venda | {quantitySold} × {unitPrice} − {fees} − {quantitySold} × {avgPriceAtSale} = {value} | É o ganho ou a perda que você concretizou ao vender, usando o preço médio da data da venda. Não é o imposto devido. **Na prévia, acrescentar:** Vira lucro realizado quando você salvar a venda. |
| `POSITION_REALIZED_PROFIT` (novo) | Detalhe (coluna Lucro realizado; posições encerradas) | Lucro realizado | Lucro realizado do ativo = soma do lucro realizado de cada venda dele nesta carteira | `sales[]` → um item por venda, rótulo "{Venda} de {data} · {corretora}", com link "Ver cálculo do lucro realizado" para o `REALIZED_PROFIT` da venda | {venda 1} + {venda 2} + … = {value} (com uma venda só: mostra a conta do `REALIZED_PROFIT` direto) | Soma o ganho ou a perda de todas as vendas deste ativo nesta carteira. Sem vendas, é R$ 0,00. |
| `PORTFOLIO_TOTAL_COST` (novo) | Detalhe (indicador Custo total) | Custo total da carteira | Custo total da carteira = soma do custo total de cada posição aberta | `positions[]` → um item por ativo aberto, rótulo "{ticker}", com link para o `TOTAL_COST` do ativo | {ativo 1} + {ativo 2} + … = {value} | É quanto você investiu nos ativos que ainda tem nesta carteira, com custos. Posições encerradas não entram. |
| `PORTFOLIO_REALIZED_PROFIT` (novo) | Detalhe (indicador Lucro realizado) | Lucro realizado da carteira | Lucro realizado da carteira = soma do lucro realizado de cada ativo, abertos e encerrados | `positions[]` → um item por ativo com vendas, rótulo "{ticker} · {aberta \| encerrada}", com link para o `POSITION_REALIZED_PROFIT` | {ativo 1} + {ativo 2} + … = {value} | Soma o ganho ou a perda de todas as vendas desta carteira, inclusive de ativos que você já vendeu por completo. Não é o imposto: o IR é apurado por pessoa, somando todas as carteiras. |
| `OPERATION_GROSS` | Formulário (Resumo: Valor da operação) | Valor da operação | Valor da operação = quantidade × preço unitário | `quantity` → Quantidade; `unitPrice` → Preço unitário | {quantity} × {unitPrice} = {value} | É o valor negociado, antes dos custos da nota. |
| `OPERATION_TOTAL_BUY` | Formulário (Resumo de compra: Total com custos) | Total com custos | Total com custos = valor da operação + custos | `grossValue` → Valor da operação (link para `OPERATION_GROSS`); `fees` → Custos (corretagem e taxas) | {grossValue} + {fees} = {value} | É quanto a compra custou de fato. Os custos entram no preço médio. |
| `OPERATION_NET_SELL` | Formulário (Resumo de venda: Valor líquido) | Valor líquido | Valor líquido = valor da operação − custos | `grossValue` → Valor da operação (link para `OPERATION_GROSS`); `fees` → Custos (corretagem e taxas) | {grossValue} − {fees} = {value} | É quanto a venda rendeu depois dos custos da nota. |

## 4. Casos de borda
| Situação | Texto |
|---|---|
| Posição zerada (encerrada), PM e custo total | Valor exibido "—". Explicação: "Você vendeu todas as unidades. O preço médio volta a zero e recomeça na próxima compra." (RN08) |
| Lucro negativo | Valor com sinal "−" e cor negativa; a explicação não muda ("ganho ou perda"). |
| Primeira compra (sem posição antes) | `quantityBefore` = 0 e `avgPriceBefore` = R$ 0,00 aparecem normalmente; a conta fica ({0} × {0,00} + …). |
| Operação com data antiga | Rodapé ganha a frase: "Inclui operações lançadas depois com data anterior, recalculadas em ordem de data." (RN09) |

## 5. Termos (usar sempre os mesmos)
preço médio (PM) · custos (corretagem e taxas) · lucro realizado · posição · posição aberta / encerrada · valor da operação · total com custos · valor líquido · carteira · corretora. Não usar: "custo médio", "taxas" sozinho, "lucro" sem "realizado", "saldo".

## 6. O que não está aqui
Mensagens das regras RN07 e RN10 ficam no componente `BusinessRuleError` (C2, já com texto no Figma). Textos das próximas etapas (rentabilidade, valor de mercado, proventos, metas, indicadores) entram nesta tabela quando a etapa for para o handoff.
