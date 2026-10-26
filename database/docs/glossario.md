# Glossário PT ↔ EN — Carteira B3 (tarefa G1)

> Correspondência entre os nomes do modelo ER (português, usados na entrega de BD) e os nomes físicos do banco (inglês, `snake_case`), usados em `prisma/schema.prisma`, nas migrations e em `database/sql/ddl.sql`.
> Gerado em 24/10/2026 a partir do banco migrado; conferido contra o modelo lógico do brModelo: **29 tabelas e 183 colunas, na mesma ordem do mapeamento**.

## Convenções

- Tabela: nome em inglês, no plural (`Usuario` → `users`). Modelo Prisma: singular em PascalCase (`User`).
- Chave primária de entidade forte: `id_<entidade>` → `id` (UUID gerado no banco). Chave estrangeira: `id_<entidade>` → `<entidade_em_inglês>_id`.
- Datas de registro (`criado_em`, `incluido_em`…) → `*_at` (`timestamptz`); datas de calendário → `*_date` ou nome próprio (`date`).
- Domínios do ER (`{COMPRA, VENDA}`) → tipos ENUM do PostgreSQL com valores em inglês (seção 3).
- Valores monetários `numeric(18,2)`; valores por ação/cota `numeric(20,8)`; percentuais e alíquotas como fração 0–1 em `numeric(10,8)`.

## 1. Tabelas

| # | Entidade / relacionamento (ER) | Tabela física | Modelo Prisma |
|---|---|---|---|
| 1 | Usuário (`Usuario`) | `users` | `User` |
| 2 | Corretora (`Corretora`) | `brokers` | `Broker` |
| 3 | Carteira (`Carteira`) | `portfolios` | `Portfolio` |
| 4 | Lote de importação (`LoteImportacao`) | `import_batches` | `ImportBatch` |
| 5 | Operação (`Operacao`) | `operations` | `Operation` |
| 6 | Setor (`Setor`) | `sectors` | `Sector` |
| 7 | Emissor (`Emissor`) | `issuers` | `Issuer` |
| 8 | Ativo (`Ativo`) | `assets` | `Asset` |
| 9 | Cotação (`Cotacao`) | `quotes` | `Quote` |
| 10 | Índice econômico (`IndiceEconomico`) | `economic_indexes` | `EconomicIndex` |
| 11 | Valor do índice (`ValorIndice`) | `index_values` | `IndexValue` |
| 12 | Demonstração (`Demonstracao`) | `financial_statements` | `FinancialStatement` |
| 13 | Linha de demonstração (`LinhaDemonstracao`) | `statement_lines` | `StatementLine` |
| 14 | Informe mensal de FII (`InformeMensalFII`) | `fii_monthly_reports` | `FiiMonthlyReport` |
| 15 | Informe trimestral de FII (`InformeTrimestralFII`) | `fii_quarterly_reports` | `FiiQuarterlyReport` |
| 16 | Imóvel do informe (`ImovelInforme`) | `fii_report_properties` | `FiiReportProperty` |
| 17 | Comunicado (`Comunicado`) | `corporate_filings` | `CorporateFiling` |
| 18 | Evento corporativo (`EventoCorporativo`) | `corporate_events` | `CorporateEvent` |
| 19 | Provento (`Provento`) | `income_distributions` | `IncomeDistribution` |
| 20 | Provento recebido (`ProventoRecebido`) | `received_income` | `ReceivedIncome` |
| 21 | Categoria de IR (`CategoriaIR`) | `tax_categories` | `TaxCategory` |
| 22 | Regra de IR (`RegraIR`) | `tax_rules` | `TaxRule` |
| 23 | Apuração (`Apuracao`) | `tax_assessments` | `TaxAssessment` |
| 24 | DARF (`DARF`) | `darfs` | `Darf` |
| 25 | Indicador (`Indicador`) | `indicators` | `Indicator` |
| 26 | Alerta de preço (`AlertaPreco`) | `price_alerts` | `PriceAlert` |
| 27 | Filtro salvo (`FiltroSalvo`) | `saved_screens` | `SavedScreen` |
| 28 | observa (N:N) (`observa`) | `watchlist_items` | `WatchlistItem` |
| 29 | critério (N:N) (`criterio`) | `screen_criteria` | `ScreenCriterion` |

