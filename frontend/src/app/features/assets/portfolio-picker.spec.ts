import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { PortfolioDto } from '../../api/models';
import { PortfolioPicker } from './portfolio-picker';

// jsdom has no modal <dialog>; the E2E opens it in the browser.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.open = false;
  };
});

const portfolios: PortfolioDto[] = [
  { id: 'p1', name: 'Longo prazo', operationCount: 9, assetCount: 4, lastTradeDate: null },
  { id: 'p2', name: 'Dividendos', operationCount: 6, assetCount: 3, lastTradeDate: null },
];

@Component({
  imports: [PortfolioPicker],
  template: `
    <button id="opener" type="button" (click)="open.set(true)">+</button>
    @if (open()) {
      <app-portfolio-picker
        asset="PETR4"
        [portfolios]="portfolios"
        (chosen)="chosen.set($event)"
        (cancelled)="open.set(false)"
      />
    }
  `,
})
class Host {
  readonly open = signal(false);
  readonly chosen = signal('');
  readonly portfolios = portfolios;
}

describe('PortfolioPicker (frame 7, escolher carteira)', () => {
  const render = async () => {
    const fixture = TestBed.createComponent(Host);
    document.body.appendChild(fixture.nativeElement);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    const opener = element.querySelector<HTMLButtonElement>('#opener')!;
    opener.focus();
    opener.click();
    await fixture.whenStable();
    return { fixture, element, opener, dialog: element.querySelector('dialog')! };
  };

  afterEach(() => document.body.replaceChildren());

  it('opens as a dialog named by its question, with the focus on the first portfolio', async () => {
    const { dialog } = await render();

    expect(dialog.open).toBe(true);
    expect(
      document.getElementById(dialog.getAttribute('aria-labelledby')!)?.textContent?.trim(),
    ).toBe('Em qual carteira lançar PETR4?');
    expect(document.activeElement).toBe(dialog.querySelector('input[value="p1"]'));
  });

  it('emits the chosen portfolio on Continuar', async () => {
    const { fixture, dialog } = await render();
    dialog.querySelector<HTMLInputElement>('input[value="p2"]')!.click();
    dialog.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));

    expect(fixture.componentInstance.chosen()).toBe('p2');
  });

  it('cancels on Esc and gives the focus back to the button that opened it', async () => {
    const { fixture, element, opener, dialog } = await render();
    const cancel = new Event('cancel', { cancelable: true });
    dialog.dispatchEvent(cancel);
    await fixture.whenStable();

    expect(cancel.defaultPrevented).toBe(true);
    expect(element.querySelector('dialog')).toBeNull();
    expect(document.activeElement).toBe(opener);
  });
});
