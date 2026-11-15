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
> **Telas em construção.** Por enquanto, o frontend tem a entrada (login e cadastro) e a navegação; carteiras e operações ainda não existem na tela e, para elas, use a API pelo Swagger (passo 6). Esta seção é atualizada a cada tela entregue.

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

**Pela tela:** abra `http://localhost:4200`, entre com o e-mail e a senha acima e você chega a "Suas carteiras". Para criar outro usuário, clique em "Criar conta": a conta nova já entra logada. A API aceita 5 cadastros ou logins por minuto por IP (`AUTH_RATE_LIMIT_MAX`); a sessão fica só na memória da aba e volta sozinha ao recarregar a página, pelo cookie de refresh.

**Pela API (carteiras, operações e posições, até as telas ficarem prontas):** no Swagger UI, em `http://localhost:3000/api/docs`:
1. Abra `POST /api/v1/auth/login`, clique em "Try it out", envie `{ "email": "demo@carteirab3.dev", "password": "demo-carteira-2026" }` e confira a resposta 200.
2. Copie o `accessToken` da resposta, clique em "Authorize" e cole o token.
3. Teste as rotas de carteiras, operações, posições e catálogo, como `GET /api/v1/portfolios`.

### 7. Testes
| Pacote | Onde | Comandos |
|---|---|---|
| Banco | `database/tests/` | `npm run db:test` na raiz, com o PostgreSQL de pé |
| Backend | `backend/src/**/*.spec.ts` (unitários), `backend/test/` (integração e E2E) | `backend/README.md` |
| Frontend | `frontend/src/**/*.spec.ts` (specs), `frontend/e2e/` (E2E) | `frontend/README.md` |

## Stack
PostgreSQL 16 + Prisma · NestJS (TypeScript) · Angular + Tailwind CSS · testes em `.spec.ts`.
