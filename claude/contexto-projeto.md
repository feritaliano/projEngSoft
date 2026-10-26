# Contexto do Projeto — Carteira B3

> Documento-mestre. Todo chat deste projeto deve ler este arquivo antes de começar e seguir as decisões registradas aqui. Mudança de decisão só com registro na seção "Decisões".
>
> Documentos que complementam este:
> - `claude/arquitetura.md`: arquitetura de dados e da aplicação (fluxo de todos os dados, schemas, módulos, contratos da API, frontend). **Aprovada em 30/09/2026; obrigatória para banco, backend e frontend.**
> - `database/docs/modelo-er.md`: **modelo ER do projeto — contexto obrigatório para banco, backend e frontend.** Entidades, atributos, relacionamentos, cardinalidades, versão Mermaid com nomes físicos e verificação de 3FN. Desenhado no brModelo Web (`CarteiraB3_ER`, lógico `CarteiraB3_Logico`). **Congelado em 05/10/2026 (D14).** Resumo do esquema relacional na seção 7 deste documento.
> - `database/docs/mapeamento.md`: as 29 tabelas com colunas, tipos, PK, FK, UNIQUE e regra de mapeamento aplicada.
> - `database/docs/descricao-problema.md`: descrição do problema, público, ODS e regras de negócio em linguagem de usuário (BD Parte 1).
> - `claude/plano-de-acao.md`: tarefas, datas e critérios de pronto de todas as trilhas. **Replanejado em 24/10/2026: todas as frentes com datas a partir de 25/10; ajustado em 26/10 (D38).**
> - `claude/convencoes-equipe.md`: Git, definição de pronto, uso dos agentes e **ferramentas do Claude Code (plugins por frente, D38)**.
> - `claude/estrutura-repositorio.md`: árvore de pastas do repositório, local do `.env` e dos arquivos do Docker, o que é gerado e o dono de cada pasta.
> - `claude/handoff-ux.md`: handoff do UX para o frontend, com o link do arquivo Figma e do frame de cada tela (modelo criado em 26/10; preenchido no U5).
> - `projetoEngSoftware.md`: enunciado de Engenharia de Software.
> - `claude/enunciadoBancoDeDados.md`: enunciado de BD, transcrição integral do PDF. **É a fonte primária para qualquer entrega de BD.**
>
> Ordem de precedência em caso de conflito: este documento → `claude/arquitetura.md` → `database/docs/modelo-er.md` → prompts em `agentes/`. Os quatro prompts em `agentes/` (banco, backend, frontend e UX/UI) foram reescritos em 05/10/2026 a partir deste documento, da arquitetura e do ER congelado; os de backend, frontend e UX/UI foram atualizados em 26/10/2026 com as ferramentas (D38).

## 1. O que é
Sistema único, desenvolvido por **1 pessoa, com eventual ajuda de uma segunda**, que atende **duas disciplinas** da UNIFESP/ICT. O enunciado de BD permite trabalho individual ou em grupo de até 4 pessoas.

| Disciplina | O que exige | Prazos |
|---|---|---|
| Engenharia de Software | Backend com arquitetura adequada, frontend integrado, regras de negócio testadas, testes automatizados, Git/GitHub, documentação, entregas incrementais (`projetoEngSoftware.md`) | Ao longo do semestre |
| Banco de Dados (Profa. Daniela Leal Musa) | Parte 1: texto do problema + ODS, ER com ≥ 10 entidades, mapeamento ER→relacional. Parte 2: DDL, ≥ 10 tuplas por tabela, 10 consultas com junção, 3 com LEFT/RIGHT JOIN, 5 com GROUP BY/HAVING/ORDER BY, relatório (`claude/enunciadoBancoDeDados.md`) | **Parte 1: 19/10/2026** · **Parte 2: 07/12/2026** (Google Classroom) |

**Tema (redefinido em 30/09/2026):** plataforma gratuita e sem fins lucrativos de **análise e gestão de investimentos da B3** para pessoa física, tendo como referências o **Investidor10** e o **Ward**. O usuário:
1. **consulta os dados** de ações, FIIs, ETFs e BDRs negociados na B3: cotação, histórico, indicadores fundamentalistas, demonstrações e dividendos;
2. **monta rankings e aplica cálculos de valuation**, como no Ward;
3. **gerencia a própria carteira**, como no Investidor10: operações, posição, preço médio, rentabilidade, proventos e **IR**, com explicação de cada número.

**Problema:** o investidor pessoa física iniciante não tem uma ferramenta gratuita e transparente que reúna dados de fonte primária para analisar ativos e que controle sua carteira. Por isso, ele decide com base em indicadores de agregadores, sem entender a origem, e calcula errado o preço médio e o IR, ficando sujeito a declaração incorreta e multa. As ferramentas que resolvem isso são pagas (Ward PRO, Investidor10 PRO).

**ODS:** 10 (meta 10.2, inclusão econômica) e 4 (meta 4.4, educação financeira como habilidade relevante). A meta 8.10 foi descartada porque trata de instituições financeiras. **Enquadramento confirmado com a professora em 05/10/2026.** A justificativa está na seção 5 de `database/docs/descricao-problema.md`.

## 2. Stack
- Frontend: Angular (standalone, TypeScript strict) + Tailwind CSS; E2E com `@playwright/test` (D38)
- Backend: NestJS (TypeScript strict), monólito modular com dois processos (api e worker) e rotinas agendadas de ingestão (`@nestjs/schedule`) — ver `claude/arquitetura.md`
- Banco: PostgreSQL 16+ em Docker + Prisma ORM (migrations versionadas); schemas `public` (domínio/ER), `ops` (técnico) e `analytics` (derivado)
- Contrato front↔back: OpenAPI gerado pelo backend
- Design: Figma (conector ativo no Claude); o frontend lê os frames pelo plugin Figma do Claude Code (D38)
- Modelagem ER de entrega: brModelo Web
- Desenvolvimento dos agentes de código: Claude Code (VS Code), subagentes em `.claude/agents/`, plugins por frente em `claude/convencoes-equipe.md` (D38)

