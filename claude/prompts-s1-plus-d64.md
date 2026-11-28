# Prompts do S1+ (D64, 25/11/2026)

> Gerados a partir da D64 (`claude/contexto-projeto.md`, seção 6) e da seção "S1+ (D64)" de `claude/plano-de-acao.md`. Cada bloco é um prompt pronto para colar no agente indicado. Um prompt por agente e por PR, exceto BD-2 + BK-5, que mudam juntos no mesmo PR. Os prompts de BD-2, BK-5, FE-3, R1-b e U7c continuam em `claude/prompts-correcao-s1-auditoria-final.md` e `claude/prompts-correcao-s1-revisao-final.md`; aqui só mudam a data e a prioridade.

## Regras desta rodada (valem para todos os prompts)
- **Caminho crítico:** DADOS (BD-2 + BK-5, BD-3, BD-4, K6) → contrato da API → K7/K8 (o contrato corre junto do DADOS). É a prioridade máxima do backend até 30/11 e do banco até 27/11 (BD-4 atrasado continua na frente do P4): nenhuma tarefa dessas frentes passa na frente do caminho crítico. FE-3, R1-b, UX-2 e W5 andam em paralelo.
- **Avisos ao usuário no mesmo dia:** contrato não mesclado em 26/11; K7 não mesclado em 30/11.
- **Gatilhos:** G-S2a em 01/12 (TWR não conferido → sai o B10, ficam B8, B9 e B11); G-S2b em 03/12 (gráficos não prontos → ficam os números); nada do S1 muda depois de 04/12.
- **Fora do S1+:** C4 e C8 na página do ativo, proventos (S6), metas e carteira ideal (S10), importação (B12), IR e o resto. Sem proventos, a rentabilidade mede só o preço, e o "como foi calculado" diz isso.
- **Preço:** fechamento do último pregão (COTAHIST), com data e fonte visíveis (D27, D59b); renda fixa e cripto pelo custo, com "sem cotação" (D55). Sem tempo real e sem agregador.
- Toda tarefa de código segue o `CLAUDE.md` (grafo do Graphify antes de grep, skills `ponytail` e `karpathy-guidelines`) e passa pelo `code-simplifier` e pelo `/review-pr` antes do PR, com os achados tratados e registrados.

## Ordem de execução
| Data | Banco | Backend | UX/UI | Frontend |
|---|---|---|---|---|
| 25/11 | BD-2, BD-3 | BK-5, K6 | UX-2 | FE-3, R1-b |
| 26/11 | BD-2 (fim), BD-3 (fim), BD-4 | BK-5 (fim), **Contrato (mesclar)**, K6, K7, K8 | UX-2 (Lista e Detalhe) | FE-3, R1-b (fim) |
| 27/11 | BD-4 (fim) | K6 (fim), K7, K8 | UX-2 (página do ativo) | W5 |
| 28–30/11 | **P4 (envio em 30/11)** | K7, K8 (**K7 mesclado em 30/11**) | U7c | W5, W6 (desde 30/11) |
| 01/12 | — | **G-S2a** | — | W5, W6 |
| 02–03/12 | — | correções | — | W5 (fim em 02/12), W6 (fim em 03/12), **G-S2b em 03/12** |
| 04–06/12 | — | FECHO | U7c (até 05/12) | FECHO |

---

