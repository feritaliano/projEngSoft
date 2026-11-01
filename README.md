# Carteira B3

Plataforma gratuita e sem fins lucrativos de análise e gestão de investimentos da B3 para pessoa física: consulta de dados de ações, FIIs, ETFs e BDRs a partir de fontes primárias (B3, CVM, Banco Central), rankings e valuation, e gestão da carteira (operações, posição, preço médio, proventos e IR), com a explicação de cada número.

Projeto acadêmico (UNIFESP/ICT) que atende as disciplinas de Engenharia de Software e Banco de Dados. ODS 10 (meta 10.2) e ODS 4 (meta 4.4).

## Documentação
- Contexto e decisões: `claude/contexto-projeto.md`
- Arquitetura: `claude/arquitetura.md`
- Modelo ER e mapeamento: `database/docs/`
- Plano de ação: `claude/plano-de-acao.md`
- Estrutura do repositório: `claude/estrutura-repositorio.md`

## Banco de dados local
Requisito: Docker Desktop (ou Docker Engine com o plugin Compose).

```bash
cp .env.example .env        # ajuste a senha nas três linhas em que aparece
docker compose up -d
docker compose ps           # o serviço postgres deve ficar "healthy"
```

Bancos criados: `carteira_dev` e `carteira_test` (PostgreSQL 16, porta 5432).

## Backend no Docker (API e worker)
Sem instalar Node: o perfil `app` do Compose constrói a imagem do backend, aplica as migrations e sobe a API e o worker, usando o mesmo `.env`.

```bash
docker compose --profile app up -d --build
docker compose --profile app ps          # migrate "Exited (0)", api "healthy", worker "Up"
```

- API: `http://localhost:3000/api/v1/health` (porta do `API_PORT`).
- Swagger UI, para testar cada endpoint: `http://localhost:3000/api/docs` (só com `NODE_ENV` diferente de `production`).
- Logs: `docker compose --profile app logs -f api worker`. Parar: `docker compose --profile app down` (o volume do banco fica).
- Sem `--profile app`, `docker compose up -d` continua subindo só o PostgreSQL.

Para desenvolver o backend fora do Docker (modo watch, testes), veja `backend/README.md`.

## Stack
PostgreSQL 16 + Prisma · NestJS (TypeScript) · Angular + Tailwind CSS · testes em `.spec.ts`.
