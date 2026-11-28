# Microcopy — "como foi calculado" (U4)

> Criado em 31/10/2026 pelo agente de UX/UI (tarefa U4); seção 7 (ações com ícone, D51) no mesmo dia; seções 8 a 11 e códigos de `source` para o contrato do K4 em 10/11/2026; seção 10 por código de erro (D56) no mesmo dia; em 13/11/2026 (U7a), origem `FORM` da prévia, origem `ASSET_POSITION` sem repetir o ativo, estados do Resumo e seção 12 (erros de carregamento); em 28/11/2026 (UX-2, D64), seção 13 com os 19 `formulaCode` do contrato do S1+ (PR #68) e, no mesmo dia, carregando e erro dos blocos de mercado (seção 12) e resumo e tabela de dados dos gráficos (13.6). Fonte única dos textos do `DerivedValueExplainer` (C1) e dos ⓘ do S1. O frontend gera a partir desta tabela um dicionário indexado por `formulaCode` (`frontend/src/app/shared/derived-value/microcopy.pt-BR.ts`) e não escreve esses textos nos templates (D26, arquitetura 7.5). Mudança de texto = mudança neste arquivo.

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
| Origem `ASSET_POSITION`: posição de um ativo (somas da carteira) | Rótulo do item: {ticker ou displayName}. Linha de origem (link): Posição {aberta \| encerrada} · ver cálculo do {custo total \| lucro realizado} (o rótulo do `DerivedValue` em `derived`, em minúsculas). Dados em `asset` = `{ id, ticker, displayName, assetType, status }`; `status` OPEN → "aberta", CLOSED → "encerrada", o mesmo valor da linha de `GET /portfolios/:id/positions`; o link abre o `DerivedValue` em `derived`. O painel usa só o que vem no `DerivedValue`, sem buscar outra rota (U7a: o ativo não se repete na linha de origem) |
| Origem `FORM`: valor do formulário (só na prévia, D42) | Do formulário, ainda não salvo |
| `source` desconhecido (versão nova da API) | Só o valor, sem linha de origem |
| Resumo da operação, sem campos válidos | Preencha ativo, corretora, data, quantidade e preço para ver o valor da operação e como ela muda sua posição. |
| Resumo da operação, cabeçalho | Calculado pelo servidor a partir das suas operações. Nada foi salvo ainda. |
| Resumo da operação, calculando (prévia passou de 300 ms) | Calculando… (no lugar do cabeçalho; valores em skeleton) |
| Resumo da operação, prévia indisponível | Não deu para calcular o resumo agora. Você ainda pode salvar: o servidor confere tudo de novo ao salvar. |
| Resumo da operação, prévia indisponível, botão | Calcular de novo |
| Insumo indisponível (valor ausente) | — |

## 3. Tabela por `formulaCode`

| `formulaCode` | Onde aparece | Rótulo | Fórmula | Valores usados (chave `name` → rótulo) | Conta | Explicação |
|---|---|---|---|---|---|---|
| `AVG_PRICE_BUY` | Detalhe (coluna Preço médio); Formulário (Resumo, PM depois da compra) | Preço médio (PM) | PM = (qtd. anterior × PM anterior + qtd. comprada × preço + custos) ÷ (qtd. anterior + qtd. comprada) | `quantityBefore` → Quantidade antes da compra; `avgPriceBefore` → PM antes da compra; `quantityBought` → Quantidade comprada; `unitPrice` → Preço unitário; `fees` → Custos (corretagem e taxas) | ({quantityBefore} × {avgPriceBefore} + {quantityBought} × {unitPrice} + {fees}) ÷ {quantityBefore + quantityBought} = {value} | É quanto cada unidade custou para você, em média, já somando corretagem e taxas. Vender não muda o preço médio; ele só muda quando você compra mais. |
| `TOTAL_COST` | Detalhe (coluna Custo total) | Custo total | Custo total = quantidade em carteira × preço médio | `quantity` → Quantidade em carteira; `avgPrice` → Preço médio (origem: "Ver cálculo do preço médio") | {quantity} × {avgPrice} = {value} | É quanto você investiu nas unidades que ainda tem, incluindo custos. Quando você vende parte, o custo total cai na mesma proporção. |
| `REALIZED_PROFIT` | Explicação de uma venda; Formulário (venda, "Lucro realizado estimado") | Lucro realizado (na prévia: Lucro realizado estimado) | Lucro realizado = qtd. vendida × preço de venda − custos − qtd. vendida × PM na data da venda | `quantitySold` → Quantidade vendida; `unitPrice` → Preço de venda; `fees` → Custos (corretagem e taxas); `avgPriceAtSale` → PM na data da venda | {quantitySold} × {unitPrice} − {fees} − {quantitySold} × {avgPriceAtSale} = {value} | É o ganho ou a perda que você concretizou ao vender, usando o preço médio da data da venda. Não é o imposto devido. **Na prévia, acrescentar:** Vira lucro realizado quando você salvar a venda. |
| `POSITION_REALIZED_PROFIT` (novo) | Detalhe (coluna Lucro realizado; posições encerradas) | Lucro realizado | Lucro realizado do ativo = soma do lucro realizado de cada venda dele nesta carteira | `sales[]` → um item por venda, rótulo "{Venda} de {data} · {corretora}", com link "Ver cálculo do lucro realizado" para o `REALIZED_PROFIT` da venda | {venda 1} + {venda 2} + … = {value} (com uma venda só: mostra a conta do `REALIZED_PROFIT` direto) | Soma o ganho ou a perda de todas as vendas deste ativo nesta carteira. Sem vendas, é R$ 0,00. |
| `PORTFOLIO_TOTAL_COST` (novo) | Detalhe (indicador Custo total) | Custo total da carteira | Custo total da carteira = soma do custo total de cada posição aberta | `positions[]` → um item por ativo aberto, rótulo "{ticker ou displayName}", origem `ASSET_POSITION` com link para o `TOTAL_COST` do ativo | {ativo 1} + {ativo 2} + … = {value} | É quanto você investiu nos ativos que ainda tem nesta carteira, com custos. Posições encerradas não entram. |
| `PORTFOLIO_REALIZED_PROFIT` (novo) | Detalhe (indicador Lucro realizado) | Lucro realizado da carteira | Lucro realizado da carteira = soma do lucro realizado de cada ativo, abertos e encerrados | `positions[]` → um item por ativo com lucro realizado diferente de zero (abertas com venda e encerradas; as mesmas linhas que têm valor na coluna Lucro realizado), rótulo "{ticker ou displayName}", origem `ASSET_POSITION` ("Posição {aberta \| encerrada} · …", pelo `asset.status`) com link para o `POSITION_REALIZED_PROFIT` | {ativo 1} + {ativo 2} + … = {value} | Soma o ganho ou a perda de todas as vendas desta carteira, inclusive de ativos que você já vendeu por completo. Não é o imposto: o IR é apurado por pessoa, somando todas as carteiras. |
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
preço médio (PM) · custos (corretagem e taxas) · lucro realizado · posição · posição aberta / encerrada · valor da operação · total com custos · valor líquido · carteira · corretora. S1+ (D64): patrimônio · valor de mercado · ganho ou perda não realizado · variação sobre o PM · variação do dia · % da carteira · rentabilidade (TWR) · fechamento · sem cotação. Não usar: "custo médio", "taxas" sozinho, "lucro" sem "realizado" (para o não realizado, "ganho ou perda"), "saldo", "cotação atual" ou "em tempo real" (é o fechamento do último pregão), "rendimento" para a rentabilidade da carteira.

## 6. O que não está aqui
Valor de mercado, alocação e rentabilidade do S1+ estão na seção 13. Textos das próximas etapas (proventos, metas, indicadores) entram aqui quando a etapa for para o handoff.

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

**Limite de tentativas (429, login e cadastro).** Acima de `AUTH_RATE_LIMIT_MAX` tentativas por minuto e por IP (BK-1), `POST /auth/login` e `POST /auth/register` respondem 429. Não é erro de campo: o aviso fica no mesmo componente do 401, no topo do cartão, com título "Muitas tentativas seguidas." e texto "Aguarde 1 minuto e tente de novo."; os campos mantêm o que foi digitado. Frames: [Login](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=152-2651), [Cadastro](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=152-2671).

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

## 12. Carregando e erro de carregamento (U7a)
Quando cada estado aparece: `claude/handoff-ux.md`, "Carregando e erro por tela". Botão do erro, em todas: **Tentar de novo**.

| Tela | Carregando (texto oculto ou visível do skeleton) | Erro: título | Erro: texto |
|---|---|---|---|
| Lista de carteiras (3) | Carregando suas carteiras… | Não conseguimos carregar suas carteiras | O servidor teve um problema. Suas carteiras e operações continuam salvas. |
| Detalhe da carteira (4) | Calculando posições a partir das suas operações… | Não conseguimos carregar esta carteira | O servidor teve um problema. Suas operações continuam salvas. |
| Histórico (6) | Carregando operações… (no lugar da contagem "{n} operações") | Não conseguimos carregar as operações | O servidor teve um problema. Suas operações continuam salvas. |
| Catálogo (7) | Buscando "{termo}"… (no lugar de "{n} ativos encontrados") | Não conseguimos buscar os ativos | O servidor teve um problema. Sua busca continua no campo: tente de novo em instantes. |
| Página do ativo (8), tela | Carregando {ticker}… | Não conseguimos carregar {ticker} | O servidor teve um problema. Tente de novo em instantes. |
| Bloco Patrimônio somado (Lista, S1+) | Carregando o patrimônio… | — | Patrimônio somado indisponível. (link "Tentar de novo" ao lado) |
| Bloco Patrimônio (Detalhe, S1+) | Carregando a evolução do patrimônio… | Não conseguimos carregar a evolução | O resto da carteira continua disponível. |
| Bloco Rentabilidade (Detalhe e página do ativo, S1+) | Calculando a rentabilidade… | Não conseguimos calcular a rentabilidade | O resto da página continua disponível. |
| Bloco Alocação (Detalhe, S1+) | Carregando a alocação… | Não conseguimos carregar a alocação | O resto da carteira continua disponível. |
| Bloco Cotação (página do ativo, S1+) | Carregando a cotação… | Não conseguimos carregar a cotação | O resto da página continua disponível. |

Nos blocos do S1+, o erro fica dentro do cartão do bloco (título do bloco visível), com o mesmo botão **Tentar de novo**, que refaz só a chamada daquele bloco (`claude/handoff-ux.md`, "Estados do S1+").

## 13. S1+ (D64): mercado, alocação e rentabilidade (UX-2, 28/11/2026)
Textos dos 19 `formulaCode` do contrato do PR #68. O painel continua o da seção 1; o que muda está abaixo. Os números de mercado usam o fechamento do último pregão da B3, nunca tempo real (D64c). Renda fixa e cripto entram pelo custo, com "sem cotação" (D55). Sem proventos, toda rentabilidade mede só o preço (D64b). As cotações do COTAHIST não são ajustadas por desdobramento ou grupamento (D64b, sem o E1).

### 13.1 Mudanças no painel
| Parte | Regra nova |
|---|---|
| Link de insumo derivado | O texto passa a ser **"Ver cálculo {de}"**, com `{de}` tirado da coluna **De** da tabela 13.4, que já traz a preposição e o artigo ("do valor de mercado", "da variação do dia"). Para os 9 códigos do S1, `{de}` = "do " + o rótulo em minúsculas, como hoje. Isso vale para `DERIVED`, `ASSET_POSITION` ("Posição aberta · ver cálculo {de}") e `PORTFOLIO` |
| Valor | Percentual em pontos percentuais (`"9.84"` = 9,84%): 2 casas, com sinal ("+ 9,84%", "− 1,70%"), no painel. Na tabela e nos cartões, as casas dos frames (1 nas colunas, 2 nos totais) |
| Notas fixas | Depois da Explicação, o painel mostra as notas da coluna **Notas** da tabela 13.4: **(P)** e **(E)** (seção 13.3) |
| Rodapé | Pela coluna **Rodapé** da tabela 13.4 (seção 13.3). O rodapé atual (seção 2) continua para os 9 códigos do S1 |
| Valor nulo | Número `null` não tem ⓘ. O motivo vem em `unavailableReason` (seção 13.5) |

### 13.2 Origens novas e formatos dos insumos
| Origem | Linha de origem |
|---|---|
| `MARKET` com `marketSource` = `B3_COTAHIST` | Fechamento de {referenceDate dd/mm/aaaa} · B3 (COTAHIST) |
| `MARKET` com `B3_INDEX` | Pontos de {referenceDate dd/mm/aaaa} · B3 |
| `MARKET` com `BCB_SGS`, em `CDI_RETURN` | Fator das taxas diárias do CDI até {referenceDate dd/mm/aaaa} · Banco Central (SGS) |
| `MARKET` com `BCB_SGS`, em `IPCA_RETURN` | Fator das taxas mensais do IPCA até {referenceDate mm/aaaa} · Banco Central (SGS) |
| `PORTFOLIO` | Rótulo do item: o nome da carteira (`portfolio.name`). Linha de origem (link): Carteira · ver cálculo do patrimônio |
| `POSITION` em `startQuota` e `endQuota` | Calculada das suas operações e dos fechamentos até {referenceDate dd/mm/aaaa} |
| `POSITION` em `dayBuys` e `daySales` | Suas operações de {referenceDate dd/mm/aaaa} |
| `POSITION` nos demais insumos | Como na seção 2: Suas operações até {referenceDate dd/mm/aaaa} |

O fator do CDI e do IPCA é **calculado** a partir das taxas publicadas. Por isso o texto não diz que o fator foi "publicado".

| `name` | Rótulo | Formato do valor |
|---|---|---|
| `quantity` | Quantidade em carteira | quantidade pela classe (seção 1) |
| `lastClose` | Último fechamento | R$, 2 casas |
| `previousClose` | Fechamento anterior | R$, 2 casas |
| `startClose` / `endClose` | Fechamento no início / Fechamento no fim | R$, 2 casas |
| `totalCost` | Custo total | R$, 2 casas |
| `marketValue` | Valor de mercado | R$, 2 casas |
| `previousMarketValue` | Valor de mercado no pregão anterior | R$, 2 casas |
| `dayBuys` / `daySales` | Compras do dia / Vendas do dia | R$, 2 casas |
| `dayChange` | Variação do dia | R$ com sinal |
| `unrealizedProfit` | Ganho ou perda não realizado | R$ com sinal |
| `equity` | Patrimônio da carteira | R$, 2 casas |
| `groupValue` | Valor de mercado de {classe ou setor} (nome do grupo da linha) | R$, 2 casas |
| `startQuota` / `endQuota` | Cota no início / Cota no fim | número com 6 casas ("1,098412") |
| `startFactor` / `endFactor` | Fator acumulado no início / Fator acumulado no fim | número com 6 casas |
| `startValue` / `endValue` | Ibovespa no início / Ibovespa no fim | pontos, 2 casas ("128.456,78 pontos") |
| `positions[]` | {ticker ou displayName} por item (origem `ASSET_POSITION`) | R$, 2 casas |
| `portfolios[]` | nome da carteira por item (origem `PORTFOLIO`) | R$, 2 casas |

### 13.3 Notas e rodapés
| Código | Texto |
|---|---|
| Nota (P), sem proventos | Não inclui proventos (dividendos, JCP e rendimentos): mede só a variação de preço. |
| Nota (E), sem ajuste de eventos | Os fechamentos da B3 não são ajustados por desdobramento ou grupamento. Se houve um no período, este número fica distorcido até a etapa S2. |
| Rodapé (C), carteira com mercado | Calculado em {asOf} a partir das suas operações nesta carteira e dos fechamentos da B3. |
| Rodapé (U), todas as carteiras | Calculado em {asOf} a partir de todas as suas carteiras e dos fechamentos da B3. |
| Rodapé (A), ativo | Calculado em {asOf} a partir dos fechamentos publicados pela B3 (COTAHIST). |
| Rodapé (B), CDI e IPCA | Calculado em {asOf} a partir das taxas publicadas pelo Banco Central (SGS). |
| Rodapé (I), Ibovespa | Calculado em {asOf} a partir dos pontos do Ibovespa publicados pela B3. |

### 13.4 Tabela dos códigos novos
| `formulaCode` | Onde aparece | Rótulo | De | Fórmula | Valores usados (`name` → origem) | Conta | Explicação | Notas | Rodapé |
|---|---|---|---|---|---|---|---|---|---|
| `MARKET_VALUE` | Detalhe, coluna Valor de mercado; página do ativo, "Na sua carteira" | Valor de mercado | do valor de mercado | Valor de mercado = quantidade em carteira × último fechamento | `quantity` → POSITION; `lastClose` → MARKET (B3_COTAHIST) | {quantity} × {lastClose} = {value} | É quanto a sua posição valeria pelo fechamento do último pregão, antes de custos e impostos de uma venda. | E | C |
| `MARKET_VALUE_AT_COST` | Detalhe, coluna Valor de mercado (renda fixa e cripto) | Valor de mercado (pelo custo) | do valor de mercado | Sem cotação: valor de mercado = custo total | `totalCost` → DERIVED (`TOTAL_COST`) | {totalCost} = {value} | Renda fixa e cripto ainda não têm cotação no sistema: entram pelo custo que você pagou, sem ganho ou perda de mercado. A cotação dessas classes chega na etapa S11. | — | C |
| `UNREALIZED_PROFIT` | Detalhe, posição | Ganho ou perda não realizado | do ganho ou perda não realizado | Ganho ou perda não realizado = valor de mercado − custo total | `marketValue` → DERIVED; `totalCost` → DERIVED | {marketValue} − {totalCost} = {value} | É quanto você ganharia ou perderia se vendesse a posição pelo último fechamento, antes de custos e impostos. Só vira lucro realizado quando você vende. | E | C |
| `UNREALIZED_PROFIT_PERCENT` | Detalhe, coluna Variação s/ PM; página do ativo, "Variação sobre o PM" | Variação sobre o PM | da variação sobre o PM | Variação sobre o PM = ganho ou perda não realizado ÷ custo total × 100 | `unrealizedProfit` → DERIVED; `totalCost` → DERIVED | {unrealizedProfit} ÷ {totalCost} × 100 = {value} | É o ganho ou a perda sobre o que você pagou. Dá o mesmo que comparar o último fechamento com o seu preço médio. | E | C |
| `POSITION_DAY_CHANGE` | Detalhe, posição | Variação do dia | da variação do dia | Variação do dia = valor no fechamento − valor no pregão anterior − compras do dia + vendas do dia | `marketValue` → DERIVED; `previousMarketValue` → DERIVED; `dayBuys`, `daySales` → POSITION | {marketValue} − {previousMarketValue} − {dayBuys} + {daySales} = {value} | É quanto a posição ganhou ou perdeu no último pregão, sem contar como ganho o dinheiro que você pôs ou tirou nesse dia. A compra do dia conta a partir do preço que você pagou. | E | C |
| `POSITION_DAY_CHANGE_PERCENT` | Detalhe, posição | Variação do dia (%) | da variação do dia em % | Variação do dia (%) = variação do dia ÷ (valor no pregão anterior + compras do dia) × 100 | `dayChange` → DERIVED; `previousMarketValue` → DERIVED; `dayBuys` → POSITION | {dayChange} ÷ ({previousMarketValue} + {dayBuys}) × 100 = {value} | É a variação do dia sobre o que estava aplicado nesse dia: o valor do pregão anterior mais as compras do dia. | E | C |
| `PORTFOLIO_WEIGHT` | Detalhe, coluna % da carteira | % da carteira | do % da carteira | % da carteira = valor de mercado ÷ patrimônio × 100 | `marketValue` → DERIVED; `equity` → DERIVED | {marketValue} ÷ {equity} × 100 = {value} | É a fatia desta posição no patrimônio da carteira. Renda fixa e cripto entram pelo custo. | — | C |
| `PORTFOLIO_EQUITY` | Lista, Patrimônio do cartão; Detalhe, indicador Patrimônio | Patrimônio | do patrimônio | Patrimônio = soma do valor de mercado das posições abertas | `positions[]` → ASSET_POSITION (link para o `MARKET_VALUE` ou o `MARKET_VALUE_AT_COST` de cada uma) | soma dos itens (sem fórmula escrita: `account` null) | É quanto valem hoje os ativos que você tem nesta carteira, pelo fechamento do último pregão. Renda fixa e cripto entram pelo custo, porque ainda não têm cotação. | E | C |
| `PORTFOLIO_UNREALIZED_PROFIT` | Detalhe, resumo | Ganho ou perda não realizado da carteira | do ganho ou perda não realizado da carteira | Ganho ou perda não realizado = patrimônio − custo total da carteira | `equity` → DERIVED; `totalCost` → DERIVED (`PORTFOLIO_TOTAL_COST`) | {equity} − {totalCost} = {value} | É quanto a carteira ganharia ou perderia se você vendesse tudo pelo último fechamento, antes de custos e impostos. Não inclui o lucro já realizado nas vendas. | E | C |
| `PORTFOLIO_UNREALIZED_PROFIT_PERCENT` | Detalhe, resumo | Ganho ou perda não realizado da carteira (%) | do ganho ou perda não realizado da carteira em % | Ganho ou perda (%) = ganho ou perda não realizado ÷ custo total da carteira × 100 | `unrealizedProfit` → DERIVED; `totalCost` → DERIVED | {unrealizedProfit} ÷ {totalCost} × 100 = {value} | É esse ganho ou perda sobre o que você investiu nos ativos que ainda tem. | E | C |
| `ALLOCATION_VALUE` | Detalhe, alocação por classe e por setor | Valor de mercado de {classe ou setor} | do valor de mercado do grupo | Valor do grupo = soma do valor de mercado das posições abertas do grupo | `positions[]` → ASSET_POSITION | soma dos itens (`account` null) | Soma o valor de mercado das posições abertas desta classe ou deste setor. Ativo sem setor no cadastro entra em "Sem setor". | E | C |
| `ALLOCATION_PERCENT` | Detalhe, alocação | % de {classe ou setor} na carteira | do % do grupo na carteira | % do grupo = valor do grupo ÷ patrimônio × 100 | `groupValue` → DERIVED; `equity` → DERIVED | {groupValue} ÷ {equity} × 100 = {value} | É a fatia do grupo no patrimônio da carteira. Não é recomendação de compra ou venda. | — | C |
| `TWR` | Lista, Rentabilidade total e 12 meses dos cartões; Detalhe, indicadores e gráfico de rentabilidade | Rentabilidade (TWR) | da rentabilidade | Rentabilidade = (cota no fim ÷ cota no início − 1) × 100 | `startQuota`, `endQuota` → POSITION | ({endQuota} ÷ {startQuota} − 1) × 100 = {value} | Mede quanto o seu dinheiro rendeu sem contar aportes e retiradas como ganho: a cota começa em 1 e muda só com a variação de preço dos ativos. Assim a carteira pode ser comparada com o CDI, o Ibovespa e o IPCA. | P, E | C |
| `ASSET_DAY_CHANGE_PERCENT` | Página do ativo, "no dia" do cabeçalho | Variação no dia | da variação no dia | Variação no dia = (fechamento − fechamento anterior) ÷ fechamento anterior × 100 | `lastClose`, `previousClose` → MARKET (B3_COTAHIST) | ({lastClose} − {previousClose}) ÷ {previousClose} × 100 = {value} | É quanto o preço de fechamento mudou em relação ao pregão anterior. | E | A |
| `ASSET_RETURN` | Página do ativo, rentabilidade por período | Rentabilidade de {ticker} | da rentabilidade do ativo | Rentabilidade = (fechamento no fim ÷ fechamento no início − 1) × 100 | `startClose`, `endClose` → MARKET (B3_COTAHIST) | ({endClose} ÷ {startClose} − 1) × 100 = {value} | É a variação do preço de fechamento no período. | P, E | A |
| `CDI_RETURN` | Detalhe e página do ativo, comparação | CDI no período | do CDI no período | CDI = (fator no fim ÷ fator no início − 1) × 100, com as taxas diárias compostas | `startFactor`, `endFactor` → MARKET (BCB_SGS) | ({endFactor} ÷ {startFactor} − 1) × 100 = {value} | É quanto rendeu o CDI no mesmo período, para comparação. As taxas diárias do Banco Central são compostas dia a dia. | — | B |
| `IBOV_RETURN` | Detalhe e página do ativo, comparação | Ibovespa no período | do Ibovespa no período | Ibovespa = (pontos no fim ÷ pontos no início − 1) × 100 | `startValue`, `endValue` → MARKET (B3_INDEX) | ({endValue} ÷ {startValue} − 1) × 100 = {value} | É quanto variou o Ibovespa no mesmo período, para comparação. | — | I |
| `IPCA_RETURN` | Detalhe e página do ativo, comparação | IPCA no período | do IPCA no período | IPCA = (fator no fim ÷ fator no início − 1) × 100, com as taxas mensais compostas | `startFactor`, `endFactor` → MARKET (BCB_SGS; datas em mm/aaaa) | ({endFactor} ÷ {startFactor} − 1) × 100 = {value} | É a inflação do período, para comparação: só meses inteiros, até o último IPCA publicado, sem proporcional de mês incompleto. | — | B |
| `USER_EQUITY` | Lista, "Patrimônio somado" do cabeçalho | Patrimônio somado | do patrimônio somado | Patrimônio somado = soma do patrimônio de todas as suas carteiras | `portfolios[]` → PORTFOLIO (link para o `PORTFOLIO_EQUITY` de cada carteira) | soma dos itens (`account` null) | Soma o patrimônio de todas as suas carteiras. Carteira sem operações entra com R$ 0,00. | E | U |

### 13.5 Casos de borda do S1+
| Situação | Texto |
|---|---|
| `unavailableReason` = `NO_QUOTE` (renda fixa e cripto) | Na célula do número de mercado (variação sobre o PM, variação do dia, ganho ou perda): "sem cotação", sem ⓘ. O valor de mercado aparece pelo custo, com o ⓘ do `MARKET_VALUE_AT_COST`, e um rótulo pequeno "pelo custo" abaixo do valor |
| `unavailableReason` = `SHORT_HISTORY`, Rentabilidade 12 meses da carteira | A carteira começou em {data da primeira operação}; o valor aparece a partir de {last12MonthsAvailableFrom dd/mm/aaaa}. (texto do frame do Detalhe; no cartão da Lista: "menos de 12 meses") |
| `SHORT_HISTORY` na página do ativo, num período (`comparison` null) | Linha inteira "—" (ativo e índices). Abaixo da tabela: "Sem fechamentos suficientes para {períodos, ligados por vírgula e \"e\"}: o histórico do ativo no sistema é menor que a janela." Com esse período escolhido nos chips: cartões "—" e, no lugar do gráfico, "Sem fechamentos suficientes para {período}: o histórico do ativo no sistema é menor que a janela." |
| Variação do dia `null` sem motivo (primeiro pregão do ativo) | "—", sem ⓘ |
| Posição encerrada (K7: campos de mercado `null`) | "—" nas colunas de mercado, como no PM e no custo total |
| Carteira sem posição aberta | Patrimônio R$ 0,00, com ⓘ; `positions[]` vazio: "Valores usados" mostra "Nenhuma posição aberta nesta carteira." |
| Usuário sem carteira | Cabeçalho da Lista sem "Patrimônio somado" (estado vazio da Lista) |
| Comparação sem dado do índice na janela | "—" na coluna do índice e, abaixo do gráfico ou da tabela: "{CDI \| Ibovespa \| IPCA} sem dado publicado para todo o período." |
| Data e fonte do fechamento, ao lado dos números de mercado | Fechamento de {marketData.closeDate dd/mm/aaaa} · B3. Sem fechamento carregado (`closeDate` null): "Sem fechamento da B3 carregado ainda." |

### 13.6 Gráficos: resumo acessível e tabela de dados
Cada gráfico tem um resumo (`aria-label` do contêiner `role="img"`) e o botão de texto **Ver tabela de dados** / **Ocultar tabela de dados** (`aria-expanded`), que abre a tabela com a legenda (`<caption>`) abaixo. Datas dd/mm/aaaa; meses "mmm/aaaa" ("out/2026"); números como na tela.

| Gráfico | Resumo (`aria-label`) | Legenda da tabela (`<caption>`) | Colunas |
|---|---|---|---|
| Patrimônio (Detalhe) | Patrimônio e valor aplicado de {mês inicial} a {mês final}: patrimônio {último patrimônio}, valor aplicado {último aplicado}. | Patrimônio e valor aplicado no fechamento de cada mês | Mês, Patrimônio, Valor aplicado |
| Rentabilidade acumulada (Detalhe) | Rentabilidade acumulada de {from} a {to}: carteira {valor}, CDI {cdi}, Ibovespa {ibov}, IPCA {ipca}. | Rentabilidade acumulada da carteira e dos índices desde {from} | Mês, Carteira, CDI, Ibovespa, IPCA |
| Alocação (Detalhe) | Sem resumo: a lista já é texto ("{classe ou setor}, {percentual}, {valor}") | — | — |
| Cotação (página do ativo) | Fechamento de {ticker} de {primeira data} a {última data}: de {primeiro fechamento} a {último fechamento}. | Fechamento diário de {ticker} no período de {período por extenso} | Data, Fechamento |
| Rentabilidade acumulada (página do ativo) | Rentabilidade acumulada em {período}, de {from} a {to}: {ticker} {valor}, Ibovespa {ibov}, CDI {cdi}, IPCA {ipca}. | Sem botão: a tabela "Rentabilidade por período" é a alternativa ("Ver tabela abaixo" na nota) | — |

Índice sem dado no resumo: "{índice} sem dado". Período por extenso: "1 mês", "6 meses", "12 meses", "24 meses", "5 anos", "todo o histórico".
