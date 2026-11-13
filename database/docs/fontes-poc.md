# Prova de conceito das fontes (PF, D59)

> Executada em 12/11/2026 pelo agente de banco de dados, sem migration e sem código de produção. A D59 foi aprovada em 12/11/2026 (`claude/fontes-de-dados.md`, seção 8); a correção F8 já foi aplicada nela. Os arquivos ficam em `data/raw/fontes-poc/`, fora do Git (`.gitignore`, linha 14: `data/raw/*`; conferido com `git check-ignore`). Horários em BRT (UTC−3).

## 1. Arquivos baixados

| # | Arquivo | URL exata | Download | SHA-256 | Registros |
|---|---|---|---|---|---|
| 1 | `COTAHIST_D12112026.ZIP` (contém `COTAHIST_D12112026.TXT`) | `https://bvmf.bmfbovespa.com.br/InstDados/SerHist/COTAHIST_D12112026.ZIP` | 12/11/2026 21:42:47 | ZIP `3c312fe86d02d33aa7a363e3e96574d0154c9a09deff29d90df58f6727e45b4a`; TXT `2b756cae734e8c4a2a5e362b9b1362c58378b20f458d6a75484aaadb70fc8eed` | 14.931 linhas: cabeçalho, trailer e 14.929 registros tipo 01 (o trailer confirma 14.929). Pregão de 12/11/2026 |
| 2 | `InstrumentsConsolidatedFile_20261112.csv` | `https://arquivos.b3.com.br/api/download/requestname?fileName=InstrumentsConsolidatedFile&date=2026-11-12` (devolve um token) → `https://arquivos.b3.com.br/api/download/?token=<token>` | 12/11/2026 21:42:58 | `d56b42fd34ffc6b3aba31255ce9939e6b10368e39f0e5117729e515a6ae4136f` | 89.971 instrumentos (89.973 linhas). Primeira linha: **"Status do Arquivo: Parcial"** (F5) |
| 3 | `IBOV_2026.csv` | `https://sistemaswebb3-listados.b3.com.br/indexStatisticsProxy/IndexCall/GetDownloadPortfolioDay/eyJpbmRleCI6IklCT1YiLCJsYW5ndWFnZSI6InB0LWJyIiwieWVhciI6IjIwMjYifQ==` (base64 de `{"index":"IBOV","language":"pt-br","year":"2026"}`; é o botão "Download" da página de dados históricos do índice). A resposta vem em base64 e foi decodificada antes de gravar | 12/11/2026 21:43:05 | `35a6de97d2e3c59674cf59b7a86717c6892f1d6f58e3842b010e8d8df72db5e0` | 36 linhas: 31 dias × 12 meses, com 216 fechamentos de 02/01 a 12/11/2026, mais 2 linhas de rodapé (mínimo e máximo do mês) |
| 4a | `listedCompaniesProxy_PETR.json` | `https://sistemaswebb3-listados.b3.com.br/listedCompaniesProxy/CompanyCall/GetListedSupplementCompany/eyJpc3N1aW5nQ29tcGFueSI6IlBFVFIiLCJsYW5ndWFnZSI6InB0LWJyIn0=` | 12/11/2026 21:43:17 | `9640204b919e1b8050e2370e4d007510b44745a43bda35b453af25c3ca3df283` | 1 emissor; 24 `cashDividends`, 6 `stockDividends`, 1 `subscriptions` |
| 4b | `listedCompaniesProxy_BBDC.json` | `…/GetListedSupplementCompany/eyJpc3N1aW5nQ29tcGFueSI6IkJCREMiLCJsYW5ndWFnZSI6InB0LWJyIn0=` | 12/11/2026 21:43:19 | `1c4d2b89f81b1f387c4c76378eee620fdf99928aa322c55ed2d4eee2bca71e9c` | 1 emissor; 32 `cashDividends`, 10 `stockDividends`, 2 `subscriptions` |
| 4c | `listedCompaniesProxy_HGLG.json` | `…/GetListedSupplementCompany/eyJpc3N1aW5nQ29tcGFueSI6IkhHTEciLCJsYW5ndWFnZSI6InB0LWJyIn0=` | 12/11/2026 21:43:22 | `1943379b36917b904fee6a37f637387c23aaaba263a1294a530b65f243499e0a` | 1 fundo; 20 `cashDividends`, 1 `stockDividends`, 2 `subscriptions` |
| 5 | candles diários BTC-BRL, Mercado Bitcoin v4: **não baixado** | `https://api.mercadobitcoin.net/api/v4/candles?symbol=BTC-BRL&resolution=1d&from=1790812800&to=1794528000` (01/10/2026 a 13/11/2026, UTC) | 12/11/2026 21:43:29–21:43:39 | — | **HTTP 403**, página do Cloudflare "Sorry, you have been blocked" (Ray ID `a599be61ca2ee2d4`) (F1) |
| 6 | `PrecoTaxaTesouroDireto.csv` | `https://www.tesourotransparente.gov.br/ckan/dataset/df56aa42-484a-4a59-8184-7676580c81e3/resource/796d2059-14e9-44e3-80c9-2d9e30b405c1/download/PrecoTaxaTesouroDireto.csv` | 12/11/2026 21:44:07 | `dc2ff589368df8e8d9740935bd22c8e1e0cf2ef08c6a2e3027ecfc6c7777502d` | 178.478 registros (178.479 linhas). Data-base de 31/12/2004 a 11/11/2026; 150 títulos (tipo + vencimento) de 8 tipos; 58 registros na última data-base |
| extra | `inf_mensal_fii_2026.zip` (geral, complemento, ativo_passivo), para a pergunta 3 | `https://dados.cvm.gov.br/dados/FII/DOC/INF_MENSAL/DADOS/inf_mensal_fii_2026.zip` | 12/11/2026 21:45:21 | `eb9dfb6d05f3c71e74ec7e53ce8328b53e429712de23db939bc3c095788b646b` | 11.785 registros em cada um dos 3 CSV; referência de jan. a out. de 2026 |