## 2. Colunas por tabela

Tipo e nulidade lidos do banco migrado. *Nulo* = coluna que aceita nulo (atributo opcional ou FK com cardinalidade mínima 0).

### 2.1 Usuario → `users`

| Coluna (ER) | Coluna física | Tipo | Nulo | Chave |
|---|---|---|---|---|
| id_usuario | `id` | uuid | não | PK |
| nome | `name` | varchar(150) | não |  |
| email | `email` | citext | não |  |
| hash_senha | `password_hash` | varchar(255) | não |  |
| criado_em | `created_at` | timestamptz | não |  |

### 2.2 Corretora → `brokers`

| Coluna (ER) | Coluna física | Tipo | Nulo | Chave |
|---|---|---|---|---|
| id_corretora | `id` | uuid | não | PK |
| nome | `name` | varchar(150) | não |  |
| cnpj | `cnpj` | char(14) | não |  |

### 2.3 Carteira → `portfolios`

| Coluna (ER) | Coluna física | Tipo | Nulo | Chave |
|---|---|---|---|---|
| id_carteira | `id` | uuid | não | PK |
| id_usuario | `user_id` | uuid | não | FK → users |
| nome | `name` | varchar(150) | não |  |
| criada_em | `created_at` | timestamptz | não |  |

### 2.4 LoteImportacao → `import_batches`

| Coluna (ER) | Coluna física | Tipo | Nulo | Chave |
|---|---|---|---|---|
| id_lote | `id` | uuid | não | PK |
| id_carteira | `portfolio_id` | uuid | não | FK → portfolios |
| nome_arquivo | `file_name` | varchar(255) | não |  |
| hash_arquivo | `file_sha256` | char(64) | não |  |
| situacao | `status` | import_batch_status | não |  |
| qtd_linhas | `row_count` | integer | não |  |
| importado_em | `imported_at` | timestamptz | não |  |
| confirmado_em | `confirmed_at` | timestamptz | sim |  |

### 2.5 Operacao → `operations`

| Coluna (ER) | Coluna física | Tipo | Nulo | Chave |
|---|---|---|---|---|
| id_operacao | `id` | uuid | não | PK |
| id_carteira | `portfolio_id` | uuid | não | FK → portfolios |
| id_ativo | `asset_id` | uuid | não | FK → assets |
| id_corretora | `broker_id` | uuid | não | FK → brokers |
| id_lote | `import_batch_id` | uuid | sim | FK → import_batches |
| tipo | `type` | operation_type | não |  |
| data_pregao | `trade_date` | date | não |  |
| quantidade | `quantity` | integer | não |  |
| preco_unitario | `unit_price` | numeric(20,8) | não |  |
| custos | `fees` | numeric(18,2) | não |  |
| sequencia | `sequence` | bigint | não |  |

### 2.6 Setor → `sectors`

| Coluna (ER) | Coluna física | Tipo | Nulo | Chave |
|---|---|---|---|---|
| id_setor | `id` | uuid | não | PK |
| id_setor_pai | `parent_id` | uuid | sim | FK → sectors |
| nome | `name` | varchar(150) | não |  |

### 2.7 Emissor → `issuers`

| Coluna (ER) | Coluna física | Tipo | Nulo | Chave |
|---|---|---|---|---|
| id_emissor | `id` | uuid | não | PK |
| id_setor | `sector_id` | uuid | sim | FK → sectors |
| nome | `name` | varchar(150) | não |  |
| tipo | `kind` | issuer_kind | não |  |
| cnpj | `cnpj` | char(14) | sim |  |
| codigo_cvm | `cvm_code` | varchar(10) | sim |  |

### 2.8 Ativo → `assets`

