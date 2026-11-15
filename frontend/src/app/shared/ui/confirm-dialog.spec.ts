import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ConfirmDialog } from './confirm-dialog';

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
  imports: [ConfirmDialog],
  template: `
    <button id="opener" type="button" (click)="open.set(true)">Excluir</button>
    @if (open()) {
      <app-confirm-dialog
        heading="Excluir a carteira “Longo prazo”?"
        text="Isto apaga a carteira e as 11 operações lançadas nela."
        confirmLabel="Excluir carteira"
        [typeToConfirm]="typeToConfirm()"
        typeToConfirmLabel="Para confirmar, digite o nome da carteira"
        [busy]="busy()"
        (confirmed)="confirmed.set(confirmed() + 1)"
        (cancelled)="open.set(false)"
      />
    }
  `,
})
class Host {
  readonly open = signal(false);
  readonly typeToConfirm = signal<string | null>('Longo prazo');
  readonly busy = signal(false);
  readonly confirmed = signal(0);
}

describe('ConfirmDialog', () => {
  const render = async (typeToConfirm: string | null = 'Longo prazo') => {
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.typeToConfirm.set(typeToConfirm);
    document.body.appendChild(fixture.nativeElement);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    const opener = element.querySelector('#opener') as HTMLButtonElement;
    opener.focus();
    opener.click();
    await fixture.whenStable();
    const dialog = () => element.querySelector('dialog');
    const button = (name: string) =>
      [...element.querySelectorAll('dialog button')].find(
        (b) => b.textContent?.trim() === name,
      ) as HTMLButtonElement;
    const type = async (value: string) => {
      const input = element.querySelector('#confirm-dialog-input') as HTMLInputElement;
      input.value = value;
      input.dispatchEvent(new Event('input'));
      await fixture.whenStable();
    };
    return { fixture, element, opener, dialog, button, type };
  };

  it('opens as a modal alertdialog named by its title and described by its text', async () => {
    const { dialog } = await render();

    expect(dialog()?.open).toBe(true);
    expect(dialog()?.getAttribute('role')).toBe('alertdialog');
    expect(dialog()?.getAttribute('aria-modal')).toBe('true');
    const title = document.getElementById(dialog()?.getAttribute('aria-labelledby') ?? '');
    const text = document.getElementById(dialog()?.getAttribute('aria-describedby') ?? '');
    expect(title?.textContent?.trim()).toBe('Excluir a carteira “Longo prazo”?');
    expect(text?.textContent?.trim()).toBe(
      'Isto apaga a carteira e as 11 operações lançadas nela.',
    );
  });

  it('focuses the name field and enables "Excluir carteira" only when the typed name is equal', async () => {
    const { fixture, button, type } = await render();

    expect(document.activeElement?.id).toBe('confirm-dialog-input');
    expect(button('Excluir carteira').disabled).toBe(true);

    await type('Longo');
    expect(button('Excluir carteira').disabled).toBe(true);
    await type('longo prazo');
    expect(button('Excluir carteira').disabled).toBe(true);
    await type('  Longo prazo ');
    expect(button('Excluir carteira').disabled).toBe(false);

    button('Excluir carteira').click();
    expect(fixture.componentInstance.confirmed()).toBe(1);
  });

  it('without a name to type, focuses "Cancelar" and the confirm button is enabled', async () => {
    const { element, button } = await render(null);

    expect(element.querySelector('#confirm-dialog-input')).toBeNull();
    expect(document.activeElement).toBe(button('Cancelar'));
    expect(button('Excluir carteira').disabled).toBe(false);
  });

  it('keeps the confirm button disabled and busy while the action runs', async () => {
    const { fixture, button, type } = await render();
    await type('Longo prazo');

    fixture.componentInstance.busy.set(true);
    await fixture.whenStable();

    expect(button('Excluir carteira').disabled).toBe(true);
    expect(button('Excluir carteira').getAttribute('aria-busy')).toBe('true');
  });

  it('Esc cancels and the focus goes back to the button that opened it', async () => {
    const { fixture, dialog, opener } = await render();

    const esc = new Event('cancel', { cancelable: true });
    dialog()?.dispatchEvent(esc);
    await fixture.whenStable();

    expect(esc.defaultPrevented).toBe(true);
    expect(dialog()).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it('"Cancelar" cancels without confirming', async () => {
    const { fixture, dialog, button } = await render();

    button('Cancelar').click();
    await fixture.whenStable();

    expect(dialog()).toBeNull();
    expect(fixture.componentInstance.confirmed()).toBe(0);
  });
});
