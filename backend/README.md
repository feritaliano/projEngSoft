# Carteira B3 — backend

API NestJS (adapter Fastify) e worker, a partir do mesmo código (D24, D52). Arquitetura: `claude/arquitetura.md`, seção 7; testes e CI: seção 9.

## Pré-requisitos
- Node 24 ou mais recente e Docker (os testes de integração e E2E sobem um PostgreSQL 16 com Testcontainers).
- Na raiz do repositório: `npm install` e `npm run db:generate` (gera o Prisma Client em `src/generated/prisma`).
- `.env` na raiz, criado a partir do `.env.example`, com `DATABASE_URL`, `CORS_ORIGIN`, `API_PORT`, `NODE_ENV`, `LOG_LEVEL` e `JWT_ACCESS_SECRET` (mais `JWT_ACCESS_TTL_SECONDS`, `REFRESH_TOKEN_TTL_DAYS` e `AUTH_RATE_LIMIT_MAX`, opcionais; o worker lê `INGESTION_DAILY_TIME`, `INGESTION_RETRY_INTERVAL_MINUTES` e `INGESTION_MAX_ATTEMPTS`, e o worker e os comandos `ingest:*` leem `RAW_DATA_DIR`, todos opcionais, seção "Cotações e índices"). Sem uma variável válida, a API e o worker não sobem.

## Comandos (dentro de `backend/`)
| Comando | O que faz |
|---|---|
| `npm install` | instala as dependências do backend |
| `npm run start:dev` | API em modo watch (`main.api.ts`); Swagger UI em `http://localhost:<API_PORT>/api/docs` fora de produção |
| `npm run start:worker:dev` | worker em modo watch (`main.worker.ts`): atualização diária de cotações e índices (K6) |
| `npm run typecheck` | confere os tipos de `src/`, dos `.spec.ts` e de `test/` (o ts-jest só transpila) |
| `npm run lint` | ESLint, incluindo a fronteira entre camadas `domain` / `application` / `infrastructure` / `presentation` |
| `npm test` / `npm run test:cov` | testes unitários (sem banco, em paralelo); com cobertura mínima de 90% de linhas |
| `npm run test:e2e` | integração e E2E com Testcontainers, em série; migrations aplicadas pelo Prisma da raiz |
| `npm run build` | compila para `dist/` |
| `npm run openapi:generate` | regenera `openapi/openapi.json`; commite o arquivo junto com toda mudança de contrato (o CI confere) |

## Docker
Na raiz: `docker compose --profile app up -d --build` sobe PostgreSQL, `migrate` (aplica as migrations existentes e termina), `api` e `worker` com a imagem de `backend/Dockerfile` (estágios `migrate`, `build` e `runtime`; contexto de build = raiz do repositório). Os serviços leem o `.env` da raiz; `DATABASE_HOST=postgres` faz o `docker/db-host-entrypoint.sh` trocar só o host do `DATABASE_URL`. Na imagem, os logs saem em JSON (o `pino-pretty` só é usado num terminal interativo). O CI constrói a imagem e testa o stack.

## Endpoints
Contrato completo, com corpos, códigos de erro e exemplos: Swagger UI em `http://localhost:<API_PORT>/api/docs` (fora de produção) e [`openapi/openapi.json`](openapi/openapi.json), versionado. Todas as rotas ficam sob `/api/v1`.

| Grupo | Rotas | Observações |
|---|---|---|
| Saúde | `GET /health` | Pública. 200 com o PostgreSQL respondendo; 503 quando não responde. |
| Autenticação (A1, A2) | `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout` | Cadastro e login são públicos, com limite por minuto e por IP (`AUTH_RATE_LIMIT_MAX`, padrão 5; no máximo 20 em produção) e devolvem o access token; o refresh token vai num cookie `httpOnly` (`refresh_token`, `Path=/api/v1/auth`), rotacionado no `refresh` (401 = entrar de novo). |
| Catálogo (C1) | `GET /assets?search=&page=&pageSize=`, `GET /assets/:ticker`, `GET /brokers` | Só leitura; dados do seed e da carga do catálogo da B3 (abaixo). |
| Carteiras (B1, RN02) | `GET /portfolios`, `GET /portfolios/:id`, `POST /portfolios`, `DELETE /portfolios/:id` | Cada carteira traz `operationCount`, `assetCount` e `lastTradeDate`; excluir apaga as operações (D41). |
| Operações (B2–B5, RN04–RN12) | `GET`, `POST /portfolios/:id/operations` (filtros `assetId`, `brokerId`, `assetType`); `GET`, `PATCH`, `DELETE /portfolios/:id/operations/:operationId`; `POST /portfolios/:id/operations/preview` | Venda acima da posição ou alteração retroativa que a deixa negativa: 422 com a operação infratora (RN07, RN10). A prévia (D42) recebe o mesmo corpo, mais `replacesOperationId` no modo editar, e nunca grava. |
| Posições e totais (B6, B7, B13) | `GET /portfolios/:id/positions`, `GET /portfolios/:id/summary` | Posições abertas e encerradas (`status`); valores derivados em `DerivedValue` (D26). Campos de mercado do S1+ (D64: patrimônio, valor de mercado, resultado não realizado, variação do dia, % da carteira, data e fonte do fechamento) opcionais no contrato, preenchidos a partir do K7. |
| Carteira com mercado (B8–B11; D64) | `GET /portfolios/totals`; `GET /portfolios/:id/allocation`, `/evolution`, `/performance` | Contrato publicado; **501 até o K7**. Patrimônio somado de todas as carteiras (cabeçalho da Lista), alocação por classe e setor, evolução patrimonial, TWR comparada com CDI, Ibovespa e IPCA. Cada carteira de `GET /portfolios` ganha, opcionais, `equity`, `marketData` e `returns` (rentabilidade total e de 12 meses dos cartões). |
| Página do ativo (C2, C3; D64) | `GET /assets/:ticker/quotes?period=`, `GET /assets/:ticker/performance?period=` | Contrato publicado; **501 até o K8**. `period` ∈ `P1M`, `P6M`, `P1Y` (padrão), `P2Y`, `P5Y`, `MAX`. Sem download nem exportação da série (D59b). |

