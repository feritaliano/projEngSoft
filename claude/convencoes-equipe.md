# Convenções da equipe — Carteira B3

> Atualizado em 26/10/2026 (D38: ferramentas do Claude Code e revisão sem segundo revisor). Regras de trabalho que valem para pessoas e agentes. Complementam `claude/contexto-projeto.md` e `claude/plano-de-acao.md`.
> Ordem de precedência em caso de conflito: `claude/contexto-projeto.md` → `claude/arquitetura.md` → `database/docs/modelo-er.md` → prompts em `agentes/`.

## Git e GitHub
- `main` é protegida: não aceita push direto; todo código entra por PR, com CI verde. Verificações obrigatórias: job `database` desde 26/10; `backend` a partir do K1, `frontend` a partir do W1 e `e2e` a partir do R1 (D40).
- **Aprovação obrigatória no PR:** o GitHub não permite que o autor aprove o próprio PR. Enquanto o projeto tiver uma só pessoa, a regra de proteção exige **0 aprovações** e a revisão é feita pelo `/review-pr` (ver "Definição de pronto"). Quando a segunda pessoa entrar, a regra volta para 1 aprovação.
- Branch por tarefa do plano: `<tipo>/<ID>-<descricao>`. Ex.: `feat/D1-prisma-schema`, `docs/G1-glossario`.
- Commits em inglês no padrão Conventional Commits: `feat:`, `fix:`, `test:`, `docs:`, `refactor:`, `chore:`, `ci:`. Ex.: `feat(operations): reject sell above position (RN07)`.
- PR pequeno e com uma única tarefa. O título cita o ID (`[D1] Prisma schema and migrations`) e a descrição lista as RNs ou decisões cobertas, como testar e o resultado do `/review-pr`.
- Issue no GitHub Projects para cada tarefa do plano, com o mesmo ID.

## Testes automatizados (D33)
- Exigência de Engenharia de Software: regras de negócio testadas e testes automatizados.
- Todos os testes em TypeScript, em arquivos `.spec.ts` ao lado do código testado (E2E do backend em `test/*.e2e-spec.ts`).
- Backend NestJS: Jest. Domínio puro (ex.: `PositionCalculator`, calculadoras, regras de IR) com testes unitários sem banco, em paralelo; integração e E2E com Testcontainers (PostgreSQL real e novo por execução, migrations pelo Prisma da raiz), em série.
- Frontend Angular: specs de componentes e serviços com Vitest; E2E do fluxo completo com `@playwright/test` em `frontend/e2e/*.spec.ts`, rodando no CI (D38) e, na máquina, contra o banco `carteira_test`.
- Banco: `npm run db:test` (restrições de `public` e `ops`) e `npm run db:drift`, também no CI.
- Onde cada tipo de teste roda e o que cada job do CI faz: `claude/arquitetura.md`, seção 9 (D40). Teste nunca usa o banco `carteira_dev`, exceto os testes de restrição do banco.
- Todo teste cita no nome a RN ou decisão que cobre quando houver (ex.: `rejects sell above position (RN07)`).

## Definição de pronto (vale para toda tarefa de código)
1. Critério de pronto da tarefa (no plano) atendido.
2. Testes `.spec.ts` escritos e passando; cobertura acima do mínimo do agente (backend 90% / domínio 100% de ramos; frontend 80%).
3. Lint e build sem erro no CI.
4. **Revisão:**
   - Com segunda pessoa no projeto: ela revisa e roda localmente o que o PR afirma.
   - Sem segunda pessoa (situação atual): `/review-pr` rodado sobre o PR; todo achado crítico tratado antes do merge; a descrição do PR lista o que foi tratado e o que foi descartado, com o motivo. Mesclar sem isso não é revisão.
5. Documentação atualizada quando o comportamento muda (README, OpenAPI, docs de `database/`).

Para tarefas de banco, também: migrations sobem do zero, `ddl.sql` regenerado e coerente com `database/docs/mapeamento.md`, seed idempotente.

## Ferramentas do Claude Code (D38)
Plugins oficiais instalados com escopo de projeto (registrados em `.claude/settings.json`, que vai para o Git):

| Plugin | Uso | Quem |
|---|---|---|
| `feature-dev` | `/feature-dev <tarefa>` antes de escrever código de módulo, caso de uso ou tela nova | backend, frontend, database |
| `pr-review-toolkit` | `code-simplifier` depois de implementar; `silent-failure-hunter`, `type-design-analyzer` e `pr-test-analyzer` conforme o prompt do agente; `/review-pr` antes de todo PR | todos |
| `security-guidance` | Automático; aviso só é ignorado com justificativa no PR | todos |
| `commit-commands` | `/commit` e `/commit-push-pr`, sempre em Conventional Commits. Requer o GitHub CLI autenticado (`gh auth login`, uma vez) | todos |
| `figma` | Ler frames e variáveis do Figma pelo link de `claude/handoff-ux.md` | frontend |
| `playwright` | Abrir a aplicação local para conferir e depurar telas; **não** é a suíte E2E (essa é `@playwright/test`, versionada) | frontend |
| `claude-md-management` | `/revise-claude-md` ao fim de sessão com aprendizado do projeto | todos |