## DOC — registrar a D64 e replanejar o fim do S1 (concluído neste PR)
Prompt original do usuário, guardado como registro da decisão:
```
Tarefa DOC (25/11/2026): registrar a D64 e replanejar o fim do S1. Só documentação, um PR.
Decisão do usuário em 25/11/2026 (D64): antecipar para antes de 06/12 parte do S2 e do S9, porque o S1 entregue parece um CRUD. Entram: B8 (valor de mercado, ganho ou perda em R$ e %, variação sobre o PM, variação do dia, % da carteira, patrimônio na Lista), B9 (alocação por classe e por setor), B11 (evolução patrimonial), B10 (rentabilidade TWR total e de 12 meses comparada com CDI, Ibovespa e IPCA), a página do ativo só com C2 (cotação e gráfico histórico) e C3 (rentabilidade do ativo comparada com os mesmos índices), e o catálogo completo com as 62 ações hoje rejeitadas pelo K5. Ficam fora: C4 (fundamentos) e C8 (FII) na página do ativo, proventos (S6), metas e carteira ideal (S10), importação (B12), IR e o resto. Fonte de preço: fechamento do último pregão (COTAHIST da B3), atualizado automaticamente todo dia pelo worker, com a data visível; cotação em tempo real fica fora (D59: sem fonte gratuita e legal; agregador com atraso descartado, D27). Renda fixa e cripto continuam pelo custo, com "sem cotação" (D55; preço no S11). Gráficos: ngx-echarts com ECharts, importando só os gráficos usados e carregando só nas telas com gráfico. Alternativas descartadas: manter o S1 como está; preço com atraso pela brapi (agregador sem contrato com a B3, teto de requisições, risco de prazo).
Caminho crítico (D64): DADOS (K6) → contrato da API → K7/K8. É a prioridade máxima do backend e do banco até 30/11; FE-3, UX-2 e W5 andam em paralelo, mas nenhuma tarefa de backend ou banco passa na frente de K6, K7 e K8. Se o contrato não estiver mesclado até 26/11 ou o K7 até 30/11, o usuário é avisado no mesmo dia.
Tarefas e datas: DOC 25/11; DADOS (BD-2 + BK-5, BD-3, histórico no seed, K6 com atualização diária) 25–27/11; API (contrato 26/11; K7 e K8 26–30/11); UX-2 25–27/11; FE-3 com R1-b 25–26/11; W5 27/11–02/12; W6 30/11–03/12; FECHO 04–06/12. Gatilhos: G-S2a em 01/12 (TWR não conferido → sai o B10, ficam B8, B9 e B11); G-S2b em 03/12 (gráficos não prontos → ficam os números); nada do S1 muda depois de 04/12.
```
Revisto no BD-3 (nota na D64): as 62 eram 44 por classe + 18 por formato do ticker; a meta é +33 ações.
Decisão tomada nesta tarefa (pergunta ao usuário em 25/11): o P4 vai para 28/11–30/11, depois do DADOS, com o envio mantido em 30/11; o G-P4 vale de 28/11 a 30/11. O "histórico no seed" recebeu o ID BD-4.

---

## BD-2 — Seed depois da carga do K5 (banco; mesmo PR do BK-5)
```
Agente: banco de dados. Tarefa BD-2, antecipada pela D64 para 25–26/11 (era até 04/12, depois do P4). Caminho crítico do S1+.
Leia: a D64 em claude/contexto-projeto.md; a seção "S1+ (D64)" de claude/plano-de-acao.md; os dois prompts de BD-2 em claude/prompts-correcao-s1-auditoria-final.md (A-1) e claude/prompts-correcao-s1-revisao-final.md (N7).
Faça: o que os dois prompts pedem, num PR só, aberto com o agente de backend (BK-5 troca o teste que hoje espera a falha; sem isso o job backend fica vermelho). A restrição "depois do P4" não vale mais: o P4 começa em 28/11.
Pronto quando: os critérios dos dois prompts; PR mesclado até 26/11, porque o BD-4 mexe no mesmo inserts.sql.
Não faça: migration (é do BD-3); mudar os valores da massa do handoff ou da "Longo prazo".
Prazo: 26/11/2026.
```

## BK-5 — Teste carga → seed, imagem fixa e actions (backend; mesmo PR do BD-2)
```
Agente: backend. Tarefa BK-5, antecipada pela D64 para 25–26/11 (era até 04/12). Caminho crítico do S1+.
Leia: a D64; a seção "S1+ (D64)" do plano; os dois prompts de BK-5 em claude/prompts-correcao-s1-auditoria-final.md (A-1) e claude/prompts-correcao-s1-revisao-final.md (N6, N7).
Faça: o que os dois prompts pedem, no PR do BD-2. O BK-5 vem antes do K6: sem ele o BD-2 não entra, e o BD-4 e o K7 param.
Pronto quando: os critérios dos dois prompts; job backend verde com o inserts.sql do BD-2.
Prazo: 26/11/2026.
```

