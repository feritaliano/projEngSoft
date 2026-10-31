# Handoff UX/UI → Frontend — Carteira B3

> Criado em 26/10/2026 (D38) como modelo; frames do S1 definidos no U0 (D41); **links preenchidos em 30/10/2026** com as telas de alta fidelidade (U2/U3). Textos do "como foi calculado" em `claude/microcopy.md` (U4, 31/10); demais textos são os dos frames (U3 aprovado em 31/10); revisão Nielsen/WCAG feita no U5 (31/10, seção "Especificação de handoff"). O agente de frontend lê cada frame no Figma pelo link desta tabela, com o plugin Figma do Claude Code. Frame sem link aqui não é implementado.

## Arquivo Figma
- Arquivo: https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo (time educacional **ProjetosUnifesp**, plano Education)
- Páginas (D46): **Telas — produto completo** (uma faixa por tela, um frame por estado; à esquerda do traço vertical, o S1; à direita, as próximas etapas; faixa 8 = página do ativo), **Componentes** (conjuntos de variantes), **Fundamentos** ([documentação dos tokens](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=23-875)).
- Variáveis: coleção `Color` (modos **Light** e **Dark**), `Spacing` e `Radius`, com os mesmos nomes dos tokens do `tailwind.config`. Tabela completa: `claude/design-tokens.md`.
- Protótipo (D46): um só, na página Telas — 71 frames, 314 ligações (revisadas em 31/10, nenhuma quebrada). Pontos de partida do S1: "Fluxo S1: cadastro → carteira → compra → venda → posição", "login → carteiras" e "catálogo → lançar operação". Pontos de partida das próximas etapas: "Carteiras: lista → detalhe → guias", "Produto completo: catálogo de ativos" e "página do ativo". Frames de estado (erro, carregando, mobile, tema escuro) são para inspeção e não são alcançados por clique.
- **Próximas etapas (não implementar no S1):** frames à direita do traço vertical de cada faixa e a faixa 8 inteira (D45, D46). Lista na seção "Roadmap" abaixo. **Só se implementa frame com link na tabela "Frames do S1".**
- Prévia do tema escuro (Lista e Detalhe já na versão única, D48): [seção Tema escuro](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=23-1177) (Lista, Detalhe e Formulário no modo Dark).

## Frames do S1
Tela = rota própria. Componente = um único frame (conjunto de variantes) reutilizado pelas telas, implementado uma vez em `shared/`. Shell = layout global (`core/`). Desktop 1440 px (conteúdo 1120 px); mobile 390 px.