Codificação: COTAHIST, Cadastro de Instrumentos, IBOV e CVM em ISO-8859-1; JSON da B3 em UTF-8; o CSV do Tesouro só tem ASCII. Os números usam vírgula decimal, exceto nos CSV da CVM (ponto).

## 2. Campo → coluna (nomes do `glossario.md`)

### 2.1 COTAHIST → `quotes` (Cotacao) e conferência de `assets`
Registro tipo 01, layout `SeriesHistoricas_Layout.pdf`. Preços em `V99`: 13 dígitos com 2 decimais implícitos, divididos por `FATCOT`.

| Campo (posição) | Coluna |
|---|---|
| `DATA` (3–10) | `quotes.quote_date` |
| `CODNEG` (13–24) → `assets.ticker` | `quotes.asset_id` |
| `PREABE` (57–69), `PREMAX` (70–82), `PREMIN` (83–95), `PREULT` (109–121) | `open`, `high`, `low`, `close` |
| `VOLTOT` (171–188) | `volume` |
| `TOTNEG` (148–152) | `trades_count` |
| `CODISI` (231–242) | conferência de `assets.isin` |
| `CODBDI` (11–12), `TPMERC` (25–27) | filtro: mercado à vista (`TPMERC` 010) e classe (seção 3.1) |
| `ESPECI` (40–49) | conferência de `assets.share_class` (ON, PN, PNA, PNB, UNT → UNIT) e `assets.bdr_program` (DRN, DR1, DR2, DR3, DRE) |
| `FATCOT` (211–217) | divisor do preço; não é gravado |

### 2.2 Cadastro de Instrumentos → `assets` (Ativo) e `issuers` (Emissor)
Filtro `MktNm = EQUITY-CASH`. Pular a primeira linha (status do arquivo).

| Campo | Coluna |
|---|---|
| `TckrSymb` | `assets.ticker` |
| `ISIN` | `assets.isin` |
| `SctyCtgyNm` | `assets.type`: SHARES e UNIT → STOCK; ETF EQUITIES e ETF FOREIGN INDEX → ETF; BDR → BDR; FUNDS → FII **só** se for FII (F7) |
| `SpcfctnCd` (ex.: `PN      N2`, `UNT     N2`, `DRN ED`) | `assets.share_class` (primeiro token) e `assets.bdr_program` |
| `TradgEndDt` (`9999-12-31` = negociável) | `assets.is_active` |
| `CrpnNm` | `issuers.name` |
| `CFICd`, `CorpGovnLvlNm`, `MktCptlstn` | não gravados |

### 2.3 Página do IBOV → `index_values` (ValorIndice)
Linha = dia, coluna = mês, ano no título (`IBOV - 2026`). `economic_indexes`: `code` IBOV, `periodicity` DAILY, `unit` POINTS, `source` B3.

| Campo | Coluna |
|---|---|
| ano do título + coluna do mês + `Dia` | `index_values.reference_date` |
| célula (`171.324,31`) | `index_values.value` |
| linhas de rodapé (`MÍNIMO`, `MÍNIMO`) | ignoradas (F6) |

### 2.4 `listedCompaniesProxy` → `income_distributions` (Provento), `corporate_events` (EventoCorporativo) e `issuers`

| Campo | Coluna |
|---|---|
| `cashDividends[].isinCode` → `assets.isin` | `income_distributions.asset_id` |
| `cashDividends[].label` | `type`: DIVIDENDO → DIVIDEND; JRS CAP PROPRIO → JCP; RENDIMENTO de FII → FII_INCOME; RENDIMENTO de ação sem valor no domínio (F3) |
| `cashDividends[].lastDatePrior` (última data com) | `record_date` |
| `cashDividends[].paymentDate` | `payment_date` |
| `cashDividends[].rate` | `amount_per_share` (F2) |
| constante | `source` = `B3` |
| `approvedOn`, `relatedTo`, `remarks` | não gravados |
| `stockDividends[].label` | `corporate_events.type`: DESDOBRAMENTO → SPLIT; GRUPAMENTO → REVERSE_SPLIT; BONIFICACAO → BONUS; CIS RED CAP sem valor no domínio (F4) |
| `stockDividends[].lastDatePrior` | `corporate_events.ex_date` = **pregão seguinte** à última data com |
| `stockDividends[].factor` | `ratio_from`/`ratio_to`. Desdobramento e bonificação: % de ações novas (desdobramento 100 → 1:2; 900 → 1:10; bonificação 10 → 100:110). Grupamento: ações novas por ação antiga (0,01 → 100:1). Corrigido no P1-2 (F10) |
| (fora do `listedCompaniesProxy`) | `bonus_unit_cost`: custo atribuído da bonificação, do documento da companhia (aviso aos acionistas, fato relevante ou edital) (F15) |
| `codeCVM` | `issuers.cvm_code` |
| `subscriptions[]` | fora do ER |

