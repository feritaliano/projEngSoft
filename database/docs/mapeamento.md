# Mapeamento ER → relacional

> Gerado a partir do modelo lógico `CarteiraB3_Logico` (brModelo Web), conferido contra o modelo conceitual `CarteiraB3_ER`. Fonte do ER: `database/docs/modelo-er.md`.

## 1. Regras de mapeamento aplicadas

| Situação no ER | Regra | Onde ocorre |
|---|---|---|
| Entidade forte | Vira tabela; o identificador vira PK (`id_<entidade>`) | 23 entidades fortes |
| Relacionamento 1:N | FK no lado N, referenciando a PK do lado 1. Se a cardinalidade mínima do lado 1 é 0, a FK aceita nulo | 27 relacionamentos (R01–R06, R08, R09, R12, R14–R23, R25–R28, R30, R32, R36, R37) |
| Autorrelacionamento 1:N | FK na própria tabela, referenciando a sua PK | R07 subdivide (Setor) |
| Entidade fraca | Vira tabela com PK composta pela PK do dono (FK) e pelo identificador parcial | 9 relacionamentos identificadores (R10, R11, R13, R31, R33, R34, R35, R38, R39): Cotação, Valor do índice, Linha de demonstração, Imóvel do informe, Regra de IR, Alocação-alvo, Meta, Preço e taxa do título, Preço da cripto |
| Especialização (parcial, exclusiva) | Uma tabela por entidade: a superclasse mantém a sua tabela; cada subclasse vira tabela com PK = PK da superclasse, que também é FK para ela (D50) | Ativo ⊃ TituloRendaFixa, Criptoativo |
| Relacionamento N:N | Vira tabela própria, com PK composta pelas FKs das duas entidades e os atributos do relacionamento | R24 observa, R29 critério |
| Atributo opcional (0,1) | Coluna que aceita nulo | Indicado em cada tabela |

Resultado: **36 tabelas** (34 entidades + 2 relacionamentos N:N), **210 colunas**. Revisão da D3 em 31/10/2026 (D50): 7 tabelas novas (3.30–3.36) e mudanças em Corretora, Operacao e Ativo.

Notação: `Tabela (__chave primária__, *chave estrangeira*, atributo)`.

## 2. Esquema relacional