## BD-3 — Domínio de share_class para as ações rejeitadas por classe e ops.ingestion_runs (banco)
```
Agente: banco de dados. Tarefa BD-3 (D64), 25–26/11. Caminho crítico: o K6 depende dela.
Leia: a D64; a seção "S1+ (D64)" do plano; claude/arquitetura.md, seção 6.3 (ingestão, ops.ingestion_runs, D24); a linha do K5 no plano (497 rejeitadas: 435 DIA, 44 por classe fora do enum share_class e 18 por formato do ticker; 62 = 44 por classe + 18 por formato do ticker; das 44, 8 não são ações (CPA, REC, TPR) e 3 têm ticker fora do formato (AXIA17G, AXIA19G, AXIA21G)); database/docs/fontes-poc.md (Cadastro de Instrumentos de 30/10).
Problema: o enum share_class (ON, PN, PNA, PNB, UNIT) não aceita as classes de 36 ações do mercado à vista que o K5 rejeita (33 gravam; 3 têm ticker fora do formato); a D64 põe o catálogo completo no S1+. A ingestão diária do K6 precisa registrar cada execução e não rodar duas vezes ao mesmo tempo, como a arquitetura prevê com ops.ingestion_runs, que ainda não existe.
Faça:
1. Liste, a partir do Cadastro de Instrumentos de 30/10 e da regra de filtro do K5, as classes das 44 linhas rejeitadas por classe, com a contagem por classe; amplie o domínio de share_class com elas (migration nova, enum do Prisma, CHECK se houver). Se alguma "classe" for na verdade sufixo de mercado ou de governança, e não classe de ação, registre no PR e pergunte ao usuário antes de incluir.
2. Crie ops.ingestion_runs com as colunas da seção 3.1 da arquitetura (fonte, arquivo, hash, data de referência, status, linhas lidas, gravadas e rejeitadas, erro), mais início e fim da execução (acréscimo desta tarefa), no schema ops (fora do ddl.sql e do relatório, D22).
3. Atualize modelo-er.md, mapeamento.md e glossario.md (domínio de share_class), regenere o ddl.sql (npm run db:ddl) e acrescente os testes de restrição (database/tests/).
4. Avise o agente de backend no PR: valores novos do enum e colunas de ops.ingestion_runs.
Pronto quando: npm run db:drift sem diferenças; npm run db:test passando com o domínio novo e com ops.ingestion_runs; a soma das contagens por classe no PR dá 44 (62 = 44 por classe + 18 por formato do ticker); o seed continua 2× idêntico.
Não faça: mudar outras colunas ou tabelas de public; mexer em backend/ além do parser do K5 e dos testes dele (decisão da usuária, nota do BD-3).
Prazo: 26/11/2026. Esforço estimado: 3 h.
```

## BD-4 — Histórico de cotações e índices no seed (banco)
```
Agente: banco de dados. Tarefa BD-4 (D64, "histórico no seed"), 26–27/11, depois do BD-2 (mesmo inserts.sql) e do BD-3. Caminho crítico: a massa dos testes do K7 e do K8 e a demonstração dependem dela.
Leia: a D64; a seção "S1+ (D64)" do plano; database/docs/fontes-poc.md (COTAHIST, índices da B3); database/sql/inserts.sql, seções 2.1 (IBOV) e 2.4 (quotes); database/docs/memoria-calculo.md.
Problema: o seed tem quotes de dois pregões (30/10 e 12/11) e o IBOV de 26/10 a 12/11/2026; o B10 (TWR total e de 12 meses), o B11 (evolução) e o C2/C3 precisam de série diária e dos índices de comparação.
Faça:
1. quotes: fechamentos diários do COTAHIST (arquivos anuais e diários da B3, em data/raw/) dos ativos das classes da B3 que aparecem nas carteiras do seed, de pelo menos 13 meses antes do último pregão do seed (ou da primeira operação dessas carteiras, se for antes) até esse pregão. Mercado à vista (TPMERC 010), mesmo mapeamento da seção 2.4.
2. index_values no mesmo período: CDI diário e IPCA mensal pela API SGS do Banco Central e IBOV diário pela página de índices da B3 (anos necessários).
3. Fonte, URL, data, SHA-256 e contagem de cada arquivo novo em fontes-poc.md; fonte citada em comentário no inserts.sql.
4. seed-check.sql: cada ativo da B3 das carteiras do seed com cotação em todo pregão do período (sem buraco) e índices cobrindo o período.
5. Regenere database/results/ (npm run db:results). A listagem de quotes e index_values vai crescer: avise o usuário no PR, porque o P4 decide com ele como anexar a listagem completa (item 5 do enunciado).
6. Liste no PR os corporate_events (desdobramento, grupamento, bonificação) desses ativos na janela; sem o E1, o K7 precisa saber.
Pronto quando: seed 2× idêntico; seed-check.sql passando; custo R$ 16.151,27 e lucro R$ 693,87 da "Longo prazo" inalterados (BK-3 verde); job database verde.
Não faça: mudar operações, carteiras ou valores da massa do handoff; inventar cotação de dia sem pregão; migration.
Prazo: 27/11/2026. Esforço estimado: 4–5 h.
```