### 2.5 Candles diários → `crypto_prices` (PrecoCripto)
**Foxbit, API pública v3 (usada no seed, decisão de 13/11/2026):** `GET /rest/v3/markets/{par}/candlesticks?interval=1d&start_time=…&end_time=…&limit=500`. Cada candle é um vetor: `[0]` abertura do período (epoch ms, UTC) → `price_date`; `[4]` fechamento → `reference_price`; `[1]`–`[3]` abertura, máxima e mínima e `[5]`–`[10]` (fim do período, volumes, negócios) não gravados. Par `btcbrl` → `assets.ticker` BTC; `ethbrl` → ETH.

Mercado Bitcoin v4 (fonte da D59), **não conferido** (F1): pelo formato documentado (vetores `t`, `o`, `h`, `l`, `c`, `v`), `t` → `price_date` e `c` → `reference_price`.

### 2.6 Tesouro Transparente → `fixed_income_prices` (PrecoTaxaTitulo) e `fixed_income_bonds`

| Campo | Coluna |
|---|---|
| `Tipo Titulo` | `fixed_income_types.name` |
| `Data Vencimento` | `fixed_income_bonds.maturity_date` (com o tipo, identifica `asset_id`) |
| `Data Base` | `fixed_income_prices.base_date` |
| `Taxa Compra Manha`, `Taxa Venda Manha` (em %) | `buy_rate`, `sell_rate`, divididos por 100 (fração 0–1) |
| `PU Compra Manha`, `PU Venda Manha` | `buy_price`, `sell_price` |
| `PU Base Manha` | não gravado |

### 2.7 Informe mensal de FII (CVM) → `fii_monthly_reports` (InformeMensalFII)

| Campo (arquivo) | Coluna |
|---|---|
| `CNPJ_Fundo_Classe` → `issuers.cnpj` | `issuer_id` |
| `Data_Referencia`, `Versao` | `reference_month`, `version` |
| `Patrimonio_Liquido` (complemento) | `net_worth` |
| `Cotas_Emitidas` (complemento) | `shares_outstanding` |
| `Total_Numero_Cotistas` (complemento) | `shareholders_count` |
| `Percentual_Dividend_Yield_Mes` (complemento; já em fração, ex.: 0.007052) | `dividend_yield_month` |

### 2.8 Informe trimestral de FII (CVM) → `fii_quarterly_reports` e `fii_report_properties`

| Campo (arquivo) | Coluna |
|---|---|
| `CNPJ_Fundo_Classe` → `issuers.cnpj` (geral) | `fii_quarterly_reports.issuer_id` |
| `Data_Referencia`, `Versao` (geral) | `reference_date`, `version` |
| posição da linha no arquivo imovel, dentro do informe | `fii_report_properties.item_number` |
| `Nome_Imovel`, `Endereco` | `name`, `address` |
| `Classe` (Imóveis para renda acabados / renda em construção / venda acabados / venda em construção) | `property_class` (RENT_FINISHED, RENT_UNDER_CONSTRUCTION, SALE_FINISHED, SALE_UNDER_CONSTRUCTION) |
| `Area` | `area` |
| `Percentual_Vacancia` (só renda acabados), `Percentual_Inadimplencia`, `Percentual_Receitas_FII`, `Percentual_Locado` (só renda em construção) | `vacancy_rate`, `delinquency_rate`, `revenue_share`, `leased_rate` (já em fração; "-" ou vazio → NULL) |

### 2.9 IPE (CVM) → `corporate_filings` (Comunicado)

| Campo | Coluna |
|---|---|
| `CNPJ_Companhia` → `issuers.cnpj` | `issuer_id` |
| `Categoria`, `Assunto` | `category`, `subject` (≤ 500 caracteres; há assuntos com 4.652) |
| `Data_Referencia` | `reference_date` |
| `Data_Entrega` (só a data) | `delivered_at`, à 00:00 de Brasília |
| `Link_Download`, `Protocolo_Entrega` | `document_url`, `cvm_protocol` |
| `Tipo`, `Especie`, `Tipo_Apresentacao`, `Versao` | não gravados |

### 2.10 DFP e ITR (CVM) → `financial_statements` e `statement_lines`

