# Verificação do plano de ação e da cobertura do Figma

> Feita em 12/11/2026. Lidos: `claude/plano-de-acao.md` (versão com o ajuste de 12/11), `claude/contexto-projeto.md` (seções 4, 5 e 11), os quatro perfis em `agentes/`, `claude/handoff-ux.md` e `claude/revisao-es.md`. Figma lido por script somente leitura (página "Telas — produto completo": 10 seções, 77 frames, 4.665 textos). O conteúdo visual de cada frame não foi conferido; a comparação usa os nomes dos frames e a busca de termos nos textos. Nada foi alterado no plano nem no Figma.

## Resultado
1. **O plano não está totalmente correto.** A trilha de BD está atrasada e o plano não registra: o P1 (seed) venceu em 07/11 sem o arquivo existir, e a janela do P2 termina em 14/11. Há 11 pontos a corrigir (tabela abaixo).
2. **O Figma cobre todas as telas do S1**, mas faltam 6 estados que o próprio perfil de UX lista.
3. **O Figma não cobre todas as funções do produto:** dos 47 itens do escopo (A1–I3), 30 têm tela, 1 tem só um botão e 16 não têm tela nenhuma. O contexto (seção 10) registra "Produto completo no Figma: desenhado"; isso está incorreto.

## 1. Plano de ação
| # | Gravidade | Problema | Evidência | Correção |
|---|---|---|---|---|
| P1 | Alta | **BD Parte 2 atrasada sem registro.** P1 (25/10–07/11) não tem status e o seed não existe; P2 (08–14/11), P3 (15–17/11) e P4 (18–28/11) dependem dele em cadeia. O alvo de 30/11 já consumiu 5 dos 7 dias de folga até o prazo de 07/12, e o plano diz que BD tem prioridade sobre tudo (G-P4). | `database/sql` só tem `ddl.sql` na `main` (`f2f1dd2`); tabela "BD Parte 2" do plano | Replanejar P1–P4 com datas reais e registrar o atraso; decidir se o alvo passa de 30/11 para 07/12 |
| P2 | Alta | **O P1 depende de decisões que o plano não lista como dependência.** Sem fonte de preço de cripto não há como semear `crypto_prices`; sem fonte de proventos, `income_distributions` e `received_income`; a fonte do Ibovespa também está aberta. O enunciado pede ≥ 10 tuplas em cada uma das 36 tabelas. | Contexto, seção 11: "Decidir a fonte de proventos", "Confirmar a fonte do Ibovespa", "definir a fonte primária de preço de cripto (bloqueia o seed de `crypto_prices`)"; plano, P1: "Depende de D1, P0, D3" | Incluir as três decisões como dependências do P1, com data, ou registrar a saída (ex.: consultar a professora sobre tabelas sem fonte) |
| P3 | Alta | **Não há gatilho de corte para BD.** Os gatilhos cobrem K4, W4, U3 e D3; nenhum diz o que sai se o P1 ou o P2 passar da data, embora BD seja a frente de maior prioridade. | Tabela "Gatilhos de corte" | Criar G-P1 (ex.: em 19/11, o seed entra com as tabelas que têm fonte; as demais vão ao relatório como pendência justificada) |
| P4 | Alta | **W4 concentra o frontend.** W2 tem 7 frames de estado em 4 dias; W3, 7 em 5 dias; W4, 30 frames e 3 componentes em 7 dias (4,3 frames por dia contra 1,4 a 1,75). A dependência "W4 depende de K4" é mais larga que o necessário: Catálogo (K3), Histórico (K4 PR 1) e Detalhe (K4 PR 2) já têm API na `main`; só o Resumo da operação espera o PR 3. | Figma: Login 4, Cadastro 3, Lista 7, Detalhe 5 do S1, Formulário 12, Histórico 8, Catálogo 5; plano: W4 em 26/11–02/12 | Dividir o W4: W4a (Catálogo, Histórico, Detalhe) logo depois do W3; W4b (Formulário e prévia) depois do PR 3. Antecipar W2 e W3 em 3 dias, já que o W1 terminou em 11/11 |
| P5 | Alta | **As correções da revisão não estão no plano.** São 7 prompts, 18 a 28 horas antes de 06/12, numa agenda sem folga. | `claude/prompts-correcao-s1.md`; plano: "Folga final zero" | Incluir BK-1 a FE-2 como tarefas, com as datas do documento de correção |
| P6 | Média | **Frase falsa sobre o catálogo:** "vem do seed do P1 (termina em 07/11, antes do K3)". O K3 terminou em 09/11 sem seed. | Seção "Banco do sistema" do plano | Corrigir junto com o P1 e o prompt BD-1 |
| P7 | Média | **Datas desatualizadas.** W1 aparece como 12–14/11 (concluído em 11/11); W2 em 15–18/11, embora o texto diga que pode começar em 12/11; "handoff de UX em 16/11" como alvo (concluído em 31/10); "frontend entra em 10/11" nos riscos e no perfil de UX, contra 12/11 em "Frentes ativas"; título "conferido em 11/11" com ajuste de 12/11. | Tabelas e cabeçalho do plano; `agentes/agente-ux-ui.md` | Atualizar as datas e o título |
| P8 | Média | **F2 e F3 sem status no plano.** O contexto marca o F2 como feito e o F3 como pendente, mas o repositório existe e a proteção da `main` foi confirmada em 12/11. | Plano, "Fundação"; contexto, seção 11 | Marcar os dois e fechar a pendência do contexto |
| P9 | Média | **Pendências sem tarefa:** calendário de entregas de ES (sem data nem dono); retorno da Parte 1 de BD, de que o P4 depende (sem data-limite nem alternativa); atualização do texto do problema e do ER do relatório com carteira ideal, metas, renda fixa e cripto. | Plano, "Planejamento (pendente)" e P4; contexto, seção 11 | Dar ID, data e dono a cada uma |
| P10 | Baixa | **Critério de pronto do K4 incompleto:** não cita a prévia (D42), as 6 classes (D55) nem os códigos de erro (D56), que estão na descrição da tarefa. | Linha K4 do plano | Acrescentar ao "Pronto quando" |
| P11 | Baixa | **Perfis divergentes do plano:** o de backend diz "antes do W2 (14/11)"; o de banco traz "Situação em 24/10/2026" como atual; o de UX lista 3 variantes do `DerivedValueExplainer`, e a microcopy tem 9 códigos. | `agentes/agente-backend.md`, `agente-banco-de-dados.md`, `agente-ux-ui.md` | Atualizar os perfis na mesma tarefa do plano |