| # | Frame | Tipo | Itens do produto | Seção / componente no Figma | Estados (links) | Componentes do design system | Tarefa do frontend |
|---|---|---|---|---|---|---|---|
| 1 | Login | Tela | A2 | [abrir](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=5-42) | [padrão](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=5-43); [credencial inválida](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=5-69); [sessão expirada](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=5-98); [carregando](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=5-127) | TextField, Button, banner | W2 |
| 2 | Cadastro | Tela | A1 | [abrir](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=5-153) | [padrão](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=5-154); [erro de campo](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=5-185); [carregando](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=5-216) | TextField, Button | W2 |
| 3 | Lista de carteiras (versão única, D48) | Tela | B1 (S1); B8, B10 ocultos até S2/S9 | [abrir](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=6-77) | [com dados](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=47-1470); [vazio](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=6-78); [criar, nome duplicado](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=86-1869); [confirmação de exclusão](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=86-1943); [carregando](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=6-288); [mobile](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=95-1858) | AppHeader, Button, TextField, ConfirmDialog | W3 |
| 4 | Detalhe da carteira (versão única, D48) | Tela | B6, B7, B13 (S1); demais ocultos até a etapa | [abrir](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=7-188) | [Resumo, com dados](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=44-1178); [encerradas + como foi calculado](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=87-1881); [vazio](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=87-2387); [mobile](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=88-2026); [carregando](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=87-2819) | AppHeader, Button, Badge, DerivedValueExplainer, PortfolioTabs, AssetAvatar | W4 |
| 5 | Formulário de operação | Tela | B2, B3, B4, C1 | [abrir](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=17-288) | [criar, busca de ativo](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=17-289); [compra preenchida, resumo](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=27-1086); [venda, lucro estimado](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=27-1218); [erro de campo](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=17-382); [rejeição RN07](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=17-457); [editar, rejeição RN10](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=17-549); [sucesso](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=17-644); [mobile](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=17-725) | TextField, Button, Badge, BusinessRuleError, Resumo da operação (D42) | W4 |
| 6 | Histórico de operações | Guia do Detalhe (D45) | B4, B5 | [abrir](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=19-547) | [com dados](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=19-548); [filtrado por tipo (FIIs)](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=43-1231); [filtro sem resultado](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=19-776); [confirmação de exclusão](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=19-822); [rejeição RN10](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=19-1061); [mobile](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=19-1307) | TextField, Button, Badge, ConfirmDialog, BusinessRuleError, PortfolioTabs, AssetAvatar | W4 |
| 7 | Catálogo de ativos | Tela | C1 | [abrir](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=20-706) | [inicial](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=20-707); [com resultado](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=20-875); [sem resultado](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=20-968); [escolher carteira](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=20-1008); [mobile](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=20-1125) | TextField, Button, Badge | W4 |
| C1 | `DerivedValueExplainer` | Componente | B13 | [abrir](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=3-112) | variantes `Formula` = AVG_PRICE_BUY, TOTAL_COST, REALIZED_PROFIT (no conjunto) | — | W4 |
| C2 | `BusinessRuleError` | Componente | B3, B4 | [abrir](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=3-148) | variantes `Rule` = RN07, RN10 (no conjunto) | — | W4 |
| C3 | `ConfirmDialog` | Componente | B1, B4 | [abrir](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=3-178) | variantes `Type` = Excluir carteira, Editar operação, Excluir operação (no conjunto) | Button, TextField | W3, W4 |
| L | Layout e navegação | Shell | — | [abrir](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=21-818) | [404](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=21-819); [falha de conexão](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=21-840); [menu mobile aberto](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=21-867); [menu do usuário (desktop)](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=21-890) | AppHeader | W1 |

**O que aparece no S1 nas telas 3 e 4 (D48).** Há uma versão só de cada tela; o S1 implementa esse layout mostrando só o que tem dado no S1, sem "em breve" (D41):
- **Lista (3):** nome da carteira, ativos e operações, ações Nova carteira, Excluir e Abrir carteira. Ocultos até a etapa: "Patrimônio somado" e a coluna Patrimônio (S2), Rentabilidade total e de 12 meses (S9).
- **Detalhe (4):** guias Resumo e Histórico; indicadores Custo total, Lucro realizado e Ativos em carteira; tabela "Posições por classe" com Ativo, Quantidade, Preço médio, Custo total e Lucro realizado, agrupada por classe; Posições encerradas; botão Lançar operação. Ocultos até a etapa: Rentabilidade total e de 12 meses (S9); gráficos de patrimônio e de rentabilidade (S2, S9); alocação por classe e marcador da carteira ideal (S2, S10); colunas Valor de mercado, Variação sobre o PM e % da carteira (S2); guias Proventos (S6) e Metas (S10); botão Carteira ideal (S10).
- A grade dos indicadores e da tabela se ajusta às colunas visíveis; a ordem das colunas é a do frame.

## Especificação de handoff (U5, 31/10/2026)
Revisão de acessibilidade (WCAG 2.1 AA) e de usabilidade (heurísticas de Nielsen) feita sobre as 50 telas do S1, temas claro e escuro. Tokens em `claude/design-tokens.md`; textos do "como foi calculado" em `claude/microcopy.md`. Esta seção vale para todas as telas do S1; o que estiver só no frame segue o frame.

