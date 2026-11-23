# Roteiro de demonstração do S1 — apresentação de 09/12/2026

Tempo total: **9 min 30 s**, com 30 s de folga para os 10 min. Tudo roda na máquina, sem internet: banco, API e frontend locais.

## Antes da apresentação

**Na véspera** (cerca de 15 min), seguindo o "Como rodar" do `README.md`:
1. Banco do zero, para a carteira de demonstração estar igual ao seed (apaga os dados locais; os testes e o ensaio criam carteiras no usuário de demonstração):
   ```bash
   docker compose --profile app down -v
   docker compose --profile app up -d --build
   npm run db:seed
   ```
2. Catálogo completo (K5), com os arquivos de 30/10/2026 que já estão em `data/raw/`. O COTAHIST está só no ZIP: antes, extraia o `COTAHIST_D30102026.TXT` de `data/raw/b3-cotahist/COTAHIST_D30102026.ZIP` para `data/raw/b3-cotahist/`.
   ```bash
   npm run db:generate
   npm --prefix backend ci
   npm --prefix backend run ingest:catalog -- --file data/raw/b3-instrumentos/InstrumentsConsolidatedFile_20261030.csv --cotahist data/raw/b3-cotahist/COTAHIST_D30102026.TXT
   ```
3. Ensaio completo com cronômetro, gravando a tela (OBS ou Win + Alt + R). A gravação é o plano B. Depois do ensaio, repita os passos 1 e 2: o ensaio deixa a carteira "Apresentação" e a compra de MGLU3.

**30 min antes:**
- `docker compose --profile app ps`: migrate "Exited (0)", api "healthy", worker "Up", postgres "healthy".
- `http://localhost:3000/api/v1/health` responde 200.
- `cd frontend && npm start`, e abra `http://localhost:4200`.
- Navegador em janela anônima (sem extensões), largura ≥ 1024 px (layout desktop), zoom 125% para o projetor, tema claro.
- Deixe abertas duas abas extras: o GitHub Actions do último merge na `main` (jobs verdes) e o vídeo do ensaio.
- **Não entre no sistema antes da hora** e não fique trocando de usuário: a API aceita 5 logins por minuto por IP.

**Dados usados** (seed, `database/sql/inserts.sql`):
- Usuário de demonstração: `demo@carteirab3.dev`, senha `demo-carteira-2026`.
- "Longo prazo": 11 operações, custo total R$ 16.151,27, lucro realizado + R$ 693,87, 6 ativos abertos, WEGE3 encerrada (+ R$ 412,80).
- "Testes FII": carteira sem operações.

## Roteiro

### 1. Abertura e entrada (0:00–1:00)
- **Falar:** o problema (a pessoa física investe sem entender preço médio, lucro realizado e custo; as plataformas pagas não mostram a conta), ODS 10.2 e 4.4, e o que o sistema não faz: **não recomenda ativos**. Todo número derivado mostra "como foi calculado".
- **Clicar:** em `http://localhost:4200/entrar`, digite o e-mail e a senha de demonstração e clique em **Entrar**. Você chega a "Suas carteiras", com 3 cartões.

### 2. Carteira e "como foi calculado" (1:00–2:45)
- **Clicar:** **Nova carteira**, digite `Apresentação` e clique em **Criar carteira**. Ela aparece no fim da lista com "Sem operações ainda" (vai receber a compra da parte 5).
- **Clicar:** no cartão **Longo prazo**.
- **Mostrar:** custo total **R$ 16.151,27**, lucro realizado **+ R$ 693,87** e **6** ativos em carteira, com as posições agrupadas por classe (ações, ETFs, FIIs, renda fixa e cripto). Quantidade de cripto com 4 casas (0,0125 BTC) e de renda fixa com 2 (0,52).
- **Clicar:** "Como foi calculado" ao lado do **Lucro realizado**. O painel mostra a fórmula e cada parcela, inclusive a **WEGE3**, que não está mais na carteira. **Falar:** o lucro de um ativo vendido por completo continua no total. Feche com **Esc**.
- **Clicar:** **Mostrar** em "Posições encerradas" para exibir a WEGE3, com + R$ 412,80.
- **Clicar:** no ⓘ do preço médio da **PETR4**. **Falar:** as duas compras entram com os custos da nota; a venda não muda o preço médio. Feche com **Esc** (o foco volta ao ⓘ).

### 3. Histórico e filtros (2:45–3:30)
- **Clicar:** na guia **Histórico**. São 11 operações, da mais recente para a mais antiga.
- **Clicar:** no filtro **FIIs**, que mostra "2 de 11 operações" (MXRF11). Na **Corretora**, escolha "Rico". Clique em **Limpar filtros**.
- **Falar:** o filtro é feito no backend e vale para todas as páginas, de 50 em 50.