- Fora `health`, `register`, `login`, `refresh` e `logout`, toda rota exige `Authorization: Bearer <accessToken>` (401 sem token válido). Carteira de outro usuário responde 404.
- Erros em RFC 7807 (`application/problem+json`); 400 e 409 de formulário trazem `errors[]` com `field` e `code` (D56).

## Catálogo completo da B3 (K5, D59)
Carga única, no ambiente do worker, dos emissores e ativos do mercado à vista (ações, units, FIIs, ETFs e BDRs) a partir do Cadastro de Instrumentos da B3, com o COTAHIST do mesmo dia para separar os FIIs dos outros fundos (F7). Rode, na raiz do repositório, antes ou depois do `npm run db:seed`:

```
npm --prefix backend run ingest:catalog -- --file data/raw/b3-instrumentos/InstrumentsConsolidatedFile_AAAAMMDD.csv --cotahist data/raw/b3-cotahist/COTAHIST_DDDMMAAAA.TXT
```

- Os caminhos são relativos ao diretório de onde o `npm` foi chamado (da pasta `backend`, `../data/raw/...`). Os dois arquivos ficam em `data/raw/` (fora do Git; URLs em `database/docs/fontes-poc.md`).
- Só aceita o Cadastro com "Status do Arquivo: Final" (F5) e arquivos do mesmo dia. Os arquivos vêm em Latin-1 e são lidos assim (F9).
- Upsert por chave natural, uma transação por lote de 500: emissor pelo nome (só criado, nunca alterado: CNPJ, código CVM e setor do seed ficam), ativo pelo ticker. Rodar de novo com os mesmos arquivos não muda nenhuma linha.
- Linha inválida (campos faltando, classe fora de `share_class`, ticker ou ISIN fora do formato) é registrada no log e ignorada; ativo cujo ISIN já pertence a outro ticker é pulado e registrado. O "*" depois da classe (cotação por lote de mil, ex.: `PNA*`) é a mesma classe; linhas da categoria de ações que não são ações (CEPAC, recibo de subscrição, título perpétuo e as taxas de financiamento `TAXA*`) ficam fora sem rejeição (D64).
- Fora do K5 (S2): desativar ativos que saíram do arquivo e agendamento da carga do catálogo (as cotações são do K6, abaixo). FII sem negócio no dia do COTAHIST fica fora.
- Seed e carga rodam em qualquer ordem (BD-2): o seed reaproveita o emissor que a carga criou (pelo nome), sem mudar o id, e preenche nele CNPJ, código CVM e setor; o ativo que a carga criou (pelo ticker) fica como está. `test/catalog-ingestion.e2e-spec.ts` testa as duas ordens.

## Cotações e índices (K6, D64)
Cotações diárias do mercado à vista (COTAHIST da B3) em `quotes` e CDI, IPCA (BCB SGS 12 e 433) e Ibovespa (página de índices da B3) em `index_values`, por upsert na chave natural (D27). Cada execução de cada fonte é uma linha em `ops.ingestion_runs` (fontes `B3_COTAHIST`, `B3_IBOV`, `BCB_SGS_CDI`, `BCB_SGS_IPCA`), com advisory lock por fonte: RUNNING ao começar (uma RUNNING de um worker que caiu é fechada como FAILED), e no fim SUCCEEDED (arquivo, hash e data de referência), NO_FILE (arquivo do pregão ainda não publicado ou dia sem pregão, com a data) ou FAILED (com o erro). Os comandos rodam na raiz do repositório, com o `DATABASE_URL` do `.env` e o seed já carregado (ele cria `economic_indexes`):