### Resultado da revisão
| Item | Resultado | O que o frontend faz |
|---|---|---|
| Contraste de texto (1.4.3) | 2.861 textos medidos; todos passam (pior par 5,39:1 claro e 5,62:1 escuro). Os 8 alertas são botões desabilitados ou carregando, que a WCAG dispensa | Usar só os tokens de cor; nunca opacidade sobre texto, exceto no estado desabilitado do `Button` |
| Contraste de componentes (1.4.11) | Borda de campo 3,79:1 / 3,71:1; anel de foco ≥ 4,81:1; sublinhado da guia ≥ 7:1 | — |
| Cor como única informação (1.4.1) | Ganho e perda sempre com sinal (+ / −); tipo de operação e classe com texto; avatar decorativo | Manter o sinal; `AssetAvatar` com `aria-hidden="true"` |
| Reflow e zoom (1.4.10, 1.4.4) | Faltava a Lista mobile: **criada** ([abrir](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=95-1858)). Login e Cadastro usam o mesmo cartão em coluna única | Abaixo de 768 px, layout dos frames mobile; funciona a 320 px e com zoom de 200% sem rolagem horizontal da página (só tabelas largas rolam dentro do cartão) |
| Foco visível (2.4.7) | `Button` e `TextField` têm estado Focus; links de texto, chips, guias e linhas clicáveis não tinham estado desenhado | Todo elemento focável usa `outline: 2px solid color/focus/ring; outline-offset: 2px` em `:focus-visible` |
| Área de toque | Links de texto com 20 px de altura (Editar, Excluir, Mostrar, Como foi calculado, breadcrumb) | Área clicável mínima de 24 × 24 px no desktop e 44 × 44 px no mobile, por padding, sem mudar o visual |
| Heurísticas de Nielsen | Estado do sistema (data dos dados, carregando, "nada foi salvo ainda"), prevenção de erro (prévia, RN07 antes de salvar, nome digitado para excluir), recuperação (RN10 aponta a operação) e ajuda ("como foi calculado") atendidos. Ponto de atenção: "Excluir" ao lado de "Abrir carteira" — aceito, porque a exclusão exige digitar o nome | — |

### Layout e pontos de quebra
| Largura | Layout |
|---|---|
| ≥ 1024 px | Frames desktop: conteúdo com 1120 px de largura máxima, centralizado; `AppHeader` Desktop |
| 768–1023 px | Conteúdo fluido com margens `spacing/8`; indicadores quebram em 2 ou 3 colunas; tabelas rolam na horizontal dentro do cartão, com a coluna Ativo fixa |
| < 768 px | Frames mobile (390 px de referência, margens `spacing/4`): cartões empilhados no lugar de tabelas; botões principais em largura total; `AppHeader` Mobile com menu |

### Componentes: estados, teclado e leitor de tela
| Componente | Estados | Teclado | Leitor de tela / ARIA |
|---|---|---|---|
| `Button` | Default, Hover (`primary/hover`), Focus, Disabled, Carregando (texto do frame, ex.: "Entrando…") | Enter e Espaço | Carregando: `disabled` + `aria-busy="true"`; botão só com ícone tem `aria-label` |
| Link de texto (Editar, Excluir, Mostrar, Ver carteira) | Default, Hover (sublinhado), Focus | Enter | É `<button>` quando age na mesma tela e `<a>` quando navega; "Excluir" e "Editar" de linha levam o alvo no nome: `aria-label="Excluir operação de 22/05/2026, MXRF11"` |
| `TextField` | Default, Focus, Error, Disabled | Tab entre campos na ordem visual | `<label for>` sempre visível; ajuda e erro em `aria-describedby`; erro com `aria-invalid="true"`. O erro aparece ao sair do campo ou ao enviar, nunca a cada tecla; ao enviar com erro, o foco vai para o primeiro campo inválido |
| `AppHeader` | Item ativo | Tab | `<header>` + `<nav aria-label="Principal">`; item ativo com `aria-current="page"`; primeiro foco da página é o link "Ir para o conteúdo" (oculto até receber foco) |
| `PortfolioTabs` | Ativa, Hover, Focus | Tab entre guias | Ver "Componentes base": `<nav>` com links e `aria-current` |
| Chips de filtro (Histórico) | Selecionado, Não selecionado, Focus | Tab e Espaço | Grupo `role="group"` com `aria-label="Tipo de ativo"`; cada chip `<button aria-pressed>`; a lista atualizada anuncia "{n} operações" num `aria-live="polite"` |
| Tabelas (posições, histórico) | Linha hover (`primary/subtle`), linha focada | Tab vai ao link do ticker e às ações da linha | `<table>` com `<caption>` visualmente oculto e `<th scope>`; a linha de classe (Ações, FIIs…) é `<th scope="rowgroup">`; números alinhados à direita com `font-variant-numeric: tabular-nums`; a linha não é clicável inteira sem ter um link real dentro |
| `DerivedValueExplainer` (C1) | Aberto, Fechado | Abre com Enter no ⓘ; Esc fecha; Tab circula dentro do painel enquanto aberto | Botão ⓘ com `aria-label` da microcopy, `aria-expanded` e `aria-controls`; painel `role="dialog"` com `aria-labelledby` no título; ao abrir, foco no título; ao fechar, volta ao ⓘ. No mobile vira painel de baixo em tela cheia |
| `BusinessRuleError` (C2) | RN07, RN10 | O link "Ver venda de …" é focável | Após salvar (422): `role="alert"`. Na prévia (D42): `aria-live="polite"`, para não interromper a digitação |
| `ConfirmDialog` (C3) | Excluir carteira, Editar operação, Excluir operação | Foco preso no diálogo; Esc = Cancelar; Enter não confirma exclusão | `role="alertdialog"`, `aria-modal="true"`, título em `aria-labelledby`, texto em `aria-describedby`. Foco inicial: no campo do nome (excluir carteira) ou em "Cancelar" (demais). "Excluir carteira" só habilita quando o texto digitado é igual ao nome (sem diferenciar espaços nas pontas). Ao fechar, o foco volta ao botão que abriu |
| Resumo da operação (D42) | Esperando, Calculando, Com valores, Prévia indisponível | — | Bloco com `aria-live="polite"`; anuncia só quando os valores mudam, após o atraso de 300 ms |
| Skeleton (carregando) | — | — | Região com `aria-busy="true"` e texto oculto "Carregando…"; mostrar o skeleton só se a resposta passar de 300 ms |

