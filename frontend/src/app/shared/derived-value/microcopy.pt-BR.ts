import { FormulaCode } from '../../api/models';

// Texts of "como foi calculado" from claude/microcopy.md (U4, U7a): sections 2 (fixed texts), 3 (by formulaCode and
// input `name`), 4 (edge cases) and 9 (Resumo da operação). The only place these texts live: templates never write
// them (D26).

export interface FormulaText {
  /** Rótulo, next to the number and in the aria-label of the ⓘ. */
  label: string;
  /** The label in lower case, for the links "Ver cálculo do {of}". */
  of: string;
  formula: string;
  /** Conta: `{name}` of an input or `{value}`; null for a sum of `sales[]` or `positions[]` items. */
  account: string | null;
  explanation: string;
}

export const FORMULA_TEXTS: Record<FormulaCode, FormulaText> = {
  AVG_PRICE_BUY: {
    label: 'Preço médio (PM)',
    of: 'preço médio',
    formula:
      'PM = (qtd. anterior × PM anterior + qtd. comprada × preço + custos) ÷ (qtd. anterior + qtd. comprada)',
    // shortcut: the microcopy divides by {quantityBefore + quantityBought}; the front does no sums (D28), so the two
    // terms are shown. Change when the API sends the quantity after the buy as an input.
    account:
      '({quantityBefore} × {avgPriceBefore} + {quantityBought} × {unitPrice} + {fees}) ÷ ({quantityBefore} + {quantityBought}) = {value}',
    explanation:
      'É quanto cada unidade custou para você, em média, já somando corretagem e taxas. Vender não muda o preço médio; ele só muda quando você compra mais.',
  },
  TOTAL_COST: {
    label: 'Custo total',
    of: 'custo total',
    formula: 'Custo total = quantidade em carteira × preço médio',
    account: '{quantity} × {avgPrice} = {value}',
    explanation:
      'É quanto você investiu nas unidades que ainda tem, incluindo custos. Quando você vende parte, o custo total cai na mesma proporção.',
  },
  REALIZED_PROFIT: {
    label: 'Lucro realizado',
    of: 'lucro realizado',
    formula:
      'Lucro realizado = qtd. vendida × preço de venda − custos − qtd. vendida × PM na data da venda',
    account: '{quantitySold} × {unitPrice} − {fees} − {quantitySold} × {avgPriceAtSale} = {value}',
    explanation:
      'É o ganho ou a perda que você concretizou ao vender, usando o preço médio da data da venda. Não é o imposto devido.',
  },
  POSITION_REALIZED_PROFIT: {
    label: 'Lucro realizado',
    of: 'lucro realizado',
    formula: 'Lucro realizado do ativo = soma do lucro realizado de cada venda dele nesta carteira',
    account: null,
    explanation:
      'Soma o ganho ou a perda de todas as vendas deste ativo nesta carteira. Sem vendas, é R$ 0,00.',
  },
  PORTFOLIO_TOTAL_COST: {
    label: 'Custo total da carteira',
    of: 'custo total da carteira',
    formula: 'Custo total da carteira = soma do custo total de cada posição aberta',
    account: null,
    explanation:
      'É quanto você investiu nos ativos que ainda tem nesta carteira, com custos. Posições encerradas não entram.',
  },
  PORTFOLIO_REALIZED_PROFIT: {
    label: 'Lucro realizado da carteira',
    of: 'lucro realizado da carteira',
    formula:
      'Lucro realizado da carteira = soma do lucro realizado de cada ativo, abertos e encerrados',
    account: null,
    explanation:
      'Soma o ganho ou a perda de todas as vendas desta carteira, inclusive de ativos que você já vendeu por completo. Não é o imposto: o IR é apurado por pessoa, somando todas as carteiras.',
  },
  OPERATION_GROSS: {
    label: 'Valor da operação',
    of: 'valor da operação',
    formula: 'Valor da operação = quantidade × preço unitário',
    account: '{quantity} × {unitPrice} = {value}',
    explanation: 'É o valor negociado, antes dos custos da nota.',
  },
  OPERATION_TOTAL_BUY: {
    label: 'Total com custos',
    of: 'total com custos',
    formula: 'Total com custos = valor da operação + custos',
    account: '{grossValue} + {fees} = {value}',
    explanation: 'É quanto a compra custou de fato. Os custos entram no preço médio.',
  },
  OPERATION_NET_SELL: {
    label: 'Valor líquido',
    of: 'valor líquido',
    formula: 'Valor líquido = valor da operação − custos',
    account: '{grossValue} − {fees} = {value}',
    explanation: 'É quanto a venda rendeu depois dos custos da nota.',
  },
};