## 3. Fontes de dados (fonte primária sempre que existir)
| Dado | Fonte | Observação |
|---|---|---|
| Cotações diárias (fechamento) e histórico | B3, séries históricas (arquivo COTAHIST) | Sem tempo real (D2) |
| CDI, Selic, IPCA | Banco Central, API SGS | — |
| Ibovespa | B3 | **A confirmar** o formato de obtenção |
| Demonstrações financeiras (DRE, balanço, fluxo) | CVM, dados abertos DFP (anual) e ITR (trimestral) | Ligação empresa↔ticker via cadastro CVM + lista de empresas listadas na B3 |
| Dados mensais de FIIs (patrimônio, cotas, cotistas, rendimentos) | CVM, dados abertos do informe mensal de FII | O informe mensal **não** traz vacância |
| Imóveis de FIIs e vacância | CVM, dados abertos do **informe trimestral estruturado de FII** (arquivo `inf_trimestral_fii_imovel`) | Cada linha é um item declarado (imóvel, laje ou unidade) com classe, área, vacância, inadimplência, % das receitas e % locado (pré-locação). Não há identidade estável do imóvel entre trimestres (conferido nos dados de 2025 em 05/10/2026). A vacância do fundo é derivada (D31) |
| Comunicados e fatos relevantes | CVM, dados abertos IPE | — |
| Proventos e eventos corporativos | B3 | **Risco aberto:** não há API gratuita e limpa. Decisão pendente para proventos. Eventos corporativos: registro manual a partir do S2 (D29) até haver fonte automática |
| Operações do usuário | Lançamento manual ou importação da planilha de negociação da Área do Investidor B3 | Sincronização automática com a B3 está fora do alcance |

## 4. Escopo do produto (visão completa)
Todos os itens abaixo fazem parte do produto. O banco é modelado para o produto completo. A aplicação é construída em etapas (seção 5).

**A. Conta**
- A1 Cadastro de usuário (nome, e-mail único, senha ≥ 8 caracteres)
- A2 Login com autenticação (JWT)

**B. Carteira (referência: Investidor10)**
- B1 Várias carteiras por usuário (criar, listar, excluir; nome único)
- B2 Lançamento de compra e venda: data, quantidade, preço, custos e corretora
- B3 Bloqueio de venda acima da posição
- B4 Edição e exclusão retroativa com recálculo, bloqueada se deixar a posição negativa em algum ponto
- B5 Histórico de operações com filtro por ativo e corretora
- B6 Posição por ativo: quantidade, preço médio, custo total, lucro realizado
- B7 Totais da carteira
- B8 Valor de mercado da posição e resultado não realizado
- B9 Alocação por classe de ativo e por setor
- B10 Rentabilidade da carteira (TWR) comparada com CDI, Ibovespa e IPCA
- B11 Gráfico de evolução patrimonial
- B12 Importação da planilha de negociações da B3
- B13 "Como foi calculado" em todo número derivado

**C. Dados dos ativos: ações, FIIs, ETFs, BDRs (referência: página de ativo do Investidor10)**
- C1 Catálogo de ativos com emissor e setor; busca por ticker ou nome
- C2 Cotação e gráfico histórico de preços
- C3 Rentabilidade do ativo comparada com CDI, Ibovespa e IPCA
- C4 Indicadores fundamentalistas por grupo: valuation (P/L, P/VP, EV/EBITDA, DY), eficiência (margens), rentabilidade (ROE, ROIC), endividamento (dívida líquida/EBITDA, dívida/PL), crescimento (CAGR de receita e lucro)
- C5 Histórico dos indicadores por ano e trimestre
- C6 Demonstrações: receitas e lucros, balanço patrimonial, lucro × cotação
- C7 Dividendos do ativo: histórico, DY atual, DY médio de 5 anos, payout
- C8 FIIs: P/VP, DY, patrimônio, **imóveis declarados no último informe trimestral (vacância e inadimplência), vacância do fundo por trimestre** e link para os relatórios do gestor
- C9 Comunicados e fatos relevantes
- C10 Comparador de ativos lado a lado

**D. Rankings e valuation (referência: Ward)**
- D1 Ranking e filtro personalizável por faixas de indicadores, com ordenação e ranking salvo por usuário (Stock Screening e Fund Screening)
- D2 Preço justo por Benjamin Graham
- D3 Preço-teto por Décio Bazin
- D4 Checklist buy and hold (critérios de aprovado/reprovado)

**E. Proventos e eventos corporativos**
- E1 Desdobramento, grupamento e bonificação, com ajuste de quantidade e preço médio
- E2 Proventos por ativo: dividendos, JCP, rendimentos de FII
- E3 Proventos recebidos por carteira, com IR retido na fonte
- E4 Agenda de dividendos dos ativos da carteira (data-com e pagamento)

**F. Imposto de renda (mantido em 30/09/2026)**
- F1 Apuração mensal por categoria: operações comuns, day trade, FII
- F2 Isenção de R$ 20 mil em vendas de ações; compensação de prejuízo por categoria
- F3 Controle de DARF: valor, vencimento, pago; DARF abaixo de R$ 10 acumula para o mês seguinte. A guia oficial é emitida pelo usuário no Sicalc da Receita (D30)

**G. Acompanhamento**
- G1 Lista de observação (favoritos)
- G2 Alerta de preço-alvo

**H. Calculadoras (referência: Ward e Investidor10)**
- H1 Juros compostos
- H2 Plano de aposentadoria
- H3 Conversor de taxas (mensal↔anual, nominal↔real)
- H4 Reserva de emergência, "primeiro milhão" e renda com dividendos

