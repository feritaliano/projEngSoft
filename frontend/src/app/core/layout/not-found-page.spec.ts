import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { NotFoundPage } from './not-found-page';

describe('NotFoundPage', () => {
  it('explains the page does not exist and links back to Carteiras', async () => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(NotFoundPage);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;

    expect(el.querySelector('h1')?.textContent?.trim()).toBe('Página não encontrada');
    expect(el.textContent).toContain('não está disponível para a sua conta');
    const link = el.querySelector('a');
    expect(link?.textContent?.trim()).toBe('Ir para Carteiras');
    expect(link?.getAttribute('href')).toBe('/carteiras');
  });
});