| Coluna (ER) | Coluna física | Tipo | Nulo | Chave |
|---|---|---|---|---|
| id_ativo | `id` | uuid | não | PK |
| id_emissor | `issuer_id` | uuid | não | FK → issuers |
| ticker | `ticker` | varchar(12) | não |  |
| isin | `isin` | char(12) | não |  |
| tipo | `type` | asset_type | não |  |
| classe | `share_class` | share_class | sim |  |
| negociado | `is_active` | boolean | não |  |

### 2.9 Cotacao → `quotes`

| Coluna (ER) | Coluna física | Tipo | Nulo | Chave |
|---|---|---|---|---|
| id_ativo | `asset_id` | uuid | não | PK, FK → assets |
| data | `quote_date` | date | não | PK |
| abertura | `open` | numeric(20,8) | não |  |
| maxima | `high` | numeric(20,8) | não |  |
| minima | `low` | numeric(20,8) | não |  |
| fechamento | `close` | numeric(20,8) | não |  |
| volume | `volume` | numeric(18,2) | não |  |
| negocios | `trades_count` | integer | não |  |

### 2.10 IndiceEconomico → `economic_indexes`

| Coluna (ER) | Coluna física | Tipo | Nulo | Chave |
|---|---|---|---|---|
| id_indice | `id` | uuid | não | PK |
| codigo | `code` | index_code | não |  |
| nome | `name` | varchar(150) | não |  |
| periodicidade | `periodicity` | index_periodicity | não |  |
| unidade | `unit` | index_unit | não |  |
| fonte | `source` | varchar(100) | não |  |

### 2.11 ValorIndice → `index_values`

| Coluna (ER) | Coluna física | Tipo | Nulo | Chave |
|---|---|---|---|---|
| id_indice | `economic_index_id` | uuid | não | PK, FK → economic_indexes |
| data_referencia | `reference_date` | date | não | PK |
| valor | `value` | numeric(20,8) | não |  |

### 2.12 Demonstracao → `financial_statements`

| Coluna (ER) | Coluna física | Tipo | Nulo | Chave |
|---|---|---|---|---|
| id_demonstracao | `id` | uuid | não | PK |
| id_emissor | `issuer_id` | uuid | não | FK → issuers |
| tipo_documento | `filing_type` | filing_type | não |  |
| inicio_exercicio | `fiscal_year_start` | date | não |  |
| fim_periodo | `period_end` | date | não |  |
| versao | `version` | integer | não |  |
| entregue_em | `filed_at` | timestamptz | não |  |
| acoes_ordinarias | `common_shares` | bigint | não |  |
| acoes_preferenciais | `preferred_shares` | bigint | não |  |
| tesouraria_ordinarias | `treasury_common` | bigint | não |  |
| tesouraria_preferenciais | `treasury_preferred` | bigint | não |  |

### 2.13 LinhaDemonstracao → `statement_lines`

| Coluna (ER) | Coluna física | Tipo | Nulo | Chave |
|---|---|---|---|---|
| id_demonstracao | `financial_statement_id` | uuid | não | PK, FK → financial_statements |
| escopo | `scope` | statement_scope | não | PK |
| codigo_conta | `account_code` | varchar(30) | não | PK |
| descricao_conta | `account_description` | varchar(255) | não |  |
| valor | `value` | numeric(18,2) | não |  |

### 2.14 InformeMensalFII → `fii_monthly_reports`

| Coluna (ER) | Coluna física | Tipo | Nulo | Chave |
|---|---|---|---|---|
| id_informe_mensal | `id` | uuid | não | PK |
| id_emissor | `issuer_id` | uuid | não | FK → issuers |
| mes_referencia | `reference_month` | date | não |  |
| versao | `version` | integer | não |  |
| patrimonio_liquido | `net_worth` | numeric(18,2) | não |  |
| cotas_emitidas | `shares_outstanding` | bigint | não |  |
| numero_cotistas | `shareholders_count` | integer | não |  |
| dividend_yield_mes | `dividend_yield_month` | numeric(10,8) | não |  |

### 2.15 InformeTrimestralFII → `fii_quarterly_reports`