**Fora do escopo:**
- cotação em tempo real (D2);
- fundos não negociados em bolsa;
- comunidade, notícias, cursos e chat com IA;
- recomendação de ativos ou "carteiras recomendadas" (exige analista credenciado na CVM);
- previsão de dividendos;
- emissão da guia oficial de DARF e armazenamento de CPF (D30).

## 5. Etapas de entrega
**Capacidade vs. escopo:** o produto completo foi estimado em **15 a 27 semanas** de trabalho para 1 pessoa com agentes. Há **~9,5 semanas** até 06/12, e ainda a Parte 1 de BD até 19/10. **O escopo completo não cabe neste semestre**: cabe algo entre 35% e 65% dele. A entrega do semestre é, portanto, um subconjunto; o resto segue no roadmap, já suportado pelo banco.

| Etapa | Itens | Esforço estimado (1 pessoa + agentes) |
|---|---|---|
| **S1 — Núcleo da carteira** | A1–A2, B1–B7, B13, C1 | 3–4 semanas |
| **S2 — Dados de mercado** | C2, C3, B8, B9 (ingestão B3 + BCB) + **E1 mínimo: registro manual de eventos corporativos e ajuste na linha do tempo (D29)** | 1,5–2,5 semanas |
| **S3 — Fundamentos** | C4, C5, C6 (ingestão CVM DFP/ITR; empresas não financeiras) | 2–4 semanas |
| **S4 — Valuation e ranking** | D1–D4, C10 | 1,5–2,5 semanas |
| **S5 — Calculadoras** | H1–H4 | 0,5–1 semana |
| S6 — Proventos e eventos | E1 (fonte automática), E2–E4, C7 | 1–2,5 semanas (risco de fonte de dados) |
| S7 — IR | F1–F3 | 1,5–2,5 semanas |
| S8 — FIIs e comunicados | C8 (informe mensal + informe trimestral com imóveis e vacância), C9 | 1,5–2,5 semanas |
| S9 — Carteira avançada | B10, B11, B12 | 1–2 semanas |
| S10 — Acompanhamento | G1, G2 | 0,5–1,5 semana |

**Datas do plano (05/10/2026):** o plano cobre só o **S1** até 06/12 (R1); S2–S5 não cabem nessas datas.

**Proposta para o semestre (PENDENTE DE APROVAÇÃO):** S1 + S2 + S3 + S4 + S5 = **8,5–14 semanas** para ~9,5 disponíveis (o D29 acrescentou 0,5–1 semana ao S2). A faixa superior não cabe, então um gatilho de corte será definido no plano. S6 a S10 ficam para depois do semestre.

