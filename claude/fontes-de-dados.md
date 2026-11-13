# Fontes de dados para o mercado inteiro

> Pesquisa de 12/11/2026. Responde à pergunta: dá para ter no banco todos os ativos da B3 (ou quase todos), com cotação, proventos e índices, sem pagar API? **Aprovada em 12/11/2026 como D59** (`claude/contexto-projeto.md`), com a carga do catálogo completo no S1 (tarefa K5, gatilho G-K5 em 26/11, `claude/plano-de-acao.md`).

## 1. Resposta curta

- **Sim, dá para ter o mercado inteiro de graça, e o projeto já está desenhado para isso.** A arquitetura (`claude/arquitetura.md`, seção 6.3) já prevê carregar todos os ativos e todas as cotações a partir dos arquivos públicos da B3, e não de uma API. O que confundiu no checklist foi o **seed**: as ≥ 10 linhas exigidas pela disciplina de BD. O seed é uma amostra para a entrega; o banco real é carregado pela ingestão.
- **A B3 não tem API gratuita com atraso para pessoa física.** As APIs e o UP2DATA são contratados por empresa. O caminho gratuito são os **arquivos** que a B3 publica no site: COTAHIST (cotações de todos os papéis, desde 1986) e o Cadastro de Instrumentos (todos os ativos listados, diário).
- **Google Finance não serve.** A API foi encerrada em 2012. Hoje só existe a função `GOOGLEFINANCE` dentro do Google Sheets, e raspar o site viola os termos de uso do Google.
- **brapi.dev não resolve o "mercado inteiro" no plano gratuito.** São 15 mil requisições por mês, 1 ativo por chamada, 3 meses de histórico e sem dividendos. Os dividendos começam no plano Startup, de R$ 119,99/mês. Além disso, é agregador, e o projeto prefere a fonte primária (D27).
- **Lacunas reais:** proventos (R2), Ibovespa diário (R3) e preço de cripto (D44). Cada uma tem candidata na seção 4.
- **Atenção à licença da B3:** a política de market data em vigor desde 01/11/2026 só permite usar dados de fim de dia e históricos para **gráficos e tabelas informacionais**. Para um projeto acadêmico com login, o risco é baixo, mas há regras a seguir (seção 5).

## 2. O que o projeto já prevê

| Fonte | Alimenta | Situação |
|---|---|---|
| B3, lista de empresas e classificação setorial | `sectors`, `issuers`, `assets` | Prevista (S2) |
| CVM, cadastro de companhias | `issuers` (código CVM, situação) | Prevista (S2) |
| B3, COTAHIST diário (+ anual para a carga inicial) | `quotes` | Prevista (S2) |
| BCB SGS | `index_values` (CDI, Selic, IPCA) | Prevista (S2) |
| CVM DFP/ITR | demonstrações | Prevista (S3) |
| CVM, informe mensal e trimestral de FII | FIIs, imóveis, vacância | Prevista (S8) |
| CVM IPE | comunicados | Prevista (S8) |
| Ibovespa | `index_values` (IBOV) | **Aberta (R3)** |
| Proventos e eventos | `income_distributions`, `corporate_events` | **Aberta (R2)**; eventos manuais até lá (D29) |
| Tesouro e cripto | `fixed_income_prices`, `crypto_prices` | Tesouro definido na D3; **cripto aberta (D44)** |

O pipeline (bronze → staging → núcleo, idempotente e com fonte e data em cada dado exibido) já atende o volume: a arquitetura estima até ~15 milhões de linhas.

**Por que hoje o banco não tem todos os ativos:** a ingestão é do S2, que só começa depois do S1 (D49). No S1, o catálogo (C1) mostra só o que está no seed.

## 3. Fonte recomendada por tipo de dado

