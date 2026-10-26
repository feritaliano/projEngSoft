# Memória de cálculo — Carteira B3

> Tarefa P0 (regras de IR) concluída em 24/10/2026; as seções de exemplos são preenchidas no P1 (seed).
> Regras de imposto de renda de pessoa física sobre ganhos em bolsa, **vigentes em outubro de 2026**, verificadas em fonte primária (leis no Planalto e na Câmara, páginas e manuais da Receita Federal). Pontos sem confirmação estão marcados **[a confirmar]** e seguem a regra de corte G-P0: o seed de IR usa só regras confirmadas.

## 1. Regras vigentes

| # | Regra | Norma | Situação |
|---|---|---|---|
| R1 | Operações comuns em bolsa: **15%** sobre o ganho líquido mensal | Lei 11.033/2004, art. 2º, II (efeitos desde 01/01/2005, art. 23); apuração mensal: Lei 8.981/1995, art. 72 | Confirmada |
| R2 | Day trade: **20%** sobre o ganho líquido mensal | Lei 11.033/2004, art. 2º, I; definição: Lei 9.959/2000, art. 8º, § 1º | Confirmada |
| R3 | Venda de cotas de FII em bolsa: **20%**, sem isenção | Lei 8.668/1993, art. 18 (redação da Lei 9.779/1999); tributação exclusiva para PF: art. 19, II | Confirmada (data de início de efeito da redação **[a confirmar]**) |
| R4 | Isenção: ganho em vendas de **ações no mercado à vista** é isento quando o **total de vendas de ações no mês** é ≤ R$ 20.000,00; acima disso, todo o ganho do mês é tributado | Lei 11.033/2004, art. 3º, I; exemplo da Receita (página "Isenções") | Confirmada |
| R5 | A isenção **não** alcança: day trade, ETF de renda variável, BDR, FII | Manual do IRPF (MIR), "Rendimentos do Capital"; página "Isenções" da Receita | Confirmada (BDR por exclusão); **units [a confirmar]** |
| R6 | ETF de renda variável, BDR e units seguem as regras de operações comuns (15%) e de day trade (20%) | Lei 11.033/2004, art. 2º; manual ReVar (grupo "Geral") | Confirmada (artigo da IN RFB 1.585/2015 **[a confirmar]**) |
| R7 | Prejuízo em operações comuns compensa ganhos de operações comuns dos meses seguintes, sem prazo; não compensa meses anteriores | Lei 8.981/1995, art. 72, § 4º; página "Compensações" da Receita | Confirmada |
| R8 | Ações, ETF e BDR compensam prejuízos entre si (mesmo grupo "Geral") | Manual ReVar | Confirmada operacionalmente |
| R9 | Prejuízo de day trade só compensa ganho de day trade, e vice-versa | Lei 8.981/1995, art. 72, §§ 5º e 6º; Lei 9.959/2000, art. 8º, §§ 6º e 7º | Confirmada |
| R10 | Prejuízo de FII só compensa ganho de FII | Manual ReVar (grupo "FII/Fiagro"); declaração anual com saldos separados | Confirmada operacionalmente (norma expressa **[a confirmar]**) |
| R11 | Prejuízo em mês com vendas isentas pode ser compensado depois | MIR (informar operações isentas para compensar perdas) | Confirmada |
| R12 | Ganho isento **não** consome prejuízo acumulado | Inferência: ganho isento é declarado em "Rendimentos Isentos" | **[a confirmar]** |
| R13 | IRRF de 0,005% sobre o valor das vendas em operações comuns; dispensado se ≤ R$ 1,00 no mês; deduz do imposto do mês, o saldo compensa nos meses seguintes e depois na declaração | Lei 11.033/2004, art. 2º, § 1º, IV, §§ 4º, 5º e 7º | Confirmada para ações; para FII, ETF e BDR **[a confirmar]** |
| R14 | IRRF de 1% sobre o resultado positivo de day trade; deduz do imposto de day trade do mês, saldo compensa até dezembro e depois é restituído | Lei 9.959/2000, art. 8º, caput e §§ 4º e 5º; página "Retenções" | Confirmada |
| R15 | DARF código **6015** ("Ganhos líquidos em operações em bolsa") para todas as categorias: um DARF por mês | Agenda Tributária da Receita (27/02/2026); MIR | Confirmada por inferência forte |
| R16 | Vencimento: último dia útil do mês seguinte ao da apuração | Página "Cálculo e Pagamento do Imposto" da Receita | Confirmada (artigo de lei **[a confirmar]**) |
| R17 | DARF abaixo de R$ 10,00 não é pago: o valor soma ao imposto do mesmo código dos meses seguintes até atingir R$ 10,00 e é pago no prazo do último período | Lei 9.430/1996, art. 68, caput e § 1º | Confirmada |