## 6. Decisões registradas
| # | Decisão | Motivo |
|---|---|---|
| D1 | PostgreSQL + Prisma, não Oracle | Menor atrito de instalação e de integração com Node |
| D2 | Sem cotação em tempo real; cotações de fechamento diário (B3 COTAHIST) | Tempo real da B3 é licenciado e pago |
| D3 | ~~Sem dados fundamentalistas~~ **Revogada em 30/09/2026:** fundamentos entram no escopo, **calculados a partir das demonstrações da CVM** (fonte primária), nunca copiados de agregador | O usuário quer paridade funcional com Investidor10/Ward; calcular os indicadores gera regra de negócio testável |
| D4 | Operações são a fonte da verdade; a posição é sempre derivada | Permite recálculo retroativo e eventos corporativos |
| D5 | Dinheiro nunca em float (Decimal / NUMERIC) | Precisão |
| D6 | Modelo de dados completo (produto inteiro) antes da aplicação | Exigência de BD (ER completo em 19/10) |
| D7 | Um único schema para aplicação e BD; `ddl.sql` gerado das migrations; `inserts.sql` é o seed. **Esclarecida pelo D22** | Evitar divergência entre dois bancos |
| D8 | IR apurado por usuário (contribuinte), não por carteira | Legislação: apuração consolidada por contribuinte |
| D9 | Toda operação exige corretora | Realismo e necessidade para IR/informes |
| D10 | ~~Apuração e DARF são snapshots com valores calculados~~ **Revista em 05/10/2026:** a apuração fechada guarda os insumos do mês (vendas, resultado, prejuízo compensado) e não é alterada silenciosamente; base, imposto, valor devido e vencimento do DARF são derivados das regras de IR versionadas por vigência (D32), então o recálculo de um mês fechado é determinístico. O DARF guarda só o pagamento informado | Os valores calculados violavam a 3FN; com as regras versionadas, o histórico continua reproduzível |
| D11 | Provento recebido é fato informado pela corretora | O valor calculado serve só para conferência |
| D12 | UX educativa: todo número tem "como foi calculado", incluindo a fórmula e a fonte de cada indicador | Sustenta o enquadramento ODS 4.4 |
| D13 | ER de entrega desenhado no brModelo Web | Ferramenta da disciplina; atenção à convenção de cardinalidade invertida do conversor |
| D14 | O ER é congelado na tarefa B3 do plano; mudanças posteriores viram decisão registrada aqui. **ER congelado em 05/10/2026** (27 entidades, 33 relacionamentos, 29 tabelas) | Uma mudança depois disso atrasa schema, UX e seed ao mesmo tempo |
| D15 | Plano sequenciado para 1–2 pessoas: no máximo duas frentes simultâneas, com gatilhos de corte decididos antecipadamente | Não há folga no fim do semestre |
| D16 | IR mantido no produto (30/09/2026) | Regra de negócio densa, sem dependência de dados externos; presente também no Investidor10 |
| D17 | Indicadores fundamentalistas são dados derivados (demonstrações + cotação). Se forem materializados para desempenho, a tabela é um cache recalculável, nunca fonte da verdade | Mesmo princípio do D4 |
| D18 | Na primeira versão, indicadores só para empresas não financeiras; bancos e seguradoras ficam de fora | Usam plano de contas diferente; tratá-los dobra o mapeamento contábil |
| D19 | Sincronização automática com a B3 fora do escopo; substituída pela importação da planilha de negociação (B12) | A integração exige parceria com a B3 |
| D20 | Núcleo relacional normalizado (3FN, OLTP) como fonte da verdade; snowflake e DW rejeitados como modelo principal (30/09/2026) | O domínio é transacional com edição retroativa; o volume (≤ ~15 M linhas) não justifica DW; o ER precisa representar o domínio |
| D21 | Medalhão leve só para dado externo e derivado: bronze = arquivos brutos imutáveis; prata = núcleo `public`; ouro = `analytics` recalculável | Rastreabilidade e reprocessamento da ingestão sem infraestrutura de lakehouse |
| D22 | Um banco e um `schema.prisma`, três schemas PostgreSQL (`public`, `ops`, `analytics`). Só `public` compõe o ER e o `ddl.sql` de BD (gerado por `pg_dump --schema-only --schema=public`) | Separar domínio de estruturas técnicas sem divergência de bancos |
| D23 | PK `uuid` para entidades com identidade própria; PK composta natural para séries temporais e associativas | Economia de espaço e índice onde há milhões de linhas |
| D24 | Monólito modular NestJS com dois processos (api e worker), sem fila externa; coordenação por `ops.ingestion_runs` + advisory lock | Isola o parse pesado da API sem custo de microsserviço ou fila |
| D25 | CQRS leve: escrita pelo domínio; leitura intensiva por query services SQL | Leituras analíticas não passam por entidades de domínio |
| D26 | Contrato `DerivedValue` com trace para todo número derivado; um componente único no front | Implementa o D12 de forma uniforme e testável |
| D27 | Ingestão idempotente (hash + upsert por chave natural); dado externo exibido com fonte e data de referência; CVM guarda a última versão da demonstração | Reprocessamento seguro e transparência (ODS 4.4) |
| D28 | Calculadoras (H1–H4) no backend, como funções puras | Regra única "sem cálculo de negócio no front" e Decimal em todas as camadas |
| D29 | Registro manual de eventos corporativos (desdobramento, grupamento, bonificação) e ajuste na linha do tempo do `PositionCalculator` antecipados para o S2 (30/09/2026) | O COTAHIST publica preço não ajustado: sem o evento, valor de mercado, alocação e indicadores por ação ficam errados após o evento |
| D30 | CPF não é armazenado. O cálculo do IR não usa CPF: a apuração consolida as operações de todas as carteiras da conta, e **cada conta representa um único contribuinte**. O sistema calcula e controla o DARF (valor, código, vencimento, pagamento); a guia oficial é emitida pelo usuário no Sicalc da Receita, onde ele informa o CPF (30/09/2026) | O CPF não entra em nenhuma conta; evita guardar dado pessoal sensível (LGPD) sem necessidade |
| D31 | Vacância de FII entra no modelo (01/10/2026; **revista em 05/10/2026**): entidades **InformeTrimestralFII** e **ImovelInforme** (fraca, um item por linha do informe, com classe, área, vacância, inadimplência, % das receitas e % locado), alimentadas pelo informe trimestral estruturado da CVM. A vacância do fundo é **derivada** (média ponderada pela área dos itens de imóveis para renda acabados) | Os dados de 2025 mostraram que a fonte declara lajes e unidades em linhas separadas e muda nomes entre trimestres, sem código de imóvel; uma entidade Imovel com série temporal teria identidade inventada |
| D32 | Modelo verificado na 3FN (05/10/2026): sem atributo calculável a partir de outros da mesma tupla. Saíram nível do setor, VP por cota, tipo de demonstrativo, base e imposto da apuração, valor e vencimento do DARF; `escopo` passou para a linha da demonstração. Entram **CategoriaIR** e **RegraIR** (fraca, versionada por início de vigência); a regra de uma apuração é obtida por consulta, não por FK, porque depende de (categoria, mês) | Exigência de BD e base para o recálculo determinístico do D10 |
| D33 | Reuso do sistema em Engenharia de Software confirmado (05/10/2026, F1 concluída): o sistema atende o enunciado de ES por ter regras de negócio além de CRUD (posição e preço médio, recálculo retroativo, eventos corporativos, IR, indicadores, valuation) e testes automatizados. Testes em **TypeScript, arquivos `.spec.ts`**: Jest no backend NestJS (unitários do domínio + E2E/integração com Testcontainers) e specs do Angular no frontend | Decisão do usuário a partir do `projetoEngSoftware.md`, que exige sistema não trivial, regras testadas e testes automatizados |
| D34 | O schema `public` tem exatamente as 183 colunas do ER, sem colunas técnicas (`updated_at` etc.); as datas de registro que o ER já tem (`criado_em` → `created_at`) usam `timestamptz` com padrão `now()` (24/10/2026) | O `ddl.sql` da entrega de BD precisa corresponder 1:1 ao mapeamento; auditoria técnica, se necessária, fica no schema `ops` |
| D35 | Operações comuns separadas em duas categorias de IR: ações no mercado à vista (`COMMON_STOCK`, com isenção de vendas até R$ 20 mil) e demais ativos (`COMMON_OTHER`: ETF de renda variável, BDR, units). Muda só o domínio de `CategoriaIR.codigo`, não a estrutura do ER (24/10/2026) | A isenção da Lei 11.033/2004, art. 3º, I, vale só para vendas de ações; com uma categoria única, um mês com ações e ETF não pode ser apurado corretamente (P0, `database/docs/memoria-calculo.md`) |
| D36 | IRRF ("dedo-duro": 0,005% sobre vendas comuns; 1% sobre ganho de day trade) não é armazenado: é calculado das operações e deduzido do imposto do mês (24/10/2026) | É valor derivado (D32); diferença eventual com o retido pela corretora não é registrada |
| D37 | Estrutura do repositório (26/10/2026): monorepo com três pacotes Node (raiz com Prisma e Docker; `backend/` e `frontend/` com `package.json` próprio, criados pelos CLIs no K1 e no W1); **um único `.env` na raiz**, lido pelo Compose, pelo Prisma e pelo backend; contrato da API versionado em `backend/openapi/openapi.json`. Detalhes em `claude/estrutura-repositorio.md` | Uma fonte de credenciais evita divergência entre Docker, migrations e API; o Prisma já vive na raiz (D1) |
| D38 | Ferramentas do Claude Code (26/10/2026). Plugins oficiais com escopo de projeto: `feature-dev`, `pr-review-toolkit`, `claude-md-management`, `security-guidance`, `commit-commands`, `figma`, `playwright`; `frontend-design` e `superpowers` desativados no projeto (`enabledPlugins` em `.claude/settings.json`). Uso por frente em `claude/convencoes-equipe.md` e nos prompts. **E2E com `@playwright/test`** em `frontend/e2e/*.spec.ts`, no CI; o plugin Playwright serve só para conferência interativa. **Handoff de UX** em `claude/handoff-ux.md`, com o link do frame de cada tela; o frontend lê o Figma pelo plugin e não implementa tela sem link. **Sem segunda pessoa, `/review-pr` substitui o revisor**; a proteção da `main` exige PR e CI, com 0 aprovações enquanto houver uma pessoa | Plugins que tomam decisões visuais ou impõem fluxo próprio conflitam com o design system e com o formato dos agentes; o D33 exige testes versionados, que o plugin não é; o GitHub não deixa o autor aprovar o próprio PR |