| Coluna (ER) | Coluna física | Tipo | Nulo | Chave |
|---|---|---|---|---|
| id_informe_trimestral | `id` | uuid | não | PK |
| id_emissor | `issuer_id` | uuid | não | FK → issuers |
| data_referencia | `reference_date` | date | não |  |
| versao | `version` | integer | não |  |

### 2.16 ImovelInforme → `fii_report_properties`

| Coluna (ER) | Coluna física | Tipo | Nulo | Chave |
|---|---|---|---|---|
| id_informe_trimestral | `fii_quarterly_report_id` | uuid | não | PK, FK → fii_quarterly_reports |
| numero_item | `item_number` | integer | não | PK |
| nome | `name` | varchar(255) | não |  |
| endereco | `address` | varchar(255) | não |  |
| classe | `property_class` | property_class | não |  |
| area | `area` | numeric(14,2) | sim |  |
| percentual_vacancia | `vacancy_rate` | numeric(10,8) | sim |  |
| percentual_inadimplencia | `delinquency_rate` | numeric(10,8) | sim |  |
| percentual_receitas_fii | `revenue_share` | numeric(10,8) | sim |  |
| percentual_locado | `leased_rate` | numeric(10,8) | sim |  |

### 2.17 Comunicado → `corporate_filings`

| Coluna (ER) | Coluna física | Tipo | Nulo | Chave |
|---|---|---|---|---|
| id_comunicado | `id` | uuid | não | PK |
| id_emissor | `issuer_id` | uuid | não | FK → issuers |
| categoria | `category` | varchar(100) | não |  |
| assunto | `subject` | varchar(500) | não |  |
| data_referencia | `reference_date` | date | não |  |
| entregue_em | `delivered_at` | timestamptz | não |  |
| url_documento | `document_url` | varchar(500) | não |  |
| protocolo_cvm | `cvm_protocol` | varchar(30) | não |  |

### 2.18 EventoCorporativo → `corporate_events`

| Coluna (ER) | Coluna física | Tipo | Nulo | Chave |
|---|---|---|---|---|
| id_evento | `id` | uuid | não | PK |
| id_ativo | `asset_id` | uuid | não | FK → assets |
| tipo | `type` | corporate_event_type | não |  |
| data_ex | `ex_date` | date | não |  |
| proporcao_de | `ratio_from` | numeric(20,8) | não |  |
| proporcao_para | `ratio_to` | numeric(20,8) | não |  |
| custo_unitario_bonificacao | `bonus_unit_cost` | numeric(20,8) | sim |  |
| fonte | `source` | data_source | não |  |

### 2.19 Provento → `income_distributions`

| Coluna (ER) | Coluna física | Tipo | Nulo | Chave |
|---|---|---|---|---|
| id_provento | `id` | uuid | não | PK |
| id_ativo | `asset_id` | uuid | não | FK → assets |
| tipo | `type` | income_type | não |  |
| data_com | `record_date` | date | não |  |
| data_pagamento | `payment_date` | date | sim |  |
| valor_por_cota | `amount_per_share` | numeric(20,8) | não |  |
| fonte | `source` | varchar(50) | não |  |

### 2.20 ProventoRecebido → `received_income`

| Coluna (ER) | Coluna física | Tipo | Nulo | Chave |
|---|---|---|---|---|
| id_recebimento | `id` | uuid | não | PK |
| id_provento | `income_distribution_id` | uuid | não | FK → income_distributions |
| id_carteira | `portfolio_id` | uuid | não | FK → portfolios |
| id_corretora | `broker_id` | uuid | não | FK → brokers |
| quantidade_base | `base_quantity` | integer | não |  |
| valor_bruto | `gross_amount` | numeric(18,2) | não |  |
| ir_retido | `withheld_tax` | numeric(18,2) | não |  |
| recebido_em | `received_at` | date | não |  |

### 2.21 CategoriaIR → `tax_categories`

| Coluna (ER) | Coluna física | Tipo | Nulo | Chave |
|---|---|---|---|---|
| id_categoria | `id` | uuid | não | PK |
| codigo | `code` | tax_category_code | não |  |
| nome | `name` | varchar(150) | não |  |
| codigo_receita | `revenue_code` | varchar(10) | não |  |

