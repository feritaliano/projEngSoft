# Microcopy — "como foi calculado" (U4)

> Criado em 31/10/2026 pelo agente de UX/UI (tarefa U4); seção 7 (ações com ícone, D51) no mesmo dia; seções 8 a 11 e códigos de `source` para o contrato do K4 em 10/11/2026; seção 10 por código de erro (D56) no mesmo dia. Fonte única dos textos do `DerivedValueExplainer` (C1) e dos ⓘ do S1. O frontend gera a partir desta tabela um dicionário indexado por `formulaCode` (`frontend/src/app/shared/derived-value/microcopy.pt-BR.ts`) e não escreve esses textos nos templates (D26, arquitetura 7.5). Mudança de texto = mudança neste arquivo.

## 1. Como o componente monta o painel
O backend devolve todo número derivado como `DerivedValue` = `{ value, formulaCode, inputs: [{ name, value, source, referenceDate }], asOf }` (arquitetura, seção 7). O painel é sempre o mesmo, de cima para baixo:

| Parte do painel | De onde vem |
|---|---|
| Título "Como foi calculado" e botão "Fechar" | fixo (seção 2) |
| Rótulo do número + ativo (ex.: "Preço médio (PM) · PETR4") | **Rótulo** da tabela da seção 3 + ticker do contexto |
| Valor | `value`, formatado em pt-BR: R$ com 2 casas; quantidade pela classe do ativo — Ação, FII, ETF e BDR inteiro com separador de milhar ("1.500"), Renda fixa sempre 2 casas ("0,52"), Cripto até 8 casas sem zeros à direita ("0,0125"; "1" quando inteira) |
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
| Rodapé | Calculado em {asOf dd/MM/aaaa} a partir das suas operações nesta carteira. (`asOf` = dia de hoje em America/Sao_Paulo em que o backend fez o cálculo; o front só troca o formato YYYY-MM-DD por dd/MM/aaaa) |
| Origem `POSITION`: posição até uma data | Suas operações até {referenceDate dd/MM/aaaa} |
| Origem `OPERATION`: uma operação | {Compra \| Venda} de {referenceDate dd/MM/aaaa} · {corretora} (tipo e corretora em `operation`) |
| Origem `DERIVED`: outro número derivado | Ver cálculo do {rótulo em minúsculas} (link que troca o painel para o `DerivedValue` em `derived`) |
| Origem `ASSET_POSITION`: posição de um ativo (somas da carteira) | {ticker ou displayName} · {aberta \| encerrada} (dados em `asset` = `{ id, ticker, displayName, assetType, status }`; `status` OPEN → "aberta", CLOSED → "encerrada", o mesmo valor da linha de `GET /portfolios/:id/positions`; o link abre o `DerivedValue` em `derived`). O painel usa só o que vem no `DerivedValue`, sem buscar outra rota |
| `source` desconhecido (versão nova da API) | Só o valor, sem linha de origem |
| Resumo da operação, sem campos válidos | Preencha ativo, corretora, data, quantidade e preço para ver o valor da operação e como ela muda sua posição. |
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
| `PORTFOLIO_REALIZED_PROFIT` (novo) | Detalhe (indicador Lucro realizado) | Lucro realizado da carteira | Lucro realizado da carteira = soma do lucro realizado de cada ativo, abertos e encerrados | `positions[]` → um item por ativo com lucro realizado diferente de zero (abertas com venda e encerradas; as mesmas linhas que têm valor na coluna Lucro realizado), rótulo "{ticker ou displayName} · {aberta \| encerrada}" pelo `asset.status`, com link para o `POSITION_REALIZED_PROFIT` | {ativo 1} + {ativo 2} + … = {value} | Soma o ganho ou a perda de todas as vendas desta carteira, inclusive de ativos que você já vendeu por completo. Não é o imposto: o IR é apurado por pessoa, somando todas as carteiras. |
| `OPERATION_GROSS` | Formulário (Resumo: Valor da operação) | Valor da operação | Valor da operação = quantidade × preço unitário | `quantity` → Quantidade; `unitPrice` → Preço unitário | {quantity} × {unitPrice} = {value} | É o valor negociado, antes dos custos da nota. |
| `OPERATION_TOTAL_BUY` | Formulário (Resumo de compra: Total com custos) | Total com custos | Total com custos = valor da operação + custos | `grossValue` → Valor da operação (link para `OPERATION_GROSS`); `fees` → Custos (corretagem e taxas) | {grossValue} + {fees} = {value} | É quanto a compra custou de fato. Os custos entram no preço médio. |
| `OPERATION_NET_SELL` | Formulário (Resumo de venda: Valor líquido) | Valor líquido | Valor líquido = valor da operação − custos | `grossValue` → Valor da operação (link para `OPERATION_GROSS`); `fees` → Custos (corretagem e taxas) | {grossValue} − {fees} = {value} | É quanto a venda rendeu depois dos custos da nota. |