**Situação legislativa (verificada em 24/10/2026):**
- A MP 1.303/2025 (alíquota única de 17,5%, apuração trimestral) **perdeu a vigência em 08/10/2025** sem conversão em lei (Ato Declaratório do Presidente da Mesa do Congresso nº 67/2025). Não produziu efeito.
- A Lei 15.270/2025 não altera a apuração mensal. Ela cria a tributação mínima anual de altas rendas (art. 16-A da Lei 9.250/1995), que inclui ganhos em bolsa, a partir do ano-calendário 2026. Está fora do escopo do sistema.
- As regras R1 a R17 valem igualmente para 2025 e 2026.

## 2. Consequências no modelo (decisões D35 e D36)

- **D35 — operações comuns separadas em duas categorias.** A isenção de R4 olha só as vendas de **ações**. Com uma única categoria "comum", um mês com R$ 15 mil em vendas de ações e R$ 30 mil em vendas de ETF não pode ser apurado corretamente: as ações são isentas e o ETF é tributado. Por isso `CategoriaIR.codigo` passou de {COMUM, DAY_TRADE, FII} para {COMUM_ACOES, COMUM_OUTROS, DAY_TRADE, FII} (`COMMON_STOCK`, `COMMON_OTHER`, `DAY_TRADE`, `FII`). A estrutura do ER não muda: só o domínio do atributo.
  - A compensação de prejuízo entre `COMMON_STOCK` e `COMMON_OTHER` é permitida (R8). O backend calcula `loss_offset` de cada apuração usando o saldo de prejuízo comum das duas categorias.
- **D36 — IRRF não é armazenado.** O IRRF de R13 e R14 é calculado a partir das operações (valor das vendas e resultado do day trade) e deduzido do imposto do mês. Guardá-lo seria guardar valor derivado (D32). Limitação aceita: se a corretora reter um valor diferente do calculado, a diferença não é registrada.
- **DARF único por (usuário, mês)** está correto (R15): a restrição `darfs_user_id_reference_month_key` permanece.
- **R17 no modelo:** apurações com imposto abaixo de R$ 10,00 ficam sem DARF (`darf_id` nulo). O DARF do mês em que a soma atinge R$ 10,00 quita também as apurações acumuladas (relacionamento *quita*, 1..n).

## 3. Dados de referência do IR (seed)

`tax_categories` (todas com código de receita 6015):

| code | name | revenue_code |
|---|---|---|
| COMMON_STOCK | Operações comuns com ações no mercado à vista | 6015 |
| COMMON_OTHER | Operações comuns com ETF, BDR e demais ativos | 6015 |
| DAY_TRADE | Operações day trade | 6015 |
| FII | Alienação de cotas de fundos imobiliários | 6015 |

`tax_rules` (vigentes; `effective_from` em 01/01/2005, início de efeitos da Lei 11.033/2004):

| category | effective_from | rate | sales_exemption_limit | Norma |
|---|---|---|---|---|
| COMMON_STOCK | 2005-01-01 | 0.15 | 20000.00 | R1, R4 |
| COMMON_OTHER | 2005-01-01 | 0.15 | — | R1, R5, R6 |
| DAY_TRADE | 2005-01-01 | 0.20 | — | R2 |
| FII | 2005-01-01 | 0.20 | — | R3 (a regra já valia antes; a data registrada é a do início da série) |

Versões anteriores a 2005 só entram no seed se confirmadas em fonte primária no P1.

## 4. Algoritmo de apuração mensal (referência para o backend e para o seed)