### Comportamento e movimento
| Elemento | Gatilho | Comportamento | Duração |
|---|---|---|---|
| Hover de botão e linha | Ponteiro | Troca de cor pelos tokens | 150 ms, ease-out |
| `DerivedValueExplainer` | Clique no ⓘ | Entra deslizando da direita (desktop) ou de baixo (mobile) | 200 ms, ease-out |
| `ConfirmDialog` | Abrir | Fundo `overlay/scrim` 55% e diálogo com fade | 150 ms |
| Posições encerradas | Mostrar / Recolher | Expande no lugar; o botão troca o texto e tem `aria-expanded` | 150 ms |
| Todos | `prefers-reduced-motion: reduce` | Sem deslocamento; só troca de opacidade | — |

### Conteúdo e casos de borda
- **Formatos pt-BR:** dinheiro "R$ 1.234,56"; perda com o sinal de menos tipográfico ("− R$ 12,40", U+2212) e ganho com "+"; datas dd/mm/aaaa; quantidade sem casas no S1; percentuais com 1 casa nos indicadores e 2 nos totais, como nos frames.
- **Textos longos:** nome de carteira até 2 linhas e depois reticências, com o nome completo no atributo `title`; nome do emissor em 1 linha com reticências; ticker nunca é cortado.
- **Volume:** lista de carteiras sem paginação no S1; Histórico com 50 operações por página e "Carregar mais"; o filtro vale para todas as páginas (o backend filtra).
- **Rede lenta ou falha:** skeleton após 300 ms; depois de 10 s sem resposta, o estado "falha de conexão" do shell com "Tentar de novo"; 401 leva ao Login com o aviso de sessão expirada.
- **Dados vazios:** estados vazios dos frames (Lista, Detalhe, Histórico com filtro sem resultado, Catálogo sem resultado).
- **Elementos de etapas futuras:** ficam fora do DOM no S1 (D48), não apenas ocultos com CSS.

### Testes de acessibilidade (para o frontend)
- Specs (Vitest): cada componente compartilhado testa nome acessível, estados `aria-*` e teclado (Esc no painel e no diálogo, foco que volta ao gatilho).
- E2E (R1, `@playwright/test`): passar `@axe-core/playwright` nas telas do S1 nos temas claro e escuro, sem violação de nível sério ou crítico; e percorrer o fluxo principal só com teclado.

## Roadmap (referência; não implementar no S1)
Desenho do produto completo para banco, backend e frontend consultarem desde já (D46; os requisitos de dados que ele gera estão no D47 e em `agentes/agente-banco-de-dados.md`): contratos e componentes do S1 não devem fechar o caminho para estes frames. Cada etapa só entra no handoff quando for planejada; até lá, estes frames não têm estados de erro e carregamento nem contrato de API fechados. Dados ilustrativos, coerentes entre frames.