## 4. Casos de borda
| Situação | Texto |
|---|---|
| Posição zerada (encerrada), PM e custo total | Valor exibido "—". Explicação: "Você vendeu todas as unidades. O preço médio volta a zero e recomeça na próxima compra." (RN08) |
| Lucro negativo | Valor com sinal "−" e cor negativa; a explicação não muda ("ganho ou perda"). |
| Primeira compra (sem posição antes) | `quantityBefore` = 0 e `avgPriceBefore` = R$ 0,00 aparecem normalmente no painel; a conta fica ({0} × {0,00} + …). No Resumo da operação, `averagePriceBefore` vem null e a linha fica "Preço médio — → R$ 36,10". |
| Carteira sem lucro realizado (nenhuma venda, ou soma de itens zerados) | `PORTFOLIO_REALIZED_PROFIT` com `positions[]` vazio: "Valores usados" mostra "Nenhuma venda com lucro ou prejuízo nesta carteira." e a conta fica "= R$ 0,00". |
| Operação com data antiga | Rodapé ganha a frase: "Inclui operações lançadas depois com data anterior, recalculadas em ordem de data." (RN09) |

## 5. Termos (usar sempre os mesmos)
preço médio (PM) · custos (corretagem e taxas) · lucro realizado · posição · posição aberta / encerrada · valor da operação · total com custos · valor líquido · carteira · corretora. Não usar: "custo médio", "taxas" sozinho, "lucro" sem "realizado", "saldo".

## 6. O que não está aqui
Textos das próximas etapas (rentabilidade, valor de mercado, proventos, metas, indicadores) entram nesta tabela quando a etapa for para o handoff.

## 7. Ações com ícone: tooltip e nome acessível (D51)
Ações de linha e de cartão são só ícone (`IconButton`). O tooltip mostra o texto curto; o `aria-label` é o texto curto + o alvo, para quem usa leitor de tela saber em qual linha está agindo. `{ativo}` = ticker; sem ticker (renda fixa, D50), o nome de exibição do título (ex.: "Tesouro IPCA+ 2035"). Datas em dd/mm/aaaa.

| Onde | Ícone | Tooltip | `aria-label` | Etapa |
|---|---|---|---|---|
| Lista de carteiras, cartão | Lixeira | Excluir carteira | Excluir carteira {nome} | S1 |
| Lista de carteiras, cartão | Seta para a direita | Abrir carteira | — (decorativo: o link é o nome da carteira, que cobre o cartão) | S1 |
| Catálogo, linha (desktop) | + | Lançar operação | Lançar operação de {ativo} | S1 |
| Histórico, linha | Lápis | Editar operação | Editar operação de {data}, {ativo} | S1 |
| Histórico, linha | Lixeira | Excluir operação | Excluir operação de {data}, {ativo} | S1 |
| Detalhe, Resumo (alocação) | Lápis | Editar carteira ideal | Editar carteira ideal | S10 |
| Detalhe, Metas | Lápis | Editar meta | Editar meta de patrimônio · Editar meta de renda com proventos | S10 |
| Página do ativo, Comunicados | Seta para fora | Abrir no site de origem | Abrir documento no site de origem: {título do documento} (abre em nova aba) | S8 |