## K6 — Ingestão diária no worker (backend)
```
Agente: backend. Tarefa K6 (D64), 25–27/11. Caminho crítico; prioridade sobre qualquer outra tarefa do backend.
Leia: a D64; a seção "S1+ (D64)" do plano; claude/arquitetura.md, seções 6.3 (medalhão leve, bronze, idempotência, ingestion_runs) e 7.2 (módulo ingestion); D24, D27, D59; database/docs/fontes-poc.md (COTAHIST e índices da B3, com a codificação de cada arquivo); o K5 (backend/src/modules/ingestion/).
Faça:
1. Adapters (porta SourceIngestor, infrastructure do módulo dono): COTAHIST diário → quotes (mercado à vista, ativos do catálogo; ticker fora do catálogo é contado e ignorado); API SGS do BCB → index_values de CDI (diário) e IPCA (mensal); página de índices da B3 → IBOV.
2. Agendamento no worker com @nestjs/schedule (ainda não está no backend/package.json: instalar pede confirmação do usuário; registre versão e licença no PR), todo dia útil depois da publicação do COTAHIST (confira o horário e registre no README), com advisory lock e uma linha em ops.ingestion_runs por execução e fonte (BD-3). Idempotente: mesmo arquivo (hash) não regrava; upsert na chave natural (D27).
3. Comando de reprocesso por data ou período (ex.: npm run ingest:quotes -- --from --to), para o histórico e para o plano B da demonstração; ao terminar, rode-o de 13/11 até o dia no carteira_dev e registre a contagem no PR.
3a. Cada arquivo baixado vai para o bronze (data/raw/<fonte>/<ano>/, com o hash), como manda a seção 6.3.
4. Conferir que o K5 continua com +33 ações e zero rejeição por classe (mudança feita no BD-3; fontes-poc.md, seção 7).
5. Data do último fechamento disponível para o K7 e o K8 (consulta, sem coluna nova).
Pronto quando: teste de parse com trecho real reduzido de cada fonte (fixtures pequenas versionadas); o mesmo dia rodado 2× não muda nenhuma linha; fim de semana, feriado e arquivo ainda não publicado ficam registrados em ops.ingestion_runs sem derrubar o worker; K5 com zero rejeições por classe e contagem por tipo no PR; comandos e horário no backend/README.md; jobs backend e e2e verdes.
Não faça: endpoint de download ou exportação de dados da B3 (D59b); cotação em tempo real; agregador (brapi, HG Brasil); desativar ativos que sumiram do arquivo (S2).
Prazo: 27/11/2026.
```

