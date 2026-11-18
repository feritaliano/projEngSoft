import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Badge } from './badge';

@Component({
  imports: [Badge],
  template: `<app-badge>Ação</app-badge><app-badge tone="warning">Venda</app-badge>`,
})
class Host {}

describe('Badge', () => {
  it('shows the text with the colors of its tone', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const [neutral, warning] = fixture.nativeElement.querySelectorAll('app-badge');

    expect(neutral.textContent.trim()).toBe('Ação');
    expect(neutral.classList).toContain('bg-subtle');
    expect(warning.textContent.trim()).toBe('Venda');
    expect(warning.classList).toContain('bg-warning-subtle');
  });
});
