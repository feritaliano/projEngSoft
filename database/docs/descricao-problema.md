# Descrição do problema

## 1. Contexto: investir ainda é para poucos

Investir é uma das formas mais diretas de uma pessoa construir patrimônio, se proteger de imprevistos e complementar a renda no futuro. No Brasil, porém, essa prática ainda alcança uma parcela pequena da população. Segundo a 9ª edição do *Raio X do Investidor Brasileiro*, pesquisa da Associação Brasileira das Entidades dos Mercados Financeiro e de Capitais (ANBIMA) feita em parceria com o Datafolha, só **36% dos brasileiros com 16 anos ou mais têm algum investimento financeiro**, o que deixa cerca de **107,7 milhões de pessoas sem nenhuma aplicação**. A caderneta de poupança continua sendo o produto mais usado (22% da população), e só 33% conseguiram guardar dinheiro em 2025 (ANBIMA, 2026a). Apenas 2% da população aplica em ações, e a desigualdade também aparece entre gêneros: investem 41% dos homens e 31% das mulheres (ANBIMA, 2026b).

A bolsa de valores brasileira, a B3 S.A. – Brasil, Bolsa, Balcão (B3), já não é um ambiente reservado a grandes investidores. Em junho de 2025, **5,4 milhões de pessoas físicas** tinham investimentos em renda variável na B3, e o **saldo mediano em custódia era de R$ 1,7 mil**. O primeiro investimento mediano mensal foi de R$ 201 entre os homens e de R$ 621 entre as mulheres, e quase metade desses investidores (48%) tem entre 25 e 39 anos (B3, 2025). Esses números mostram que é possível começar com pouco dinheiro. O que falta à maior parte da população não é acesso à bolsa, mas confiança e conhecimento para investir e acompanhar os próprios investimentos.

Essa questão ganha peso com o envelhecimento da população. O Censo 2022 do Instituto Brasileiro de Geografia e Estatística (IBGE) contou mais de **32,1 milhões de pessoas com 60 anos ou mais**, 15,8% da população (BRASIL, 2023). Quanto mais cedo uma pessoa aprende a poupar, investir e acompanhar o próprio patrimônio, maior a chance de chegar a essa fase da vida com segurança financeira.

## 2. O problema

Quem decide começar a investir em ações, fundos imobiliários (FIIs), fundos de índice (ETFs, do inglês *Exchange Traded Funds*) ou certificados de ações estrangeiras (BDRs, do inglês *Brazilian Depositary Receipts*) encontra quatro barreiras.

**A percepção de que investir é difícil e só serve para quem já tem dinheiro.** Para o iniciante, termos como preço médio, dividend yield, data-com, desdobramento e Documento de Arrecadação de Receitas Federais (DARF) formam uma linguagem distante. Sem uma ferramenta que traduza esses conceitos, muita gente desiste antes de começar ou deixa o dinheiro sempre na mesma aplicação, por não saber comparar alternativas.

**Informação oficial dispersa e técnica.** Os dados para analisar um ativo são públicos e gratuitos: a B3 publica as cotações diárias, a Comissão de Valores Mobiliários (CVM) publica as demonstrações financeiras das empresas e os informes dos fundos imobiliários, e o Banco Central publica índices como o CDI (Certificado de Depósito Interbancário), a taxa Selic (Sistema Especial de Liquidação e de Custódia) e o IPCA (Índice Nacional de Preços ao Consumidor Amplo). Mas estão espalhados em arquivos extensos, em formatos pensados para especialistas. O iniciante acaba usando indicadores prontos de sites e aplicativos, sem saber de onde vêm nem como foram calculados.

**A gestão da carteira dá trabalho e o erro custa caro.** Depois de comprar, o investidor precisa controlar a carteira: registrar cada compra e venda, calcular o preço médio de cada ativo, ajustar a quantidade quando a empresa faz desdobramento, grupamento ou bonificação, conferir os dividendos recebidos e apurar o imposto de renda (IR) todo mês. No Brasil, o imposto sobre ganhos em bolsa é apurado e pago pelo próprio investidor. Ele precisa separar operações comuns, day trade e fundos imobiliários, aplicar a isenção sobre vendas de ações quando cabível, compensar prejuízos de meses anteriores e emitir o DARF. Quem faz isso em planilhas manuais erra com facilidade, sobretudo depois de eventos corporativos. Um preço médio errado gera imposto errado, declaração anual incorreta e risco de multa.

