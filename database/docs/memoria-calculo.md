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
| R18 | IRRF sobre JCP pago a pessoa física: **17,5%** desde 01/01/2026 (era 15%); dividendos sem retenção; rendimento de FII isento para pessoa física nas condições do art. 3º, III, da Lei 11.033/2004 | Lei 9.249/1995, art. 9º, § 2º, na redação da LC 224/2025 (efeitos desde 01/01/2026, art. 14, III); Nota Cetad/Coest nº 009/2026 da Receita | Confirmada em 13/11/2026; JCP declarado em 2025 e pago em 2026 **[a confirmar]** |

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
- Receita Federal — Nota Cetad/Coest nº 009/2026 (LC 224/2025; IRRF de 17,5% sobre JCP, R18): https://www.gov.br/receitafederal/pt-br/centrais-de-conteudo/publicacoes/estudos/notas-cetad/notas-tecnicas/2026/nota-cetad-coest-no-009-2026

## 7. Exemplos do seed

Preenchido no P1-2 (13/11/2026). Operações em `database/sql/inserts.sql`, seção 4; os valores abaixo são os gravados em `tax_assessments`, `darfs` e `received_income`, e o `database/tests/seed-check.sql` os recalcula a partir das operações (falha se divergirem). O seed não tem day trade nem exemplo que dependa dos pontos da seção 5; vendas de renda fixa e cripto não têm apuração (IR fora da D3, D44).

**Convenções do cálculo.** Preço médio fiscal por usuário e ativo, somando carteiras e corretoras, sem arredondar entre os passos; resultado da venda = qtd × preço − custos − qtd × PM; `total_sales` = soma de qtd × preço; `net_result` arredondado em centavos (meio para cima) só no fim do mês. Imposto = (ganho tributável − compensado) × alíquota, em centavos; IRRF de 0,005% sobre as vendas (R13), dispensado quando ≤ R$ 1,00, deduzido do imposto do mês. Nas categorias `FII` e `COMMON_OTHER` o seed só tem meses com vendas ≤ R$ 20.000,00, em que o IRRF seria ≤ R$ 1,00 e dispensado (o ponto "IRRF sobre FII, ETF e BDR" da seção 5 não afeta os números). DARF pago no último dia útil do mês seguinte (R16).

### 7.1 Apurações

| Usuário | Mês | Categoria | Vendas (R$) | Resultado (R$) | Isento (R4) | Compensado (R$) | Imposto (R$) | IRRF (R$) | Devido (R$) | DARF |
|---|---|---|---|---|---|---|---|---|---|---|
| demo | 02/2026 | COMMON_STOCK | 1.862,00 | 412,80 | sim | 0,00 | 0,00 | 0,00 | 0,00 | — |
| demo | 05/2026 | FII | 494,00 | −12,40 | não | 0,00 | 0,00 | 0,00 | 0,00 | — |
| demo | 06/2026 | COMMON_STOCK | 1.900,00 | 293,47 | sim | 0,00 | 0,00 | 0,00 | 0,00 | — |
| Bruno | 03/2026 | COMMON_STOCK | 28.960,00 | 4.539,00 | não | 0,00 | 680,85 | 1,45 | 679,40 | 03/2026, pago 30/04 |
| Bruno | 07/2026 | COMMON_STOCK | 16.200,00 | −2.415,40 | sim | 0,00 | 0,00 | 0,00 | 0,00 | — |
| Bruno | 09/2026 | COMMON_STOCK | 27.360,00 | 2.696,50 | não | 2.415,40 | 42,17 | 1,37 | 40,80 | 09/2026, pago 30/10 |
| Carla | 02/2026 | FII | 2.955,00 | 42,00 | não | 0,00 | 8,40 | 0,00 | 8,40 | 04/2026 (R17) |
| Carla | 04/2026 | FII | 2.940,00 | 27,00 | não | 0,00 | 5,40 | 0,00 | 5,40 | 04/2026, pago 29/05 |
| Diego | 02/2026 | COMMON_OTHER | 7.900,00 | 295,10 | não | 0,00 | 44,27 | 0,00 | 44,27 | 02/2026, pago 31/03 |
| Diego | 05/2026 | COMMON_OTHER | 16.500,00 | −2.109,00 | não | 0,00 | 0,00 | 0,00 | 0,00 | — |
| Diego | 08/2026 | COMMON_OTHER | 16.000,00 | 3.989,00 | não | 2.109,00 | 282,00 | 0,00 | 282,00 | 08/2026, pago 30/09 |
| Felipe | 06/2026 | COMMON_STOCK | 25.210,00 | 1.984,60 | não | 0,00 | 297,69 | 1,26 | 296,43 | 06/2026, pago 31/07 |
| Henrique | 07/2026 | COMMON_OTHER | 14.000,00 | 1.183,00 | não | 0,00 | 177,45 | 0,00 | 177,45 | 07/2026, pago 31/08 |
| Isabela | 02/2026 | COMMON_STOCK | 13.600,00 | 1.191,00 | sim | 0,00 | 0,00 | 0,00 | 0,00 | — |
| Isabela | 04/2026 | COMMON_STOCK | 10.200,00 | −2.410,00 | sim | 0,00 | 0,00 | 0,00 | 0,00 | — |
| Isabela | 09/2026 | COMMON_STOCK | 35.700,00 | 3.278,00 | não | 2.410,00 | 130,20 | 1,79 | 128,41 | 09/2026, pago 30/10 |
| João | 06/2026 | COMMON_OTHER | 7.600,00 | 595,00 | não | 0,00 | 89,25 | 0,00 | 89,25 | 06/2026, pago 31/07 |
| João | 10/2026 | COMMON_OTHER | 7.800,00 | 795,00 | não | 0,00 | 119,25 | 0,00 | 119,25 | 10/2026, não pago (vence 30/11) |
| João | 10/2026 | COMMON_STOCK | 9.900,00 | 1.287,00 | sim | 0,00 | 0,00 | 0,00 | 0,00 | — |

