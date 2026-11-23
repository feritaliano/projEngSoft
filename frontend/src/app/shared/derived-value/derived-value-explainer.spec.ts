import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DerivedValue } from '../../api/models';
import { PETR4, TOTAL_COST } from '../../../testing/derived-values';
import { text } from '../../../testing/text';
import { DerivedValueExplainer } from './derived-value-explainer';

// jsdom has no modal <dialog>; the browser behavior (focus trap, inert page) is covered by the E2E.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.open = false;
  };
});

@Component({
  imports: [DerivedValueExplainer],
  template: `<app-derived-value-explainer [value]="value()" [asset]="asset" [link]="link()" />`,
})
class Host {
  readonly value = signal<DerivedValue>(TOTAL_COST);
  readonly link = signal<string | null>(null);
  readonly asset = PETR4;
}

describe('DerivedValueExplainer (C1)', () => {
  const render = async (link: string | null = null) => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.link.set(link);
    document.body.appendChild(fixture.nativeElement);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    const trigger = element.querySelector('button') as HTMLButtonElement;
    const dialog = element.querySelector('dialog') as HTMLDialogElement;
    const open = async () => {
      trigger.click();
      await fixture.whenStable();
    };
    return { fixture, element, trigger, dialog, open };
  };

  afterEach(() => document.body.replaceChildren());

  it('names the ⓘ by the label of the number and points it at the closed panel', async () => {
    const { trigger, dialog } = await render();

    expect(trigger.getAttribute('aria-label')).toBe('Como foi calculado: Custo total');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.getAttribute('aria-controls')).toBe(dialog.id);
    expect(dialog.open).toBe(false);
    expect(dialog.textContent?.trim()).toBe('');
  });

  it('shows the text link "Como foi calculado" when asked (indicators of the Detail)', async () => {
    const { trigger } = await render('Como foi calculado');

    expect(trigger.textContent?.trim()).toBe('Como foi calculado');
    expect(trigger.getAttribute('aria-label')).toBe('Como foi calculado: Custo total');
  });

  it('names a link with another text by that text', async () => {
    const { trigger } = await render('Ver como o preço médio mudou');

    expect(trigger.textContent?.trim()).toBe('Ver como o preço médio mudou');
    expect(trigger.getAttribute('aria-label')).toBeNull();
  });

  it('opens the panel with the focus on its title, as a dialog named by it', async () => {
    const { trigger, dialog, open } = await render();
    await open();

    expect(dialog.open).toBe(true);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    const title = dialog.querySelector('h2') as HTMLElement;
    expect(dialog.getAttribute('aria-labelledby')).toBe(title.id);
    expect(document.activeElement).toBe(title);
    expect(text(dialog)).toContain('Custo total · PETR4');
    expect(text(dialog)).toContain('100 × 32,0327 = 3.203,27');
  });

  it('swaps to the value of a link and back to the trigger when closed', async () => {
    const { fixture, trigger, dialog, open } = await render();
    await open();

    const link = [...dialog.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Ver cálculo do preço médio'),
    ) as HTMLButtonElement;
    link.click();
    await fixture.whenStable();
    expect(text(dialog)).toContain('Preço médio (PM) · PETR4');
    expect(document.activeElement).toBe(dialog.querySelector('h2'));

    const close = [...dialog.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Fechar'),
    ) as HTMLButtonElement;
    close.click();
    await fixture.whenStable();
    expect(dialog.open).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });

  it('closes on Esc (the cancel event of the dialog)', async () => {
    const { fixture, trigger, dialog, open } = await render();
    await open();

    const cancel = new Event('cancel', { cancelable: true });
    dialog.dispatchEvent(cancel);
    await fixture.whenStable();

    expect(cancel.defaultPrevented).toBe(true);
    expect(dialog.open).toBe(false);
    expect(document.activeElement).toBe(trigger);
  });
});