**As ferramentas que resolvem isso são pagas.** As plataformas que reúnem análise dos ativos, controle de carteira e apuração de imposto cobram assinatura pelas funções principais. As opções gratuitas costumam mostrar números sem explicação. O pequeno investidor, que é justamente quem mais precisa de apoio, fica sem acesso às ferramentas que facilitam a gestão.

O resultado é um ciclo de exclusão: quem tem menos recursos e menos informação investe menos, investe pior ou desiste, e continua dependendo apenas da renda do trabalho e da aposentadoria pública.

## 3. Quem é afetado

O público é formado por pessoas físicas que investem ou querem começar a investir em renda variável na B3, principalmente:

- iniciantes com patrimônio pequeno, que não pagam por ferramentas profissionais nem por assessoria;
- jovens adultos, a maior parcela dos novos investidores, que estão formando os primeiros hábitos financeiros;
- mulheres, que ainda investem menos que os homens;
- pessoas que querem complementar a aposentadoria com uma carteira de longo prazo, montada aos poucos.

## 4. Como o projeto contribui para a solução

O projeto propõe um sistema gratuito e sem fins lucrativos de **gestão de investimentos aberto a toda a população**. A ideia central é mostrar que acompanhar os próprios investimentos não é difícil quando a informação está organizada e cada número vem com a explicação de como foi obtido. O sistema:

- organiza em um só lugar a carteira do investidor (operações, corretoras, proventos e imposto);
- reúne os dados oficiais dos ativos, tirados direto da B3, da CVM e do Banco Central, sempre com fonte e data;
- calcula o que hoje é feito em planilhas (posição, preço médio, resultado, indicadores, vacância de fundos imobiliários e imposto do mês) e mostra a fórmula e os valores usados em cada cálculo;
- permite comparar ativos, acompanhar ativos de interesse e salvar filtros de análise.

Com isso, as mesmas ferramentas que hoje são pagas ficam ao alcance de quem investe pequenos valores, o que contribui para a democratização dos investimentos. Ao ver, mês a mês, como a própria carteira evolui e como cada número é calculado, a pessoa ganha autonomia para tomar decisões, evita erros no imposto e constrói patrimônio com mais segurança. No longo prazo, isso pode melhorar a vida financeira e o futuro de muitas famílias.

O sistema não recomenda ativos: recomendação de investimento é atividade regulada pela CVM. Ele informa, calcula e explica, e a decisão é sempre do investidor.

O núcleo dessa solução é o **banco de dados**. Ele precisa guardar de forma íntegra o que o investidor informa (contas, carteiras, operações, proventos recebidos, pagamentos de imposto) e o que as fontes oficiais publicam (ativos, cotações, demonstrações, informes de fundos, proventos e eventos), relacionados de forma que todo valor calculado possa ser refeito e explicado a partir dos fatos registrados. A seção 1.6 descreve esse domínio, que é representado no modelo entidade-relacionamento (ER).

## 5. Enquadramento nos Objetivos de Desenvolvimento Sustentável

O projeto se enquadra em dois Objetivos de Desenvolvimento Sustentável (ODS) da Agenda 2030 da Organização das Nações Unidas (ONU) (NAÇÕES UNIDAS BRASIL, [2026a], [2026b]).

**ODS 10 — Redução das desigualdades, meta 10.2:** até 2030, empoderar e promover a inclusão social, econômica e política de todos, independentemente da idade, do gênero, da condição econômica ou de qualquer outra condição. Hoje, controle de carteira, análise com dados oficiais e apuração de imposto estão concentrados em ferramentas pagas e em quem pode contratar assessoria. Ao oferecer gratuitamente essa gestão, o projeto reduz a diferença de acesso à informação e de capacidade de decisão entre o pequeno investidor e quem tem mais recursos. Também diminui o risco de quem tem menos renda pagar multa por erro de cálculo do imposto.

**ODS 4 — Educação de qualidade, meta 4.4:** até 2030, aumentar substancialmente o número de jovens e adultos com habilidades relevantes, inclusive competências técnicas e profissionais, para emprego, trabalho decente e empreendedorismo. A educação financeira é uma dessas habilidades. O sistema não entrega só números prontos: cada valor calculado mostra fórmula, insumos e fonte. Ao usar o sistema, o investidor aprende na prática como se calcula um preço médio, o que significa cada indicador, de onde vem a vacância de um fundo imobiliário e como se apura o imposto.

## 6. Domínio representado no banco de dados

Esta seção descreve o que o banco de dados precisa registrar. Os nomes em **negrito** são as entidades do modelo ER, e os verbos em *itálico* são os nomes dos relacionamentos. Os dados de mercado vêm das fontes oficiais (B3, CVM e Banco Central). Os dados da carteira são informados pelo investidor.

