# Carteira B3 — instruções para o Claude Code

Plataforma gratuita e sem fins lucrativos de análise e gestão de investimentos da B3 para pessoa física. Um único sistema atende duas disciplinas da UNIFESP/ICT: **Engenharia de Software** (aplicação completa com testes) e **Banco de Dados** (Profa. Daniela Leal Musa; Parte 2 até 07/12/2026).

## Leia antes de qualquer tarefa
Ordem de precedência em caso de conflito:
1. `claude/contexto-projeto.md` — documento-mestre: escopo, decisões D1–D56 (D54 reservada ao backend, K4), esquema relacional, pendências.
2. `claude/arquitetura.md` — arquitetura de dados e da aplicação.
3. `database/docs/modelo-er.md` — modelo ER (34 entidades, 39 relacionamentos + 1 especialização, 36 tabelas), revisto na tarefa D3 (D50).
4. Prompts dos agentes em `agentes/` (espelhados em `.claude/agents/`).

Onde cada arquivo fica, o que é gerado e o que vai para o Git: `claude/estrutura-repositorio.md`. Arquivo novo segue essa estrutura; mudança nela só com registro no contexto (D37).

Tarefas, datas, dependências e critérios de pronto: `claude/plano-de-acao.md`. Git, PR, testes e definição de pronto: `claude/convencoes-equipe.md`.

## Pesquisa no código: grafo do Graphify (D53)
O grafo do projeto fica em `graphify-out/` (gerado, fora do Git): `graph.json` (grafo completo), `GRAPH_REPORT.md` (comunidades e nós centrais) e `graph.html` (visualização no navegador). Cobre o código (TypeScript, SQL das migrations e de `database/`, JSON e YAML de configuração), extraído por AST e sem LLM; os `.md` ficam fora (`--code-only`). Arquivos excluídos: `.gitignore` + `.graphifyignore`.
- Em pergunta sobre o código (onde está, quem chama, o que depende de quê), consulte o grafo **antes** de Grep, Glob ou leitura de arquivo-fonte, e leia só as linhas que ele apontar:
  - `graphify query "<pergunta>"`: subgrafo da pergunta, limitado a 2000 tokens (`--budget N` muda o limite).
  - `graphify explain "<símbolo>"`: o símbolo e seus vizinhos.
  - `graphify path "<A>" "<B>"`: como dois símbolos se ligam.
  - `graphify affected "<símbolo>"`: o que é afetado se ele mudar.
- Repasse esta regra no prompt de todo subagente que for explorar código.
- `GRAPH_REPORT.md` só para visão geral da arquitetura.
- Grep e leitura direta continuam certos para texto literal, documentos `.md`, configuração que o grafo não indexa e quando o grafo estiver desatualizado.
- Hooks opcionais, por máquina: `graphify hook-guard read|search|compact` no `.claude/settings.local.json` (`PreToolUse` em `Read|Glob` e `Bash|Grep`, `SessionStart` em `compact`), com o caminho absoluto do executável. Nunca no `settings.json` compartilhado. Sem o grafo, o hook não bloqueia nada.
- Sem `graphify` no PATH ou sem `graphify-out/graph.json`: instale com `uv tool install "graphifyy[sql]"` (Python 3.10 a 3.13; o 3.15 não instala) e gere com os comandos abaixo, ou siga com grep.

**Avaliação depois de mudança grande.** Ao concluir uma mudança grande, avalie se o grafo precisa ser atualizado e diga na resposta o que decidiu.
- É mudança grande:
  - criar, remover, renomear ou mover arquivo de código ou módulo;
  - mudar símbolo exportado, classe, DTO, rota ou dependência entre módulos;
  - migration nova;
  - merge, rebase ou pull que traga código.
- Não é: só `.md`, ajuste dentro de uma função, teste sem símbolo novo, formatação.
- Para conferir, compare o commit de origem do grafo ("Built from commit" no `GRAPH_REPORT.md`) com `git rev-parse HEAD`; `git diff --stat <commit>` mostra o que mudou desde então (inclua o que ainda não foi commitado).
- Atualizar (AST, sem LLM, segundos): `GRAPHIFY_BACKEND=none graphify update .`. Se o código diminuiu e o comando recusar gravar um grafo com menos nós, acrescente `--force`.
- Comunidades novas ficam como "Community N". Renomeie só quando muitas mudarem: `graphify label . --missing-only --backend=claude-cli`. Usa a assinatura do Claude; a geração completa gastou ~55 mil tokens de entrada.
- Recriar do zero: `GRAPHIFY_BACKEND=none graphify extract . --code-only` e depois `graphify cluster-only . --backend=claude-cli`.

## Agentes (subagentes em `.claude/agents/`)
| Agente | Arquivo | Quando usar |
|---|---|---|
| `database` | `.claude/agents/database.md` | `schema.prisma`, migrations, seed, SQL, Docker do PostgreSQL, tudo em `database/` e os entregáveis de BD |
| `backend` | `.claude/agents/backend.md` | API NestJS (`backend/`), regras de negócio, testes Jest |
| `frontend` | `.claude/agents/frontend.md` | Angular + Tailwind (`frontend/`), specs |

O agente de UX/UI roda no chat do projeto no claude.ai (Figma), não aqui.
O conteúdo de `.claude/agents/*.md` é o mesmo de `agentes/*.md`; ao alterar um, altere o outro na mesma tarefa.