| Campo (arquivo) | Coluna |
|---|---|
| `CNPJ_CIA` → `issuers.cnpj` (índice `{dfp,itr}_cia_aberta_AAAA.csv`) | `issuer_id`; `filing_type` = DFP ou ITR pelo arquivo |
| `DT_INI_EXERC` (DRE), `DT_REFER`, `VERSAO` (maior), `DT_RECEB` | `fiscal_year_start`, `period_end`, `version`, `filed_at` (00:00 de Brasília) |
| `QT_ACAO_ORDIN_CAP_INTEGR`, `QT_ACAO_PREF_CAP_INTEGR`, `QT_ACAO_ORDIN_TESOURO`, `QT_ACAO_PREF_TESOURO` (composicao_capital, mesma versão) | `common_shares`, `preferred_shares`, `treasury_common`, `treasury_preferred` (F12) |
| arquivo `_con_` / `_ind_` | `statement_lines.scope` = CONSOLIDATED / INDIVIDUAL |
| `CD_CONTA`, `DS_CONTA` | `account_code`, `account_description` |
| `VL_CONTA` × 1.000 quando `ESCALA_MOEDA` = MIL; só `ORDEM_EXERC` = ÚLTIMO | `value` (em reais) |

## 3. Respostas

### 3.1 Tickers distintos por classe no COTAHIST (pregão de 12/11/2026, mercado à vista, `TPMERC` 010)

| Classe | `CODBDI` | Tickers | Conferência com o Cadastro de Instrumentos |
|---|---|---|---|
| Ação | 02 (lote padrão), 07 (recuperação extrajudicial), 08 (recuperação judicial) | **336** = 315 + 7 + 14 | 325 SHARES + 11 UNIT. O `CODBDI` 02 tem 316 linhas; uma delas é o IBOV11 (INDEX, seção 3.2), fora da contagem |
| FII | 12 | **280** | 280 FUNDS |
| ETF | 14 | **244** no `CODBDI`, só **158** ETF | 60 ETF EQUITIES + 98 ETF FOREIGN INDEX; os outros 86 são 85 FUNDS (FIAGRO, FIDC, FIP, FI-Infra) e 1 SHARES (PSVM11). O `CODBDI` não separa ETF de outros fundos (F7) |
| BDR | 34 (DRN), 35 (DR1, DR2, DR3), 36 (DRE) | **562** = 429 + 8 + 125 | O `CODBDI` 35 tem 9 linhas: 8 BDR e 1 UNIT (PPLA11) |

Fora das quatro classes, no mercado à vista: 5 direitos (`CODBDI` 10), 2 fundos (`CODBDI` 13: IAAG11, BBGO11) e 8 bônus (`CODBDI` 22). Em outros mercados: 6.402 opções de compra e 6.442 de venda (78/070, 82/080), 81 opções de índice (74 e 75), 370 no fracionário (96/020) e 170 a termo (62/030).

### 3.2 O COTAHIST traz linha de índice?
**Sim, uma, mas ela não serve como fechamento do Ibovespa.** A linha `IBOV11` (`CODBDI` 02, `TPMERC` 010, `ESPECI` `IBO/`, ISIN `BRIBOVINDM18`; categoria INDEX no Cadastro) registra **negócios** com o índice (27 negócios em 12/11), não o índice calculado: em 12/11, `PREULT` = 170.843,00 com abertura, máxima e mínima iguais, enquanto a página da B3 dá 171.324,31 (diferença de 481,31 pontos, 0,28%). Em outros pregões há só 1 a 20 negócios. O Ibovespa diário (R3) continua vindo da página de índices.

Conferência da série da página: os saltos de 30/09 → 05/10 (+11%) e 23/10 → 26/10 (−13,9%) aparecem também no `IBOV11` do COTAHIST (02/10: 190.487; 05/10: 208.639; 15/10: 205.194; 23/10: 204.890; 26/10: 175.492) e na PETR4 (58,68 → 53,88 em 26/10). São dados da fonte, não erro de leitura.

### 3.3 O informe mensal de FII da CVM traz rendimento por cota e data-com?
**Não.** Nenhum dos três arquivos (geral, 37 colunas; complemento, 30; ativo_passivo, 52) tem valor por cota distribuído nem data-com. O que mais se aproxima:
- `Rendimentos_Distribuir` (ativo_passivo): total em R$ a pagar no fim do mês, no passivo. HGLG11 em 09/2026: R$ 53.364.083,37.
- `Percentual_Dividend_Yield_Mes` (complemento): fração do valor patrimonial. HGLG11 em 09/2026: 0,007052 × VP de R$ 165,48 ≈ R$ 1,167 por cota, uma aproximação sem data-com.

Quem traz os dois é o `listedCompaniesProxy` da B3, que também cobre FII: HGLG11, rendimento de out/2026 = R$ 1,17 por cota, data-com (`lastDatePrior`) 30/10/2026, pagamento 16/11/2026. A frase da D59 "Rendimentos de FII pelo informe mensal da CVM" precisa de correção (F8).

Linha B da D47 (segmento do FII): o arquivo geral tem `Mandato` e `Segmento_Atuacao`, mas o `Mandato` vem vazio no HGLG11 e no MXRF11, e o `Segmento_Atuacao` não bate com o rótulo da tela (HGLG11 "Multicategoria"; MXRF11 "Logística", em 08 e 09/2026). Sem conferência, não serve de fonte para "Tijolo · logística" / "Papel · recebíveis".

## 4. Linhas do seed (`database/sql/inserts.sql`, seção 2)

PF (12/11/2026):

