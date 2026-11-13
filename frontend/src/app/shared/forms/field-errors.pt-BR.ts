import { AbstractControl, FormGroup, ValidatorFn } from '@angular/forms';
import { FieldError, FieldErrorCode, FieldErrorParams, ProblemDetails } from '../../api/models';

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

type CodedError = Pick<FieldError, 'code' | 'params'>;

/** The server error put on the control by applyServerErrors, or the one its validators stand for. */
function codedError(control: AbstractControl<string>): CodedError {
  const errors = control.errors ?? {};
  if (errors['server']) return errors['server'] as CodedError;
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
  return (texts[code] ?? UNKNOWN_CODE_TEXT).replace(/\{(\w+)\}/g, (_, key: string) =>
    key === 'n'
      ? String((values['min'] as number) - charCount(control.value))
      : String(values[key]),
  );
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
