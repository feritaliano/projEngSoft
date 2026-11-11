import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideApiConfiguration } from '../../api/api-configuration';
import { Shell } from './shell';

describe('Shell', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideApiConfiguration('http://api.test'),
        provideRouter([]),
      ],
    });
  });

  it('renders the skip link first, then the header, the connection banner and the main content', async () => {
    const fixture = TestBed.createComponent(Shell);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;

    expect(el.firstElementChild?.textContent).toBe('Ir para o conteúdo');
    expect(el.querySelector('header')).not.toBeNull();
    expect(el.querySelector('app-connection-banner')).not.toBeNull();
    expect(el.querySelector('main#conteudo')).not.toBeNull();
  });

  it('"Ir para o conteúdo" moves the focus to the main content without leaving the page', async () => {
    const fixture = TestBed.createComponent(Shell);
    await fixture.whenStable();
    const el: HTMLElement = fixture.nativeElement;
    document.body.appendChild(el);

    const event = new MouseEvent('click', { cancelable: true });
    el.querySelector('a[href="#conteudo"]')?.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(el.querySelector('main'));
    el.remove();
  });
});
