import { AbstractControl, FormGroup, ValidatorFn } from '@angular/forms';
import {
  AssetType,
  FieldError,
  FieldErrorCode,
  FieldErrorParams,
  ProblemDetails,
} from '../../api/models';
import { formatDate } from '../format/pt-br';

/**
 * Field error texts of claude/microcopy.md, section 10 (D56), by field + code. The API `message` is never shown.
 * Placeholders come from `params`; {n} (characters still missing) is counted here from the typed value.
 */
export type FieldTexts = Partial<Record<FieldErrorCode, string>>;

export const UNKNOWN_CODE_TEXT = 'Confira este campo.';

/** RN01; the API sends it again in params.min. */
export const PASSWORD_MIN_LENGTH = 8;

const EMAIL_FORMAT = 'Informe um e-mail válido, como nome@exemplo.com.';

export const REGISTER_TEXTS = {
  name: { REQUIRED: 'Informe seu nome.', TOO_LONG: 'Use até {max} caracteres.' },
  email: {
    REQUIRED: 'Informe seu e-mail.',
    INVALID_FORMAT: EMAIL_FORMAT,
    TOO_LONG: 'Use um e-mail com até {max} caracteres.',
    ALREADY_EXISTS: 'Já existe uma conta com este e-mail. Entre ou use outro e-mail.',
  },
  password: {
    REQUIRED: 'Crie uma senha com pelo menos {min} caracteres.',
    TOO_SHORT: 'A senha precisa de pelo menos {min} caracteres. Faltam {n}.',
    TOO_LONG: 'Use até {max} caracteres.',
  },
} satisfies Record<string, FieldTexts>;

export const LOGIN_TEXTS = {
  email: { REQUIRED: 'Informe seu e-mail.', INVALID_FORMAT: EMAIL_FORMAT },
  password: { REQUIRED: 'Informe sua senha.' },
} satisfies Record<string, FieldTexts>;

export const PORTFOLIO_TEXTS = {
  name: {
    REQUIRED: 'Dê um nome à carteira.',
    TOO_LONG: 'Use até {max} caracteres.',
    ALREADY_EXISTS: 'Você já tem uma carteira com este nome. Escolha outro.',
  },
} satisfies Record<string, FieldTexts>;

const QUANTITY_LIMIT = 'Quantidade grande demais: até {maxIntegerDigits} dígitos antes da vírgula.';
const WHOLE_QUANTITY: FieldTexts = {
  REQUIRED: 'Informe a quantidade.',
  NOT_POSITIVE: 'Use um número inteiro maior que zero.',
  NOT_INTEGER: 'Use um número inteiro maior que zero.',
  TOO_LARGE: QUANTITY_LIMIT,
};

/** Quantity by class of the asset (RN04, D55): the same codes read differently for fixed income and crypto. */
export const QUANTITY_TEXTS: Record<AssetType, FieldTexts> = {
  STOCK: WHOLE_QUANTITY,
  FII: WHOLE_QUANTITY,
  ETF: WHOLE_QUANTITY,
  BDR: WHOLE_QUANTITY,
  FIXED_INCOME: {
    REQUIRED: 'Informe a quantidade.',
    NOT_POSITIVE: 'Use um valor maior que zero, em múltiplos de {step} (ex.: 0,52).',
    INVALID_STEP: 'Use um valor maior que zero, em múltiplos de {step} (ex.: 0,52).',
    TOO_LARGE: QUANTITY_LIMIT,
  },
  CRYPTO: {
    REQUIRED: 'Informe a quantidade.',
    NOT_POSITIVE: 'Use um valor maior que zero, com até {maxDecimals} casas decimais.',
    TOO_MANY_DECIMALS: 'Use um valor maior que zero, com até {maxDecimals} casas decimais.',
    TOO_LARGE: QUANTITY_LIMIT,
  },
};

const PRICE_FORMAT = 'Use um preço maior que zero, com até {maxDecimals} casas decimais.';
const FEES_FORMAT =
  'Use 0 ou mais, com até {maxDecimals} casas decimais. Use 0 se não houve custos.';