| Dado | Fonte primária | Cobertura | Custo e acesso | Frequência |
|---|---|---|---|---|
| **Lista de todos os ativos** (ticker, ISIN, tipo, espécie, programa do BDR) | B3, **Cadastro de Instrumentos (Listado)**, arquivo `InstrumentsConsolidatedFile` / BVBG.028, na área "pesquisa por pregão" | Todos os instrumentos listados no dia (ações, units, FIIs, FIAGROs, ETFs, BDRs, opções, futuros) | Gratuito, arquivo diário | Diária |
| **Emissores e setores** | B3, lista de empresas listadas e classificação setorial; CVM, cadastro de companhias abertas (`dados.cvm.gov.br`, licença ODbL) | Todas as companhias abertas e fundos listados | Gratuito | Semanal |
| **Cotações diárias (OHLC, volume, negócios)** | B3, **COTAHIST** (arquivos diário, mensal e anual) | Ações, ETFs, BDRs, units, FIIs, FIAGROs, FIDCs e opções. Anual desde 1986; diário desde 02/01/2014 | Gratuito; layout público (`SeriesHistoricas_Layout.pdf`) | Diária, após o pregão |
| **CDI, Selic, IPCA, IGP-M** | BCB, API SGS (`api.bcb.gov.br/dados/serie/bcdata.sgs.{codigo}/dados`) | Séries oficiais | Gratuito, sem chave, licença ODbL | Diária ou mensal |
| **Ibovespa diário** | B3, página de dados históricos e estatísticas dos índices | Série diária oficial | Gratuito, página pública (o pacote `rb3` em R já lê esse arquivo) | Diária |
| **Proventos e eventos (ações)** | B3, endpoint **não oficial** do portal de empresas listadas (`listedCompaniesProxy`, seção 4.1) | Dividendos, JCP, desdobramentos, grupamentos e bonificações por emissor | Gratuito, sem documentação nem garantia | Diária (consultar por emissor) |
| **Rendimentos de FII** | B3, `listedCompaniesProxy` (o mesmo endpoint dos proventos de ações) | Valor por cota, data-com e pagamento (HGLG11: R$ 1,17, data-com 30/10/2026). O informe mensal da CVM **não** traz esses campos (PF, F8) | Gratuito, sem documentação nem garantia | Diária (consultar por fundo) |
| **Demonstrações financeiras** | CVM, DFP e ITR | Todas as companhias abertas | Gratuito, ODbL | Semanal |
| **FII: dados mensais, imóveis e vacância** | CVM, informes mensal e trimestral estruturados | Todos os FIIs | Gratuito, ODbL | Mensal e trimestral |
| **Tesouro Direto (taxa e PU)** | Tesouro Transparente, CSV "Taxas dos Títulos Ofertados pelo Tesouro Direto" | Todos os títulos do programa desde dez/2004 | Gratuito; arquivo grande (centenas de MB), baixar o completo uma vez e depois só o incremento | Diária |
| **Cripto (preço diário em BRL)** | **Mercado Bitcoin, API pública v4** (`api.mercadobitcoin.net/api/v4`: símbolos, candles, ticker) | Os pares em BRL negociados na exchange | Gratuito, sem chave para dados públicos | Diária (candle de 1 dia) |

Com isso o banco fica com **todos** os papéis negociados na B3 (catálogo + cotação diária), todas as companhias e FIIs com dados da CVM, os índices e o Tesouro. O que não fica completo de forma garantida são os proventos de ações (seção 4.1).

## 4. Lacunas e como fechar

### 4.1 Proventos e eventos corporativos (R2)

| Opção | Prós | Contras |
|---|---|---|
| **A. Endpoint não oficial da B3** — `https://sistemaswebb3-listados.b3.com.br/listedCompaniesProxy/CompanyCall/GetListedSupplementCompany/{base64}`, com `{"issuingCompany":"BBDC","language":"pt-br"}` em base64 | Fonte primária; JSON; dividendos, JCP e eventos (desdobramento, grupamento, bonificação) num lugar; gratuito | Não documentado: pode mudar sem aviso. Uma chamada por emissor (~400–500 companhias), então é preciso pausar entre chamadas. Sem termo de uso próprio |
| **B. brapi Startup ou Pro** (R$ 119,99 ou R$ 139,99/mês) | Endpoint estável de dividendos, JCP, bonificações e desdobramentos | Pago; agregador (contra D27); a própria brapi declara que não tem contrato de market data com a B3 |
| **C. Formulário de Proventos em Dinheiro da B3** | Documento oficial padronizado que a companhia envia à B3 a cada provento aprovado | É **documento** no portal, não dado estruturado; extrair exige parse de PDF |
| **D. Registro manual** (já previsto na D29 para eventos) | Sempre funciona | Não escala para o mercado inteiro |

**Recomendação:** A como fonte principal, isolada num adapter da ingestão (resposta bruta guardada no bronze), com D como plano B. Se o endpoint quebrar, o sistema continua funcionando com o que já carregou e com os registros manuais. O endpoint também cobre FIIs (valor por cota e data-com); o informe mensal da CVM não traz esses campos (PF, 12/11/2026).