| Tabela | Linhas | Origem |
|---|---|---|
| `index_values` (IBOV) | 13 pregões, de 26/10 a 12/11/2026 | arquivo 3 |
| `income_distributions` | 26: PETR4 (10: 2 dividendos, 8 JCP), BBDC4 (6 JCP), HGLG11 (10 rendimentos); 6 com pagamento depois de 12/11/2026 | arquivos 4a–4c |
| `crypto_prices` | 0 na PF (F1); 25 no P1-2 (abaixo) | — |

Validado em `carteira_dev` numa transação desfeita (`ROLLBACK`) e com pais temporários. Contagens 13 e 26; a segunda execução não muda nada; pai ausente falha com `not_null_violation`. Dependências da seção 1 (BD-1): `economic_indexes` IBOV e os ativos PETR4 (`BRPETRACNPR6`), BBDC4 (`BRBBDCACNPR8`) e HGLG11 (`BRHGLGCTF004`).

Segundo corte do P1 (P1-2, 13/11/2026), seções 2.3 a 2.11 (arquivos na seção 6):

| Tabela | Linhas | Origem |
|---|---|---|
| `crypto_prices` | 25: BTC e ETH de 03/11 a 12/11/2026 e os dias das operações de cripto do seed | candles da Foxbit |
| `quotes` | 97: os 49 ativos negociados de 1.6 nos pregões de 30/10 e 12/11/2026 (ACWX39 sem negócio em 12/11, só em 30/10); ELET3, renda fixa e cripto sem cotação | COTAHIST |
| `fixed_income_prices` | 50: os 10 títulos de 1.7 em 5 datas-base (03/02, 10/03, 05/11, 10/11 e 11/11/2026) | arquivo 6 |
| `fii_monthly_reports` | 15: os 8 FIIs em 08 e 09/2026, menos XPML11 09/2026 (F11) | arquivo extra (complemento) |
| `fii_quarterly_reports` | 17: os 8 FIIs em 31/03 e 30/06/2026 e o FII Opportunity em 30/06/2026 | informe trimestral |
| `fii_report_properties` | 14: HGLG11 (6), KNRI11 (2), MXRF11 (2, venda acabados) e Opportunity (um de cada classe); KNCR11 sem imóveis | informe trimestral |
| `corporate_filings` | 14: o Fato Relevante e o Aviso aos Acionistas mais recentes de 2026 de PETR, VALE, ITUB, ITSA, BBDC, WEGE (só aviso), BBAS (só fato) e B3SA | IPE |
| `financial_statements` | 11: DFP 2025 de PETR, BBDC, WEGE, KLBN, BBAS, B3SA, SUZB e RENT; ITR 2T26 de PETR, WEGE e BBDC (F12) | DFP, ITR |
| `statement_lines` | 44: 4 por demonstração (ativo total individual e consolidado; receita e lucro consolidados) | DFP, ITR |
| `corporate_events` | 11: 5 desdobramentos, 2 grupamentos, 4 bonificações (F10, F15) | arquivos 4a–4c e `b3-empresas/supplement_*.json` |

Conferido num banco migrado do zero: seed 2× com as mesmas contagens, `seed-check.sql` e `db:test` passando.

## 5. Achados e prompts de correção