Botões de criar no cabeçalho ou no estado vazio mantêm o texto e ganham o ícone + à esquerda (decorativo, `aria-hidden`): Nova carteira, Lançar operação, Lançar primeira operação, Nova meta. No Catálogo mobile, "Lançar operação" de cada cartão continua com texto.

## 8. Regra de negócio violada: `BusinessRuleError` (C2)
Mesmo layout para todos os casos (título, frase, quadro com 3 linhas, "Como resolver" e, só na RN10, o link). Dados do objeto `violation`; `{ativo}` = ticker, ou `displayName` quando o ticker é nulo; quantidades no formato da classe (seção 1). Nenhum número é calculado no front: só aparecem `availableQuantity`, `soldQuantity` e os dados de `operation`.

| Caso | Título | Frase | Como resolver |
|---|---|---|---|
| RN07 — a própria venda passa da posição (lançar ou editar a venda) | A venda é maior que a sua posição | Em {tradeDate} você tinha {availableQuantity} {ativo} nesta carteira e a venda é de {soldQuantity}. Nada foi salvo. | Como resolver: reduza a quantidade para até {availableQuantity} ou lance antes a compra que está faltando. |
| RN10 — editar (quantidade, data, preço, tipo) | Esta alteração deixaria uma venda maior que a posição | Com esta alteração na {compra \| venda} de {data original}, a venda de {operation.tradeDate} fica maior que a posição. Nada foi salvo. | Como resolver: {compra: aumente a quantidade desta compra \| venda: reduza a quantidade desta venda} ou edite antes a venda de {operation.tradeDate}. |
| RN10 — lançar operação retroativa (uma venda antiga) | Esta venda deixaria uma venda posterior maior que a posição | Lançar esta venda em {data do formulário} faz a venda de {operation.tradeDate} ficar maior que a posição. Nada foi salvo. | Como resolver: reduza a quantidade desta venda, lance antes a compra que está faltando ou edite a venda de {operation.tradeDate}. |
| RN10 — excluir compra (Histórico) | Esta exclusão deixaria uma venda maior que a posição | Excluir a compra de {data da compra} faz a venda de {operation.tradeDate} ficar maior que a posição. Nada foi apagado. | Como resolver: edite ou exclua antes a venda de {operation.tradeDate}, ou mantenha esta compra. |
| RN10 — editar trocando o ativo | Trocar o ativo deixaria uma venda maior que a posição | Tirar esta compra de {ativo original} faz a venda de {operation.tradeDate} de {ativo original} ficar maior que a posição. Nada foi salvo. | Como resolver: mantenha {ativo original} nesta compra ou edite antes a venda de {operation.tradeDate}. |

Quadro (todas as linhas acima):

| Rótulo | RN07 | RN10 |
|---|---|---|
| 1ª linha | Operação: Venda de {soldQuantity} {ativo} · {tradeDate} | Operação afetada: Venda de {soldQuantity} {ativo} · {tradeDate} · {broker.name} |
| 2ª linha | Posição disponível na data: {availableQuantity} | Posição disponível na data: {availableQuantity} |
| 3ª linha | Quantidade da venda: {soldQuantity} | Quantidade vendida: {soldQuantity} |
| Link | — (`id` null ou é a própria operação) | Ver venda de {operation.tradeDate} → (abre o Histórico com essa venda em destaque, pelo `operation.id`) |

Texto de ajuda do campo Quantidade quando há violação: RN07 "Máximo de {availableQuantity} nesta data."; RN10 "Afeta a venda de {operation.tradeDate}: {soldQuantity} vendidas, {availableQuantity} disponíveis."