### 7.2 Memória de três casos

- **Bruno, 09/2026 (compensação, R7 e R11).** PETR4: recompra de 400 a R$ 33,10 + R$ 6,00 → PM 33,115; venda de 400 a R$ 38,40 com R$ 7,00 → 15.360,00 − 7,00 − 13.246,00 = 2.107,00. VALE3: recompra de 200 a R$ 57,00 + R$ 5,00 → PM 57,025; venda de 200 a R$ 60,00 com R$ 5,50 → 12.000,00 − 5,50 − 11.405,00 = 589,50. Vendas do mês 27.360,00 > 20.000,00 (tributável); resultado 2.696,50; o prejuízo de 07/2026 (−2.415,40, de um mês isento, compensável por R11) é abatido por inteiro; base 281,10 × 15% = 42,165 → 42,17; IRRF 27.360,00 × 0,005% = 1,368 → 1,37; devido 40,80.
- **Carla, 02 e 04/2026 (R17).** MXRF11: 1.000 a R$ 9,70 + R$ 5,00 → PM 9,705. Fev.: 300 × 9,85 − 1,50 − 300 × 9,705 = 42,00 → 20% = 8,40 (abaixo de R$ 10,00, sem DARF). Abr.: 300 × 9,80 − 1,50 − 2.911,50 = 27,00 → 5,40. Acumulado 13,80 ≥ 10,00: o DARF de 04/2026 quita as duas apurações.
- **demo, Longo prazo.** Mesmos números do handoff: WEGE3 + 412,80 (02/2026, vendas 1.862,00, isento), MXRF11 −12,40 (05/2026, prejuízo de FII sem ganho de FII depois), PETR4 + 293,4666… → 293,47 (06/2026, isento).

### 7.3 Carteira "Longo prazo" (massa das telas 3 e 4, D48)

As 9 operações do handoff mais Tesouro IPCA+ 2035 (0,52 a R$ 3.846,15384615) e BTC (0,0125 a R$ 328.000,00). Custo das posições abertas: PETR4 3.203,2667 + MXRF11 1.518,00 + ITSA4 2.961,00 + BOVA11 2.369,00 + título 1.999,999999998 + BTC 4.100,00 = 16.151,2667 → **16.151,27**; lucro realizado 693,8667 → **693,87**; 6 ativos e 11 operações (Lista do Figma). Conferido pela API (`GET /portfolios/:id/summary`, 13/11/2026). O Figma dá o PM do título (R$ 3.846,15, arredondado) e o total implica R$ 2.000,00 investidos, daí o preço 2000 ÷ 0,52; com R$ 3.846,15 exatos, a soma exata daria 16.151,26 (achado F13 do `fontes-poc.md`).

### 7.4 Proventos recebidos

Base = posição da carteira na corretora no fim da data-com (`record_date`); bruto = base × valor por cota, em centavos; IRRF = 17,5% do bruto no JCP (R18), zero em dividendo e rendimento de FII; recebido na data de pagamento. Só proventos pagos até 13/11/2026. 29 linhas:

| Carteira (corretora) | Provento | Data-com | Base | Bruto (R$) | IRRF (R$) | Linhas |
|---|---|---|---|---|---|---|
| demo, Longo prazo (XP) | PETR4 JCP | 22/04/2026 (2 parcelas) | 150 | 46,97 cada | 8,22 cada | 2 |
| demo, Longo prazo (XP) | PETR4 JCP | 01/06/2026 (2 parcelas) | 150 | 52,57 cada | 9,20 cada | 2 |
| Bruno, Ações BR (BTG) | PETR4 JCP | 01/06/2026 (2 parcelas) | 400 | 140,19 cada | 24,53 cada | 2 |
| demo, Dividendos (XP e Itaú) | BBDC4 JCP | 06/04/2026 | 100 + 100 | 29,73 cada | 5,20 cada | 2 |
| demo, Dividendos (XP e Itaú) | BBDC4 JCP | 03/07/2026 | 100 + 100 | 34,69 cada | 6,07 cada | 2 |
| João, Bolsa e BDR (Santander) | BBDC4 JCP | 03/07/2026 | 500 | 173,45 | 30,35 | 1 |
| demo, Dividendos (NuInvest) | HGLG11 rendimento | 30/01 a 30/09/2026 | 20 | 22,00 (jan.–jun.), 23,40 (jul.–set.) | 0,00 | 9 |
| Carla, Renda FII (NuInvest) | HGLG11 rendimento | 30/01 a 30/09/2026 | 50 | 55,00 (jan.–jun.), 58,50 (jul.–set.) | 0,00 | 9 |

Sem recebimento (casos de LEFT JOIN do P2): proventos de PETR4 e BBDC4 de dez./2025 (ninguém do seed tinha posição; também evitam o caso [a confirmar] da R18), JCP mensal do BBDC4 de 02/01 e 03/11/2026, PETR4 de 21/08/2026 (pagamento em 23/11 e 21/12), BBDC4 de 13/10/2026 (pagamento em 2027) e HGLG11 de 30/10/2026 (pagamento em 16/11).