**Permissões (`.claude/settings.json`, D40):** comandos de leitura, testes, lint, build e `db:*` não destrutivos rodam sem perguntar; `docker exec`, `docker compose down`, `prisma migrate` (dev e reset), `npm install <pacote>`, `git push` e `gh pr merge` sempre pedem confirmação; ler `.env`, `docker compose config` (imprime a senha), `git push --force` e `git reset --hard` são bloqueados. `git commit` e `gh pr create` pedem confirmação por padrão. Ajuste pessoal vai em `.claude/settings.local.json`, nunca no arquivo do projeto.

Desativados neste projeto (via `enabledPlugins` em `.claude/settings.json`): `frontend-design` (toma decisões visuais fora do design system) e `superpowers` (fluxo de trabalho concorrente ao `feature-dev`). O UX/UI roda no chat do projeto no claude.ai, com o conector Figma e o plugin Design (ver `agentes/agente-ux-ui.md`).

## Uso dos agentes
- Chat do projeto: `Agente: <nome>. Tarefa <ID>.`, um chat por agente.
- Claude Code: `@database`, `@backend`, `@frontend` dentro do repositório; um agente por branch.
- Todo código gerado por agente passa pela mesma revisão de PR que código humano. Aprovar sem ler e sem rodar não é revisão.
- Divergência entre agentes (ex.: contrato de API ou schema) se resolve no artefato dono: o schema é do agente de banco; o contrato da API (OpenAPI) é do backend; os tokens visuais e os frames do Figma são do UX.
- Frentes ativas (replanejadas em 24/10/2026): todas, com datas em `claude/plano-de-acao.md` e nos prompts de cada agente. Os quatro prompts em `agentes/` foram reescritos em 05/10/2026, atualizados em 24/10/2026 e, todos os quatro, em 26/10/2026 (D38); o de banco também com o banco do sistema (D2, D39).

## Mudança de escopo ou de decisão
- Qualquer mudança em decisão (D1–D41), no ER congelado (D14, 05/10/2026) ou nas regras de negócio (RN) é registrada em `claude/contexto-projeto.md`, na seção de decisões, antes de ser implementada.
- Mudança no ER atualiza, na mesma tarefa: `database/docs/modelo-er.md`, `database/docs/mapeamento.md`, os modelos no brModelo (`CarteiraB3_ER` e `CarteiraB3_Logico`) e o esquema da seção 7 de `claude/contexto-projeto.md`.
- Mudança no plano atualiza, na mesma tarefa, o checklist interativo (link em `claude/plano-de-acao.md`) e o prompt da frente afetada.
- Quando mudar uma RN, atualize os 4 prompts em `agentes/` e o `.claude/agents/` do repositório.
- Os documentos existem em duas cópias (projeto no claude.ai e repositório): ao alterar um, atualize o outro.

## Documentos do projeto
| Documento | Para quê |
|---|---|
| `claude/contexto-projeto.md` | Visão geral, decisões (D1–D41), esquema relacional resumido, agentes, artefatos, pendências |
| `claude/arquitetura.md` | Arquitetura do sistema e do banco (schemas `public`/`ops`/`analytics`, ingestão, CQRS leve) |
| `claude/plano-de-acao.md` | Tarefas, datas, dependências, gatilhos de corte; link do checklist interativo |
| `claude/convencoes-equipe.md` | Este documento |
| `claude/estrutura-repositorio.md` | Árvore de pastas, onde fica cada arquivo (`.env`, Docker, gerados), o que vai para o Git e o dono de cada pasta |
| `claude/handoff-ux.md` | Handoff do UX para o frontend: link do arquivo Figma e do frame de cada tela (preenchido no U5) |
| `database/docs/modelo-er.md` | Modelo ER congelado: 27 entidades, 33 relacionamentos, verificação 3FN |
| `database/docs/mapeamento.md` | Mapeamento ER→relacional: regras aplicadas e as 29 tabelas |
| `database/docs/descricao-problema.md` | Texto do problema + ODS (BD Parte 1) |
| `agentes/*.md` | Prompts de cada agente (banco, backend, frontend, UX/UI) |
| `claude/enunciadoBancoDeDados.md` | Enunciado de Banco de Dados |
| `projetoEngSoftware.md` | Enunciado de Engenharia de Software |
