import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { LoadError, expectedFailure } from './load-error';

describe('expectedFailure (U7a)', () => {
  it('only counts no network, 401 and 5xx as expected', () => {
    const http = (status: number) => new HttpErrorResponse({ status });

    expect([0, 401, 500, 503].map((s) => expectedFailure(http(s)))).toEqual([
      true,
      true,
      true,
      true,
    ]);
    expect([400, 403, 422, 200].map((s) => expectedFailure(http(s)))).toEqual([
      false,
      false,
      false,
      false,
    ]);
    expect(expectedFailure(new Error('parse'))).toBe(false);
  });
});

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
