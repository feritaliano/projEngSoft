import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Button } from './button';

@Component({
  imports: [Button],
  template: `
    <button appButton>Salvar</button>
    <a appButton variant="secondary" class="w-full" href="/x">Voltar</a>
  `,
})
class Host {}

describe('Button', () => {
  it('styles <button> as Primary by default and <a> as the chosen variant, keeping its own classes', async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const [primary, secondary] = [
      ...fixture.nativeElement.querySelectorAll('[appButton]'),
    ] as HTMLElement[];

    expect(primary.classList).toContain('bg-primary');
    expect(primary.classList).toContain('h-11');
    expect(secondary.classList).toContain('border-strong');
    expect(secondary.classList).not.toContain('bg-primary');
    expect(secondary.classList).toContain('w-full');
  });
});