## 9. Resumo da operação (frame 5)
| Elemento | Texto |
|---|---|
| Cabeçalho dos valores "antes → depois", lançamento | Na carteira {nome}, em {data da operação}, após esta {compra \| venda} |
| Cabeçalho, modo editar | {ativo} em {data da operação}, com a alteração |
| Posição | Posição de {ativo}: {positionBefore} → {positionAfter} (sem ⓘ) |
| Preço médio na venda | {averagePriceBefore} (venda não muda) |
| Preço médio sem unidades (null) | — |
| Com violação RN07 | Posição: {positionBefore} → —; linha de preço médio oculta; no lugar do valor do lucro estimado: "Venda maior que a posição em {data}: {availableQuantity} disponíveis, {soldQuantity} na venda." |
| Com violação RN10 | Valores completos e, abaixo deles: "Deixa a venda de {operation.tradeDate} maior que a posição: {availableQuantity} disponíveis, {soldQuantity} vendidas." |

## 10. Erros de campo (400 e 409) por `field` + `code` (D56)
O backend devolve `errors: [{ field, code, message, params? }]`. A tela mostra, embaixo do campo, o texto desta tabela pelo par `field` + `code`; a `message` (inglês, técnica) nunca aparece. `{min}`, `{max}`, `{step}`, `{maxDecimals}`, `{maxIntegerDigits}` e `{today}` vêm de `params` (`today` em YYYY-MM-DD, exibido como dd/mm/aaaa; `step` exibido no formato pt-BR, "0,01"). A validação do próprio formulário, antes de enviar, usa os mesmos textos. Código que não estiver na tabela: "Confira este campo." Ao enviar com erro, o foco vai para o primeiro campo inválido (handoff, U5).

**Cadastro (`POST /auth/register`, frame 2)**

| `field` | `code` | Texto |
|---|---|---|
| name | REQUIRED | Informe seu nome. |
| name | TOO_LONG | Use até {max} caracteres. |
| email | REQUIRED | Informe seu e-mail. |
| email | INVALID_FORMAT | Informe um e-mail válido, como nome@exemplo.com. |
| email | TOO_LONG | Use um e-mail com até {max} caracteres. |
| email | ALREADY_EXISTS (409) | Já existe uma conta com este e-mail. Entre ou use outro e-mail. |
| password | REQUIRED | Crie uma senha com pelo menos {min} caracteres. |
| password | TOO_SHORT | A senha precisa de pelo menos {min} caracteres. Faltam {n}. ({n} = {min} menos os caracteres digitados, contado no campo) |
| password | TOO_LONG | Use até {max} caracteres. |

**Login (`POST /auth/login`, frame 1)**

| `field` | `code` | Texto |
|---|---|---|
| email | REQUIRED | Informe seu e-mail. |
| email | INVALID_FORMAT | Informe um e-mail válido, como nome@exemplo.com. |
| password | REQUIRED | Informe sua senha. |

E-mail ou senha errados não são erro de campo: o 401 mostra o aviso do frame "credencial inválida" ("E-mail ou senha incorretos." / "Confira os dados e tente de novo. Depois de 5 tentativas, aguarde 1 minuto.").

**Nova carteira (`POST /portfolios`, frame 3)**

| `field` | `code` | Texto |
|---|---|---|
| name | REQUIRED | Dê um nome à carteira. |
| name | TOO_LONG | Use até {max} caracteres. |
| name | ALREADY_EXISTS (409) | Você já tem uma carteira com este nome. Escolha outro. |

**Operação (`POST` e `PATCH /portfolios/:id/operations`, `POST …/preview`, frame 5)**