- Usuario (__id_usuario__, nome, email, hash_senha, criado_em)
- Corretora (__id_corretora__, nome, cnpj)
- Carteira (__id_carteira__, *id_usuario*, nome, criada_em)
- LoteImportacao (__id_lote__, *id_carteira*, nome_arquivo, hash_arquivo, situacao, qtd_linhas, importado_em, confirmado_em)
- Operacao (__id_operacao__, *id_carteira*, *id_ativo*, *id_corretora*, *id_lote*, tipo, data_pregao, quantidade, preco_unitario, custos, sequencia)
- Setor (__id_setor__, *id_setor_pai*, nome)
- Emissor (__id_emissor__, *id_setor*, nome, tipo, cnpj, codigo_cvm)
- Ativo (__id_ativo__, *id_emissor*, ticker, isin, tipo, classe, negociado, programa_bdr)
- Cotacao (*__id_ativo__*, __data__, abertura, maxima, minima, fechamento, volume, negocios)
- IndiceEconomico (__id_indice__, codigo, nome, periodicidade, unidade, fonte)
- ValorIndice (*__id_indice__*, __data_referencia__, valor)
- Demonstracao (__id_demonstracao__, *id_emissor*, tipo_documento, inicio_exercicio, fim_periodo, versao, entregue_em, acoes_ordinarias, acoes_preferenciais, tesouraria_ordinarias, tesouraria_preferenciais)
- LinhaDemonstracao (*__id_demonstracao__*, __escopo__, __codigo_conta__, descricao_conta, valor)
- InformeMensalFII (__id_informe_mensal__, *id_emissor*, mes_referencia, versao, patrimonio_liquido, cotas_emitidas, numero_cotistas, dividend_yield_mes)
- InformeTrimestralFII (__id_informe_trimestral__, *id_emissor*, data_referencia, versao)
- ImovelInforme (*__id_informe_trimestral__*, __numero_item__, nome, endereco, classe, area, percentual_vacancia, percentual_inadimplencia, percentual_receitas_fii, percentual_locado)
- Comunicado (__id_comunicado__, *id_emissor*, categoria, assunto, data_referencia, entregue_em, url_documento, protocolo_cvm)
- EventoCorporativo (__id_evento__, *id_ativo*, tipo, data_ex, proporcao_de, proporcao_para, custo_unitario_bonificacao, fonte)
- Provento (__id_provento__, *id_ativo*, tipo, data_com, data_pagamento, valor_por_cota, fonte)
- ProventoRecebido (__id_recebimento__, *id_provento*, *id_carteira*, *id_corretora*, quantidade_base, valor_bruto, ir_retido, recebido_em)
- CategoriaIR (__id_categoria__, codigo, nome, codigo_receita)
- RegraIR (*__id_categoria__*, __inicio_vigencia__, aliquota, limite_isencao_vendas)
- Apuracao (__id_apuracao__, *id_usuario*, *id_darf*, *id_categoria*, mes_referencia, total_vendas, resultado_liquido, prejuizo_compensado, fechada_em)
- DARF (__id_darf__, *id_usuario*, mes_referencia, valor_pago, pago_em)
- Indicador (__id_indicador__, codigo, nome, grupo, formula, unidade, aplica_a)
- AlertaPreco (__id_alerta__, *id_usuario*, *id_ativo*, preco_alvo, direcao, criado_em, disparado_em, data_cotacao_disparo)
- FiltroSalvo (__id_filtro__, *id_usuario*, *id_indicador_ordenacao*, nome, tipo_ativo, direcao_ordenacao)
- observa (*__id_usuario__*, *__id_ativo__*, incluido_em)
- criterio (*__id_filtro__*, *__id_indicador__*, valor_minimo, valor_maximo)
- AlocacaoAlvo (*__id_carteira__*, __classe__, percentual_alvo)
- Meta (*__id_carteira__*, __tipo__, valor_alvo, prazo, criada_em)
- TipoTituloRF (__id_tipo_titulo__, *id_indice*, nome, juros_semestrais)
- TituloRendaFixa (*__id_ativo__*, *id_tipo_titulo*, data_vencimento)
- PrecoTaxaTitulo (*__id_ativo__*, __data_base__, taxa_compra, taxa_venda, pu_compra, pu_venda)
- Criptoativo (*__id_ativo__*, nome)
- PrecoCripto (*__id_ativo__*, __data__, preco_referencia)

## 3. Tabelas em detalhe

### 3.1 Usuario (Usuário)

| Coluna | Tipo | Restrições |
|---|---|---|
| id_usuario | UUID | PK |
| nome | VARCHAR(150) | NOT NULL |
| email | VARCHAR(254) | NOT NULL, UNIQUE |
| hash_senha | VARCHAR(255) | NOT NULL |
| criado_em | TIMESTAMP | NOT NULL |

- **PK:** (id_usuario)
- **Regra aplicada:** Entidade forte → tabela própria; o identificador vira PK.

### 3.2 Corretora

| Coluna | Tipo | Restrições |
|---|---|---|
| id_corretora | UUID | PK |
| nome | VARCHAR(150) | NOT NULL |
| cnpj | CHAR(14) | nulo permitido, UNIQUE |

- **PK:** (id_corretora)
- Desde a D3 (D50), o CNPJ é opcional: a exchange estrangeira de cripto não tem CNPJ.
- **Regra aplicada:** Entidade forte → tabela própria; o identificador vira PK.

### 3.3 Carteira

| Coluna | Tipo | Restrições |
|---|---|---|
| id_carteira | UUID | PK |
| id_usuario | UUID | FK, NOT NULL |
| nome | VARCHAR(150) | NOT NULL |
| criada_em | TIMESTAMP | NOT NULL |

- **PK:** (id_carteira)
- **FK:** id_usuario → Usuario(id_usuario)
- **UNIQUE:** (id_usuario, nome)
- **Regra aplicada:** Entidade forte → tabela própria; o identificador vira PK. R01 possui (1:N) → FK `id_usuario` no lado N, referenciando Usuario.

### 3.4 LoteImportacao (Lote de importação)

| Coluna | Tipo | Restrições |
|---|---|---|
| id_lote | UUID | PK |
| id_carteira | UUID | FK, NOT NULL |
| nome_arquivo | VARCHAR(255) | NOT NULL |
| hash_arquivo | CHAR(64) | NOT NULL |
| situacao | VARCHAR(20) | NOT NULL |
| qtd_linhas | INT | NOT NULL |
| importado_em | TIMESTAMP | NOT NULL |
| confirmado_em | TIMESTAMP | nulo permitido |