### 6.1 Conta, carteira e operações

- Cada pessoa que usa o sistema é um **Usuário**, com nome, e-mail (único), senha guardada apenas de forma cifrada e data de cadastro. O Cadastro de Pessoas Físicas (CPF) não é registrado, porque não entra em nenhum cálculo.
- Um usuário *possui* várias **Carteiras** (por exemplo, "Aposentadoria" e "Renda com dividendos"), cada uma com nome e data de criação. O nome não se repete para o mesmo usuário, e cada carteira pertence a um único usuário.
- Cada compra ou venda é uma **Operação** que a carteira *registra*. A operação *negocia* um ativo e é *intermediada* por uma **Corretora** (nome e Cadastro Nacional da Pessoa Jurídica, o CNPJ). Registra o tipo (compra ou venda), a data do pregão, a quantidade, o preço unitário, os custos (corretagem e taxas) e um número de sequência que ordena operações do mesmo dia. Toda operação tem corretora.
- O investidor pode lançar operações uma a uma ou importar a planilha de negociações disponível na Área do Investidor da B3. Cada importação é um **Lote de importação** que a carteira *importa*, com o nome do arquivo, a identificação do arquivo (hash), a situação (pendente, confirmado ou descartado), a quantidade de linhas e as datas de importação e confirmação. Um lote *origina* as operações importadas. Operações lançadas à mão não têm lote, e o mesmo arquivo não pode ser importado duas vezes na mesma carteira.
- Regras da carteira:
    - a quantidade é inteira e positiva, o preço é positivo e os custos não são negativos;
    - uma venda não pode ser maior que a quantidade que o investidor tinha naquele ativo, naquela carteira, na data da venda;
    - posição, preço médio e lucro realizado não são digitados: são calculados a partir das operações, em ordem de data e sequência. Se uma operação antiga for alterada e a posição ficar negativa em algum momento, a alteração é recusada.

### 6.2 Catálogo de ativos

- Cada **Ativo** negociado na B3 é identificado pelo código de negociação, o ticker (por exemplo, PETR4), e pelo código ISIN (*International Securities Identification Number*), ambos únicos. Tem um tipo (ação, FII, ETF ou BDR) e, no caso das ações, uma classe (ordinária, preferencial ou unit). Também indica se ainda é negociado.
- Todo ativo é emitido por um **Emissor**: a companhia, o fundo ou a empresa estrangeira. O emissor *emite* zero ou mais ativos (como as ações ordinárias, ON, e preferenciais, PN, da mesma empresa) e tem nome, tipo, CNPJ e código na CVM, quando existirem.
- O emissor pode ser classificado em um **Setor** da classificação setorial da B3 (relacionamento *classifica*). A classificação é hierárquica: um setor se *subdivide* em subsetores, e cada subsetor em segmentos. Por isso cada setor pode ter um setor pai. Fundos e empresas estrangeiras podem não ter classificação.

### 6.3 Dados de mercado

- A **Cotação** é o resumo de um pregão para um ativo: preços de abertura, máximo, mínimo e fechamento, volume financeiro e número de negócios, como publicados pela B3. O ativo é *cotado* no máximo uma vez por data, e a cotação só existe ligada ao seu ativo (entidade fraca).
- Para comparar a rentabilidade com referências do mercado, o banco guarda **Índices econômicos** (CDI, Selic, IPCA e Índice Bovespa, o Ibovespa), com código, nome, periodicidade, unidade e fonte. Cada índice *registra* uma série de **Valores do índice**, um por data de referência (entidade fraca).

### 6.4 Fundamentos das empresas

- Cada **Demonstração** é um documento que o emissor *publica* na CVM: as Demonstrações Financeiras Padronizadas, anuais (DFP), ou as Informações Trimestrais (ITR). Registra o início do exercício, o fim do período, a versão (a empresa pode reapresentar o documento), a data de entrega e a quantidade de ações ordinárias e preferenciais em circulação e em tesouraria.
- As **Linhas de demonstração** *compõem* a demonstração: cada linha é uma conta contábil, como "3.01 – Receita de venda de bens e serviços", no escopo individual ou consolidado, com descrição e valor publicado (entidade fraca). O tipo de demonstrativo (balanço, resultado, fluxo de caixa, valor adicionado) é identificado pelo próprio código da conta.
- Os **Indicadores** fundamentalistas (P/L, preço sobre lucro; P/VP, preço sobre valor patrimonial; ROE, do inglês *Return on Equity*, retorno sobre o patrimônio líquido; margem líquida; dívida líquida sobre EBITDA, do inglês *Earnings Before Interest, Taxes, Depreciation and Amortization*, lucro antes de juros, impostos, depreciação e amortização; dividend yield; vacância e outros) formam um catálogo com código, nome, grupo, fórmula, unidade e tipo de ativo a que se aplicam. Os valores dos indicadores não são armazenados: são calculados a partir das demonstrações, das cotações e dos informes.
- Os **Comunicados** (fatos relevantes e avisos ao mercado) que o emissor *divulga* na CVM são registrados com categoria, assunto, data de referência, data de entrega, endereço do documento e protocolo da CVM (único).