| `field` | `code` | Texto |
|---|---|---|
| type | REQUIRED, INVALID_VALUE | Escolha Compra ou Venda. |
| assetId | REQUIRED | Escolha um ativo da lista. |
| assetId | NOT_FOUND | Este ativo não está no catálogo. Escolha um da lista. |
| brokerId | REQUIRED | Escolha a corretora. |
| brokerId | NOT_FOUND | Esta corretora não está na lista. Escolha uma da lista. |
| tradeDate | REQUIRED, INVALID_FORMAT | Informe a data do pregão (dd/mm/aaaa). |
| tradeDate | FUTURE_DATE | A data não pode ser depois de hoje ({today}). |
| quantity | REQUIRED | Informe a quantidade. |
| quantity | NOT_POSITIVE, NOT_INTEGER (Ação, FII, ETF, BDR) | Use um número inteiro maior que zero. |
| quantity | NOT_POSITIVE, INVALID_STEP (Renda fixa) | Use um valor maior que zero, em múltiplos de {step} (ex.: 0,52). |
| quantity | NOT_POSITIVE, TOO_MANY_DECIMALS (Cripto) | Use um valor maior que zero, com até {maxDecimals} casas decimais. |
| quantity | TOO_LARGE | Quantidade grande demais: até {maxIntegerDigits} dígitos antes da vírgula. |
| unitPrice | REQUIRED | Informe o preço unitário. |
| unitPrice | NOT_POSITIVE, TOO_MANY_DECIMALS | Use um preço maior que zero, com até {maxDecimals} casas decimais. |
| unitPrice | TOO_LARGE | Preço grande demais: até {maxIntegerDigits} dígitos antes da vírgula. |
| fees | REQUIRED | Informe os custos. Use 0 se não houve. |
| fees | NEGATIVE, TOO_MANY_DECIMALS | Use 0 ou mais, com até {maxDecimals} casas decimais. Use 0 se não houve custos. |
| fees | TOO_LARGE | Custos grandes demais: até {maxIntegerDigits} dígitos antes da vírgula. |
| replacesOperationId | NOT_FOUND | Aviso no topo do formulário (abaixo). |

**Operação que não existe mais** (404 no `PATCH` ou no `GET` do modo editar, ou `replacesOperationId` com `NOT_FOUND` na prévia): aviso no topo do formulário, título "Esta operação não existe mais", texto "Ela pode ter sido excluída em outra aba ou dispositivo. Nada foi salvo. Volte ao Histórico para ver a lista atualizada."; o Resumo mostra "Sem resumo: esta operação não existe mais." e "Salvar alteração" fica desabilitado. No Histórico, 404 ao excluir: aviso "Esta operação já tinha sido excluída. A lista foi atualizada." e a lista é recarregada.

## 11. Cabeçalhos e estados vazios
| Onde | Com dados | Singular | Sem operações |
|---|---|---|---|
| Lista de carteiras (3), cartão | {assetCount} ativos · {operationCount} operações | 1 ativo · 1 operação | Sem operações ainda |
| Lista, cartão com todas as posições encerradas | nenhuma posição aberta · {operationCount} operações | — | — |
| Detalhe (4), abaixo do nome | {operationCount} operações · {assetCount} ativos | 1 operação · 1 ativo | Nenhuma operação ainda |
| Detalhe, todas as posições encerradas | {operationCount} operações · nenhuma posição aberta | — | — |
| Histórico (6), abaixo do nome | {operationCount} operações · última em {lastTradeDate} | 1 operação · última em {lastTradeDate} | Nenhuma operação ainda (`lastTradeDate` null) |
| Histórico vazio, bloco | — | — | Título "Nenhuma operação nesta carteira"; texto "As compras e vendas que você lançar aparecem aqui, da mais recente para a mais antiga."; botão "Lançar primeira operação" |
| Histórico, chip de classe sem operações | — | — | Título "Nenhuma operação {de ações \| de FIIs \| de ETFs \| de BDRs \| de renda fixa \| de cripto} nesta carteira"; botão "Limpar filtros" |