## Contrato — API do K7 e do K8 (backend)
```
Agente: backend. Tarefa Contrato (D64), PR só de contrato, mesclado até 26/11. Se não der, avise o usuário no mesmo dia. **Atrasado:** não foi mesclado até 26/11 (Aviso-C dado à usuária em 27/11); vem antes do K7 e do UX-2.
Leia: a D64; a seção "S1+ (D64)" do plano; claude/arquitetura.md, seção 7.4 (contratos, DerivedValue); claude/microcopy.md (formulaCode e chaves de insumos); D52, D56, D59b, D63; o módulo market-data do K6 (backend/src/modules/market-data; a data do fechamento usado vem de LatestCloseDate).
Faça: DTOs, rotas e backend/openapi/openapi.json dos endpoints abaixo (nomes finais são seus; os campos são o mínimo). As rotas novas respondem 501 até o K7 e o K8; as existentes ganham campos opcionais sem quebrar o W3 e o W4.
- GET /portfolios: patrimônio de cada carteira (B8) e data do fechamento usado.
- GET /portfolios/:id/summary: patrimônio, resultado não realizado em R$ e %, data e fonte do fechamento.
- GET /portfolios/:id/positions: por posição aberta, último fechamento e data (null com motivo na renda fixa e na cripto), valor de mercado, ganho ou perda em R$ e %, variação sobre o PM, variação do dia e % da carteira.
- Alocação (B9): por classe e por setor, valor e %, ativos sem setor num grupo próprio.
- Evolução patrimonial (B11): série de patrimônio e valor investido.
- Rentabilidade (B10): TWR total e de 12 meses, com CDI, Ibovespa e IPCA nos mesmos períodos e a série para o gráfico; 12 meses null com motivo quando o histórico for menor.
- Ativo (C2): último fechamento, variação do dia, data e fonte, série de fechamentos por período.
- Ativo (C3): rentabilidade do ativo por período comparada com CDI, Ibovespa e IPCA.
Todo número derivado é DerivedValue com formulaCode novo (lista no PR, para o UX-2 escrever os textos em 27/11); dinheiro e percentual como string decimal; renda fixa e cripto pelo custo, com motivo "sem cotação".
Pronto quando: openapi.json regenerado e conferido no CI; o frontend roda npm run api:generate sem erro; lista dos formulaCode no PR; PR mesclado até 26/11.
Não faça: implementação dos cálculos (K7 e K8); endpoint que devolva arquivo ou série para download (D59b).
Prazo: 26/11/2026. Esforço estimado: 3 h.
```

## K7 — Carteira com mercado: B8, B9, B10, B11 (backend)
```
Agente: backend. Tarefa K7 (D64), 26–30/11, mesclada até 30/11 (senão, avise o usuário no mesmo dia). Caminho crítico.
Leia: a D64; a seção "S1+ (D64)" do plano; o contrato mesclado; claude/arquitetura.md (market-data; analytics só como referência); D4, D17, D28, D32, D55, D63; database/docs/memoria-calculo.md; database/docs/fontes-poc.md, seção 6.2 (histórico do seed, eventos corporativos da janela e achado F17); o módulo market-data do K6 (backend/src/modules/market-data: leia quotes e index_values por portas desse módulo, acrescentando as de leitura que faltarem, e use LatestCloseDate para a data do último fechamento, sem acesso paralelo às tabelas).
Faça:
1. B8: valor de mercado = quantidade × último fechamento até a data (dia sem pregão usa o anterior); ganho ou perda em R$ e %, variação sobre o PM, variação do dia (fechamento do último pregão sobre o anterior), % da carteira; patrimônio da carteira em GET /portfolios e no summary. Renda fixa e cripto pelo custo, com motivo "sem cotação".
2. B9: alocação por classe e por setor sobre o patrimônio.
3. B11: evolução do patrimônio e do valor investido ao longo do tempo.
4. B10: TWR total e de 12 meses (cotas diárias, com os fluxos nas datas das operações), sem proventos (S6), comparado com CDI e IPCA acumulados e com o Ibovespa nos mesmos períodos.
5. A ordem das classes da D63 passa a usar o valor de mercado.
6. Operação com preço fora da faixa do pregão é normal (decisão da usuária, 27/11/2026; database/docs/fontes-poc.md, F17): vale o preço executado. Na compra, no fim do pregão, o ganho ou a perda do dia é quantidade × (fechamento − preço executado) e a rentabilidade é (fechamento − preço executado) ÷ preço executado (compra a 10, fechamento a 12 = +20% no dia); na venda, o preço executado é o valor de saída e o lucro realizado segue a RN06. Não ajuste nem filtre essas operações; a TWR do dia da operação inclui esse ganho.
7. Unidades dos índices (seed do BD-4 e ingestão do K6): CDI (SGS 12) em % ao dia, acumulado como Π(1 + taxa/100) nos dias publicados (o BCB publica também dias sem pregão, ex.: 24/12 e 31/12/2025); IPCA (SGS 433) em % ao mês, com o mês corrente publicado só no mês seguinte, então o período vai até o último mês publicado e o "como foi calculado" diz isso; IBOV em pontos. Operação em dia sem pregão (ex.: PETR4 em 14/03/2026, sábado) é avaliada pelo fechamento anterior.
Tudo calculado na leitura, em Decimal, sem coluna nova (D4, D17); DerivedValue com insumos em todo número (B13).
Pronto quando:
- E2E sobre o seed (BD-4; histórico de 02/01/2025 a 12/11/2026, primeira operação em 12/02/2025): "Longo prazo" com valor de mercado no último pregão do seed (12/11/2026); isolamento com dados de dois usuários ao mesmo tempo; dia sem pregão usa o fechamento anterior.
- TWR conferido (critério do G-S2a, 01/12): spec com um caso calculado à mão (dois aportes e uma venda no período) e a TWR total e de 12 meses da "Longo prazo" iguais a um cálculo independente (planilha anexada ao PR).
- Eventos corporativos da janela: a lista já está em database/docs/fontes-poc.md, seção 6.2 (BD-4), e a usuária decidiu em 26/11 que as quedas sem marca de 26/10/2026 (BBDC4 em "Dividendos" e SMAL11 em "Aposentadoria") entram como variação de preço, sem o E1. Cite a lista no PR; avise o usuário no mesmo dia só se aparecer evento que não está nela.
- backend/README.md atualizado; jobs backend e e2e verdes.
Não faça: proventos, metas, carteira ideal ou IR; coluna ou tabela nova para dado derivado (se o tempo de resposta pedir cache, peça ao agente de banco e ao usuário antes).
Prazo: 30/11/2026.
```