- **PK:** (id_lote)
- **FK:** id_carteira → Carteira(id_carteira)
- **UNIQUE:** (id_carteira, hash_arquivo)
- **Regra aplicada:** Entidade forte → tabela própria; o identificador vira PK. R05 importa (1:N) → FK `id_carteira` no lado N, referenciando Carteira.

### 3.5 Operacao (Operação)

| Coluna | Tipo | Restrições |
|---|---|---|
| id_operacao | UUID | PK |
| id_carteira | UUID | FK, NOT NULL |
| id_ativo | UUID | FK, NOT NULL |
| id_corretora | UUID | FK, NOT NULL |
| id_lote | UUID | FK, nulo permitido |
| tipo | VARCHAR(20) | NOT NULL |
| data_pregao | DATE | NOT NULL |
| quantidade | NUMERIC(20,8) | NOT NULL |
| preco_unitario | NUMERIC(20,8) | NOT NULL |
| custos | NUMERIC(18,2) | NOT NULL |
| sequencia | BIGINT | NOT NULL |

- **PK:** (id_operacao)
- **FK:** id_carteira → Carteira(id_carteira)
- **FK:** id_ativo → Ativo(id_ativo)
- **FK:** id_corretora → Corretora(id_corretora)
- **FK:** id_lote → LoteImportacao(id_lote)
- **Regra aplicada:** Entidade forte → tabela própria; o identificador vira PK. R02 registra (1:N) → FK `id_carteira` no lado N, referenciando Carteira. R03 negocia (1:N) → FK `id_ativo` no lado N, referenciando Ativo. R04 intermedia (1:N) → FK `id_corretora` no lado N, referenciando Corretora. R06 origina (1:N) → FK `id_lote` no lado N, referenciando LoteImportacao. Opcional (aceita nulo), porque a cardinalidade mínima do lado 1 é 0.

### 3.6 Setor

| Coluna | Tipo | Restrições |
|---|---|---|
| id_setor | UUID | PK |
| id_setor_pai | UUID | FK, nulo permitido |
| nome | VARCHAR(150) | NOT NULL |

- **PK:** (id_setor)
- **FK:** id_setor_pai → Setor(id_setor)
- **UNIQUE:** (id_setor_pai, nome)
- **Regra aplicada:** Entidade forte → tabela própria; o identificador vira PK. R07 subdivide (autorrelacionamento 1:N) → FK `id_setor_pai` na própria tabela, referenciando Setor; nula para o setor raiz.

### 3.7 Emissor

| Coluna | Tipo | Restrições |
|---|---|---|
| id_emissor | UUID | PK |
| id_setor | UUID | FK, nulo permitido |
| nome | VARCHAR(150) | NOT NULL |
| tipo | VARCHAR(20) | NOT NULL |
| cnpj | CHAR(14) | nulo permitido, UNIQUE |
| codigo_cvm | VARCHAR(10) | nulo permitido, UNIQUE |

- **PK:** (id_emissor)
- **FK:** id_setor → Setor(id_setor)
- **Regra aplicada:** Entidade forte → tabela própria; o identificador vira PK. R08 classifica (1:N) → FK `id_setor` no lado N, referenciando Setor. Opcional (aceita nulo), porque a cardinalidade mínima do lado 1 é 0.

### 3.8 Ativo

| Coluna | Tipo | Restrições |
|---|---|---|
| id_ativo | UUID | PK |
| id_emissor | UUID | FK, nulo permitido |
| ticker | VARCHAR(12) | nulo permitido, UNIQUE |
| isin | CHAR(12) | nulo permitido, UNIQUE |
| tipo | VARCHAR(20) | NOT NULL |
| classe | VARCHAR(20) | nulo permitido |
| negociado | BOOLEAN | NOT NULL |
| programa_bdr | VARCHAR(20) | nulo permitido |

- **PK:** (id_ativo)
- **FK:** id_emissor → Emissor(id_emissor)
- **Regra aplicada:** Entidade forte → tabela própria; o identificador vira PK. R09 emite (1:N) → FK `id_emissor` no lado N, referenciando Emissor. Opcional (aceita nulo), porque a cardinalidade mínima do lado 1 é 0 (cripto não tem emissor). Superclasse da especialização em TituloRendaFixa e Criptoativo (3.33, 3.35).
- Desde a D3 (D50), `ticker`, `isin` e `id_emissor` são obrigatórios ou não conforme o tipo (CHECK no DDL; modelo ER, seção 4); `programa_bdr` só no BDR.