### 2.22 RegraIR → `tax_rules`

| Coluna (ER) | Coluna física | Tipo | Nulo | Chave |
|---|---|---|---|---|
| id_categoria | `tax_category_id` | uuid | não | PK, FK → tax_categories |
| inicio_vigencia | `effective_from` | date | não | PK |
| aliquota | `rate` | numeric(10,8) | não |  |
| limite_isencao_vendas | `sales_exemption_limit` | numeric(18,2) | sim |  |

### 2.23 Apuracao → `tax_assessments`

| Coluna (ER) | Coluna física | Tipo | Nulo | Chave |
|---|---|---|---|---|
| id_apuracao | `id` | uuid | não | PK |
| id_usuario | `user_id` | uuid | não | FK → users |
| id_darf | `darf_id` | uuid | sim | FK → darfs |
| id_categoria | `tax_category_id` | uuid | não | FK → tax_categories |
| mes_referencia | `reference_month` | date | não |  |
| total_vendas | `total_sales` | numeric(18,2) | não |  |
| resultado_liquido | `net_result` | numeric(18,2) | não |  |
| prejuizo_compensado | `loss_offset` | numeric(18,2) | não |  |
| fechada_em | `closed_at` | timestamptz | não |  |

### 2.24 DARF → `darfs`

| Coluna (ER) | Coluna física | Tipo | Nulo | Chave |
|---|---|---|---|---|
| id_darf | `id` | uuid | não | PK |
| id_usuario | `user_id` | uuid | não | FK → users |
| mes_referencia | `reference_month` | date | não |  |
| valor_pago | `amount_paid` | numeric(18,2) | sim |  |
| pago_em | `paid_at` | date | sim |  |

### 2.25 Indicador → `indicators`

| Coluna (ER) | Coluna física | Tipo | Nulo | Chave |
|---|---|---|---|---|
| id_indicador | `id` | uuid | não | PK |
| codigo | `code` | varchar(20) | não |  |
| nome | `name` | varchar(150) | não |  |
| grupo | `indicator_group` | indicator_group | não |  |
| formula | `formula` | text | não |  |
| unidade | `unit` | indicator_unit | não |  |
| aplica_a | `applies_to` | analysis_asset_type | não |  |

### 2.26 AlertaPreco → `price_alerts`

| Coluna (ER) | Coluna física | Tipo | Nulo | Chave |
|---|---|---|---|---|
| id_alerta | `id` | uuid | não | PK |
| id_usuario | `user_id` | uuid | não | FK → users |
| id_ativo | `asset_id` | uuid | não | FK → assets |
| preco_alvo | `target_price` | numeric(20,8) | não |  |
| direcao | `direction` | price_direction | não |  |
| criado_em | `created_at` | timestamptz | não |  |
| disparado_em | `triggered_at` | timestamptz | sim |  |
| data_cotacao_disparo | `triggered_quote_date` | date | sim |  |

### 2.27 FiltroSalvo → `saved_screens`

| Coluna (ER) | Coluna física | Tipo | Nulo | Chave |
|---|---|---|---|---|
| id_filtro | `id` | uuid | não | PK |
| id_usuario | `user_id` | uuid | não | FK → users |
| id_indicador_ordenacao | `sort_indicator_id` | uuid | sim | FK → indicators |
| nome | `name` | varchar(150) | não |  |
| tipo_ativo | `asset_type` | analysis_asset_type | não |  |
| direcao_ordenacao | `sort_direction` | sort_direction | não |  |

### 2.28 observa → `watchlist_items`

| Coluna (ER) | Coluna física | Tipo | Nulo | Chave |
|---|---|---|---|---|
| id_usuario | `user_id` | uuid | não | PK, FK → users |
| id_ativo | `asset_id` | uuid | não | PK, FK → assets |
| incluido_em | `added_at` | timestamptz | não |  |

### 2.29 criterio → `screen_criteria`