## 7. Modelo de dados
O banco cobre o produto completo (D6). Modelo detalhado em `claude/arquitetura.md` (seção 4, físico) e `database/docs/modelo-er.md` (conceitual, B2): **27 entidades + 2 relacionamentos N:N com atributos = 29 tabelas**, 33 relacionamentos nomeados, todas as relações na 3FN.

- **Conta e carteira:** users, portfolios, brokers, operations, import_batches
- **Catálogo:** sectors, issuers, assets
- **Mercado:** quotes, economic_indexes, index_values
- **Fundamentos:** financial_statements, statement_lines, fii_monthly_reports, fii_quarterly_reports, fii_report_properties, corporate_filings
- **Proventos e eventos:** corporate_events, income_distributions, received_income
- **IR:** tax_categories, tax_rules, tax_assessments, darfs
- **Referência analítica:** indicators
- **Usuário:** watchlist_items (N:N), price_alerts, saved_screens, screen_criteria (N:N)

**Esquema relacional congelado (nomes do ER em português, como na entrega de BD).** Legenda: **negrito** = PK; `→Tabela` = FK; `?` = aceita nulo. A tradução para os nomes físicos em inglês está na seção 5 de `database/docs/modelo-er.md` e entra no glossário (`database/docs/glossario.md`, Parte 2).

- `Usuario` (**id_usuario**, nome, email, hash_senha, criado_em)
- `Corretora` (**id_corretora**, nome, cnpj)
- `Carteira` (**id_carteira**, id_usuario→Usuario, nome, criada_em)
- `LoteImportacao` (**id_lote**, id_carteira→Carteira, nome_arquivo, hash_arquivo, situacao, qtd_linhas, importado_em, confirmado_em?)
- `Operacao` (**id_operacao**, id_carteira→Carteira, id_ativo→Ativo, id_corretora→Corretora, id_lote→LoteImportacao?, tipo, data_pregao, quantidade, preco_unitario, custos, sequencia)
- `Setor` (**id_setor**, id_setor_pai→Setor?, nome)
- `Emissor` (**id_emissor**, id_setor→Setor?, nome, tipo, cnpj?, codigo_cvm?)
- `Ativo` (**id_ativo**, id_emissor→Emissor, ticker, isin, tipo, classe?, negociado)
- `Cotacao` (**id_ativo**→Ativo, **data**, abertura, maxima, minima, fechamento, volume, negocios)
- `IndiceEconomico` (**id_indice**, codigo, nome, periodicidade, unidade, fonte)
- `ValorIndice` (**id_indice**→IndiceEconomico, **data_referencia**, valor)
- `Demonstracao` (**id_demonstracao**, id_emissor→Emissor, tipo_documento, inicio_exercicio, fim_periodo, versao, entregue_em, acoes_ordinarias, acoes_preferenciais, tesouraria_ordinarias, tesouraria_preferenciais)
- `LinhaDemonstracao` (**id_demonstracao**→Demonstracao, **escopo**, **codigo_conta**, descricao_conta, valor)
- `InformeMensalFII` (**id_informe_mensal**, id_emissor→Emissor, mes_referencia, versao, patrimonio_liquido, cotas_emitidas, numero_cotistas, dividend_yield_mes)
- `InformeTrimestralFII` (**id_informe_trimestral**, id_emissor→Emissor, data_referencia, versao)
- `ImovelInforme` (**id_informe_trimestral**→InformeTrimestralFII, **numero_item**, nome, endereco, classe, area?, percentual_vacancia?, percentual_inadimplencia?, percentual_receitas_fii?, percentual_locado?)
- `Comunicado` (**id_comunicado**, id_emissor→Emissor, categoria, assunto, data_referencia, entregue_em, url_documento, protocolo_cvm)
- `EventoCorporativo` (**id_evento**, id_ativo→Ativo, tipo, data_ex, proporcao_de, proporcao_para, custo_unitario_bonificacao?, fonte)
- `Provento` (**id_provento**, id_ativo→Ativo, tipo, data_com, data_pagamento?, valor_por_cota, fonte)
- `ProventoRecebido` (**id_recebimento**, id_provento→Provento, id_carteira→Carteira, id_corretora→Corretora, quantidade_base, valor_bruto, ir_retido, recebido_em)
- `CategoriaIR` (**id_categoria**, codigo, nome, codigo_receita)
- `RegraIR` (**id_categoria**→CategoriaIR, **inicio_vigencia**, aliquota, limite_isencao_vendas?)
- `Apuracao` (**id_apuracao**, id_usuario→Usuario, id_darf→DARF?, id_categoria→CategoriaIR, mes_referencia, total_vendas, resultado_liquido, prejuizo_compensado, fechada_em)
- `DARF` (**id_darf**, id_usuario→Usuario, mes_referencia, valor_pago?, pago_em?)
- `Indicador` (**id_indicador**, codigo, nome, grupo, formula, unidade, aplica_a)
- `AlertaPreco` (**id_alerta**, id_usuario→Usuario, id_ativo→Ativo, preco_alvo, direcao, criado_em, disparado_em?, data_cotacao_disparo?)
- `FiltroSalvo` (**id_filtro**, id_usuario→Usuario, id_indicador_ordenacao→Indicador?, nome, tipo_ativo, direcao_ordenacao)
- `observa` (**id_usuario**→Usuario, **id_ativo**→Ativo, incluido_em)
- `criterio` (**id_filtro**→FiltroSalvo, **id_indicador**→Indicador, valor_minimo?, valor_maximo?)