### 3.9 Cotacao (Cotação)

| Coluna | Tipo | Restrições |
|---|---|---|
| id_ativo | UUID | PK, FK |
| data | DATE | PK |
| abertura | NUMERIC(20,8) | NOT NULL |
| maxima | NUMERIC(20,8) | NOT NULL |
| minima | NUMERIC(20,8) | NOT NULL |
| fechamento | NUMERIC(20,8) | NOT NULL |
| volume | NUMERIC(18,2) | NOT NULL |
| negocios | INT | NOT NULL |

- **PK:** (id_ativo, data)
- **FK:** id_ativo → Ativo(id_ativo)
- **Regra aplicada:** Entidade fraca de Ativo (relacionamento identificador R10 cotado) → tabela própria com PK composta pela PK do dono (FK) e pelo identificador parcial (data).

### 3.10 IndiceEconomico (Índice econômico)

| Coluna | Tipo | Restrições |
|---|---|---|
| id_indice | UUID | PK |
| codigo | VARCHAR(20) | NOT NULL, UNIQUE |
| nome | VARCHAR(150) | NOT NULL |
| periodicidade | VARCHAR(20) | NOT NULL |
| unidade | VARCHAR(20) | NOT NULL |
| fonte | VARCHAR(100) | NOT NULL |

- **PK:** (id_indice)
- **Regra aplicada:** Entidade forte → tabela própria; o identificador vira PK.

### 3.11 ValorIndice (Valor do índice)

| Coluna | Tipo | Restrições |
|---|---|---|
| id_indice | UUID | PK, FK |
| data_referencia | DATE | PK |
| valor | NUMERIC(20,8) | NOT NULL |

- **PK:** (id_indice, data_referencia)
- **FK:** id_indice → IndiceEconomico(id_indice)
- **Regra aplicada:** Entidade fraca de IndiceEconomico (relacionamento identificador R11 registra_valor) → tabela própria com PK composta pela PK do dono (FK) e pelo identificador parcial (data_referencia).

### 3.12 Demonstracao (Demonstração)

| Coluna | Tipo | Restrições |
|---|---|---|
| id_demonstracao | UUID | PK |
| id_emissor | UUID | FK, NOT NULL |
| tipo_documento | VARCHAR(20) | NOT NULL |
| inicio_exercicio | DATE | NOT NULL |
| fim_periodo | DATE | NOT NULL |
| versao | INT | NOT NULL |
| entregue_em | TIMESTAMP | NOT NULL |
| acoes_ordinarias | BIGINT | NOT NULL |
| acoes_preferenciais | BIGINT | NOT NULL |
| tesouraria_ordinarias | BIGINT | NOT NULL |
| tesouraria_preferenciais | BIGINT | NOT NULL |

- **PK:** (id_demonstracao)
- **FK:** id_emissor → Emissor(id_emissor)
- **UNIQUE:** (id_emissor, fim_periodo)
- **Regra aplicada:** Entidade forte → tabela própria; o identificador vira PK. R12 publica (1:N) → FK `id_emissor` no lado N, referenciando Emissor.

### 3.13 LinhaDemonstracao (Linha de demonstração)

| Coluna | Tipo | Restrições |
|---|---|---|
| id_demonstracao | UUID | PK, FK |
| escopo | VARCHAR(20) | PK |
| codigo_conta | VARCHAR(30) | PK |
| descricao_conta | VARCHAR(255) | NOT NULL |
| valor | NUMERIC(18,2) | NOT NULL |

- **PK:** (id_demonstracao, escopo, codigo_conta)
- **FK:** id_demonstracao → Demonstracao(id_demonstracao)
- **Regra aplicada:** Entidade fraca de Demonstracao (relacionamento identificador R13 compoe) → tabela própria com PK composta pela PK do dono (FK) e pelo identificador parcial (escopo, codigo_conta).

### 3.14 InformeMensalFII (Informe mensal de FII)

| Coluna | Tipo | Restrições |
|---|---|---|
| id_informe_mensal | UUID | PK |
| id_emissor | UUID | FK, NOT NULL |
| mes_referencia | DATE | NOT NULL |
| versao | INT | NOT NULL |
| patrimonio_liquido | NUMERIC(18,2) | NOT NULL |
| cotas_emitidas | BIGINT | NOT NULL |
| numero_cotistas | INT | NOT NULL |
| dividend_yield_mes | NUMERIC(10,8) | NOT NULL |

