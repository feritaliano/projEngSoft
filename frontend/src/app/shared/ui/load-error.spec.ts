import { TestBed } from '@angular/core/testing';
import { LoadError } from './load-error';

describe('LoadError (U7a)', () => {
  it('announces the failure and asks to try again', async () => {
    const fixture = TestBed.createComponent(LoadError);
    fixture.componentRef.setInput('heading', 'Não conseguimos carregar esta carteira');
    fixture.componentRef.setInput('text', 'O servidor teve um problema.');
    const retry = vi.fn();
    fixture.componentInstance.retry.subscribe(retry);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('[role="alert"] h2')?.textContent).toBe(
      'Não conseguimos carregar esta carteira',
    );
    element.querySelector('button')?.click();
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
