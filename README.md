# Carteira B3

Plataforma gratuita e sem fins lucrativos de análise e gestão de investimentos da B3 para pessoa física: consulta de dados de ações, FIIs, ETFs e BDRs a partir de fontes primárias (B3, CVM, Banco Central), rankings e valuation, e gestão da carteira (operações, posição, preço médio, proventos e IR), com a explicação de cada número.

Projeto acadêmico (UNIFESP/ICT) que atende as disciplinas de Engenharia de Software e Banco de Dados. ODS 10 (meta 10.2) e ODS 4 (meta 4.4).

## Documentação
- Contexto e decisões: `claude/contexto-projeto.md`
- Arquitetura: `claude/arquitetura.md`
- Modelo ER e mapeamento: `database/docs/`
- Plano de ação: `claude/plano-de-acao.md`
- Estrutura do repositório: `claude/estrutura-repositorio.md`

## Como rodar

### 1. Pré-requisitos
- Docker Desktop (ou Docker Engine com o plugin Compose).
- Node 24 ou mais recente.
- Portas livres: 5432 (PostgreSQL), 3000 (API) e 4200 (frontend).

### 2. Configuração
Na raiz do repositório:

```bash
cp .env.example .env    # troque "troque-esta-senha" pela mesma senha em todas as linhas em que aparece
npm install             # Prisma e scripts do banco
```

Para rodar na máquina, os outros valores do `.env.example` já servem.

### 3. Banco, migrations e API
```bash
docker compose --profile app up -d --build
docker compose --profile app ps    # migrate "Exited (0)", api "healthy", worker "Up", postgres "healthy"
```

Esse comando sobe o PostgreSQL 16 com os bancos `carteira_dev` e `carteira_test`, aplica as migrations (serviço `migrate`) e sobe a API e o worker. Teste a API em `http://localhost:3000/api/v1/health`.

- **API fora do Docker** (modo watch): rode `docker compose up -d` (só o PostgreSQL) e `npm run db:migrate`. Os demais passos estão em `backend/README.md`.
- **Para parar:** `docker compose --profile app down`. Os dados ficam no volume. Para apagar os dados, use `docker compose down -v`.

### 4. Dados de exemplo (seed)
```bash
npm run db:seed
```

O seed carrega o catálogo de referência do S1 (setores, emissores, corretoras e 72 ativos reais das 6 classes) e usuários fictícios com carteiras e operações. Pode rodar mais de uma vez sem duplicar nada. Ele roda o `psql` de dentro do contêiner `carteira-b3-db`, por isso o PostgreSQL do passo 3 precisa estar de pé.

**Catálogo completo da B3 (opcional, K5).** Os 72 ativos do seed bastam para usar o sistema. Para buscar e lançar as ações, units, FIIs, ETFs e BDRs da B3 (FII sem negócio no dia do COTAHIST fica fora), carregue o Cadastro de Instrumentos e o COTAHIST do mesmo pregão, depois do seed:
1. Baixe os dois arquivos para `data/raw/` (fora do Git) pelos endereços de `database/docs/fontes-poc.md`: `InstrumentsConsolidatedFile_AAAAMMDD.csv` em `data/raw/b3-instrumentos/` e o `COTAHIST_DDDMMAAAA.TXT` (de dentro do ZIP) do mesmo dia em `data/raw/b3-cotahist/`. Use um dia anterior a hoje: a carga só aceita o cadastro com "Status do Arquivo: Final".
2. Na raiz do repositório, com o PostgreSQL de pé (a carga usa o `DATABASE_URL` do `.env`):

   ```bash
   npm run db:generate      # Prisma Client do backend
   npm --prefix backend ci
   npm --prefix backend run ingest:catalog -- --file data/raw/b3-instrumentos/InstrumentsConsolidatedFile_AAAAMMDD.csv --cotahist data/raw/b3-cotahist/COTAHIST_DDDMMAAAA.TXT
   ```

   Troque as datas pelas dos arquivos baixados. Rodar de novo com os mesmos arquivos não muda nada. Detalhes e regras da carga em `backend/README.md`, seção "Catálogo completo da B3".

### 5. Frontend
```bash
cd frontend
npm ci
npm start               # http://localhost:4200
```

O frontend chama a API em `http://localhost:3000`. Detalhes em `frontend/README.md`.

### 6. Entrar
O seed cria um usuário de demonstração:
- **e-mail:** `demo@carteirab3.dev`
- **senha:** `demo-carteira-2026`

É uma senha só para desenvolvimento, a mesma do comentário em `database/sql/inserts.sql`.