### 4.2 Ibovespa diário (R3)

- **Recomendação:** a página de dados históricos e estatísticas dos índices da B3 (fonte primária, diária).
- **Conferido na PF (12/11/2026):** o COTAHIST tem uma linha `IBOV11`, mas ela registra negócios com o índice (27 em 12/11), não o índice calculado (170.843,00 contra 171.324,31 da página). O Ibovespa vem da página de índices.
- **Fallback:** BCB SGS, que tem só a série mensal (serve para C3 mensal, não para gráfico diário).

### 4.3 Preço de cripto (D44)

- **Recomendação:** Mercado Bitcoin, API pública v4, candle diário em BRL. É a fonte primária do preço negociado no Brasil, gratuita e sem chave.
- A política de market data da B3 não se aplica aqui.
- **A conferir:** os termos de uso da API e os limites de requisição; a documentação pública lista os endpoints de símbolos, candles e ticker.
- **PF (12/11/2026):** a API respondeu 403 do Cloudflare ("Sorry, you have been blocked") para o cliente automático na rede do usuário (F1). Para o seed, o usuário baixa o JSON dos candles pelo próprio navegador. Para a ingestão automática do S11, a fonte de cripto volta a ser decidida se o bloqueio continuar.

## 5. Licença dos dados da B3 (risco)

A **Política de Consumo de Market Data B3**, versão 1.2, em vigor desde 01/11/2026 (OC 048/2026-PRE), diz, em resumo:

- Dado **com atraso** é o distribuído 15 minutos ou mais depois da B3. **Dado de fim de dia** é o distribuído a partir de 15 minutos após o fim do pregão.
- Dados com atraso, de fim de dia e **históricos** só podem ser usados para **construir gráficos e tabelas informacionais**, salvo contrato de desenvolvimento de produto. Ficam proibidos revenda, desenvolvimento de produto, distribuição, download e armazenamento para desenvolvimento de produto.
- Em **site aberto**, a distribuição com atraso se limita a último preço, variação, mínima, máxima, abertura, fechamento e volume financeiro.
- O FAQ de distribuidores da B3 diz que dados de fim de dia e históricos a partir de D-1 podem ser distribuídos sem custo e sem autorização prévia, mas fala de **distribuidores e redistribuidores** das plataformas de market data, não de quem baixa o arquivo do site.

**Leitura para o projeto** (não é parecer jurídico):

- Projeto acadêmico, sem cobrança e com login → **risco baixo**. O uso previsto (carteira, gráficos, tabelas, indicadores) é o "informacional" da política.
- Regras para seguir desde já:
  - (a) Dado da B3 só aparece para usuário logado; a página pública não mostra cotação.
  - (b) Sem download ou exportação de séries de preço da B3 (exportar a carteira do usuário é outra coisa).
  - (c) Sem API pública de cotações.
  - (d) Toda tela mostra fonte e data do dado (já é regra da arquitetura).
- **Se o sistema virar produto aberto ou comercial**, é preciso consultar a B3 (`contratacao@b3.com.br`) antes, porque armazenar e redistribuir para "desenvolvimento de produto" pede licença. Brapi e semelhantes não resolvem isso: a brapi declara que não tem contrato com a B3.
- CVM, BCB e Tesouro publicam em dados abertos (CVM e BCB com licença ODbL): sem esse risco.

## 6. Opções descartadas

| Opção | Motivo |
|---|---|
| API oficial da B3 / UP2DATA | Contratada por pessoa jurídica, paga; não há plano gratuito com atraso |
| Google Finance | API encerrada em 2012; a função `GOOGLEFINANCE` só funciona dentro do Sheets; raspagem viola os termos |
| brapi gratuito | 15 mil req./mês, 1 ativo por chamada, 3 meses de histórico, sem dividendos: não carrega o mercado inteiro |
| HG Brasil gratuito | 400 req./dia; dados básicos |
| Raspagem de sites agregadores (Status Invest, Investidor10 etc.) | Viola termos de uso, quebra com frequência e contraria D27 |

## 7. Impacto no plano

- **Seed (checklist, item 1b):** passa a ter fonte citável para todas as tabelas.
  - `crypto_prices` vem do candle diário do Mercado Bitcoin.
  - `index_values` (IBOV) vem da página de índices da B3.
  - `income_distributions` vem do endpoint de proventos da B3.
  - As linhas continuam transcritas no `inserts.sql`, mas a partir de arquivos reais guardados em `data/raw/`.
