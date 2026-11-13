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
| `stockDividends[].factor` | `ratio_from`/`ratio_to` (ex.: desdobramento 100 → 1:100; grupamento 0,01 → 100:1; bonificação 10% → 100:110) |
| `codeCVM` | `issuers.cvm_code` |
| `subscriptions[]` | fora do ER |

### 2.5 Mercado Bitcoin v4 → `crypto_prices` (PrecoCripto). **Não conferido** (F1)
Pelo formato documentado da API (candles com vetores `t`, `o`, `h`, `l`, `c`, `v`): `t` (epoch, UTC) → `price_date`; `c` (fechamento do dia) → `reference_price`; `symbol` BTC-BRL → `crypto_assets`/`assets.ticker` BTC.

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

| Tabela | Linhas | Origem |
|---|---|---|
| `index_values` (IBOV) | 13 pregões, de 26/10 a 12/11/2026 | arquivo 3 |
| `income_distributions` | 26: PETR4 (10: 2 dividendos, 8 JCP), BBDC4 (6 JCP), HGLG11 (10 rendimentos); 6 com pagamento depois de 12/11/2026 | arquivos 4a–4c |
| `crypto_prices` | 0 (F1) | — |

Validado em `carteira_dev` numa transação desfeita (`ROLLBACK`) e com pais temporários. Contagens 13 e 26; a segunda execução não muda nada; pai ausente falha com `not_null_violation`. Dependências da seção 1 (BD-1): `economic_indexes` IBOV e os ativos PETR4 (`BRPETRACNPR6`), BBDC4 (`BRBBDCACNPR8`) e HGLG11 (`BRHGLGCTF004`).

## 5. Achados e prompts de correção

| ID | Achado | Para quem |
|---|---|---|
| F1 | API v4 do Mercado Bitcoin bloqueada pelo Cloudflare para esta rede (403 em `candles`, `tickers` e `symbols`, também com UA de cliente; a v3 em `www.mercadobitcoin.net/api` respondeu 521). Não houve tentativa de contornar o bloqueio. `crypto_prices` sem seed | usuário → agente de banco |
| F2 | `amount_per_share` é `NUMERIC(20,8)` e a B3 publica `rate` com 11 casas; 5 linhas do BBDC4 têm 9 casas significativas e foram arredondadas na 8ª. Erro ≤ 5 × 10⁻⁹ por cota (R$ 0,005 por milhão de cotas). `received_income` não é afetado (valor informado pela corretora, D11) | usuário (decisão) |
| F3 | "RENDIMENTO" em ação (PETR3/PETR4: 0,01649003 e 0,02038398 em 2026, correção de proventos declarados) não tem valor em `income_type` | usuário (decisão) → agente de banco |
| F4 | `stockDividends` traz "CIS RED CAP" (cisão com redução de capital), sem valor em `corporate_event_type` | registrar; fora do S1 (D29) |
| F5 | Cadastro de Instrumentos baixado às 21:42 do mesmo dia veio "Parcial"; o de 30/10 em `data/raw/b3-instrumentos/` é "Final" | backend (K5) |
| F6 | Rodapé da página do IBOV: as duas linhas se chamam "MÍNIMO", e a segunda traz os máximos | backend (S2) |
| F7 | FUNDS no Cadastro mistura FII com FIAGRO, FIDC, FIP e FI-Infra, e o `CODBDI` 14 mistura ETF com esses fundos | backend (K5) |
| F8 | D59 (proposta) atribui rendimentos de FII ao informe mensal da CVM; o dado está no `listedCompaniesProxy` | usuário (aprovação da D59) |

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
