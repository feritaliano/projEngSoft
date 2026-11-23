import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, Validators } from '@angular/forms';
import { provideApiConfiguration } from '../../api/api-configuration';
import { AssetDto } from '../../api/models';
import { text } from '../../../testing/text';
import { SEARCH_DEBOUNCE_MS } from '../assets/assets.service';
import { AssetChoice, AssetCombobox, assetLabel } from './asset-combobox';

const API = 'http://api.test';
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const asset = (ticker: string, issuer: string): AssetDto => ({
  id: `a-${ticker}`,
  ticker,
  displayName: ticker,
  assetType: 'STOCK',
  issuer,
  sector: null,
});
const PETR4 = asset('PETR4', 'Petróleo Brasileiro S.A. – Petrobras');
const RECV3 = asset('RECV3', 'PetroRecôncavo S.A.');

@Component({
  imports: [AssetCombobox],
  template: `<app-asset-combobox
    [control]="control"
    [asset]="asset()"
    [error]="error()"
    (assetChange)="asset.set($event)"
  />`,
})
class Host {
  readonly control = new FormControl('', { nonNullable: true, validators: Validators.required });
  readonly asset = signal<AssetChoice | null>(null);
  readonly error = signal<string | null>(null);
}

describe('AssetCombobox (frame 5, field Ativo)', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration(API)],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const render = async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    const input = element.querySelector('input')!;
    const type = async (value: string) => {
      input.value = value;
      input.dispatchEvent(new Event('input'));
      await wait(SEARCH_DEBOUNCE_MS + 20);
    };
    const key = async (name: string) => {
      const event = new KeyboardEvent('keydown', { key: name, cancelable: true });
      input.dispatchEvent(event);
      await fixture.whenStable();
      return event;
    };
    return { fixture, element, input, type, key };
  };

  it('searches the catalog as the user types and lists ticker, issuer and class', async () => {
    const { fixture, element, input, type } = await render();
    await type('petro');
    const request = http.expectOne((r) => r.url === `${API}/api/v1/assets`);
    expect(request.request.params.get('search')).toBe('petro');
    request.flush({ items: [PETR4, RECV3], total: 2 });
    await fixture.whenStable();

    expect(input.getAttribute('role')).toBe('combobox');
    expect(input.getAttribute('aria-expanded')).toBe('true');
    const options = [...element.querySelectorAll('[role="option"]')].map(text);
    expect(options).toEqual([
      'PETR4 Petróleo Brasileiro S.A. – Petrobras Ação',
      'RECV3 PetroRecôncavo S.A. Ação',
    ]);
    expect(text(element.querySelector('[role="listbox"] + p'))).toBe(
      'Busca por código (ticker) ou nome da empresa ou fundo.',
    );
  });

  it('picks with the arrows and Enter, without sending the form', async () => {
    const { fixture, input, type, key } = await render();
    await type('petro');
    http.expectOne(() => true).flush({ items: [PETR4, RECV3], total: 2 });
    await fixture.whenStable();

    await key('ArrowDown');
    await key('ArrowDown');
    expect(input.getAttribute('aria-activedescendant')).toBe('operation-asset-1');
    await key('ArrowUp');
    expect(input.getAttribute('aria-activedescendant')).toBe('operation-asset-0');
    const enter = await key('Enter');

    expect(enter.defaultPrevented).toBe(true);
    expect(fixture.componentInstance.control.value).toBe('a-PETR4');
    expect(fixture.componentInstance.asset()?.ticker).toBe('PETR4');
    expect(input.value).toBe('PETR4 · Petróleo Brasileiro S.A. – Petrobras');
    expect(input.getAttribute('aria-expanded')).toBe('false');
  });

  it('clears the choice when the user types again, keeping the typed text', async () => {
    const { fixture, input, type } = await render();
    fixture.componentInstance.asset.set(PETR4);
    fixture.componentInstance.control.setValue(PETR4.id);
    await fixture.whenStable();
    expect(input.value).toBe(assetLabel(PETR4));

    await type('RECV');
    http.expectOne(() => true).flush({ items: [], total: 0 });
    await fixture.whenStable();

    expect(fixture.componentInstance.asset()).toBeNull();
    expect(fixture.componentInstance.control.value).toBe('');
    expect(input.value).toBe('RECV');
    expect(text(fixture.nativeElement.querySelector('[role="option"]'))).toBe(
      'Nenhum ativo encontrado para “RECV”',
    );
  });

  it('closes on Esc, marks the field touched when left and shows the error', async () => {
    const { fixture, element, input, type, key } = await render();
    await type('petro');
    http.expectOne(() => true).flush({ items: [PETR4], total: 1 });
    await fixture.whenStable();

    await key('Escape');
    expect(element.querySelector('[role="listbox"]')).toBeNull();
    input.dispatchEvent(new Event('blur'));
    expect(fixture.componentInstance.control.touched).toBe(true);

    fixture.componentInstance.error.set('Escolha um ativo da lista.');
    await fixture.whenStable();
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(text(element.querySelector(`#${input.getAttribute('aria-describedby')}`))).toBe(
      'Escolha um ativo da lista.',
    );
  });

  it('does not search an empty field and lists nothing when the search fails', async () => {
    const { fixture, element, type } = await render();
    await type('   ');
    http.expectNone(() => true);

    await type('petro');
    http.expectOne(() => true).flush(null, { status: 500, statusText: 'Error' });
    await fixture.whenStable();
    expect(element.querySelectorAll('[role="option"]').length).toBe(1); // "Nenhum ativo encontrado"
  });

  it('names an asset without issuer by its name alone (fixed income has no ticker, D50)', () => {
    expect(
      assetLabel({
        id: 'x',
        ticker: null,
        displayName: 'Tesouro IPCA+ 2035',
        assetType: 'FIXED_INCOME',
      }),
    ).toBe('Tesouro IPCA+ 2035');
  });
});