Sem erro encontrado: escopo do S1 igual ao do contexto (D49, D55); dependências de K0–K4 e W1–W3; ordem das etapas depois de 06/12; gatilhos G-K4 e G-W4 coerentes com as datas.

## 2. Figma — telas do S1
As 7 telas, o shell e os componentes existem: 48 frames de estado do S1, mais 3 de prévia do tema escuro. O cabeçalho de todos os frames só tem "Carteiras" e "Ativos", como o D41 exige.

Estados que o perfil de UX lista (tabela "Telas do S1") e que não têm frame:

| Tela | Estado sem frame | Observação |
|---|---|---|
| 3 Lista de carteiras | erro | — |
| 4 Detalhe da carteira | erro | — |
| 6 Histórico | carregando, erro | — |
| 7 Catálogo | carregando, erro | — |

Outras lacunas do S1:
- **Resumo da operação:** os estados "Calculando" e "Prévia indisponível" estão descritos no handoff, sem frame.
- **`BusinessRuleError` RN10:** há frame para editar e para excluir; as origens "lançar operação retroativa" e "trocar o ativo" só existem como texto na microcopy.
- **`DerivedValueExplainer`:** variantes para 3 dos 9 `formulaCode` do S1 (já apontado na matriz).
- **Login e Cadastro:** sem frame mobile; o handoff diz que usam o mesmo cartão em coluna única.

O frontend é obrigado a tratar carregando, erro, vazio e sucesso em toda tela com dados e não pode implementar estado sem link de frame. Sem esses 6 frames, o W3 e o W4 param ou improvisam.

## 3. Figma — funções do produto completo
| Bloco | Itens | Com tela | Sem tela |
|---|---|---|---|
| A. Conta | A1–A2 | A1, A2 | — |
| B. Carteira | B1–B13 | B1–B11, B13 | **B12** importação da planilha da B3 |
| C. Dados dos ativos | C1–C10 | C1–C9 | **C10** comparador |
| D. Rankings e valuation | D1–D4 | — | **D1–D4** (nenhuma ocorrência de "Ranking", "Graham", "Bazin" ou "Checklist") |
| E. Proventos e eventos | E1–E4 | E2, E3, E4 | **E1** eventos corporativos (nenhuma ocorrência de desdobramento, grupamento ou bonificação) |
| F. Imposto de renda | F1–F3 | — | **F1–F3** (nenhuma ocorrência de "DARF" ou "Imposto") |
| G. Acompanhamento | G1–G4 | G3, G4 | **G2** alerta de preço; **G1** tem só o botão "Observar" na página do ativo, sem a tela da lista |
| H. Calculadoras | H1–H4 | — | **H1–H4** |
| I. Renda fixa e cripto | I1–I3 | I1, I2 | **I3** IR dessas classes |