## K8 — Ativo com mercado: C2 e C3 (backend)
```
Agente: backend. Tarefa K8 (D64), 26–30/11, depois do K7 se faltar tempo (o K7 é que tem aviso em 30/11).
Leia: a D64; a seção "S1+ (D64)" do plano; o contrato; D59b; o módulo market-data do K6 (portas de leitura e LatestCloseDate, as mesmas do K7); database/docs/fontes-poc.md, seção 6.2 (os 21 ativos com histórico no seed).
Faça: C2 (último fechamento, variação do dia, data e fonte, série de fechamentos por período) e C3 (rentabilidade do ativo por período comparada com CDI, Ibovespa e IPCA) para ação, unit, FII, ETF e BDR; renda fixa e cripto ficam fora da página do ativo (S11), com a resposta definida no contrato.
Pronto quando: E2E com um dos 21 ativos com histórico no seed (série, variação e comparação, de 02/01/2025 a 12/11/2026); ativo sem cotação devolve série vazia com o motivo (no banco de teste, um ativo do catálogo fora do seed serve de caso); nenhum endpoint devolve arquivo; jobs backend e e2e verdes.
Não faça: C4 (fundamentos), C8 (FII), proventos; download ou exportação da série (D59b).
Prazo: 30/11/2026.
```

## UX-2 — Handoff do S1+ (UX/UI)
```
Agente: UX/UI. Tarefa UX-2 (D64), 25–27/11, em paralelo ao caminho crítico.
Leia: a D64; a seção "S1+ (D64)" do plano; claude/handoff-ux.md; claude/microcopy.md; D41, D46, D48 (elementos ocultos no S1 que passam a aparecer), D55; Figma 71YUqOEoUNi1HIPcLZd0qo (faixas da Lista, do Detalhe e faixa 8, página do ativo).
Faça:
1. Promova ao handoff, com link de cada frame e estado: patrimônio na Lista; no Detalhe, KPIs (patrimônio, resultado, rentabilidade total e de 12 meses comparada com CDI, Ibovespa e IPCA), colunas do B8 na tabela de posições, alocação por classe e por setor, evolução patrimonial; página do ativo só com C2 e C3 para ação, FII, ETF e BDR, sem as seções de C4, C8 e proventos.
2. Estados: carregando, sem cotação (renda fixa e cripto), histórico menor que 12 meses, data e fonte do fechamento ("Fechamento de dd/mm/aaaa · B3"), erro, mobile (390 px), escuro; alternativa acessível de cada gráfico (tabela ou resumo em texto); cores color/chart/1–6 (D45).
3. Microcopy: texto de cada formulaCode novo do contrato (lista no PR do backend de 26/11), dizendo que a rentabilidade não inclui proventos e que renda fixa e cripto entram pelo custo.
Pronto quando: Lista e Detalhe no handoff até 26/11 (o W5 começa em 27/11) e a página do ativo até 27/11 (o W6 começa em 30/11); todo formulaCode do contrato com texto; revisão de contraste e foco sem pendência.
Não faça: telas de C4, C8, proventos, metas ou carteira ideal no handoff; mudar telas do S1 já implementadas além do que a D48 já previa mostrar.
Prazo: 27/11/2026.
```