- **S2:** sem mudança de escopo; R3 fica resolvido.
- **S6:** R2 passa de "sem fonte" para "fonte não oficial + plano B manual".
- **S11:** a fonte de cripto da D44 fica definida.
- **Catálogo completo no S1 (aprovado):** carga única do catálogo (Cadastro de Instrumentos + emissores), sem cotações, como tarefa K5 do backend (18/11–26/11). A busca do C1 passa a ter todos os ativos da B3 na entrega de 06/12. Custo estimado: 1–2 dias (parser + teste de idempotência). Gatilho G-K5 em 26/11: sem a carga testada, ficam os ~50 ativos reais do seed e o K5 volta para o S2.
- **S2 inteiro no S1 (rejeitado):** 1,5–2,5 semanas sobre um plano com folga zero no W4 e no R1; e cotações sem as telas do S2 não aparecem no S1 (D41, D48).

## 8. Decisão (aprovada em 12/11/2026)

> **D59** — Fontes do mercado inteiro.
> - Catálogo: B3 Cadastro de Instrumentos + lista de empresas, com CVM para emissores.
> - Cotações: B3 COTAHIST.
> - Ibovespa diário: página de índices da B3 (R3 resolvido; conferir se o COTAHIST traz índices).
> - Proventos e eventos: endpoint não oficial `listedCompaniesProxy` da B3, isolado em adapter com resposta guardada no bronze; registro manual como plano B (R2 mitigado). Rendimentos de FII também pelo `listedCompaniesProxy` (valor por cota e data-com); o informe mensal da CVM não traz esses campos (conferido na PF em 12/11/2026, F8).
> - Tesouro: CSV do Tesouro Transparente.
> - Cripto: API pública v4 do Mercado Bitcoin (D44, fonte definida).
> - Uso dos dados da B3 conforme a Política de Consumo de Market Data V1.2: só para usuário logado, sem download nem API pública de preços, com fonte e data visíveis.
> - Agregadores pagos (brapi, HG) e Google Finance descartados.

### Prompt para o agente de banco (prova de conceito das fontes)

```
Agente: banco-de-dados
Tarefa: prova de conceito das fontes da D59, até 16/11, sem migration e sem código de produção.
1. Baixe para data/raw/fontes-poc/ um arquivo de cada:
   - COTAHIST diário do último pregão;
   - Cadastro de Instrumentos (InstrumentsConsolidatedFile) do mesmo dia;
   - página de dados históricos do IBOV do ano corrente;
   - resposta do listedCompaniesProxy para PETR, BBDC e HGLG (base64 de {"issuingCompany":"<código>","language":"pt-br"});
   - candles diários de BTC-BRL na API v4 do Mercado Bitcoin;
   - CSV de taxas do Tesouro Transparente.
2. Para cada arquivo, registre em database/docs/fontes-poc.md:
   - URL exata;
   - data e hora do download;
   - hash SHA-256;
   - número de linhas ou registros;
   - campos que alimentam quais colunas do glossário.
3. Responda com números:
   - quantos tickers distintos o COTAHIST traz por tipo (ação, FII, ETF, BDR) usando CODBDI/TPMERC;
   - se o COTAHIST traz linhas de índice (IBOV);
   - se o informe mensal de FII da CVM traz rendimento por cota e data-com.
4. Monte as linhas do seed de assets (~50 ativos reais do Cadastro de Instrumentos: ações, units, FIIs, ETFs e BDRs, com emissor e programa do BDR), crypto_prices, index_values (IBOV) e income_distributions a partir desses arquivos, com a fonte citada em comentário no inserts.sql. Escolha os 50 de forma que o K5 depois faça upsert sobre eles sem duplicar (mesmo ISIN e ticker).
5. Confira se data/raw/ está no .gitignore. Se não estiver, pergunte antes de commitar arquivos grandes ou dados da B3.
Cláusula de correção: falha encontrada vira prompt para o agente certo.
```

### Prompt para o agente de backend (K5, carga do catálogo completo)

