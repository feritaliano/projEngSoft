import { TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { TextField } from './text-field';

describe('TextField', () => {
  const render = async (inputs: { helper?: string | null; error?: string | null }) => {
    const fixture = TestBed.createComponent(TextField);
    fixture.componentRef.setInput('label', 'Senha');
    fixture.componentRef.setInput('fieldId', 'password');
    fixture.componentRef.setInput('type', 'password');
    fixture.componentRef.setInput('control', new FormControl('', { nonNullable: true }));
    for (const [name, value] of Object.entries(inputs)) fixture.componentRef.setInput(name, value);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    return {
      label: element.querySelector('label') as HTMLLabelElement,
      input: element.querySelector('input') as HTMLInputElement,
      hint: element.querySelector('p'),
    };
  };

  it('ties the visible label to the input', async () => {
    const { label, input } = await render({});

    expect(label.textContent?.trim()).toBe('Senha');
    expect(label.htmlFor).toBe('password');
    expect(input.id).toBe('password');
    expect(input.type).toBe('password');
    expect(input.getAttribute('aria-describedby')).toBeNull();
  });

  it('describes the input with the helper text', async () => {
    const { input, hint } = await render({ helper: 'Mínimo de 8 caracteres.' });

    expect(hint?.textContent?.trim()).toBe('Mínimo de 8 caracteres.');
    expect(input.getAttribute('aria-describedby')).toBe(hint?.id);
    expect(input.getAttribute('aria-invalid')).toBeNull();
  });

  it('replaces the helper with the error, marked aria-invalid and with the error border', async () => {
    const { input, hint } = await render({
      helper: 'Mínimo de 8 caracteres.',
      error: 'Informe sua senha.',
    });

    expect(hint?.textContent?.trim()).toBe('Informe sua senha.');
    expect(hint?.classList).toContain('text-negative');
    expect(input.getAttribute('aria-describedby')).toBe(hint?.id);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.classList).toContain('border-negative');
  });
});