| Coluna (ER) | Coluna física | Tipo | Nulo | Chave |
|---|---|---|---|---|
| id_filtro | `saved_screen_id` | uuid | não | PK, FK → saved_screens |
| id_indicador | `indicator_id` | uuid | não | PK, FK → indicators |
| valor_minimo | `min_value` | numeric(20,8) | sim |  |
| valor_maximo | `max_value` | numeric(20,8) | sim |  |

## 3. Domínios (ENUM)

| Atributo no ER | Tipo no banco | Valores (ER → banco) |
|---|---|---|
| LoteImportacao.situacao | `import_batch_status` | PENDENTE → PENDING; CONFIRMADO → CONFIRMED; DESCARTADO → DISCARDED |
| Operacao.tipo | `operation_type` | COMPRA → BUY; VENDA → SELL |
| Emissor.tipo | `issuer_kind` | EMPRESA → COMPANY; FUNDO → FUND; ESTRANGEIRO → FOREIGN |
| Ativo.tipo | `asset_type` | ACAO → STOCK; FII; ETF; BDR |
| Ativo.classe | `share_class` | ON; PN; PNA; PNB; UNIT |
| IndiceEconomico.codigo | `index_code` | CDI; SELIC; IPCA; IBOV |
| IndiceEconomico.periodicidade | `index_periodicity` | DIARIA → DAILY; MENSAL → MONTHLY |
| IndiceEconomico.unidade | `index_unit` | TAXA_PERCENTUAL → RATE_PERCENT; PONTOS → POINTS |
| Demonstracao.tipo_documento | `filing_type` | DFP; ITR |
| LinhaDemonstracao.escopo | `statement_scope` | INDIVIDUAL; CONSOLIDADO → CONSOLIDATED |
| ImovelInforme.classe | `property_class` | RENDA_ACABADO → RENT_FINISHED; RENDA_CONSTRUCAO → RENT_UNDER_CONSTRUCTION; VENDA_ACABADO → SALE_FINISHED; VENDA_CONSTRUCAO → SALE_UNDER_CONSTRUCTION |
| EventoCorporativo.tipo | `corporate_event_type` | DESDOBRAMENTO → SPLIT; GRUPAMENTO → REVERSE_SPLIT; BONIFICACAO → BONUS |
| EventoCorporativo.fonte | `data_source` | B3; MANUAL |
| Provento.tipo | `income_type` | DIVIDENDO → DIVIDEND; JCP; RENDIMENTO_FII → FII_INCOME |
| CategoriaIR.codigo | `tax_category_code` | COMUM_ACOES → COMMON_STOCK; COMUM_OUTROS → COMMON_OTHER; DAY_TRADE; FII (D35) |
| Indicador.grupo | `indicator_group` | VALUATION; EFICIENCIA → EFFICIENCY; RENTABILIDADE → PROFITABILITY; ENDIVIDAMENTO → DEBT; CRESCIMENTO → GROWTH; FII |
| Indicador.unidade | `indicator_unit` | RAZAO → RATIO; PERCENTUAL → PERCENT; MOEDA → CURRENCY |
| Indicador.aplica_a / FiltroSalvo.tipo_ativo | `analysis_asset_type` | ACAO → STOCK; FII |
| AlertaPreco.direcao | `price_direction` | ACIMA → ABOVE; ABAIXO → BELOW |
| FiltroSalvo.direcao_ordenacao | `sort_direction` | ASC; DESC |

## 4. Colunas físicas sem atributo correspondente no ER

Nenhuma. O banco tem exatamente as 183 colunas do ER; não há colunas técnicas (como `updated_at`) no schema `public` (decisão D34).

## 5. Objetos do banco sem entidade no ER

- Extensão `citext` (tipo do `users.email`).
- 42 restrições CHECK com nome `<tabela>_<regra>_check`, que materializam as restrições da seção 4 do modelo ER.
- Índices de apoio (`*_idx`) em chaves estrangeiras usadas em consultas e o índice da linha do tempo da carteira (`operations_timeline_idx`).
