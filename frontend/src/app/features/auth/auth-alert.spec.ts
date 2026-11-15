import { TestBed } from '@angular/core/testing';
import { AuthAlert, TOO_MANY_ATTEMPTS } from './auth-alert';

describe('AuthAlert', () => {
  it('announces the title and the text as an alert', async () => {
    const fixture = TestBed.createComponent(AuthAlert);
    fixture.componentRef.setInput('heading', TOO_MANY_ATTEMPTS.heading);
    fixture.componentRef.setInput('text', TOO_MANY_ATTEMPTS.text);
    await fixture.whenStable();

    const alert: HTMLElement = fixture.nativeElement.querySelector('[role="alert"]');
    expect(alert.querySelectorAll('p')[0].textContent?.trim()).toBe('Muitas tentativas seguidas.');
    expect(alert.querySelectorAll('p')[1].textContent?.trim()).toBe(
      'Aguarde 1 minuto e tente de novo.',
    );
  });
});