- **PK:** (id_informe_mensal)
- **FK:** id_emissor → Emissor(id_emissor)
- **UNIQUE:** (id_emissor, mes_referencia)
- **Regra aplicada:** Entidade forte → tabela própria; o identificador vira PK. R14 informa (1:N) → FK `id_emissor` no lado N, referenciando Emissor.

### 3.15 InformeTrimestralFII (Informe trimestral de FII)

| Coluna | Tipo | Restrições |
|---|---|---|
| id_informe_trimestral | UUID | PK |
| id_emissor | UUID | FK, NOT NULL |
| data_referencia | DATE | NOT NULL |
| versao | INT | NOT NULL |

- **PK:** (id_informe_trimestral)
- **FK:** id_emissor → Emissor(id_emissor)
- **UNIQUE:** (id_emissor, data_referencia)
- **Regra aplicada:** Entidade forte → tabela própria; o identificador vira PK. R30 entrega (1:N) → FK `id_emissor` no lado N, referenciando Emissor.

### 3.16 ImovelInforme (Imóvel do informe)

| Coluna | Tipo | Restrições |
|---|---|---|
| id_informe_trimestral | UUID | PK, FK |
| numero_item | INT | PK |
| nome | VARCHAR(255) | NOT NULL |
| endereco | VARCHAR(255) | NOT NULL |
| classe | VARCHAR(20) | NOT NULL |
| area | NUMERIC(14,2) | nulo permitido |
| percentual_vacancia | NUMERIC(10,8) | nulo permitido |
| percentual_inadimplencia | NUMERIC(10,8) | nulo permitido |
| percentual_receitas_fii | NUMERIC(10,8) | nulo permitido |
| percentual_locado | NUMERIC(10,8) | nulo permitido |

- **PK:** (id_informe_trimestral, numero_item)
- **FK:** id_informe_trimestral → InformeTrimestralFII(id_informe_trimestral)
- **Regra aplicada:** Entidade fraca de InformeTrimestralFII (relacionamento identificador R31 lista) → tabela própria com PK composta pela PK do dono (FK) e pelo identificador parcial (numero_item).

### 3.17 Comunicado

| Coluna | Tipo | Restrições |
|---|---|---|
| id_comunicado | UUID | PK |
| id_emissor | UUID | FK, NOT NULL |
| categoria | VARCHAR(100) | NOT NULL |
| assunto | VARCHAR(500) | NOT NULL |
| data_referencia | DATE | NOT NULL |
| entregue_em | TIMESTAMP | NOT NULL |
| url_documento | VARCHAR(500) | NOT NULL |
| protocolo_cvm | VARCHAR(30) | NOT NULL, UNIQUE |

- **PK:** (id_comunicado)
- **FK:** id_emissor → Emissor(id_emissor)
- **Regra aplicada:** Entidade forte → tabela própria; o identificador vira PK. R15 divulga (1:N) → FK `id_emissor` no lado N, referenciando Emissor.

### 3.18 EventoCorporativo (Evento corporativo)

| Coluna | Tipo | Restrições |
|---|---|---|
| id_evento | UUID | PK |
| id_ativo | UUID | FK, NOT NULL |
| tipo | VARCHAR(20) | NOT NULL |
| data_ex | DATE | NOT NULL |
| proporcao_de | NUMERIC(20,8) | NOT NULL |
| proporcao_para | NUMERIC(20,8) | NOT NULL |
| custo_unitario_bonificacao | NUMERIC(20,8) | nulo permitido |
| fonte | VARCHAR(10) | NOT NULL |

- **PK:** (id_evento)
- **FK:** id_ativo → Ativo(id_ativo)
- **UNIQUE:** (id_ativo, tipo, data_ex)
- **Regra aplicada:** Entidade forte → tabela própria; o identificador vira PK. R16 sofre (1:N) → FK `id_ativo` no lado N, referenciando Ativo.

### 3.19 Provento

| Coluna | Tipo | Restrições |
|---|---|---|
| id_provento | UUID | PK |
| id_ativo | UUID | FK, NOT NULL |
| tipo | VARCHAR(20) | NOT NULL |
| data_com | DATE | NOT NULL |
| data_pagamento | DATE | nulo permitido |
| valor_por_cota | NUMERIC(20,8) | NOT NULL |
| fonte | VARCHAR(50) | NOT NULL |