## FE-3 e R1-b — Correções da revisão e da auditoria final (frontend; dois PRs)
```
Agente: frontend. Tarefas FE-3 e R1-b, antecipadas pela D64 para 25–26/11 (eram até 04/12 e 05/12), em paralelo ao caminho crítico.
Leia: a D64; a seção "S1+ (D64)" do plano; o prompt FE-3 em claude/prompts-correcao-s1-revisao-final.md e o prompt R1-b em claude/prompts-correcao-s1-auditoria-final.md.
Faça: o que os dois prompts pedem, um PR por tarefa. No R1-b, o passo (4) (nota no README sobre a ordem seed → K5) não vale mais: o BD-2 entrou na main em 26/11 (PR #62) e seed e K5 rodam em qualquer ordem. O projeto mobile do Playwright criado no R1-b é o mesmo que o W5 e o W6 vão usar.
Pronto quando: os critérios de cada prompt; os dois PRs mesclados até 26/11, antes do W5.
Prazo: 26/11/2026.
```

## W5 — Lista e Detalhe com mercado (frontend)
```
Agente: frontend. Tarefa W5 (D64), 27/11–02/12. Specs desde 27/11 com o cliente gerado do contrato; E2E com a API real depois do K7 (até 30/11).
Leia: a D64; a seção "S1+ (D64)" do plano; o contrato de 26/11 (backend/openapi/openapi.json); claude/handoff-ux.md e claude/microcopy.md atualizados pelo UX-2; D48, D55, D58, D59b; a regra de lint de dinheiro do FE-1.
Faça:
1. Lista: patrimônio de cada carteira com a data do fechamento.
2. Detalhe: KPIs, colunas do B8 na tabela de posições, alocação por classe e por setor, evolução patrimonial e rentabilidade comparada com CDI, Ibovespa e IPCA, como no handoff; "sem cotação" na renda fixa e na cripto; data e fonte do fechamento visíveis; "como foi calculado" em todo número novo.
3. Gráficos com ngx-echarts e ECharts: importe de echarts/core só os gráficos e componentes usados; a biblioteca carrega só nas rotas com gráfico (rota preguiçosa); conversão para number só nos arquivos *.chart.ts. Instalar os pacotes pede confirmação do usuário; registre versão e licença no PR (ECharts Apache-2.0, ngx-echarts MIT) e npm audit sem alta.
4. Cada gráfico com a alternativa acessível do handoff.
Pronto quando: specs dos estados novos (incluindo histórico menor que 12 meses e sem cotação); E2E da Lista e do Detalhe com a API real e o seed; axe sem violação séria ou crítica em claro, escuro e 390 px; ECharts fora do bundle inicial (conferido no relatório do build e colado no PR); npm run lint, test:cov e build verdes; nenhuma toolbox de exportação do ECharts (saveAsImage, dataView) nem download da série (D59b); jobs frontend e e2e verdes.
Gatilhos: G-S2a (01/12) tira os KPIs e o gráfico de rentabilidade se o TWR não for conferido; G-S2b (03/12) deixa só os números se os gráficos não estiverem prontos.
Não faça: conta com dinheiro ou percentual no front (o backend manda tudo pronto, D28); proventos, metas, carteira ideal (as guias Proventos e Metas e o botão e o marcador da carteira ideal continuam ocultos); exportação ou download da série (D59b); mock de API no E2E.
Prazo: 02/12/2026.
```