Dado derivado **nunca** vira coluna (D4, D17, D32): posição, preço médio, lucro, indicadores, VP por cota, vacância do fundo, nível do setor, base e imposto do IR, valor devido e vencimento do DARF.

## 8. Agentes
Os prompts completos estão em `agentes/`, todos reescritos em 05/10/2026: modelo de 27 entidades/29 tabelas, etapas S1–S10 (S1 neste semestre), decisões D1–D36, regras RN01–RN12, tarefas e datas do plano de cada frente. Os de backend, frontend e UX/UI foram atualizados em 26/10/2026 com as ferramentas de cada frente (D38). Quando uma decisão ou RN mudar, os quatro prompts são atualizados na mesma tarefa (`claude/convencoes-equipe.md`).

**Frentes ativas (replanejadas em 24/10/2026):** todas, com datas no plano. Fundação em 25–27/10; de 28/10 a meados de novembro correm BD (P1–P2), UX/UI (U1–U5) e backend (K0–K3); o frontend entra em 10/11. Prazos de BD têm prioridade (G-P4, G-UX).

| Agente | Arquivo | Responsável por | Onde roda | Ferramentas (D38) |
|---|---|---|---|---|
| Banco de Dados | `agentes/agente-banco-de-dados.md` | Modelagem do produto completo, `schema.prisma`, migrations, seed e **todos os entregáveis de BD** | Chat deste projeto (Parte 1) e Claude Code (`@database`, Parte 2 e schema) | Fluxo geral das convenções (`/feature-dev`, `/review-pr`, `/commit`) |
| Backend | `agentes/agente-backend.md` | API NestJS, arquitetura, regras de negócio, ingestão de dados, cálculos (posição, indicadores, valuation, IR), testes | Claude Code (`@backend`) | `/feature-dev`, `code-simplifier`, `silent-failure-hunter`, `type-design-analyzer`, `pr-test-analyzer`, `/review-pr` |
| Frontend | `agentes/agente-frontend.md` | Angular + Tailwind, telas, integração com a API, specs | Claude Code (`@frontend`) | Plugin Figma (frames do `claude/handoff-ux.md`), Playwright (conferência), `@playwright/test` (E2E), `/feature-dev`, `/review-pr` |
| UX/UI | `agentes/agente-ux-ui.md` | Design system, telas no Figma, microcopy educativa, handoff | Chat deste projeto, com o conector Figma ativo | Plugin Design: design system, crítica de design, microcopy, revisão de acessibilidade, especificação de handoff |

**Regras de uso:**
- Um chat por agente, iniciado com `Agente: <nome>` e a tarefa do plano.
- Resultado aprovado vira documento do projeto e é registrado na seção 10.
- Um agente não altera o artefato de outro.
- Git, PR, definição de pronto e ferramentas seguem `claude/convencoes-equipe.md`.

**Checklist interativo** (página privada): https://claude.ai/artifact/MEKLYSKz6kRe1ff3nvop6U. **Atualizado em 26/10/2026** com o plano vigente (`claude/plano-de-acao.md`): todas as trilhas (BD Parte 1, BD Parte 2, UX/UI, fundação, backend, frontend) com datas, dependências e critério de pronto. O progresso marcado vive no checklist; datas e critérios vivem no plano. Toda mudança no plano atualiza o checklist na mesma tarefa.

## 9. Estrutura do repositório
Definida em `claude/estrutura-repositorio.md` (D37): árvore completa, onde fica cada arquivo, o que vai para o Git e o dono de cada pasta. Resumo:
```
.claude/agents/   subagentes do Claude Code (espelho de agentes/)
.claude/settings.json  permissões e plugins do projeto (D38)
.github/          template de PR; workflows/ci.yml (K1)
agentes/  claude/ prompts e documentação (inclui claude/handoff-ux.md)
prisma/           schema.prisma, migrations/ (agente database)
database/         docs/, scripts/, tests/, sql/ (ddl gerado, inserts, queries), results/
data/raw/         bronze (fora do Git)
docker/           scripts de inicialização do PostgreSQL
backend/          NestJS (K1): src/modules/<modulo>/{domain,application,infrastructure,presentation}, main.api.ts, main.worker.ts, openapi/
frontend/         Angular (W1): src/app/{core,shared,api,features}, e2e/ com @playwright/test (R1)
.env (fora do Git), .env.example, docker-compose.yml, prisma.config.ts, package.json, CLAUDE.md, README.md  na raiz
```