```
npm --prefix backend run ingest:quotes -- --file data/raw/b3-cotahist/COTAHIST_A2025.ZIP
npm --prefix backend run ingest:quotes -- --from 2026-11-13 --to 2026-11-27
npm --prefix backend run ingest:indexes -- --from 2025-01-01 --to 2025-12-31 [--ibov-file data/raw/b3-indices/IBOV_2025.csv]
```

- `--file`: COTAHIST local, anual ou diário, ZIP (lido sem descompactar em disco, com conferência de tamanho e CRC) ou TXT. É reprocesso: carrega de novo mesmo um arquivo já carregado; as linhas iguais não são regravadas.
- `--from`/`--to` (cotações): baixa o COTAHIST diário de cada dia de segunda a sexta do período para o bronze e carrega; dia sem arquivo (feriado, ainda não publicado) fica NO_FILE. Arquivo já carregado com sucesso para o mesmo dia (mesmo hash) não é carregado de novo; o arquivo de outro dia servido no lugar falha pela data do cabeçalho. É o plano B da demonstração.
- `ingest:indexes`: uma consulta ao SGS por série no período e um arquivo do Ibovespa por ano; `--ibov-file` usa um CSV já baixado (um ano só). O SGS aceita no máximo 10 anos por consulta de série diária: para um período maior, rode por partes.
- Só ativos do catálogo (STOCK, FII, ETF e BDR com ticker) recebem cotação; ticker fora do catálogo é contado e ignorado, e linha com ISIN diferente do catálogo ou preço que os CHECKs de `quotes` recusam é rejeitada (`rows_rejected`). Preço = campo ÷ 100 ÷ `FATCOT`. Nenhum ativo é desativado (S2); renda fixa e cripto continuam sem preço (S11).
- Bronze: todo arquivo baixado é gravado uma vez em `RAW_DATA_DIR/<fonte>/<ano>/<nome>_<sha256>.<ext>` (`b3-cotahist`, `b3-indices`, `bcb-sgs`; padrão `data/raw` da raiz). O CSV do Ibovespa é gravado já decodificado do base64 da resposta, como o botão "Download" da página entrega.
- Data do último fechamento para o K7 e o K8: porta `LatestCloseDate` do módulo `market-data` (consulta, sem coluna).

**Atualização diária automática (worker).** De segunda a sexta às `INGESTION_DAILY_TIME` (padrão `21:30`, horário de São Paulo; aceita de 18:00 a 23:59), o worker baixa o COTAHIST do dia, o arquivo do Ibovespa do ano (só conta como carregado se trouxer o dia; senão, NO_FILE), o CDI dos últimos 30 dias e o IPCA dos últimos 120 e carrega pelos mesmos casos de uso dos comandos. Fonte sem SUCCEEDED (NO_FILE, FAILED ou outra execução da mesma fonte em andamento) é tentada de novo a cada `INGESTION_RETRY_INTERVAL_MINUTES` (padrão 30), até `INGESTION_MAX_ATTEMPTS` tentativas no total (padrão 6: com 21:30 e 30 minutos, a última sai às 00:00; outro horário ou intervalo muda essa conta), sempre para o mesmo pregão. Num feriado de semana, as tentativas terminam em NO_FILE; a última cotação fica como está e nada derruba o worker. A execução do dia seguinte cancela as tentativas pendentes do anterior (o reprocesso cobre o que faltar). A execução diária também apaga as linhas NO_FILE e FAILED de `ops.ingestion_runs` com mais de 90 dias (as SUCCEEDED ficam: são a chave da idempotência).

Horário: o `Last-Modified` dos COTAHIST diários de 03/11 a 26/11/2026 em `https://bvmf.bmfbovespa.com.br/InstDados/SerHist/COTAHIST_DDDMMAAAA.ZIP` ficou entre 20:25 e 21:18 (horário de Brasília), conferido em 26/11/2026; 21:30 cobre o pior caso, e as novas tentativas cobrem atrasos. Feriado e fim de semana: a B3 responde 404 (conferido em 20/11 e 22/11/2026).

Uso dos dados da B3 (D59): só para usuário logado, com fonte e data visíveis; nenhum endpoint de download ou exportação de séries, nenhuma cotação em tempo real, nenhum agregador (brapi, HG Brasil).

## Dados de demonstração
`npm run db:seed` (na raiz) carrega o catálogo e usuários fictícios. Usuário `demo@carteirab3.dev`, senha `demo-carteira-2026` (só desenvolvimento), com as carteiras "Longo prazo", "Dividendos" e "Testes FII". O teste `test/seed.e2e-spec.ts` carrega o seed num banco do Testcontainers e confere essas carteiras pela API.