- **PK:** (id_provento)
- **FK:** id_ativo → Ativo(id_ativo)
- **Regra aplicada:** Entidade forte → tabela própria; o identificador vira PK. R17 distribui (1:N) → FK `id_ativo` no lado N, referenciando Ativo.

### 3.20 ProventoRecebido (Provento recebido)

| Coluna | Tipo | Restrições |
|---|---|---|
| id_recebimento | UUID | PK |
| id_provento | UUID | FK, NOT NULL |
| id_carteira | UUID | FK, NOT NULL |
| id_corretora | UUID | FK, NOT NULL |
| quantidade_base | INT | NOT NULL |
| valor_bruto | NUMERIC(18,2) | NOT NULL |
| ir_retido | NUMERIC(18,2) | NOT NULL |
| recebido_em | DATE | NOT NULL |

- **PK:** (id_recebimento)
- **FK:** id_provento → Provento(id_provento)
- **FK:** id_carteira → Carteira(id_carteira)
- **FK:** id_corretora → Corretora(id_corretora)
- **UNIQUE:** (id_carteira, id_provento, id_corretora)
- **Regra aplicada:** Entidade forte → tabela própria; o identificador vira PK. R18 credita (1:N) → FK `id_provento` no lado N, referenciando Provento. R19 recebe (1:N) → FK `id_carteira` no lado N, referenciando Carteira. R20 paga (1:N) → FK `id_corretora` no lado N, referenciando Corretora.

### 3.21 CategoriaIR (Categoria de IR)

| Coluna | Tipo | Restrições |
|---|---|---|
| id_categoria | UUID | PK |
| codigo | VARCHAR(20) | NOT NULL, UNIQUE |
| nome | VARCHAR(150) | NOT NULL |
| codigo_receita | VARCHAR(10) | NOT NULL |

- **PK:** (id_categoria)
- **Regra aplicada:** Entidade forte → tabela própria; o identificador vira PK.

### 3.22 RegraIR (Regra de IR)

| Coluna | Tipo | Restrições |
|---|---|---|
| id_categoria | UUID | PK, FK |
| inicio_vigencia | DATE | PK |
| aliquota | NUMERIC(10,8) | NOT NULL |
| limite_isencao_vendas | NUMERIC(18,2) | nulo permitido |

- **PK:** (id_categoria, inicio_vigencia)
- **FK:** id_categoria → CategoriaIR(id_categoria)
- **Regra aplicada:** Entidade fraca de CategoriaIR (relacionamento identificador R33 vigora) → tabela própria com PK composta pela PK do dono (FK) e pelo identificador parcial (inicio_vigencia).

### 3.23 Apuracao (Apuração)

| Coluna | Tipo | Restrições |
|---|---|---|
| id_apuracao | UUID | PK |
| id_usuario | UUID | FK, NOT NULL |
| id_darf | UUID | FK, nulo permitido |
| id_categoria | UUID | FK, NOT NULL |
| mes_referencia | DATE | NOT NULL |
| total_vendas | NUMERIC(18,2) | NOT NULL |
| resultado_liquido | NUMERIC(18,2) | NOT NULL |
| prejuizo_compensado | NUMERIC(18,2) | NOT NULL |
| fechada_em | TIMESTAMP | NOT NULL |

- **PK:** (id_apuracao)
- **FK:** id_usuario → Usuario(id_usuario)
- **FK:** id_darf → DARF(id_darf)
- **FK:** id_categoria → CategoriaIR(id_categoria)
- **UNIQUE:** (id_usuario, mes_referencia, id_categoria)
- **Regra aplicada:** Entidade forte → tabela própria; o identificador vira PK. R21 apura (1:N) → FK `id_usuario` no lado N, referenciando Usuario. R23 quita (1:N) → FK `id_darf` no lado N, referenciando DARF. Opcional (aceita nulo), porque a cardinalidade mínima do lado 1 é 0. R32 enquadra (1:N) → FK `id_categoria` no lado N, referenciando CategoriaIR.

### 3.24 DARF

| Coluna | Tipo | Restrições |
|---|---|---|
| id_darf | UUID | PK |
| id_usuario | UUID | FK, NOT NULL |
| mes_referencia | DATE | NOT NULL |
| valor_pago | NUMERIC(18,2) | nulo permitido |
| pago_em | DATE | nulo permitido |

- **PK:** (id_darf)
- **FK:** id_usuario → Usuario(id_usuario)
- **UNIQUE:** (id_usuario, mes_referencia)
- **Regra aplicada:** Entidade forte → tabela própria; o identificador vira PK. R22 deve (1:N) → FK `id_usuario` no lado N, referenciando Usuario.