### 6.5 Fundos imobiliários

- Todo mês o fundo *informa* à CVM o **Informe mensal de FII**, com mês de referência, versão, patrimônio líquido, número de cotas emitidas, número de cotistas e dividend yield do mês.
- A cada trimestre o fundo *entrega* o **Informe trimestral de FII**, com data de referência e versão. O informe *lista* os imóveis do fundo: cada **Imóvel do informe** é uma linha desse documento, identificada pela ordem no informe (entidade fraca). Tem nome, endereço, classe (para renda acabado, para renda em construção, para venda acabado ou para venda em construção), área e, quando aplicável, os percentuais de vacância, de inadimplência, de participação nas receitas do fundo e de pré-locação. Fundos de papel, que não têm imóveis, entregam o informe sem itens.
- A vacância do fundo é calculada como a média da vacância dos imóveis para renda acabados, ponderada pela área. A CVM não atribui código aos imóveis, e o mesmo edifício pode aparecer em várias linhas (por andar ou unidade). Por isso o banco guarda o que cada informe declara, sem criar uma identidade artificial para o imóvel.

### 6.6 Eventos corporativos e proventos

- Um **Evento corporativo** que o ativo *sofre* altera a quantidade de ações de quem já o possui: desdobramento, grupamento ou bonificação. Registra a data a partir da qual vale (data-ex), a proporção (por exemplo, de 1 para 2), o custo atribuído às novas ações no caso de bonificação e a fonte (B3 ou cadastro manual). O evento vale para todas as carteiras que têm o ativo.
- Um **Provento** é a distribuição que o ativo *distribui*: dividendo, juros sobre capital próprio ou rendimento de FII. Registra a data-com, a data de pagamento (que pode ainda não estar definida), o valor por cota e a fonte.
- O **Provento recebido** é o que de fato caiu na carteira. O provento *credita* o recebimento, a carteira o *recebe* e a corretora o *paga*. Registra a quantidade que gerou o direito, o valor bruto, o imposto retido na fonte e a data, como informados pela corretora. O mesmo provento não é registrado duas vezes para a mesma carteira e corretora.

### 6.7 Imposto de renda

- O imposto é apurado por usuário, somando todas as carteiras, porque o imposto é do contribuinte e não da carteira. Cada conta representa um único contribuinte.
- As operações são separadas por **Categoria de IR**: operações comuns com ações, operações comuns com os demais ativos (fundos de índice e BDRs, que não têm a isenção sobre vendas), day trade e fundos imobiliários. Cada categoria tem código, nome e o código de receita usado no DARF.
- Cada categoria tem **Regras de IR** que *vigoram* a partir de uma data de início de vigência, com a alíquota e, quando existe, o limite de isenção sobre o total de vendas do mês (entidade fraca). Se a legislação mudar, entra uma nova regra, e os meses anteriores continuam calculados com a regra da época.
- A **Apuração** mensal registra, para um usuário (relacionamento *apura*), uma categoria (relacionamento *enquadra*) e um mês: o total de vendas, o resultado líquido, o prejuízo de meses anteriores compensado e a data de fechamento. Depois de fechada, a apuração não muda: se uma operação antiga for alterada, a diferença é apontada em vez de reescrever o mês. A base de cálculo e o imposto devido são calculados a partir da apuração e da regra vigente.
- O **DARF** é a guia de pagamento do imposto de um mês, que o usuário *deve*. Um DARF *quita* uma ou mais apurações: pode reunir categorias diferentes e meses anteriores cujo imposto ficou abaixo do valor mínimo de recolhimento. O investidor registra o valor pago e a data do pagamento. O valor devido e o vencimento são calculados.

### 6.8 Acompanhamento e análise

