# Handoff UX/UI → Frontend — Carteira B3

> Criado em 26/10/2026 (D38) como modelo; frames do S1 definidos no U0 (D41); **links preenchidos em 30/10/2026** com as telas de alta fidelidade (U2/U3). Textos explicativos e mensagens são provisórios até a tabela de microcopy (U4); a revisão Nielsen/WCAG formal é do U5. O agente de frontend lê cada frame no Figma pelo link desta tabela, com o plugin Figma do Claude Code. Frame sem link aqui não é implementado.

## Arquivo Figma
- Arquivo: https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo (time educacional **ProjetosUnifesp**, plano Education)
- Páginas (D46): **Telas — produto completo** (uma faixa por tela, um frame por estado; à esquerda do traço vertical, o S1; à direita, as próximas etapas; faixa 8 = página do ativo), **Componentes** (conjuntos de variantes), **Fundamentos** ([documentação dos tokens](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=23-875)).
- Variáveis: coleção `Color` (modos **Light** e **Dark**), `Spacing` e `Radius`, com os mesmos nomes dos tokens do `tailwind.config`. Tabela completa: `claude/design-tokens.md`.
- Protótipo (D46): um só, na página Telas — 72 frames, 253 ligações (revisadas em 30/10, nenhuma quebrada). Pontos de partida do S1: "Fluxo S1: cadastro → carteira → compra → venda → posição", "login → carteiras" e "catálogo → lançar operação". Pontos de partida das próximas etapas: "Produto completo: carteiras", "catálogo de ativos" e "página do ativo". Frames de estado (erro, carregando, mobile, tema escuro) são para inspeção e não são alcançados por clique.
- **Próximas etapas (não implementar no S1):** frames à direita do traço vertical de cada faixa e a faixa 8 inteira (D45, D46). Lista na seção "Roadmap" abaixo. **Só se implementa frame com link na tabela "Frames do S1".**
- Prévia do tema escuro: [seção Tema escuro](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=23-1177) (Lista, Detalhe e Formulário no modo Dark).

## Frames do S1
Tela = rota própria. Componente = um único frame (conjunto de variantes) reutilizado pelas telas, implementado uma vez em `shared/`. Shell = layout global (`core/`). Desktop 1440 px (conteúdo 1120 px); mobile 390 px.

| # | Frame | Tipo | Itens do produto | Seção / componente no Figma | Estados (links) | Componentes do design system | Tarefa do frontend |
|---|---|---|---|---|---|---|---|
| 1 | Login | Tela | A2 | [abrir](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=5-42) | [padrão](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=5-43); [credencial inválida](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=5-69); [sessão expirada](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=5-98); [carregando](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=5-127) | TextField, Button, banner | W2 |
| 2 | Cadastro | Tela | A1 | [abrir](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=5-153) | [padrão](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=5-154); [erro de campo](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=5-185); [carregando](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=5-216) | TextField, Button | W2 |
| 3 | Lista de carteiras | Tela | B1 | [abrir](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=6-77) | [vazio](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=6-78); [com dados](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=6-108); [criar, nome duplicado](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=6-157); [confirmação de exclusão](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=6-219); [carregando](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=6-288) | AppHeader, Button, TextField, ConfirmDialog | W3 |
| 4 | Detalhe da carteira | Tela | B6, B7, B13 | [abrir](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=7-188) | [com dados](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=7-189); [encerradas + como foi calculado](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=7-355); [vazio](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=7-588); [mobile](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=7-619); [carregando](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=21-912) | AppHeader, Button, Badge, DerivedValueExplainer, PortfolioTabs, AssetAvatar | W4 |
| 5 | Formulário de operação | Tela | B2, B3, B4, C1 | [abrir](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=17-288) | [criar, busca de ativo](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=17-289); [compra preenchida, resumo](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=27-1086); [venda, lucro estimado](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=27-1218); [erro de campo](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=17-382); [rejeição RN07](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=17-457); [editar, rejeição RN10](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=17-549); [sucesso](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=17-644); [mobile](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=17-725) | TextField, Button, Badge, BusinessRuleError, Resumo da operação (D42) | W4 |
| 6 | Histórico de operações | Guia do Detalhe (D45) | B4, B5 | [abrir](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=19-547) | [com dados](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=19-548); [filtrado por tipo (FIIs)](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=43-1231); [filtro sem resultado](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=19-776); [confirmação de exclusão](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=19-822); [rejeição RN10](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=19-1061); [mobile](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=19-1307) | TextField, Button, Badge, ConfirmDialog, BusinessRuleError, PortfolioTabs, AssetAvatar | W4 |
| 7 | Catálogo de ativos | Tela | C1 | [abrir](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=20-706) | [inicial](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=20-707); [com resultado](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=20-875); [sem resultado](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=20-968); [escolher carteira](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=20-1008); [mobile](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=20-1125) | TextField, Button, Badge | W4 |
| C1 | `DerivedValueExplainer` | Componente | B13 | [abrir](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=3-112) | variantes `Formula` = AVG_PRICE_BUY, TOTAL_COST, REALIZED_PROFIT (no conjunto) | — | W4 |
| C2 | `BusinessRuleError` | Componente | B3, B4 | [abrir](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=3-148) | variantes `Rule` = RN07, RN10 (no conjunto) | — | W4 |
| C3 | `ConfirmDialog` | Componente | B1, B4 | [abrir](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=3-178) | variantes `Type` = Excluir carteira, Editar operação, Excluir operação (no conjunto) | Button, TextField | W3, W4 |
| L | Layout e navegação | Shell | — | [abrir](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=21-818) | [404](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=21-819); [falha de conexão](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=21-840); [menu mobile aberto](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=21-867); [menu do usuário (desktop)](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=21-890) | AppHeader | W1 |