### 3.25 Indicador

| Coluna | Tipo | Restrições |
|---|---|---|
| id_indicador | UUID | PK |
| codigo | VARCHAR(20) | NOT NULL, UNIQUE |
| nome | VARCHAR(150) | NOT NULL |
| grupo | VARCHAR(20) | NOT NULL |
| formula | TEXT | NOT NULL |
| unidade | VARCHAR(20) | NOT NULL |
| aplica_a | VARCHAR(20) | NOT NULL |

- **PK:** (id_indicador)
- **Regra aplicada:** Entidade forte → tabela própria; o identificador vira PK.

### 3.26 AlertaPreco (Alerta de preço)

| Coluna | Tipo | Restrições |
|---|---|---|
| id_alerta | UUID | PK |
| id_usuario | UUID | FK, NOT NULL |
| id_ativo | UUID | FK, NOT NULL |
| preco_alvo | NUMERIC(20,8) | NOT NULL |
| direcao | VARCHAR(20) | NOT NULL |
| criado_em | TIMESTAMP | NOT NULL |
| disparado_em | TIMESTAMP | nulo permitido |
| data_cotacao_disparo | DATE | nulo permitido |

- **PK:** (id_alerta)
- **FK:** id_usuario → Usuario(id_usuario)
- **FK:** id_ativo → Ativo(id_ativo)
- **Regra aplicada:** Entidade forte → tabela própria; o identificador vira PK. R25 cria_alerta (1:N) → FK `id_usuario` no lado N, referenciando Usuario. R26 monitora (1:N) → FK `id_ativo` no lado N, referenciando Ativo.

### 3.27 FiltroSalvo (Filtro salvo)

| Coluna | Tipo | Restrições |
|---|---|---|
| id_filtro | UUID | PK |
| id_usuario | UUID | FK, NOT NULL |
| id_indicador_ordenacao | UUID | FK, nulo permitido |
| nome | VARCHAR(150) | NOT NULL |
| tipo_ativo | VARCHAR(20) | NOT NULL |
| direcao_ordenacao | VARCHAR(20) | NOT NULL |

- **PK:** (id_filtro)
- **FK:** id_usuario → Usuario(id_usuario)
- **FK:** id_indicador_ordenacao → Indicador(id_indicador)
- **UNIQUE:** (id_usuario, nome)
- **Regra aplicada:** Entidade forte → tabela própria; o identificador vira PK. R27 salva (1:N) → FK `id_usuario` no lado N, referenciando Usuario. R28 ordena (1:N) → FK `id_indicador_ordenacao` no lado N, referenciando Indicador. Opcional (aceita nulo), porque a cardinalidade mínima do lado 1 é 0.

### 3.28 observa

| Coluna | Tipo | Restrições |
|---|---|---|
| id_usuario | UUID | PK, FK |
| id_ativo | UUID | PK, FK |
| incluido_em | TIMESTAMP | NOT NULL |

- **PK:** (id_usuario, id_ativo)
- **FK:** id_usuario → Usuario(id_usuario)
- **FK:** id_ativo → Ativo(id_ativo)
- **Regra aplicada:** Relacionamento N:N R24 entre Usuario e Ativo → tabela própria, com PK composta pelas FKs das duas entidades e os atributos do relacionamento (incluido_em).

### 3.29 criterio

| Coluna | Tipo | Restrições |
|---|---|---|
| id_filtro | UUID | PK, FK |
| id_indicador | UUID | PK, FK |
| valor_minimo | NUMERIC(20,8) | nulo permitido |
| valor_maximo | NUMERIC(20,8) | nulo permitido |

- **PK:** (id_filtro, id_indicador)
- **FK:** id_filtro → FiltroSalvo(id_filtro)
- **FK:** id_indicador → Indicador(id_indicador)
- **Regra aplicada:** Relacionamento N:N R29 entre FiltroSalvo e Indicador → tabela própria, com PK composta pelas FKs das duas entidades e os atributos do relacionamento (valor_minimo, valor_maximo).

### 3.30 AlocacaoAlvo (Alocação-alvo da carteira ideal)

| Coluna | Tipo | Restrições |
|---|---|---|
| id_carteira | UUID | PK, FK |
| classe | VARCHAR(20) | PK |
| percentual_alvo | NUMERIC(10,8) | NOT NULL |

