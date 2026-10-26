# Enunciado — Trabalho de Banco de Dados (transcrição do PDF original)

Universidade Federal de São Paulo · Instituto de Ciência e Tecnologia
Disciplina: Banco de Dados · Professora: Daniela Leal Musa

## Descrição geral
O trabalho consiste em realizar o projeto de um banco de dados sobre o domínio de problema a ser escolhido pelo grupo. O domínio do problema deve contemplar alguma ODS (Objetivos de Desenvolvimento Sustentável) da ONU (https://brasil.un.org/pt-br/sdgs). Se possível, o trabalho deve resolver algum problema da sociedade e envolver algum projeto de extensão do ICT.

IMPORTANTE:
- Na dúvida, verificar com o professor se o domínio escolhido está de acordo.
- Não escolher domínios muito simples como biblioteca, universidade etc.
- Grupos de no máximo 4 pessoas ou individual.

## Parte 1 — Descrição do Problema e Modelo ER
**Data de entrega: 19/10/2026, no Google Classroom.**

### Etapa 1 — Descrição do problema
Entregar um texto descrevendo em detalhes o problema escolhido e em qual ODS ele se encaixa.

### Etapa 2 — Modelo ER
Deverá ser desenvolvido um Modelo ER completo (atributos, cardinalidades) do assunto escolhido. O modelo deverá, obrigatoriamente, conter:
- pelo menos 10 entidades, com nomes e atributos;
- relacionamentos com nome e cardinalidades;
- utilizar as regras de mapeamento ER para relacional e apresentar as tabelas geradas pelo mapeamento.

O que deve ser entregue:
1. Diagrama ER detalhado.
2. Lista das tabelas criadas, com respectivos atributos, chaves primárias e estrangeiras (formato texto).

Critérios de avaliação:
- Será verificado se o diagrama ER está representando o domínio do problema escolhido.
- Se está de acordo com o texto descritivo entregue.
- O número de entidades, os relacionamentos e as cardinalidades também serão avaliados.
- Será verificado se as regras de mapeamento foram aplicadas de forma adequada.

## Parte 2 — Implementação
**Data de entrega: 07/12/2026, no Google Classroom.**

Implementar em qualquer SGBD o sistema de informação modelado na Parte 1. A implementação deve conter:

1. **DDL (Data Definition Language):** criação das relações em SQL.
2. **Inserção de dados:** devem ser inseridas no mínimo ±10 tuplas para cada tabela. Conselho: inserir instâncias variadas, que representem vários casos distintos, de modo a testar a correção das consultas.
3. **Consultas SQL.** Devem ser formuladas e implementadas:
   - 10 consultas com os operadores básicos de SQL, as quais devem conter junção com, no mínimo, duas tabelas;
   - 3 consultas com LEFT JOIN ou RIGHT JOIN;
   - 5 consultas com os operadores (avg, sum etc.) usando GROUP BY, HAVING e ORDER BY.

   Para cada consulta, deve ser apresentado: enunciado da consulta; comando SQL da consulta; resultado da consulta.

Material a ser entregue — Relatório Final contendo:
1. Título do trabalho e nomes dos integrantes do grupo.
2. Nome e fabricante do SGBD escolhido.
3. Texto e diagrama ER (última versão): Trabalho Parte 1 corrigido e alterado.
4. DDL referente à implementação das relações em SQL e comandos para inserção de dados. Entregar arquivo .sql com todos os comandos de criação e inserção dos dados.
5. Listagem de cada tabela com seu conteúdo completo.
6. Para cada consulta:
   a. enunciado da consulta;
   b. implementação em SQL (entregar arquivo .sql com todas as consultas);
   c. resultado da consulta (instâncias retornadas).

Critérios de avaliação: implementação, consistência e amplitude da criação, instanciação e consultas.

## Observações importantes
- Devem ser postados no Google Classroom.
- Serão desconsiderados os trabalhos enviados por e-mail.
- O trabalho consiste em 2 partes OBRIGATÓRIAS.