- O usuário pode *observar* ativos que ainda não tem (lista de favoritos), com a data em que incluiu cada um. Um usuário observa vários ativos, e um ativo pode ser observado por vários usuários.
- O usuário pode criar **Alertas de preço** (relacionamento *cria_alerta*): cada alerta *monitora* um ativo, com preço-alvo, direção (acima ou abaixo), data de criação e, quando dispara, a data do disparo e a data da cotação que o provocou.
- O usuário pode *salvar* **Filtros** para comparar ativos, com nome, tipo de ativo (ação ou FII), um indicador opcional que *ordena* o resultado e a direção da ordenação. Cada filtro é composto por um ou mais *critérios*. Cada critério define uma faixa (valor mínimo, máximo ou ambos) para um indicador, por exemplo "P/L entre 0 e 10" e "ROE acima de 15%".

## 7. Fatos registrados e valores calculados

O banco guarda apenas fatos: o que o investidor informou e o que as fontes oficiais publicaram. O que pode ser obtido a partir desses fatos não é armazenado, para não haver dois valores diferentes para a mesma informação. Esses valores são calculados quando necessário e exibidos com a explicação do cálculo:

- posição, preço médio e lucro realizado;
- valor de mercado da carteira e rentabilidade;
- indicadores fundamentalistas;
- valor patrimonial por cota e vacância dos fundos imobiliários;
- base de cálculo e imposto devido;
- valor devido e vencimento do DARF;
- nível de cada setor na classificação da B3.

## 8. Correspondência entre o texto e o modelo ER

| Seção | Entidades | Relacionamentos |
|---|---|---|
| 6.1 | Usuário, Carteira, Operação, Corretora, Lote de importação | possui, registra, negocia, intermedia, importa, origina |
| 6.2 | Ativo, Emissor, Setor | emite, classifica, subdivide (autorrelacionamento) |
| 6.3 | Cotação, Índice econômico, Valor do índice | cotado, registra_valor |
| 6.4 | Demonstração, Linha de demonstração, Indicador, Comunicado | publica, compõe, divulga |
| 6.5 | Informe mensal de FII, Informe trimestral de FII, Imóvel do informe | informa, entrega, lista |
| 6.6 | Evento corporativo, Provento, Provento recebido | sofre, distribui, credita, recebe, paga |
| 6.7 | Categoria de IR, Regra de IR, Apuração, DARF | apura, enquadra, vigora, deve, quita |
| 6.8 | Alerta de preço, Filtro salvo (e Usuário, Ativo, Indicador) | observa (N:N), cria_alerta, monitora, salva, ordena, critério (N:N) |

## Referências

ANBIMA. **Raio X do investidor brasileiro**. 9. ed. Rio de Janeiro: ANBIMA, 2026a. Pesquisa realizada em parceria com o Datafolha. Disponível em: https://www.anbima.com.br/data/files/BE/05/B0/55/1EABD91008E6DAD9F82BA2A8/Raio-X-do-Investidor-9-edicao.pdf. Acesso em: 18 out. 2026.

ANBIMA. Anbima lança a nona edição do Raio X do Investidor Brasileiro: 36% da população aplica em produtos financeiros. **ANBIMA**, Rio de Janeiro, 23 abr. 2026b. Disponível em: https://www.anbima.com.br/pt_br/noticias/anbima-lanca-a-nona-edicao-do-raio-x-do-investidor-brasileiro-36-da-populacao-aplica-em-produtos-financeiros.htm. Acesso em: 18 out. 2026.

B3. **Pessoas físicas**: uma análise da evolução dos investidores na B3: 2º trimestre de 2025. São Paulo: B3, 2025. Disponível em: https://www.b3.com.br/data/files/A2/A0/78/20/E61689100A29E189AC094EA8/Book%20PF%202TRI%202025_vF.pdf. Acesso em: 18 out. 2026.

BRASIL. Ministério dos Direitos Humanos e da Cidadania. Censo 2022: brasileiros com 60 anos ou mais superam 32 milhões de pessoas. **Agência Gov**, Brasília, DF, 27 out. 2023. Disponível em: https://agenciagov.ebc.com.br/noticias/202310/brasileiros-com-60-anos-ou-mais-superam-32-milhoes-de-pessoas-mdhc-reforca-importancia-do-cuidado-e-respeito-com-essa-faixa-etaria. Acesso em: 18 out. 2026.

NAÇÕES UNIDAS BRASIL. **Objetivo de Desenvolvimento Sustentável 10**: redução das desigualdades. Brasília, DF: ONU Brasil, [2026a]. Disponível em: https://brasil.un.org/pt-br/sdgs/10. Acesso em: 18 out. 2026.

NAÇÕES UNIDAS BRASIL. **Objetivo de Desenvolvimento Sustentável 4**: educação de qualidade. Brasília, DF: ONU Brasil, [2026b]. Disponível em: https://brasil.un.org/pt-br/sdgs/4. Acesso em: 18 out. 2026.