| ID | Achado | Para quem |
|---|---|---|
| F1 | API v4 do Mercado Bitcoin bloqueada pelo Cloudflare para esta rede (403 em `candles`, `tickers` e `symbols`, também com UA de cliente; a v3 em `www.mercadobitcoin.net/api` respondeu 521). Não houve tentativa de contornar o bloqueio. O usuário confirmou o bloqueio também no navegador (13/11/2026) | **Decidido (13/11/2026):** `crypto_prices` vem dos candles diários da API pública da Foxbit (seções 2.5 e 6), mesma fonte do catálogo de cripto (D60c) |
| F2 | `amount_per_share` é `NUMERIC(20,8)` e a B3 publica `rate` com 11 casas; 5 linhas do BBDC4 têm 9 casas significativas e foram arredondadas na 8ª. Erro ≤ 5 × 10⁻⁹ por cota (R$ 0,005 por milhão de cotas). `received_income` não é afetado (valor informado pela corretora, D11) | **Decidido (D60):** aceito; continua `NUMERIC(20,8)`, sem migration |
| F3 | "RENDIMENTO" em ação (PETR3/PETR4: 0,01649003 e 0,02038398 em 2026, correção de proventos declarados) não tem valor em `income_type` | **Decidido (D60):** fica fora do seed e de `income_type` |
| F4 | `stockDividends` traz "CIS RED CAP" (cisão com redução de capital), sem valor em `corporate_event_type` | registrar; fora do S1 (D29) |
| F5 | Cadastro de Instrumentos baixado às 21:42 do mesmo dia veio "Parcial"; o de 30/10 em `data/raw/b3-instrumentos/` é "Final" | backend (K5) |
| F9 | O `InstrumentsConsolidatedFile` vem em Latin-1 (ISO-8859-1). O K5 tem de converter para UTF-8 antes de procurar o emissor pelo nome (`CrpnNm`); lido como UTF-8, nome com acento (ex.: "KINEA RENDA IMOBILIÁRIA…", "ISHARES IBOVESPA FUNDO DE ÍNDICE") não casa com o do seed e o emissor é duplicado | backend (K5) |
| F6 | Rodapé da página do IBOV: as duas linhas se chamam "MÍNIMO", e a segunda traz os máximos | backend (S2) |
| F7 | FUNDS no Cadastro mistura FII com FIAGRO, FIDC, FIP e FI-Infra, e o `CODBDI` 14 mistura ETF com esses fundos | backend (K5) |
| F8 | D59 (proposta) atribui rendimentos de FII ao informe mensal da CVM; o dado está no `listedCompaniesProxy` | usuário (aprovação da D59) |
| F10 | O exemplo da seção 2.4 lia o `factor` do desdobramento como proporção (100 → 1:100). É % de ações novas, como na bonificação: PETR 2008 (100) = 1:2, KLBN 2014 (400) = 1:5, HGLG 2018 (900) = 1:10. O grupamento é a fração (0,01 → 100:1). Seção 2.4 corrigida | backend (S2, ingestão de eventos) |
| F11 | O informe mensal de FII traz `Percentual_Dividend_Yield_Mes` negativo (XPML11 09/2026: −0,001103) e `fii_monthly_reports` tem CHECK `dividend_yield_month >= 0`. A linha ficou fora do seed | usuário: manter o CHECK e descartar a linha na ingestão, ou aceitar negativo (migration) |
| F12 | A composição do capital da DFP/ITR não traz a escala: Vale, Itaú, Itaúsa e Ambev informam a quantidade de ações em milhares (Vale: 4.539.007), as demais em unidades. Ficaram fora do seed | backend (S3: ler a escala no formulário ou conferir com o Cadastro da B3) |
| F13 | O Figma mostra o Tesouro IPCA+ 2035 com PM de R$ 3.846,15; o PU de mercado na época era ~R$ 2.400 (2.5). E o custo total de R$ 16.151,27 da massa das telas 3 e 4 só fecha com a soma exata (como a API faz) se o título custou R$ 2.000,00: o seed usa preço unitário 2000 ÷ 0,52 = 3846,15384615 | UX (dado ilustrativo, sem ação no S1) |
| F14 | A LC 224/2025 elevou o IRRF sobre JCP de 15% para 17,5% desde 01/01/2026 (Lei 9.249/1995, art. 9º, § 2º). `received_income.withheld_tax` do seed usa 17,5% (todos os JCP recebidos foram aprovados em 2026); JCP declarado em 2025 e pago em 2026 (PETR4 e BBDC4 de dez./2025) e JCP mensal do BBDC4 aprovado em 2025 ficaram sem recebimento no seed | backend (S6) e `memoria-calculo.md` (R18) |
| F15 | O `listedCompaniesProxy` não traz o custo atribuído da bonificação (`bonus_unit_cost`, obrigatório). O seed usa o valor do documento da companhia (BBDC 2022, ITSA 2025, ITUB 2025); a bonificação da KLBN 2025 ficou fora (custo da unit só em fonte secundária) | backend (S2: registro manual do custo, D29) |
| F16 | O informe mensal de FII traz `Cotas_Emitidas` fracionário (VISC11: 28828640.0000073); `shares_outstanding` é inteiro. O seed grava o inteiro mais próximo, com o original em comentário | backend (S8) |

```
F1 — Agente: banco de dados. Tarefa PF (pendência).
Problema: a API v4 do Mercado Bitcoin respondeu 403 do Cloudflare ("Sorry, you have been blocked") em 12/11/2026 na rede de desenvolvimento.
Faça: baixe de outra rede (casa, 4G, universidade) e sem contornar bloqueio
https://api.mercadobitcoin.net/api/v4/candles?symbol=BTC-BRL&resolution=1d&from=<epoch>&to=<epoch>
para data/raw/fontes-poc/MB_candles_BTC-BRL_1d.json; registre URL, hora, SHA-256 e registros na seção 1 de database/docs/fontes-poc.md; confira o mapeamento da seção 2.5; acrescente ≥ 10 linhas de crypto_prices na seção 2.3 do inserts.sql, com fonte em comentário.
Se o bloqueio persistir em outra rede: leve ao usuário a escolha de outra fonte para a D44, antes de qualquer dado.
Não faça: trocar de User-Agent, usar proxy ou automatizar navegador para passar pelo bloqueio.
```

```
F2/F3 — Decisão do usuário (registrar no contexto-projeto.md, junto da aprovação da D59).
F2: manter amount_per_share em NUMERIC(20,8) e registrar o arredondamento na 8ª casa como aceito (recomendado: impacto ≤ R$ 0,005 por milhão de cotas; mantém o padrão de valores unitários), ou ampliar para NUMERIC(20,11) com migration.
F3: o "RENDIMENTO" de ação fica fora (recomendado até a regra de IR ser validada na legislação, como na D44) ou entra como novo valor de income_type (migration + memoria-calculo.md).
Depois da decisão, o agente de banco aplica e atualiza glossario.md, mapeamento.md e os testes de restrição.
```