## 10. Artefatos produzidos
| Artefato | Status | Local |
|---|---|---|
| Prompt do agente de banco | **Atualizado (05/10/2026)** | `agentes/agente-banco-de-dados.md` |
| Prompts de backend, frontend e UX/UI | **Reescritos (05/10/2026); ferramentas incluídas (26/10/2026, D38)** | `agentes/` |
| Estrutura do repositório | **Concluído (26/10/2026)**, D37; atualizada com handoff e E2E (D38) | `claude/estrutura-repositorio.md` |
| Plano de ação | **Replanejado (24/10/2026)**, todas as trilhas com datas a partir de 25/10; ajustado em 26/10 (D38: U5, R1, W1, F3, G-U3) | `claude/plano-de-acao.md` |
| Checklist interativo | **Atualizado (26/10/2026)** com o ajuste do D38; B1–B6, F1, P0, G1 e D1 marcadas | página privada (link na seção 8) |
| Convenções da equipe | **Atualizado (26/10/2026)**: ferramentas do Claude Code, revisão sem segunda pessoa, proteção da `main` | `claude/convencoes-equipe.md` |
| Handoff UX → frontend | **Modelo criado (26/10/2026)**; preenchido no U5 | `claude/handoff-ux.md` |
| Arquivo Figma do design system | **Pendente (U1)**: registrar o link aqui quando o arquivo for criado | — |
| Enunciado de BD (transcrição) | Concluído | `claude/enunciadoBancoDeDados.md` |
| Arquitetura de dados e da aplicação | **Aprovada (30/09/2026)**; atualizada com D31 | `claude/arquitetura.md` |
| Modelo ER (Mermaid + especificação brModelo + verificação 3FN) | **Congelado (05/10/2026)** | `database/docs/modelo-er.md` |
| Modelo ER no brModelo Web | **Congelado (05/10/2026)**: 27 entidades e 33 relacionamentos; lógico convertido e ajustado | brModelo Web, modelagens `CarteiraB3_ER` e `CarteiraB3_Logico` |
| Descrição do problema (B1) | **Reescrita (13/10/2026)** com foco na disciplina de BD: democratização da gestão de investimentos, dados de fonte primária (ANBIMA, B3, IBGE) e domínio do banco | `database/docs/descricao-problema.md` |
| Mapeamento ER→relacional (B5) | **Concluído (05/10/2026)** | `database/docs/mapeamento.md` |
| Glossário PT↔EN (G1) | **Concluído (24/10/2026)**: 29 tabelas, 183 colunas, 20 domínios | `database/docs/glossario.md` |
| Regras de IR na legislação (P0) | **Concluído (24/10/2026)**, com pontos a confirmar listados | `database/docs/memoria-calculo.md` |
| Schema e migrations (D1) | **Concluído (24/10/2026)**, validado em PostgreSQL 16 na nuvem (G-D1); `prisma migrate deploy` aplicado do zero; `db:drift` sem diferenças entre schema e migration; 42 CHECK; 25 testes de restrição passando | `prisma/schema.prisma`, `prisma/migrations/20261024000000_init/`, `database/sql/ddl.sql`, `database/tests/constraints.sql` |
| PDF de entrega da Parte 1 (B6) | **Enviado (19/10/2026)**. Versão final de 18/10: lista de abreviaturas e siglas, siglas explicadas na primeira ocorrência, citações e referências no padrão ABNT; versão em Word para o usuário preencher os integrantes e enviar | `BD_Parte1_CarteiraB3.docx` e `.pdf` (enviados no chat do agente de banco) |
| Pacote inicial do repositório (F3/F4) | **Gerado (05/10/2026)**; falta o usuário subir no GitHub | `carteira-b3.zip`: `CLAUDE.md`, `.claude/agents/` (database, backend, frontend), `.claude/settings.json`, cópia dos documentos do projeto, `docker-compose.yml` com PostgreSQL 16 (`carteira_dev`, `carteira_test`) |
| Design system (Figma) | Pendente | — |

## 11. Pendências
**Banco de dados**
- [ ] Apagar no brModelo os lógicos desatualizados (`CarteiraB3_ER_convertido` de 30/09 e de 01/10).
- [ ] P0: confirmar os pontos marcados "a confirmar" em `database/docs/memoria-calculo.md` (seção 5); o seed não depende deles.
- [ ] P1: tabelas com poucos registros reais (`tax_categories` tem 4 categorias; `economic_indexes`, 4 índices) contra a exigência de ±10 tuplas por tabela: decidir com a professora ou completar com dados reais (ex.: outros índices do Banco Central).
- [ ] Decidir a fonte de proventos (seção 3); afeta também o DY de C4 no S3.
- [ ] Confirmar a fonte do Ibovespa.
- [ ] D2 (27–31/10): schema `ops` com `ops.user_sessions`; bloqueia o K2 (04/11). Banco do sistema, fora da entrega de BD.

**Fundação (usuário, 25–27/10)**
- [ ] F2: Claude Code funcionando (comando `claude` no PATH).
- [ ] F3: repositório no GitHub com regras e `.claude/agents/`; proteção da `main` com PR obrigatório e 0 aprovações enquanto houver uma pessoa (D38); `gh auth login`.
- [ ] Copiar para o repositório os documentos atualizados em 26/10 (D38): `agentes/agente-backend.md`, `agentes/agente-frontend.md`, `agentes/agente-ux-ui.md`, `claude/contexto-projeto.md`, `claude/convencoes-equipe.md`, `claude/plano-de-acao.md`, `claude/estrutura-repositorio.md`, `claude/handoff-ux.md`; e atualizar o corpo de `.claude/agents/backend.md` e `.claude/agents/frontend.md` (o cabeçalho YAML não muda).
- [ ] Template de PR (`.github/pull_request_template.md`): incluir o item "`/review-pr` rodado; achados críticos tratados ou descartados com motivo".