```
Agente: backend
Tarefa: K5 do plano (D59), 21/11–26/11 (replanejamento de 12/11), depois do K4 PR 3 e dos prompts BK-1, BK-2 e BK-3. Gatilho G-K5 em 26/11.
Leia: claude/fontes-de-dados.md, database/docs/fontes-poc.md (prova de conceito; achados F5 e F9), database/sql/inserts.sql (seção 1, catálogo do seed do BD-1), claude/arquitetura.md seção 6.3, database/docs/glossario.md (sectors, issuers, assets).
1. Módulo ingestion (worker), adapter do Cadastro de Instrumentos da B3 (InstrumentsConsolidatedFile). Comando npm no backend, ex.: npm run ingest:catalog -- --file data/raw/<arquivo> (aceitar arquivo local; download automático é opcional).
2. Arquivo: use só o Cadastro com "Status do Arquivo: Final" (o do mesmo dia pode vir "Parcial", F5; recuse o Parcial com mensagem clara). O arquivo vem em Latin-1 (F9): converta para UTF-8 antes de comparar nomes, senão os emissores do seed (gravados em UTF-8, ex.: "TELEFÔNICA BRASIL S.A") são duplicados.
2b. Filtro: mercado à vista, ações (ON, PN, PNA, PNB...), units, FIIs, ETFs e BDRs. Sem opções, termo, futuro ou fracionário.
3. Upsert por chave natural, numa transação por lote: issuers (CNPJ quando houver; senão o nome do CrpnNm, que é a mesma chave que o seed usa no NOT EXISTS; CNPJ e código CVM quando o cadastro da CVM trouxer, nulo aceito; não sobrescreva CNPJ, código CVM ou setor já gravados pelo seed) e assets (ISIN; ticker; type; share_class; bdr_program pelo SpcfctnCd; is_active = true). Setor só se a classificação setorial da B3 estiver disponível; nulo é aceito pelo schema.
4. Fora do escopo do K5: cotações, desativar ativos que sumiram do arquivo, ops.ingestion_runs e agendamento (tudo S2).
5. Testes: parse com trecho real reduzido do arquivo (fixture versionada pequena); idempotência (rodar 2× não muda nenhuma linha); linha inválida registrada e ignorada sem derrubar o lote; upsert sobre os ativos do seed sem duplicar, nas duas ordens (seed → K5 e K5 → seed); a ELET3 do seed (is_active = false, fora do Cadastro) continua como está.
6. PR com: contagem de ativos por tipo carregados de um arquivo real; tempo de execução; a busca GET /api/v1/assets?search= achando um ativo que não está no seed; comando no backend/README.md.
7. Regra de licença (D59): nenhum endpoint novo de exportação de dados da B3.
Cláusula de correção: falha encontrada vira prompt para o agente certo.
```

## Fontes

- [Política de Consumo de Market Data B3 V1.2.1](https://b3.com.br/data/files/4F/25/23/55/5D881A10F75B881AAC094EA8/Politica%20de%20Consumo%20de%20Market%20Data%20B3%20V1.2.1.pdf)
- [B3 — Perguntas frequentes de distribuidores de market data](https://b3.com.br/pt_br/market-data-e-indices/servicos-de-dados/market-data/distribuidores/perguntas-frequentes/)
- [B3 — Layout do arquivo COTAHIST](https://www.b3.com.br:443/data/files/33/67/B9/50/D84057102C784E47AC094EA8/SeriesHistoricas_Layout.pdf)
- [B3 — UP2DATA, central de ajuda](https://www.b3.com.br/pt_br/market-data-e-indices/servicos-de-dados/up2data/central-de-ajuda/)
- [B3 — Formulário de Proventos em Dinheiro no portal](https://clientes.b3.com.br/w/disponibilizacao-no-site-b3-do-formulario-de-proventos-em-dinheiro-das-companhias-listadas)
- [rb3 — pacote para arquivos públicos da B3 (COTAHIST, índices)](https://packages.ropensci.org/rb3/doc/manual.html)
- [Portal de Dados Abertos da CVM](https://dados.cvm.gov.br/dados/)
- [Tesouro Transparente — metadados de taxas do Tesouro Direto](https://www.tesourotransparente.gov.br/ckan/dataset/df56aa42-484a-4a59-8184-7676580c81e3/resource/1a8eb2e3-4902-4a38-a1eb-6410f23d90de/download/Taxa.pdf)
- [brapi — limitações do plano gratuito](https://brapi.dev/faq/o-plano-gratuito-tem-limitacoes-importantes)
- [brapi — gratuidade e planos](https://brapi.dev/faq/api-e-gratis-mesmo)