```
F5/F7 — Agente: backend. Tarefa K5 (carga do catálogo).
1. Leia a primeira linha do InstrumentsConsolidatedFile e só carregue arquivo com "Status do Arquivo: Final"; com "Parcial", falhe com mensagem clara (sem carga parcial).
2. type de assets: SHARES/UNIT → STOCK; ETF EQUITIES/ETF FOREIGN INDEX → ETF; BDR → BDR; FUNDS → FII só quando o ticker estiver no CODBDI 12 do COTAHIST do mesmo dia (ou no cadastro de FII da CVM pelo ISIN); os demais FUNDS (FIAGRO, FIDC, FIP, FI-Infra) ficam fora do catálogo.
3. Teste com os números da PF (12/11/2026): 280 FII, 158 ETF, 562 BDR.
Referência: database/docs/fontes-poc.md, seções 2.2 e 3.1.
```

```
F6 — Agente: backend. Tarefa S2 (ingestão do IBOV).
O CSV de GetDownloadPortfolioDay vem em base64 e tem 2 linhas de rodapé com o mesmo rótulo "MÍNIMO" (a segunda traz os máximos). Leia só as linhas cujo primeiro campo é o dia (1–31), mapeie a coluna pelo mês e descarte o rodapé. Teste com data/raw/fontes-poc/IBOV_2026.csv: 216 fechamentos, 12/11/2026 = 171.324,31.
```

```
F8 — Usuário, na aprovação da D59.
Trocar "Rendimentos de FII pelo informe mensal da CVM" por "Rendimentos de FII pelo listedCompaniesProxy da B3 (valor por cota e data-com); o informe mensal da CVM alimenta PL, cotistas e DY (fii_monthly_reports)".
```

## 6. Fontes do catálogo do seed (BD-1, seção 1 do `inserts.sql`)

Baixadas em 12/11/2026 para `data/raw/` (fora do Git). Horários em BRT.

| Arquivo | URL exata | Download | SHA-256 | Registros | Alimenta |
|---|---|---|---|---|---|
| `b3-setorial/ClassifSetorial_20261112.xlsx` | `https://sistemaswebb3-listados.b3.com.br/listedCompaniesProxy/CompanyCall/GetDownloadIndustryClassification/eyJsYW5ndWFnZSI6InB0LWJyIn0=` (base64 de `{"language":"pt-br"}`; é o botão "Download" da página "Classificação setorial" da B3) | 12/11/2026 22:56 | `342a9966b1cafe0ee226de66b398a9288c5ad9ba93c40cbc2d2bc3354ba454aa` | 1 planilha, 366 linhas (setor, subsetor, segmento, nome de pregão, código, segmento de listagem) | `sectors` (3 níveis) e `issuers.sector_id` pelo código de 4 letras (`Asst` do Cadastro) |
| `cvm-cia/cad_cia_aberta.csv` | `https://dados.cvm.gov.br/dados/CIA_ABERTA/CAD/DADOS/cad_cia_aberta.csv` | 12/11/2026 22:55 | `ac6c4ea8dc95cec62dd322c4842304238a6e6869ab1f9c5a4f7c2bc2251bfd07` | 2.680 companhias | `issuers.cnpj` e `issuers.cvm_code` das companhias (situação ATIVO, casadas pelo nome com o `CrpnNm` do Cadastro; a CVM grafa "BANCO" e a B3 "BCO" em Bradesco, Banco do Brasil e Santander, conferidos à mão) |
| `cvm-intermed/cad_intermed.zip` | `https://dados.cvm.gov.br/dados/INTERMED/CAD/DADOS/cad_intermed.zip` | 12/11/2026 22:41 | `62f3642c539e5f41238c6ecc6678a3658e15df17304f09272a0e98ea4d4b3b53` | 2.354 intermediários (`cad_intermed.csv`) | `brokers.cnpj` (situação "EM FUNCIONAMENTO NORMAL"); a Rico CTVM consta como cancelada por incorporação em 04/10/2018 |
| `b3-cotahist/COTAHIST_D02012025.ZIP` | `https://bvmf.bmfbovespa.com.br/InstDados/SerHist/COTAHIST_D02012025.ZIP` | 12/11/2026 22:57 | `def09b58768bf69c570a8dbbf7752c9c834abbb75f996fb8ad040912b706e01e` | pregão de 02/01/2025 | ticker, ISIN (`BRELETACNOR6`) e espécie da ELET3, ativo fora de negociação (`is_active = false`) |
| `cripto/foxbit_markets.json` | `https://api.foxbit.com.br/rest/v3/markets` | 12/11/2026 22:57 | `a181934fa40a6ee0a04207548f8d52a9ed6d93153edebe3f5c7f1c57c0f94188` | 132 mercados, 127 pares de cripto em BRL | `assets.ticker` (símbolo) e `crypto_assets.name` das 12 criptos (D60; o Mercado Bitcoin continua bloqueado, F1) |
| `cripto/foxbit_currencies.json` | `https://api.foxbit.com.br/rest/v3/currencies` | 12/11/2026 22:57 | `9e73641b803e9a213b5932852bffb1f22fcfd603e8a05b2824d8a5d52025b820` | moedas da Foxbit | conferência dos nomes (não alimenta coluna) |