## Roadmap (referência; não implementar no S1)
Desenho do produto completo para banco, backend e frontend consultarem desde já (D46; os requisitos de dados que ele gera estão no D47 e em `agentes/agente-banco-de-dados.md`): contratos e componentes do S1 não devem fechar o caminho para estes frames. Cada etapa só entra no handoff quando for planejada; até lá, estes frames não têm estados de erro e carregamento nem contrato de API fechados. Dados ilustrativos, coerentes entre frames.

| Frame | Itens do produto | Etapa | Link |
|---|---|---|---|
| Lista de carteiras com patrimônio e rentabilidade | B8, B10 | S2, S9 | [abrir](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=47-1470) |
| Catálogo de ativos completo (abre a página do ativo) | C1, C2 | S2, S11 | [abrir](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=47-1536) |
| Detalhe — Resumo com gráficos, KPIs de 12 meses e total, alocação × carteira ideal | B8–B11, G3 | S2, S9, S10 | [abrir](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=44-1178) |
| Detalhe — Histórico completo | B4, B5 | S1 + classes do S11 | [abrir](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=45-1212) |
| Detalhe — Proventos (mensal, recebidos e a receber) | E3, E4 | S6 | [abrir](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=45-1531) |
| Detalhe — Metas; nova meta | G4 | S10 | [metas](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=45-1714); [nova meta](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=45-1796) |
| Carteira ideal — editar; soma diferente de 100% | G3 | S10 | [editar](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=45-1903); [erro](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=45-2022) |
| Página do ativo — Ação (PETR4, ITSA4) | C2, C4 | S2, S3 | [PETR4](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=46-1370); [ITSA4](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=60-1525) |
| Ação — guias Indicadores, Demonstrações, Dividendos, Comunicados | C5, C6, C7, C9 | S3, S6, S8 | [Indicadores](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=61-1560); [Demonstrações](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=61-1948); [Dividendos](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=62-1593); [Comunicados](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=62-1919) |
| Página do ativo — FII de tijolo (HGLG11) e de papel (MXRF11, sem imóveis) | C8 | S8 | [HGLG11](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=46-1556); [MXRF11](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=60-1738) |
| FII — guias Imóveis e vacância, Rendimentos, Comunicados | C7, C8, C9 | S6, S8 | [Imóveis](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=63-1640); [Rendimentos](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=63-2018); [Comunicados](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=63-2368) |
| Página do ativo — ETF (BOVA11) e guias Rentabilidade, Comunicados | C2, C3, C9 | S2, S8 | [BOVA11](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=46-1759); [Rentabilidade](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=64-1698); [Comunicados](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=64-1984) |
| Página do ativo — BDR (AAPL34) e guias Dividendos, Comunicados | C2, C7, C9 | S2, S6, S8 | [AAPL34](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=46-1901); [Dividendos](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=64-2199); [Comunicados](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=64-2419) |
| Página do ativo — Renda fixa (Tesouro IPCA+ 2035) e guia Preços e taxas | I1 | S11 | [Tesouro](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=46-2006); [Preços e taxas](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=65-1777) |
| Página do ativo — Cripto (BTC) | I2 | S11 | [abrir](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=46-2124) |