/** "Valores usados": label of each input by its `name` (section 3); `sales` and `positions` are labeled per item. */
export const INPUT_LABELS: Record<string, string> = {
  quantityBefore: 'Quantidade antes da compra',
  avgPriceBefore: 'PM antes da compra',
  quantityBought: 'Quantidade comprada',
  unitPrice: 'Preço unitário',
  fees: 'Custos (corretagem e taxas)',
  quantity: 'Quantidade em carteira',
  avgPrice: 'Preço médio',
  quantitySold: 'Quantidade vendida',
  avgPriceAtSale: 'PM na data da venda',
  grossValue: 'Valor da operação',
};

/** Labels that change with the formula: in OPERATION_GROSS the quantity is the operation's; in a sale, the price. */
export const INPUT_LABEL_BY_FORMULA: Partial<Record<FormulaCode, Record<string, string>>> = {
  OPERATION_GROSS: { quantity: 'Quantidade' },
  REALIZED_PROFIT: { unitPrice: 'Preço de venda' },
};

/** Section 2, the fixed texts of the panel, and section 4, the edge cases it shows. */
export const EXPLAINER_TEXTS = {
  title: 'Como foi calculado',
  close: 'Fechar',
  formula: 'Fórmula',
  inputs: 'Valores usados',
  account: 'Conta',
  footer: (asOf: string) => `Calculado em ${asOf} a partir das suas operações nesta carteira.`,
  trigger: (label: string) => `Como foi calculado: ${label}`,
  position: (date: string) => `Suas operações até ${date}`,
  operation: (type: 'BUY' | 'SELL', date: string, broker: string) =>
    `${type === 'BUY' ? 'Compra' : 'Venda'} de ${date} · ${broker}`,
  form: 'Do formulário, ainda não salvo',
  derived: (of: string) => `Ver cálculo do ${of}`,
  assetPosition: (open: boolean, of: string) =>
    `Posição ${open ? 'aberta' : 'encerrada'} · ver cálculo do ${of}`,
  noSales: 'Nenhuma venda com lucro ou prejuízo nesta carteira.',
  /** REALIZED_PROFIT in the preview (D42). */
  estimatedLabel: 'Lucro realizado estimado',
  estimatedNote: 'Vira lucro realizado quando você salvar a venda.',
};

/** Section 2 (states of the Resumo da operação) and section 9 (its lines). */
export const SUMMARY_TEXTS = {
  title: 'Resumo da operação',
  waiting:
    'Preencha ativo, corretora, data, quantidade e preço para ver o valor da operação e como ela muda sua posição.',
  header: 'Calculado pelo servidor a partir das suas operações. Nada foi salvo ainda.',
  calculating: 'Calculando…',
  unavailable:
    'Não deu para calcular o resumo agora. Você ainda pode salvar: o servidor confere tudo de novo ao salvar.',
  retry: 'Calcular de novo',
  gone: 'Sem resumo: esta operação não existe mais.',
  fees: 'Custos',
  averagePrice: 'Preço médio',
  createHeading: (portfolio: string, date: string, type: 'BUY' | 'SELL') =>
    `Na carteira ${portfolio}, em ${date}, após esta ${type === 'BUY' ? 'compra' : 'venda'}`,
  editHeading: (asset: string, date: string) => `${asset} em ${date}, com a alteração`,
  position: (asset: string) => `Posição de ${asset}`,
  sellKeepsAverage: (price: string) => `${price} (venda não muda)`,
  rn07: (date: string, available: string, sold: string) =>
    `Venda maior que a posição em ${date}: ${available} disponíveis, ${sold} na venda.`,
  rn10: (date: string, available: string, sold: string) =>
    `Deixa a venda de ${date} maior que a posição: ${available} disponíveis, ${sold} vendidas.`,
};