/** Operation form (frame 5); quantity is in QUANTITY_TEXTS, by class. */
export const OPERATION_TEXTS = {
  type: { REQUIRED: 'Escolha Compra ou Venda.', INVALID_VALUE: 'Escolha Compra ou Venda.' },
  assetId: {
    REQUIRED: 'Escolha um ativo da lista.',
    NOT_FOUND: 'Este ativo não está no catálogo. Escolha um da lista.',
  },
  brokerId: {
    REQUIRED: 'Escolha a corretora.',
    NOT_FOUND: 'Esta corretora não está na lista. Escolha uma da lista.',
  },
  tradeDate: {
    REQUIRED: 'Informe a data do pregão (dd/mm/aaaa).',
    INVALID_FORMAT: 'Informe a data do pregão (dd/mm/aaaa).',
    FUTURE_DATE: 'A data não pode ser depois de hoje ({today}).',
  },
  unitPrice: {
    REQUIRED: 'Informe o preço unitário.',
    NOT_POSITIVE: PRICE_FORMAT,
    TOO_MANY_DECIMALS: PRICE_FORMAT,
    TOO_LARGE: 'Preço grande demais: até {maxIntegerDigits} dígitos antes da vírgula.',
  },
  fees: {
    REQUIRED: 'Informe os custos. Use 0 se não houve.',
    NEGATIVE: FEES_FORMAT,
    TOO_MANY_DECIMALS: FEES_FORMAT,
    TOO_LARGE: 'Custos grandes demais: até {maxIntegerDigits} dígitos antes da vírgula.',
  },
} satisfies Record<string, FieldTexts>;

type CodedError = Pick<FieldError, 'code' | 'params'>;

/** A client validator that answers with a code of the API (D56), so its text is the server's: `{ coded: {...} }`. */
export const coded = (code: FieldErrorCode, params?: FieldErrorParams) => ({
  coded: { code, params },
});

/** The server error put on the control by applyServerErrors, or the one its validators stand for. */
function codedError(control: AbstractControl<string>): CodedError {
  const errors = control.errors ?? {};
  if (errors['server']) return errors['server'] as CodedError;
  if (errors['coded']) return errors['coded'] as CodedError;
  if (errors['required']) return { code: 'REQUIRED' };
  if (errors['email']) return { code: 'INVALID_FORMAT' };
  if (errors['minlength']) {
    return { code: 'TOO_SHORT', params: { min: errors['minlength'].requiredLength } };
  }
  return { code: 'INVALID_VALUE' };
}

/**
 * Text under the field, or null while there is nothing to show. Handoff U5: the error appears after leaving the
 * field or on submit (both mark it touched), never on the first keystrokes.
 */
export function fieldErrorText(
  texts: FieldTexts,
  control: AbstractControl<string>,
  defaults: FieldErrorParams = {},
): string | null {
  if (!control.invalid || !control.touched) return null;
  const { code, params } = codedError(control);
  const values: Record<string, unknown> = { ...defaults, ...params };
  return (texts[code] ?? UNKNOWN_CODE_TEXT).replace(/\{(\w+)\}/g, (_, key: string) => {
    if (key === 'n') return String((values['min'] as number) - charCount(control.value));
    // Microcopy, section 10: today as dd/mm/aaaa and the step in the pt-BR format ("0,01").
    if (key === 'today') return formatDate(String(values[key]));
    if (key === 'step') return String(values[key]).replace('.', ',');
    return String(values[key]);
  });
}

/** Characters as the API counts them (code points: an emoji is 1), not UTF-16 units like Validators.minLength. */
const charCount = (value: string) => [...value].length;

/** Minimum length in characters (RN01), with the same error shape as Validators.minLength. */
export function minChars(min: number): ValidatorFn {
  return ({ value }: AbstractControl<string>) =>
    value && charCount(value) < min ? { minlength: { requiredLength: min } } : null;
}

/** Puts each errors[] entry of a 400/409 on its control; returns false when none matched a field of the form. */
export function applyServerErrors(form: FormGroup, problem: ProblemDetails | null): boolean {
  let applied = false;
  for (const error of problem?.errors ?? []) {
    const control = form.get(error.field);
    if (!control) continue;
    // Replaced by the validators on the next change of the value, so the text goes away when the user edits.
    control.setErrors({ server: error });
    control.markAsTouched();
    applied = true;
  }
  return applied;
}

/** Handoff U5: on submit with errors, focus goes to the first invalid field. */
export function focusFirstInvalid(host: HTMLElement): void {
  host.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
}