Também usados, já baixados antes: Cadastro de Instrumentos de 30/10/2026 (`data/raw/b3-instrumentos/`, "Final"; ticker, ISIN, categoria, especificação e nome do emissor), informe mensal de FII da CVM de 2026 (arquivo extra da seção 1; CNPJ dos FIIs), registro de fundos da CVM (`data/raw/cvm-fundos/registro_fundo_classe/registro_fundo.csv`; CNPJ dos ETFs) e o CSV do Tesouro (arquivo 6; tipos e títulos).

A planilha antiga `ClassifSetorial.zip` (`https://bvmf.bmfbovespa.com.br/InstDados/InformacoesEmpresas/ClassifSetorial.zip`) ainda está publicada, mas é de 15/09/2022 e não foi usada.

### 6.1 Fontes do segundo corte (P1-2, seções 2.3 a 2.10 do `inserts.sql`)

Baixadas em 13/11/2026 para `data/raw/` (fora do Git), cada uma na própria pasta. Horários em BRT.

| Arquivo | URL exata | Download | SHA-256 | Registros | Alimenta |
|---|---|---|---|---|---|
| `foxbit-candles/btcbrl_1d.json` | `https://api.foxbit.com.br/rest/v3/markets/btcbrl/candlesticks?interval=1d&start_time=2026-01-01T00:00:00.000Z&end_time=2026-11-13T00:00:00.000Z&limit=500` | 13/11/2026 08:52 | `00e705271826ab4a914a71c536e6125fcd2d86cfdf9d4e0c66710d033d69ba4b` | 317 candles diários (01/01 a 13/11/2026, UTC) | `crypto_prices` do BTC (decisão de 13/11, F1) |
| `foxbit-candles/ethbrl_1d.json` | mesma URL com `ethbrl` | 13/11/2026 08:52 | `100db70af2b08ef9fc39479fa39a7612992a977a194f4ba763e2d64fdc16271a` | 317 candles diários | `crypto_prices` do ETH |
| `b3-cotahist/COTAHIST_D30102026.ZIP` | `https://bvmf.bmfbovespa.com.br/InstDados/SerHist/COTAHIST_D30102026.ZIP` | 31/10/2026 09:56 (já no repositório local) | ZIP `8f88503d4106f3010b2ba37ba9e26cd322e7564197ac8d78caa487301c9842f6`; TXT `a115a3eb5e8f215df33c7d397ffe6d566dcf3eadc0c6e63a4ab103ccb62b9323` | pregão de 30/10/2026 | `quotes` de 30/10 (com o arquivo 1 para 12/11) |
| `cvm-fii-trim/inf_trimestral_fii_2026.zip` | `https://dados.cvm.gov.br/dados/FII/DOC/INF_TRIMESTRAL/DADOS/inf_trimestral_fii_2026.zip` | 13/11/2026 08:52 | `deb46b0607fef5ae1a3da22cc925552a1e9cefbcafb684d8dcb76cf91e6e53f5` | 16 CSV; geral com 2.760 informes, imovel com 11.410 itens | `fii_quarterly_reports`, `fii_report_properties` |
| `cvm-ipe/ipe_cia_aberta_2026.zip` | `https://dados.cvm.gov.br/dados/CIA_ABERTA/DOC/IPE/DADOS/ipe_cia_aberta_2026.zip` | 13/11/2026 08:52 | `498337a805a0efb1f5856a79fa74c9507141b0b932ddf81f19a627dc46e5279e` | 39.173 documentos | `corporate_filings` |
| `cvm-dfp/dfp_cia_aberta_2025.zip` | `https://dados.cvm.gov.br/dados/CIA_ABERTA/DOC/DFP/DADOS/dfp_cia_aberta_2025.zip` | 13/11/2026 08:52 | `a0aaf1ed8be9f7a644d1ec7eb6c17f2d0860f40416c0e3151c2c690329eeb343` | 761 entregas (índice); BPA, BPP, DRE e composição do capital | `financial_statements`, `statement_lines` (DFP 2025) |
| `cvm-itr/itr_cia_aberta_2026.zip` | `https://dados.cvm.gov.br/dados/CIA_ABERTA/DOC/ITR/DADOS/itr_cia_aberta_2026.zip` | 13/11/2026 08:58 | `115227a5d0872e23a532c0f17c17683f7218ac225013eea2901844a92b3fe4a9` | 1.498 entregas (índice), de 31/03 a 30/09/2026 | `financial_statements`, `statement_lines` (ITR 2T26) |

Também usados, já baixados antes: informe mensal de FII de 2026 (arquivo extra da seção 1; `fii_monthly_reports`), CSV do Tesouro (arquivo 6; `fixed_income_prices`), `listedCompaniesProxy` (arquivos 4a–4c) e `b3-empresas/supplement_{BBAS,ITSA,ITUB,KLBN}.json` (`corporate_events`), Cadastro de Instrumentos de 30/10/2026 (nome do emissor do FII Opportunity, `FTCE11`). Custo atribuído das bonificações (F15): edital da AGE do Bradesco de 10/03/2022 (R$ 4,128165265), aviso aos acionistas da Itaúsa de 15/12/2025 (R$ 11,370033972) e fato relevante do Itaú Unibanco de 18/12/2025 (R$ 40,00).