## Skills (D57)
- Em toda tarefa de código (escrever, corrigir, refatorar, revisar), aplique as skills `ponytail` (nível full) e `karpathy-guidelines`, de `.claude/skills/`.
- A escolha das demais skills segue o `using-superpowers`, do plugin `superpowers` ativado no `.claude/settings.json`.
- Em conflito, prevalecem este arquivo, `claude/contexto-projeto.md` e os prompts dos agentes. Exemplos: responder em pt-BR, a regra de delegação e os comandos que pedem confirmação.
- Antes de instalar qualquer skill ou plugin novo, rode o `skill-inspector` (CLI: `uv tool install git+https://github.com/NVIDIA/skillspector.git`; no Windows, `skillspector scan <pasta> --no-llm --format json > relatorio.json`, sem `--output`). Só instale com veredito APPROVE.
- Repasse esta seção no prompt de todo subagente que for escrever ou revisar código.

## Ambiente local
- PostgreSQL 16 via Docker: `docker compose up -d` (serviço `postgres`, contêiner `carteira-b3-db`, porta 5432).
- Backend no Docker: `docker compose --profile app up -d --build` (serviços `migrate`, `api` e `worker`; Swagger UI em `http://localhost:<API_PORT>/api/docs`).
- Bancos: `carteira_dev` (desenvolvimento) e `carteira_test` (testes). Credenciais em `.env`, criado a partir de `.env.example`.
- Acesso: `docker exec -it carteira-b3-db psql -U <POSTGRES_USER> -d carteira_dev`.
- Recriar do zero (apaga os dados): `docker compose down -v && docker compose up -d`. Só com autorização do usuário.

## Banco de dados (Prisma 7)
- `npm install` na raiz instala o Prisma (as ferramentas de banco ficam na raiz; o backend terá o próprio `package.json`).
- `npm run db:migrate` aplica as migrations (`prisma migrate deploy`); `npm run db:drift` confere se `schema.prisma` e as migrations estão iguais (deve sair sem diferenças).
- `npm run db:test` roda `database/tests/constraints.sql`, `database/tests/ops-constraints.sql` e `database/tests/full-product-constraints.sql` (testes das restrições de `public`, de `ops` e das tabelas da D3; não deixam dados).
- `npm run db:ddl` regenera `database/sql/ddl.sql` a partir do banco migrado.
- CHECK constraints e as extensões `citext` e `unaccent` ficam escritos à mão nas migrations; o Prisma não os expressa nem os remove.

## Testes e CI (D40)
- Onde cada tipo de teste roda: `claude/arquitetura.md`, seção 9. Resumo: unitário sem banco; integração e E2E do backend com Testcontainers (migrations pelo Prisma da raiz, em série); specs do frontend com Vitest; E2E do frontend com `@playwright/test` contra `carteira_test` na máquina; `db:test` contra `carteira_dev`.
- CI em `.github/workflows/ci.yml`: job `database` (já existe); `backend` (K1), `frontend` (W1) e `e2e` (R1) entram nas tarefas indicadas.
- Permissões em `.claude/settings.json`: comandos destrutivos, `docker exec`, `npm install <pacote>`, push e merge pedem confirmação; ler `.env` e `docker compose config` são bloqueados.

## Regras invioláveis
- Responder em português (pt-BR); código, identificadores e commits em inglês (Conventional Commits).
- Nunca commitar `.env` nem segredos. Nunca exibir senhas no chat.
- O schema (`prisma/schema.prisma`, migrations, `database/sql/inserts.sql`) é do agente `database`; outros agentes pedem mudanças a ele.
- `database/sql/ddl.sql` é gerado (`pg_dump --schema-only --schema=public`), nunca escrito à mão.
- Dinheiro e percentuais nunca em `float` (Decimal / NUMERIC). Dado derivado nunca vira coluna (D4, D17, D32).
- Mudança no ER congelado ou em decisão só com registro em `claude/contexto-projeto.md` antes de implementar.
- Testes em TypeScript, arquivos `.spec.ts` (D33).
- Comandos destrutivos (`docker compose down -v`, `prisma migrate reset`, `DROP`) só com confirmação explícita do usuário.

## Estrutura
Resumo; a árvore completa está em `claude/estrutura-repositorio.md`.
```
.claude/agents/   database.md, backend.md, frontend.md
.claude/skills/   ponytail, karpathy-guidelines, skill-inspector (D57)
.github/          pull_request_template.md; workflows/ci.yml (K1)
agentes/          prompts-fonte dos agentes (inclui UX/UI)
claude/           contexto, arquitetura, plano, convenções, estrutura do repositório, enunciado de BD
prisma/           schema.prisma, migrations/
database/
  docs/           descricao-problema.md, modelo-er.md, mapeamento.md, glossario.md, memoria-calculo.md, diagrama-er.{svg,png}, diagrama-logico.{svg,png}
  scripts/        export-ddl.mjs, run-sql.mjs
  tests/          constraints.sql, ops-constraints.sql, full-product-constraints.sql
  sql/            ddl.sql (gerado), inserts.sql (seed), queries.sql
  results/        resultados das consultas e listagens das tabelas
data/raw/         arquivos brutos das fontes externas (fora do Git)
docker/           scripts de inicialização do PostgreSQL
backend/          NestJS (criado pelo Nest CLI no K1)
frontend/         Angular (criado pelo Angular CLI no W1)
graphify-out/     grafo do código do Graphify (gerado, fora do Git, D53)
.env              único, na raiz, fora do Git (Compose, Prisma e backend leem o mesmo)
```