### 4. Prévia com violação da RN07 (3:30–5:00)
- **Clicar:** na guia **Resumo** e depois em **Lançar operação**.
- **Preencher:** **Venda**; Ativo `PETR4` (escolha a sugestão); Corretora **XP Investimentos**; data de hoje; Quantidade `150`; Preço `38,50`; Custos `4,90`.
- **Mostrar:** sem salvar nada, o "Resumo da operação" vem da prévia do servidor e mostra **"A venda é maior que a sua posição"**: 100 disponíveis, 150 na venda. A posição aparece como "100 → —" e o botão **Lançar venda** fica desabilitado.
- **Trocar:** Quantidade para `50`. A violação some e aparece o **lucro realizado estimado**. Clique no ⓘ do lucro: o painel mostra a conta com o preço médio da carteira e o aviso "Do formulário, ainda não salvo". Feche com **Esc**.
- **Clicar:** **Cancelar**. Nada foi salvo.

### 5. RN10 ao editar (5:00–6:15)
- **Clicar:** na guia **Histórico** e no lápis da compra de **MXRF11 de 08/01/2026** ("Editar operação de 08/01/2026, MXRF11").
- **Trocar:** Quantidade de `200` para `40`.
- **Mostrar:** **"Esta alteração deixaria uma venda maior que a posição"**. A venda de 22/05/2026 ficaria com 40 disponíveis e 50 vendidas, e **Salvar alteração** fica desabilitado. **Falar:** a regra vale para o passado; a edição retroativa recalcula tudo o que vem depois da data.
- **Clicar:** **Ver venda de 22/05/2026**. O Histórico abre com essa venda em destaque, e as 11 operações seguem iguais.

### 6. Catálogo com ativo fora do seed (6:15–7:45)
- **Clicar:** em **Ativos**, no topo, e busque `magazine`. Aparece a **MGLU3** (Magazine Luiza), que não está no seed: veio do Cadastro de Instrumentos da B3 pela carga do K5. **Falar:** a busca não diferencia maiúsculas nem acentos ("telefonica" acha a VIVT3).
- **Clicar:** no **+** da linha da MGLU3 ("Lançar operação de MGLU3"). Em "Em qual carteira lançar MGLU3?", escolha **Apresentação** e clique em **Continuar**.
- **Preencher:** Compra; o Ativo já vem preenchido; Corretora **XP Investimentos**; Quantidade `100`; Preço `10,00`; Custos `1,00`. O Resumo mostra total com custos R$ 1.001,00 e posição 0 → 100.
- **Clicar:** **Lançar compra** e depois **Ver carteira**. A MGLU3 aparece com 100 ações e preço médio **R$ 10,01**. **Falar:** os custos entram no preço médio.

### 7. Exclusão com confirmação (7:45–8:15)
- **Clicar:** em **Carteiras**, no topo, e na lixeira do cartão **Apresentação**. O diálogo avisa que apaga a carteira e a operação lançada nela, e o botão só habilita depois de digitar `Apresentação`. Digite o nome e clique em **Excluir carteira**.

### 8. Qualidade e encerramento (8:15–9:30)
- **Mostrar** a aba do GitHub Actions com os 4 jobs verdes (`database`, `backend`, `frontend` e `e2e`). **Falar:**
  - regras de negócio testadas no backend (Jest), com o cálculo de posição separado da API;
  - specs do frontend com Vitest e cobertura mínima de 80%;
  - E2E com Playwright contra a API e o PostgreSQL reais, sem mock: jornada completa, fluxo só com teclado e axe (WCAG 2.1 AA) em todas as telas, nos temas claro e escuro.
- **Mostrar** (opcional, 15 s): **Tab** na tela de Ativos para exibir o anel de foco.
- **Fechar:** o que vem depois do S1 (cotações, fundamentos, proventos e IR) já tem lugar na navegação e nos dados, mas só aparece quando a etapa é entregue.

## Plano B

| Falha | O que fazer | Tempo |
|---|---|---|
| A tela mostra "Sem conexão com o servidor." | `docker compose --profile app restart api`, espere `http://localhost:3000/api/v1/health` responder 200 e clique em **Tentar de novo** | 30 s |
| PostgreSQL fora do ar (a API não fica "healthy") | `docker compose --profile app up -d` e confira com `docker compose --profile app ps` | 1 min |
| Carteira de demonstração com dados diferentes (outra carteira, totais mudados) | Siga mesmo assim: fale dos valores que aparecem. Na próxima vez, repita o passo 1 da véspera | — |
| MGLU3 não aparece (a carga do K5 não foi feita) | Na parte 6, use a **RENT3** (do seed, fora das carteiras de demonstração) e diga que o catálogo completo vem da carga do K5 | — |
| "Muitas tentativas seguidas." no login | Espere 1 minuto: o limite é de 5 logins por minuto. Enquanto isso, mostre o GitHub Actions (parte 8) | 1 min |
| Volta para o Login com "Sua sessão expirou" | Entre de novo e siga de onde parou | 15 s |
| O frontend não abre | `cd frontend && npm start` num segundo terminal (cerca de 30 s); enquanto isso, mostre o Swagger em `http://localhost:3000/api/docs` | 30 s |
| Docker inteiro fora do ar ou a máquina falha | Passe o vídeo do ensaio, narrando o mesmo roteiro | — |