**UX/UI, backend e frontend**
- [ ] U0 (25/10): aprovar a lista de telas do S1 proposta em `agentes/agente-ux-ui.md`.
- [ ] U1: registrar na seção 10 o link do arquivo Figma do design system.

**Planejamento**
- [ ] Aprovar a entrega do semestre de Engenharia de Software (seção 5): as datas atuais cobrem só o S1.
- [ ] Obter o calendário de entregas incrementais de Engenharia de Software.
- [ ] Verificar se existe projeto de extensão do ICT relacionado a educação financeira (o enunciado de BD pede "se possível").

## 12. Registro de alterações
| Data | Alteração | Documentos |
|---|---|---|
| 05/10/2026 | ER congelado (D14): 27 entidades, 33 relacionamentos, 29 tabelas na 3FN; D10 e D31 revistas; D32 registrada | `database/docs/modelo-er.md`, `database/docs/mapeamento.md`, seção 7 deste documento |
| 05/10/2026 | BD Parte 1 concluída (B1–B5); PDF gerado, falta o envio (B6) | `database/docs/descricao-problema.md`, plano |
| 05/10/2026 | ODS confirmado com a professora; reuso em ES confirmado com testes em `.spec.ts` (D33); F1 concluída | seções 1 e 6, `claude/convencoes-equipe.md`, `claude/arquitetura.md` |
| 05/10/2026 | Plano revisado: todas as frentes com datas (BD, UX/UI, fundação, backend, frontend); S1 até 06/12; novos gatilhos G-K4, G-W4 e G-UX | `claude/plano-de-acao.md`, checklist interativo |
| 05/10/2026 | Prompts de banco, backend, frontend e UX/UI reescritos ao modelo atual; arquitetura ajustada (D10 revista, D33, referência aos prompts); convenções atualizadas | `agentes/*.md`, `claude/arquitetura.md`, `claude/convencoes-equipe.md` |
| 05/10/2026 | Pacote inicial do repositório gerado para o Claude Code. Os documentos do projeto passam a existir em duas cópias (projeto no claude.ai e repositório); ao alterar um, atualizar o outro | `CLAUDE.md`, `.claude/agents/`, `docker-compose.yml` |
| 13/10/2026 | Parte 1 de BD revisada: texto do problema reescrito para a disciplina de BD (sem detalhes de aplicação), com dados da ANBIMA, B3 e IBGE; PDF reestruturado conforme o enunciado (tabelas do mapeamento em formato texto, sem tipos) | `database/docs/descricao-problema.md` |
| 18/10/2026 | Parte 1 de BD: lista de siglas, siglas expandidas no texto, citações autor-data e seção de Referências (ABNT NBR 6023) com ANBIMA, B3, MDHC/IBGE e ONU Brasil; entregue também em .docx | `database/docs/descricao-problema.md` |
| 24/10/2026 | BD Parte 2 iniciada: P0 (regras de IR com citação da norma), G1 (glossário) e D1 (schema Prisma 7, migration inicial, `ddl.sql` gerado, testes de restrição) concluídos; decisões D34–D36; G-D1 aplicado (validação na nuvem) | `database/docs/memoria-calculo.md`, `database/docs/glossario.md`, `prisma/`, `database/sql/ddl.sql` |
| 24/10/2026 | Domínio `binaries.prisma.sh` liberado pelo usuário; conferência do Prisma concluída: `migrate deploy` do zero, `migrate diff` vazio, `ddl.sql` idêntico, Prisma Client gerado | `prisma/`, `database/sql/ddl.sql` |
| 24/10/2026 | Projeto geral retomado: todas as frentes replanejadas a partir de 25/10 (fundação 25–27/10, UX/UI até 16/11, backend até 25/11, frontend até 06/12, BD Parte 2 até 30/11); novo gatilho G-U3; datas atualizadas nos prompts de UX, backend, frontend e banco e no checklist | `claude/plano-de-acao.md`, `agentes/*.md`, checklist interativo |
| 26/10/2026 | Estrutura do repositório definida (D37) para o F3: árvore, local do `.env` (raiz, único) e dos arquivos do Docker, gerados e donos por pasta; referência incluída nos quatro prompts, no `CLAUDE.md` e no README; F3 e F4 com critério de pronto ajustado (o CI só existe a partir do K1) | `claude/estrutura-repositorio.md`, `claude/plano-de-acao.md`, `agentes/*.md`, `CLAUDE.md` |
| 26/10/2026 | F4 concluído: banco local validado pelo usuário (Docker, `db:migrate`, `db:test`). Revisão da prontidão do banco para o sistema: `public` completo para o S1; falta o schema `ops` com `ops.user_sessions` (exigido pelo K2 e sem tarefa no plano) → nova tarefa D2 (27–31/10), K2 passa a depender dela | `claude/plano-de-acao.md`, `agentes/agente-banco-de-dados.md`, `agentes/agente-backend.md`, checklist |
| 26/10/2026 | Ferramentas do Claude Code (D38): plugins por frente; `frontend-design` e `superpowers` desativados no projeto (feito pelo usuário em `.claude/settings.json`, junto com a seção de ferramentas do `CLAUDE.md`); E2E com `@playwright/test`; handoff de UX com link do frame de cada tela (`claude/handoff-ux.md`, modelo); `/review-pr` no lugar do revisor humano e proteção da `main` com 0 aprovações enquanto houver uma pessoa; U5, R1, W1, F3 e G-U3 ajustados no plano e no checklist | `agentes/agente-backend.md`, `agentes/agente-frontend.md`, `agentes/agente-ux-ui.md`, `claude/convencoes-equipe.md`, `claude/plano-de-acao.md`, `claude/estrutura-repositorio.md`, `claude/handoff-ux.md`, checklist |
