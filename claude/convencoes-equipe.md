# Convenções da equipe — Carteira B3

> Atualizado em 05/10/2026. Regras de trabalho que valem para pessoas e agentes. Complementam `claude/contexto-projeto.md` e `claude/plano-de-acao.md`.
> Ordem de precedência em caso de conflito: `claude/contexto-projeto.md` → `claude/arquitetura.md` → `database/docs/modelo-er.md` → prompts em `agentes/`.

## Git e GitHub
- `main` é protegida: não aceita push direto; todo código entra por PR, com pelo menos 1 aprovação e CI verde.
- Branch por tarefa do plano: `<tipo>/<ID>-<descricao>`. Ex.: `feat/D1-prisma-schema`, `docs/G1-glossario`.
- Commits em inglês no padrão Conventional Commits: `feat:`, `fix:`, `test:`, `docs:`, `refactor:`, `chore:`, `ci:`. Ex.: `feat(operations): reject sell above position (RN07)`.
- PR pequeno e com uma única tarefa. O título cita o ID (`[D1] Prisma schema and migrations`) e a descrição lista as RNs ou decisões cobertas e como testar.
- Issue no GitHub Projects para cada tarefa do plano, com o mesmo ID.

## Testes automatizados (D33)
- Exigência de Engenharia de Software: regras de negócio testadas e testes automatizados.
- Todos os testes em TypeScript, em arquivos `.spec.ts` ao lado do código testado (E2E do backend em `test/*.e2e-spec.ts`).
- Backend NestJS: Jest. Domínio puro (ex.: `PositionCalculator`, calculadoras, regras de IR) com testes unitários sem banco; integração e E2E com Testcontainers (PostgreSQL real).
- Frontend Angular: specs de componentes e serviços.
- Todo teste cita no nome a RN ou decisão que cobre quando houver (ex.: `rejects sell above position (RN07)`).

## Definição de pronto (vale para toda tarefa de código)
1. Critério de pronto da tarefa (no plano) atendido.
2. Testes `.spec.ts` escritos e passando; cobertura acima do mínimo do agente (backend 90% / domínio 100% de ramos; frontend 80%).
3. Lint e build sem erro no CI.
4. Revisado por outra pessoa, que roda localmente o que o PR afirma.
5. Documentação atualizada quando o comportamento muda (README, OpenAPI, docs de `database/`).

Para tarefas de banco, também: migrations sobem do zero, `ddl.sql` regenerado e coerente com `database/docs/mapeamento.md`, seed idempotente.

## Uso dos agentes
- Chat do projeto: `Agente: <nome>. Tarefa <ID>.`, um chat por agente.
- Claude Code: `@database`, `@backend`, `@frontend` dentro do repositório; um agente por branch.
- Todo código gerado por agente passa pela mesma revisão de PR que código humano. Aprovar sem ler e sem rodar não é revisão.
- Divergência entre agentes (ex.: contrato de API ou schema) se resolve no artefato dono: o schema é do agente de banco; o contrato da API (OpenAPI) é do backend; os tokens visuais são do UX.
- Frentes ativas (replanejadas em 24/10/2026): todas, com datas em `claude/plano-de-acao.md` e nos prompts de cada agente. Os quatro prompts em `agentes/` foram reescritos em 05/10/2026 e atualizados em 24/10/2026.

## Mudança de escopo ou de decisão
- Qualquer mudança em decisão (D1–D37), no ER congelado (D14, 05/10/2026) ou nas regras de negócio (RN) é registrada em `claude/contexto-projeto.md`, na seção de decisões, antes de ser implementada.
- Mudança no ER atualiza, na mesma tarefa: `database/docs/modelo-er.md`, `database/docs/mapeamento.md`, os modelos no brModelo (`CarteiraB3_ER` e `CarteiraB3_Logico`) e o esquema da seção 7 de `claude/contexto-projeto.md`.
- Mudança no plano atualiza, na mesma tarefa, o checklist interativo (link em `claude/plano-de-acao.md`) e o prompt da frente afetada.
- Quando mudar uma RN, atualize os 4 prompts em `agentes/` e o `.claude/agents/` do repositório.

## Documentos do projeto
| Documento | Para quê |
|---|---|
| `claude/contexto-projeto.md` | Visão geral, decisões (D1–D37), esquema relacional resumido, agentes, artefatos, pendências |
| `claude/arquitetura.md` | Arquitetura do sistema e do banco (schemas `public`/`ops`/`analytics`, ingestão, CQRS leve) |
| `claude/plano-de-acao.md` | Tarefas, datas, dependências, gatilhos de corte; link do checklist interativo |
| `claude/convencoes-equipe.md` | Este documento |
| `claude/estrutura-repositorio.md` | Árvore de pastas, onde fica cada arquivo (`.env`, Docker, gerados), o que vai para o Git e o dono de cada pasta |
| `database/docs/modelo-er.md` | Modelo ER congelado: 27 entidades, 33 relacionamentos, verificação 3FN |
| `database/docs/mapeamento.md` | Mapeamento ER→relacional: regras aplicadas e as 29 tabelas |
| `database/docs/descricao-problema.md` | Texto do problema + ODS (BD Parte 1) |
| `agentes/*.md` | Prompts de cada agente (banco, backend, frontend, UX/UI), reescritos em 05/10/2026 |
| `claude/enunciadoBancoDeDados.md` | Enunciado de Banco de Dados |
| `projetoEngSoftware.md` | Enunciado de Engenharia de Software |