## W6 — Página do ativo com C2 e C3 (frontend)
```
Agente: frontend. Tarefa W6 (D64), 30/11–03/12, depois do K8 e reaproveitando os componentes de gráfico do W5.
Leia: a D64; a seção "S1+ (D64)" do plano; o contrato de 26/11; a página do ativo no handoff (UX-2); D59b.
Faça: página do ativo para ação, unit, FII, ETF e BDR, aberta pelo catálogo e pela posição: cabeçalho com último fechamento, variação do dia, data e fonte; gráfico histórico com os períodos do handoff; rentabilidade do ativo comparada com CDI, Ibovespa e IPCA; estados do handoff. Renda fixa e cripto não abrem a página (S11).
Pronto quando: specs e E2E com a API real; axe em claro, escuro e 390 px; nenhum botão de download ou exportação da série (D59b); jobs frontend e e2e verdes.
Gatilho: G-S2b (03/12) deixa só os números se o gráfico não estiver pronto.
Não faça: seções de C4, C8 ou proventos, nem "em breve" (D41).
Prazo: 03/12/2026.
```

## P4 — Relatório da Parte 2 (banco; data nova)
```
Agente: banco de dados. Tarefa P4 com data nova pela D64: 28/11–30/11 (era 25/11–30/11), depois de BD-2, BD-3 e BD-4. Envio mantido em 30/11 (prazo 07/12). De 28/11 a 30/11, o P4 tem prioridade sobre qualquer outra tarefa sua (G-P4).
Leia: a linha do P4 em claude/plano-de-acao.md e o seu perfil.
Faça: o relatório com o ddl.sql, o inserts.sql e os resultados regerados depois do BD-4 (domínio novo de share_class e histórico de quotes e index_values). Decida com o usuário como anexar a listagem completa das tabelas que cresceram (item 5 do enunciado): depois do BD-4, database/results foi de 312 KB para 1,7 MB (tables/quotes.txt com 9.847 linhas e 1,41 MB; tables/index_values.txt com 962 linhas e 70 KB), e mudaram também queries/consulta-03.txt e tables/price_alerts.txt (alertas corrigidos no BD-4). Regere database/entrega/ (hoje a foto de 24/11) com o ddl.sql e o inserts.sql atuais. ops.ingestion_runs (BD-3) fica fora do DDL e do relatório (D22); o domínio novo de share_class (PNC, PND, PNV, PRA, PRB) entra, com o significado de cada código no glossário.
Pronto quando: enviado até 30/11.
```

## FECHO — Fechamento do S1 com o S1+ (frontend e backend; 04–06/12)
```
Agentes: frontend (dono) e backend. Tarefa FECHO (D64), 04–06/12. Nada do S1 muda depois de 04/12: só teste, documentação e correção de defeito achado aqui; nenhuma função entra nem sai.
Leia: a D64; a seção "S1+ (D64)" do plano; docs/roteiro-demonstracao.md; README.md da raiz; backend/README.md.
Frontend: jornada E2E (journey) com os números novos (patrimônio, resultado, alocação, evolução, rentabilidade se o B10 ficou, página do ativo); axe e teclado nas telas novas, em claro, escuro e 390 px; README da raiz ("Como rodar"): o K6 já escreveu o worker, a atualização diária e os comandos; confira num clone limpo e acrescente o que faltar (atualizar a imagem do worker com `docker compose --profile app up -d --build`; no Linux, criar data/raw antes de subir); roteiro de demonstração com a parte nova, o reprocesso até a véspera (`npm --prefix backend run ingest:quotes -- --from <data> --to <véspera>` e `npm --prefix backend run ingest:indexes -- --from <data> --to <véspera>`) e a conferência da data do último fechamento na véspera e 30 min antes; clone limpo pelo README.
Backend: conferir o backend/README.md, que o K6 já escreveu (atualização de segunda a sexta às 21:30, INGESTION_DAILY_TIME; reprocesso com ingest:quotes e ingest:indexes, o plano B da demonstração; arquivo do dia ausente fica NO_FILE em ops.ingestion_runs e é tentado de novo até INGESTION_MAX_ATTEMPTS; se não sair, rodar o reprocesso no dia seguinte), e corrigir o que o ensaio mostrar.
Pronto quando: E2E do S1 com o S1+ verde no CI; alguém de fora sobe e usa o sistema seguindo só o README, com a data do último fechamento visível; contexto e plano atualizados com o que entrou e o que os gatilhos cortaram.
Usuário: tag s1 no merge final; ensaio em 08/12.
Prazo: 06/12/2026.
```