- **PK:** (id_carteira, classe)
- **FK:** id_carteira → Carteira(id_carteira)
- **Regra aplicada:** Entidade fraca de Carteira (relacionamento identificador R34 define) → tabela própria com PK composta pela PK do dono (FK) e pelo identificador parcial (classe). `classe` usa o domínio de `Ativo.tipo`.

### 3.31 Meta

| Coluna | Tipo | Restrições |
|---|---|---|
| id_carteira | UUID | PK, FK |
| tipo | VARCHAR(20) | PK |
| valor_alvo | NUMERIC(18,2) | NOT NULL |
| prazo | DATE | nulo permitido |
| criada_em | TIMESTAMP | NOT NULL |

- **PK:** (id_carteira, tipo)
- **FK:** id_carteira → Carteira(id_carteira)
- **Regra aplicada:** Entidade fraca de Carteira (relacionamento identificador R35 almeja) → tabela própria com PK composta pela PK do dono (FK) e pelo identificador parcial (tipo); por isso há no máximo uma meta de cada tipo por carteira.

### 3.32 TipoTituloRF (Tipo de título de renda fixa)

| Coluna | Tipo | Restrições |
|---|---|---|
| id_tipo_titulo | UUID | PK |
| id_indice | UUID | FK, nulo permitido |
| nome | VARCHAR(100) | NOT NULL, UNIQUE |
| juros_semestrais | BOOLEAN | NOT NULL |

- **PK:** (id_tipo_titulo)
- **FK:** id_indice → IndiceEconomico(id_indice)
- **Regra aplicada:** Entidade forte → tabela própria; o identificador vira PK. R36 indexa (1:N) → FK `id_indice` no lado N, referenciando IndiceEconomico. Opcional (aceita nulo), porque a cardinalidade mínima do lado 1 é 0 (título prefixado).

### 3.33 TituloRendaFixa (Título de renda fixa)

| Coluna | Tipo | Restrições |
|---|---|---|
| id_ativo | UUID | PK, FK |
| id_tipo_titulo | UUID | FK, NOT NULL |
| data_vencimento | DATE | NOT NULL |

- **PK:** (id_ativo)
- **FK:** id_ativo → Ativo(id_ativo)
- **FK:** id_tipo_titulo → TipoTituloRF(id_tipo_titulo)
- **UNIQUE:** (id_tipo_titulo, data_vencimento)
- **Regra aplicada:** Especialização de Ativo → tabela própria com PK = PK da superclasse, que também é FK para Ativo. R37 caracteriza (1:N) → FK `id_tipo_titulo` no lado N, referenciando TipoTituloRF.

### 3.34 PrecoTaxaTitulo (Preço e taxa do título)

| Coluna | Tipo | Restrições |
|---|---|---|
| id_ativo | UUID | PK, FK |
| data_base | DATE | PK |
| taxa_compra | NUMERIC(10,8) | nulo permitido |
| taxa_venda | NUMERIC(10,8) | nulo permitido |
| pu_compra | NUMERIC(20,8) | nulo permitido |
| pu_venda | NUMERIC(20,8) | nulo permitido |

- **PK:** (id_ativo, data_base)
- **FK:** id_ativo → TituloRendaFixa(id_ativo)
- **Regra aplicada:** Entidade fraca de TituloRendaFixa (relacionamento identificador R38 precifica) → tabela própria com PK composta pela PK do dono (FK) e pelo identificador parcial (data_base).

### 3.35 Criptoativo

| Coluna | Tipo | Restrições |
|---|---|---|
| id_ativo | UUID | PK, FK |
| nome | VARCHAR(100) | NOT NULL |

- **PK:** (id_ativo)
- **FK:** id_ativo → Ativo(id_ativo)
- **Regra aplicada:** Especialização de Ativo → tabela própria com PK = PK da superclasse, que também é FK para Ativo.

### 3.36 PrecoCripto (Preço de referência da cripto)

| Coluna | Tipo | Restrições |
|---|---|---|
| id_ativo | UUID | PK, FK |
| data | DATE | PK |
| preco_referencia | NUMERIC(20,8) | NOT NULL |

- **PK:** (id_ativo, data)
- **FK:** id_ativo → Criptoativo(id_ativo)
- **Regra aplicada:** Entidade fraca de Criptoativo (relacionamento identificador R39 referencia) → tabela própria com PK composta pela PK do dono (FK) e pelo identificador parcial (data).