**Pela tela:** abra `http://localhost:4200`, entre com o e-mail e a senha acima e você chega a "Suas carteiras". Para criar outro usuário, clique em "Criar conta": a conta nova já entra logada. A API aceita 5 cadastros ou logins por minuto por IP (`AUTH_RATE_LIMIT_MAX`); a partir daí a tela mostra "Muitas tentativas seguidas." e é preciso aguardar 1 minuto; a sessão fica só na memória da aba e volta sozinha ao recarregar a página, pelo cookie de refresh.

**Criar uma carteira pela tela:** em "Suas carteiras", clique em "Nova carteira", digite o nome (ex.: "Minha carteira") e clique em "Criar carteira"; ela aparece no fim da lista com "Sem operações ainda". O usuário de demonstração já tem 3 carteiras ("Longo prazo", "Dividendos" e "Testes FII"); uma conta nova começa vazia e cria a primeira carteira no próprio aviso "Você ainda não tem carteiras". Para excluir, use a lixeira do cartão e digite o nome da carteira para confirmar: as operações dela são apagadas junto.

**Ver uma carteira pela tela:** clique em "Longo prazo". A guia **Resumo** mostra custo total R$ 16.151,27, lucro realizado + R$ 693,87 e 6 ativos em carteira, com as posições agrupadas por classe (ações, ETFs, FIIs, renda fixa e cripto); em "Posições encerradas", clique em "Mostrar" para ver a WEGE3, vendida por completo. A guia **Histórico** lista as 11 operações, da mais recente para a mais antiga, com filtros por ativo, corretora e tipo de ativo (ex.: "FIIs" deixa as 2 operações de MXRF11). "Testes FII" mostra os estados de carteira sem operações.

**Consultar o catálogo pela tela:** clique em "Ativos" no topo e busque por código ou pelo nome da empresa, sem diferenciar maiúsculas nem acentos (ex.: "telefonica" encontra VIVT3, da Telefônica; "tesouro" encontra os títulos do Tesouro). O "+" no fim da linha (no celular, o botão "Lançar operação" do cartão) abre o formulário com o ativo preenchido; com mais de uma carteira, a tela pergunta em qual lançar.

**Lançar uma compra pela tela:** crie uma carteira (acima), abra-a e clique em "Lançar operação". Deixe "Compra", digite "PETR4" no campo Ativo e escolha a sugestão, escolha a corretora "XP Investimentos", mantenha a data de hoje e preencha quantidade `100`, preço `30,00` e custos `5,00`. O "Resumo da operação" (ao lado; no celular, acima do botão) mostra o que o servidor calculou antes de salvar (total com custos R$ 3.005,00; posição de PETR4 0 → 100); cada ⓘ abre o "como foi calculado". Clique em "Lançar compra" e depois em "Ver carteira": a guia Resumo mostra a PETR4 com 100 ações e preço médio R$ 30,05.

**Vender, editar e excluir pela tela:** de volta a "Lançar operação" na mesma carteira, "Venda" de 50 PETR4 a `40,00` com custos `5,00` mostra o lucro realizado estimado de + R$ 492,50 antes de salvar. Na "Longo prazo", vender 150 PETR4 mostra que a venda é maior que a posição (100) e o botão fica desabilitado: nada é salvo. Na guia Histórico, o lápis de cada linha edita a operação e a lixeira a exclui depois de confirmar; editar a compra de MXRF11 de 08/01/2026 para 40 cotas mostra o aviso e desabilita "Salvar alteração", e excluí-la é recusado, porque a venda de 22/05/2026 ficaria maior que a posição.

**Pela API:** o Swagger UI fica em `http://localhost:3000/api/docs`. Para chamar uma rota protegida, abra `POST /api/v1/auth/login`, clique em "Try it out", envie `{ "email": "demo@carteirab3.dev", "password": "demo-carteira-2026" }` (resposta 200), copie o `accessToken`, clique em "Authorize" e cole o token.

### 7. Testes
| Pacote | Onde | Comandos |
|---|---|---|
| Banco | `database/tests/` | `npm run db:test` na raiz, com o PostgreSQL de pé |
| Backend | `backend/src/**/*.spec.ts` (unitários), `backend/test/` (integração e E2E) | `backend/README.md` |
| Frontend | `frontend/src/**/*.spec.ts` (specs), `frontend/e2e/` (E2E) | `frontend/README.md` |

## Stack
PostgreSQL 16 + Prisma · NestJS (TypeScript) · Angular + Tailwind CSS · testes em `.spec.ts`.