| Frame | Itens do produto | Etapa | Link |
|---|---|---|---|
| Lista de carteiras — patrimônio e rentabilidade (mesmo frame da tela 3, D48) | B8, B10 | S2, S9 | [abrir](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=47-1470) |
| Catálogo de ativos completo (abre a página do ativo) | C1, C2 | S2, S11 | [abrir](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=47-1536) |
| Detalhe — Resumo com gráficos, rentabilidade, alocação × carteira ideal (mesmo frame da tela 4, D48) | B8–B11, G3 | S2, S9, S10 | [abrir](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=44-1178) |
| Detalhe — Histórico completo | B4, B5 | S1 + classes do S11 | [abrir](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=45-1212) |
| Detalhe — Proventos (mensal, recebidos e a receber) | E3, E4 | S6 | [abrir](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=45-1531) |
| Detalhe — Metas; nova meta | G4 | S10 | [metas](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=45-1714); [nova meta](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=45-1796) |
| Carteira ideal — editar; soma diferente de 100% | G3 | S10 | [editar](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=45-1903); [erro](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=45-2022) |
| Página do ativo — Ação (PETR4, ITSA4) | C2, C4 | S2, S3 | [PETR4](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=46-1370); [ITSA4](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=60-1525) |
| Ação — guias Indicadores, Demonstrações, Dividendos, Comunicados | C5, C6, C7, C9 | S3, S6, S8 | [Indicadores](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=61-1560); [Demonstrações](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=61-1948); [Dividendos](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=62-1593); [Comunicados](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=62-1919) |
| Página do ativo — FII com imóveis (HGLG11) e sem imóveis declarados (MXRF11); sem segmento do fundo, que não tem fonte (D50) | C8 | S8 | [HGLG11](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=46-1556); [MXRF11](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=60-1738) |
| FII — guias Imóveis e vacância, Rendimentos, Comunicados | C7, C8, C9 | S6, S8 | [Imóveis](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=63-1640); [Rendimentos](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=63-2018); [Comunicados](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=63-2368) |
| Página do ativo — ETF (BOVA11) e guias Rentabilidade (comparada com Ibovespa e CDI; sem índice de referência nem taxa de administração, D50), Comunicados | C2, C3, C9 | S2, S8 | [BOVA11](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=46-1759); [Rentabilidade](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=64-1698); [Comunicados](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=64-1984) |
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
| `PortfolioTabs` | [abrir](https://www.figma.com/design/71YUqOEoUNi1HIPcLZd0qo?node-id=41-1110) | Set = S1 (Resumo, Histórico), Completo (+ Proventos, Metas); Active | navegação entre rotas: `<nav aria-label="Seções da carteira">` com links e `aria-current="page"` na guia ativa (U5; não usar `role=tablist`, que é para painéis na mesma página); sublinhado de 3 px na guia ativa; no S1 só Resumo e Histórico aparecem (D45, D48) |

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
- **Massa das telas 3 e 4 (D48):** a Lista e o Detalhe usam a massa do produto completo — Longo prazo com 11 operações e 6 ativos abertos (PETR4, ITSA4, BOVA11, MXRF11, Tesouro IPCA+ 2035 0,52 a R$ 3.846,15, BTC 0,0125 a R$ 328.000,00) e WEGE3 encerrada; custo total R$ 16.151,27; lucro realizado + R$ 693,87 (+ R$ 281,07 nas abertas). O caso de teste do S1 continua sendo a massa de 9 operações acima, que é a mesma carteira sem renda fixa e cripto.
- **Resumo da operação (D42)**: os números do bloco ao lado do formulário vêm da prévia do backend; o front não faz conta (D5, D28). Sem campos válidos, o bloco mostra o texto de espera; com `violation`, o `BusinessRuleError` aparece antes de salvar e o botão principal fica desabilitado enquanto a violação existir. Se a prévia falhar (rede, 5xx), o botão continua habilitado e o 422 do salvamento cobre o caso; o resumo mostra "Não foi possível calcular o resumo agora".
- **Números**: pt-BR, `tabular-nums`, alinhados à direita; ganho/perda com sinal + cor.
- **Excluir carteira**: o botão Danger só habilita quando o texto digitado é igual ao nome da carteira.
- **Textos** do `DerivedValueExplainer`, do `BusinessRuleError` e dos estados vazios são provisórios: a versão final vem da tabela de microcopy (U4), indexada por `formulaCode`.

## Divergências conhecidas entre o Figma e o design system
Nenhuma.
