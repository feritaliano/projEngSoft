import { FormControl, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import {
  LOGIN_TEXTS,
  REGISTER_TEXTS,
  UNKNOWN_CODE_TEXT,
  applyServerErrors,
  fieldErrorText,
  focusFirstInvalid,
} from './field-errors.pt-BR';

const touched = (value: string, ...validators: ValidatorFn[]) => {
  const control = new FormControl(value, { nonNullable: true, validators });
  control.markAsTouched();
  return control;
};

describe('fieldErrorText', () => {
  it('shows nothing before the field is left or the form is sent', () => {
    const control = new FormControl('', { nonNullable: true, validators: Validators.required });

    expect(fieldErrorText(LOGIN_TEXTS.email, control)).toBeNull();
  });

  it('shows nothing for a valid field', () => {
    expect(
      fieldErrorText(LOGIN_TEXTS.email, touched('ana@email.com', Validators.email)),
    ).toBeNull();
  });

  it('maps the client validators to the codes of the microcopy (RN01)', () => {
    expect(fieldErrorText(LOGIN_TEXTS.email, touched('', Validators.required))).toBe(
      'Informe seu e-mail.',
    );
    expect(fieldErrorText(LOGIN_TEXTS.email, touched('ana', Validators.email))).toBe(
      'Informe um e-mail válido, como nome@exemplo.com.',
    );
    expect(
      fieldErrorText(REGISTER_TEXTS.password, touched('', Validators.required), { min: 8 }),
    ).toBe('Crie uma senha com pelo menos 8 caracteres.');
  });

  it('counts the missing characters of a short password (RN01)', () => {
    expect(fieldErrorText(REGISTER_TEXTS.password, touched('abcde', Validators.minLength(8)))).toBe(
      'A senha precisa de pelo menos 8 caracteres. Faltam 3.',
    );
  });

  it('fills the placeholders with the params of the server error (D56)', () => {
    const control = touched('x');
    control.setErrors({
      server: { field: 'name', code: 'TOO_LONG', message: 'too long', params: { max: 150 } },
    });

    expect(fieldErrorText(REGISTER_TEXTS.name, control)).toBe('Use até 150 caracteres.');
  });

  it('uses the default text for a code the microcopy does not list', () => {
    const control = touched('x');
    control.setErrors({ server: { field: 'name', code: 'INVALID_VALUE', message: 'bad' } });

    expect(fieldErrorText(REGISTER_TEXTS.name, control)).toBe(UNKNOWN_CODE_TEXT);
    expect(
      fieldErrorText(
        REGISTER_TEXTS.name,
        touched('x', () => ({ pattern: true })),
      ),
    ).toBe(UNKNOWN_CODE_TEXT);
  });
});

describe('applyServerErrors', () => {
  const form = () =>
    new FormGroup({
      email: new FormControl('ana@email.com', { nonNullable: true }),
      password: new FormControl('12345678', { nonNullable: true }),
    });

  it('puts each error on the control of its field, shown at once', () => {
    const group = form();

    const applied = applyServerErrors(group, {
      type: 'about:blank',
      title: 'Conflict',
      status: 409,
      errors: [{ field: 'email', code: 'ALREADY_EXISTS', message: 'exists' }],
    });

    expect(applied).toBe(true);
    expect(fieldErrorText(REGISTER_TEXTS.email, group.controls.email)).toBe(
      'Já existe uma conta com este e-mail. Entre ou use outro e-mail.',
    );
    expect(group.controls.password.valid).toBe(true);
  });

  it('drops the server error when the user edits the field', () => {
    const group = form();
    applyServerErrors(group, {
      type: 'about:blank',
      title: 'Conflict',
      status: 409,
      errors: [{ field: 'email', code: 'ALREADY_EXISTS', message: 'exists' }],
    });

    group.controls.email.setValue('outra@email.com');

    expect(group.controls.email.valid).toBe(true);
  });

  it('returns false when no error names a field of the form', () => {
    expect(applyServerErrors(form(), null)).toBe(false);
    expect(
      applyServerErrors(form(), {
        type: 'about:blank',
        title: 'Bad Request',
        status: 400,
        errors: [{ field: 'body', code: 'REQUIRED', message: 'required' }],
      }),
    ).toBe(false);
  });
});

describe('focusFirstInvalid', () => {
  it('focuses the first field marked aria-invalid', () => {
    const host = document.createElement('form');
    host.innerHTML =
      '<input id="a"><input id="b" aria-invalid="true"><input id="c" aria-invalid="true">';
    document.body.append(host);

    focusFirstInvalid(host);

    expect(document.activeElement?.id).toBe('b');
    host.remove();
  });
});