Total: 30 com tela, 1 parcial (G1), 16 sem tela.

Por etapa, na ordem aprovada (D49):
- **S2:** E1 sem tela. O registro é por seed ou rota administrativa (D29), mas nenhum frame mostra o evento ao usuário (por exemplo, no Histórico ou no "como foi calculado").
- **S6:** coberta.
- **S9:** falta B12 (envio do arquivo, pré-visualização com linhas rejeitadas, confirmação).
- **S10:** faltam a tela da lista de observação (G1) e os alertas (G2).
- **S3:** coberta pela página do ativo.
- **S4, S5 e S7:** nenhuma tela (ranking, valuation, comparador, calculadoras, IR).
- **S11:** falta I3.
- **Navegação:** os frames do produto completo também só têm "Carteiras" e "Ativos". Não há onde entrar Rankings, Calculadoras, IR e Observação; o perfil de UX pede lugar previsto "sem redesenho".

## Prompts de correção
### Para o chat do projeto (plano)
```
Tarefa: corrigir claude/plano-de-acao.md com base em claude/verificacao-plano-figma.md, itens P1 a P11.
1. Replaneje P1–P4 com datas reais a partir de hoje, registre o atraso do P1 e proponha o gatilho G-P1 (P1, P3).
2. Liste como dependências do P1 as fontes de cripto, proventos e Ibovespa, com data de decisão; para cada uma, diga o que entra no seed se a decisão não sair (P2).
3. Divida o W4 em W4a (Catálogo, Histórico, Detalhe) e W4b (Formulário e prévia) e antecipe W2 e W3 (P4).
4. Inclua as tarefas BK-1, BK-2, BK-3, BD-1, FE-1 e FE-2 de claude/prompts-correcao-s1.md (P5).
5. Corrija datas, status de F2 e F3, a frase do catálogo e o critério do K4; dê ID, data e dono às pendências sem tarefa (P6–P10).
6. Atualize os quatro perfis em agentes/, o checklist interativo e a seção 11 do contexto na mesma tarefa (P11).
Apresente o plano revisto para aprovação antes de gravar. Não mude escopo nem a ordem das etapas.
```

### Para o agente de UX/UI (Figma)
```
Agente: UX/UI. Tarefa nova U7: lacunas do Figma apontadas em claude/verificacao-plano-figma.md, seções 2 e 3.
Parte A (S1, antes do W3 em 19/11):
1. Frames de estado que faltam: Lista — erro; Detalhe — erro; Histórico — carregando e erro; Catálogo — carregando e erro. Se a decisão for usar só a falha de conexão do shell, registre isso no handoff e tire "erro" da tabela de telas do seu perfil.
2. Resumo da operação: frames "Calculando" e "Prévia indisponível".
3. BusinessRuleError RN10: variantes para "lançar operação retroativa" e "trocar o ativo".
4. DerivedValueExplainer: variantes dos 6 formulaCode que faltam (totais e resumo da operação).
5. Inclua os links em claude/handoff-ux.md e confira o protótipo.
Parte B (produto completo, fora do handoff do S1; uma etapa por vez, na ordem do D49):
6. Navegação do produto completo com lugar para Rankings, Calculadoras, IR e Observação, sem mudar a do S1.
7. S2: como o evento corporativo (E1) aparece para o usuário.
8. S9: importação da planilha (B12). S10: lista de observação (G1) e alertas (G2).
9. S4: ranking, valuation e comparador (D1–D4, C10). S5: calculadoras (H1–H4). S7: IR (F1–F3), só com as regras do P0. S11: I3, depois de validado na legislação.
10. Todo dado novo de tela que não esteja no ER vira linha na tabela D47 do agente de banco.
Pronto quando: cada estado da tabela de telas do S1 tem frame com link no handoff; cada item do escopo (A1–I3) tem ao menos um frame ou um registro de por que não tem tela.
Não faça: mostrar no S1 o que não funciona; linguagem de recomendação de ativo.
Prazo: parte A até 18/11; parte B acompanha a etapa (sem data neste semestre).
```

### Para o chat do projeto (contexto)
Corrigir a linha "Produto completo no Figma" da seção 10 do contexto: 30 de 47 itens com tela; listar os 16 sem tela como pendência de UX.