Para um usuário e um mês *m*:
1. Reunir as operações de **todas** as carteiras do usuário (D8), em ordem de data e sequência, aplicando os eventos corporativos.
2. Classificar cada venda: cota de FII → `FII` (inclusive em day trade, que também paga 20%); day trade dos demais ativos (compra e venda do mesmo ativo no mesmo dia) → `DAY_TRADE`; ação → `COMMON_STOCK`; ETF, BDR e demais → `COMMON_OTHER`.
3. Calcular o resultado de cada venda com o **preço médio fiscal por usuário** (consolidando corretoras e carteiras).
4. Por categoria: `total_sales` = soma das vendas; `net_result` = soma dos resultados (com custos).
5. Isenção (R4): se a categoria é `COMMON_STOCK` e `total_sales` ≤ `sales_exemption_limit` da regra vigente, o ganho do mês é isento (base 0). Um resultado negativo continua compondo o prejuízo a compensar (R11).
6. Compensação: com resultado positivo tributável, abater o prejuízo acumulado do mesmo grupo (comum = `COMMON_STOCK` + `COMMON_OTHER`; `DAY_TRADE`; `FII`) até zerar a base; o valor abatido é `loss_offset`.
7. Base = `net_result` − `loss_offset`; imposto = base × `rate` da regra vigente (maior `effective_from` ≤ *m*).
8. Deduzir o IRRF do mês da mesma natureza (R13, R14); saldo de IRRF segue para os meses seguintes.
9. Somar o imposto das categorias do mês com os valores acumulados abaixo de R$ 10,00; se ≥ R$ 10,00, gerar o DARF 6015 de *m*, com vencimento no último dia útil de *m* + 1, e ligar a ele todas as apurações quitadas.

Os campos `total_sales`, `net_result` e `loss_offset` são gravados quando o usuário fecha o mês (D10). Base, imposto, IRRF, valor devido e vencimento são sempre recalculados.

## 5. Pontos a confirmar (G-P0)

| Ponto | Tratamento até a confirmação |
|---|---|
| Units dentro ou fora da isenção de R$ 20 mil | Classificadas em `COMMON_OTHER` (sem isenção) |
| Ganho isento consome prejuízo acumulado | Não consome (R12) |
| IRRF de 0,005% sobre venda de FII, ETF e BDR | Calculado também para esses ativos |
| IRRF de uma categoria abater imposto de outra | Não abate |
| Artigos da IN RFB 1.585/2015 (texto não acessível na verificação) | Regras apoiadas nas leis e nas páginas da Receita |
| Data de efeito da alíquota de 20% para FII | Série de regras começa em 01/01/2005 |
| Day trade com cotas de FII apurado no grupo FII | Apurado em `FII` (mesma alíquota de 20%) |

O seed (P1) não terá exemplos que dependam desses pontos.

## 6. Fontes consultadas

- Lei 11.033/2004 (compilada): https://www.planalto.gov.br/ccivil_03/_Ato2004-2006/2004/Lei/L11033compilado.htm
- Lei 9.959/2000: https://www.planalto.gov.br/ccivil_03/leis/l9959.htm
- Lei 8.668/1993: https://www.planalto.gov.br/ccivil_03/leis/l8668.htm
- Lei 8.981/1995, art. 72: https://www2.camara.leg.br/legin/fed/lei/1995/lei-8981-20-janeiro-1995-374786-normaatualizada-pl.html
- Lei 9.430/1996, art. 68: https://www2.camara.leg.br/legin/fed/lei/1996/lei-9430-27-dezembro-1996-367738-publicacaooriginal-1-pl.html
- Lei 15.270/2025: https://planalto.gov.br/ccivil_03/_Ato2023-2026/2025/Lei/L15270.htm
- MP 1.303/2025 e situação: https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2025/mpv/mpv1303.htm ; https://www.congressonacional.leg.br/materias/medidas-provisorias/-/mpv/169059 ; https://www2.camara.leg.br/legin/fed/atodecpm/2025/atodeclaratoriodopresidentedamesa-67-14-outubro-2025-798130-publicacaooriginal-176721-cn.html
- Receita Federal — renda variável (isenções, compensações, retenções, cálculo e pagamento): https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/pagamento/renda-variavel/bolsa-de-valores-1
- Receita Federal — manual ReVar: https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/pagamento/renda-variavel/manual
- Receita Federal — MIR, Rendimentos do Capital: https://www.gov.br/receitafederal/pt-br/assuntos/meu-imposto-de-renda/preenchimento/manual-mir/rendimentos/rendimentos-do-capital
- Receita Federal — Agenda Tributária (27/02/2026, código 6015): https://www.gov.br/receitafederal/pt-br/assuntos/agenda-tributaria/2026/fevereiro/dia-27-02-2026

## 7. Exemplos do seed

A preencher no P1: para cada usuário e mês do seed, as operações, o preço médio fiscal, o resultado por categoria, a isenção, a compensação, o imposto e o DARF, conferidos com os valores gravados em `tax_assessments` e `darfs`.