Limites conhecidos do roadmap: as guias internas foram desenhadas uma vez por tipo de ativo, no ativo de referência (PETR4, HGLG11, BOVA11, AAPL34, Tesouro). Nas páginas de ITSA4 e MXRF11 só a Visão geral está desenhada, e as guias delas não navegam. Logo de ativo continua fora do escopo (D45): o `AssetAvatar` usa as letras do ticker.

## Componentes base
| Componente | Link | Variantes / propriedades | Observações |
|---|---|---|---|
| `Button` | [abrir](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=2-20) | Style = Primary, Secondary, Danger, Ghost × State = Default, Hover, Focus, Disabled; propriedade `Label` | Altura 44 px, largura pelo texto (mín. 96 px); foco = anel `color/focus/ring` 2 px por fora; Danger só em `ConfirmDialog` |
| `TextField` | [abrir](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=2-41) | State = Default, Focus, Error, Disabled; `Label`, `Value`, `Helper`, `Show helper` | Rótulo sempre visível; erro no próprio campo (borda + texto) |
| `Badge` | [abrir](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=2-52) | Tone = Neutral, Primary, Positive, Negative, Warning; `Label` | Tipo de ativo (Ação, FII, ETF, BDR) e tipo de operação (Compra = Primary, Venda = Warning) |
| `AppHeader` | [abrir](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=3-200) | Viewport = Desktop, Mobile | Navegação só com Carteiras e Ativos; menu do usuário com Sair |
| `AssetAvatar` | [abrir](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=41-1063) | Class = Ação, FII, ETF, BDR, Renda fixa, Cripto; `Letters` | Duas letras do ticker; borda `color/chart/N` da classe; 36 px; decorativo (`aria-hidden`), o ticker está ao lado (D45) |
| `PortfolioTabs` | [abrir](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=41-1110) | Set = S1 (Resumo, Histórico), Completo (+ Proventos, Metas); Active | `role=tablist`; sublinhado de 3 px na guia ativa; no S1 só o Set=S1 (D45) |

## Dependências do contrato da API
| Frame | O que precisa do backend | Tarefa do backend |
|---|---|---|
| 3, C3 | `GET /portfolios` devolve `operationCount` de cada carteira | K3 |
| 4 | `GET /portfolios/:id/positions` devolve também as posições encerradas (quantidade 0 e lucro realizado ≠ 0), com `status` OPEN/CLOSED | K4 |
| 5 (editar) | `GET /portfolios/:id/operations/:operationId` para preencher o modo editar | K4 |
| C2 | 422 da RN07/RN10 com operação infratora (id, tipo, ativo, data, corretora), posição disponível na data e quantidade vendida | K4 |
| 6 (filtro por tipo) | `GET /portfolios/:id/operations?assetType=STOCK|FII|ETF|BDR` (D45) | K4 |
| 5 (Resumo da operação) | `POST /portfolios/:id/operations/preview` (D42), com `replacesOperationId` no modo editar: `DerivedValue` de valor da operação, total com custos ou valor líquido, posição e PM antes/depois, lucro estimado na venda; `violation` com o mesmo corpo do 422 | K4 |

## Notas de implementação
- **Massa de dados dos frames** (coerente entre telas, conferida na conta): carteira Longo prazo com 9 operações; PETR4 100 a PM R$ 32,03 (custo R$ 3.203,27; lucro realizado + R$ 293,47), ITSA4 300 a R$ 9,87, BOVA11 20 a R$ 118,45, MXRF11 150 a R$ 10,12 (− R$ 12,40), WEGE3 encerrada (+ R$ 412,80); custo total R$ 10.051,27; lucro realizado total + R$ 693,87. Serve de caso de teste para o backend e para o E2E.
- **Resumo da operação (D42)**: os números do bloco ao lado do formulário vêm da prévia do backend; o front não faz conta (D5, D28). Sem campos válidos, o bloco mostra o texto de espera; com `violation`, o `BusinessRuleError` aparece antes de salvar e o botão principal fica desabilitado enquanto a violação existir. Se a prévia falhar (rede, 5xx), o botão continua habilitado e o 422 do salvamento cobre o caso; o resumo mostra "Não foi possível calcular o resumo agora".
- **Números**: pt-BR, `tabular-nums`, alinhados à direita; ganho/perda com sinal + cor.
- **Excluir carteira**: o botão Danger só habilita quando o texto digitado é igual ao nome da carteira.
- **Textos** do `DerivedValueExplainer`, do `BusinessRuleError` e dos estados vazios são provisórios: a versão final vem da tabela de microcopy (U4), indexada por `formulaCode`.

## Divergências conhecidas entre o Figma e o design system
Nenhuma.
