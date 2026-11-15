import { TestBed } from '@angular/core/testing';
import { IconButton, TOOLTIP_DELAY_MS } from './icon-button';

describe('IconButton', () => {
  const render = async (icon: 'delete' | 'open' = 'delete') => {
    const fixture = TestBed.createComponent(IconButton);
    fixture.componentRef.setInput('icon', icon);
    fixture.componentRef.setInput('tooltip', 'Excluir carteira');
    fixture.componentRef.setInput('label', 'Excluir carteira Longo prazo');
    await fixture.whenStable();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    const tooltip = () =>
      fixture.nativeElement.querySelector('[role="tooltip"]') as HTMLElement | null;
    return { fixture, button, tooltip };
  };

  afterEach(() => vi.useRealTimers());

  it('is named by the tooltip text + the target, with the icon hidden (D51)', async () => {
    const { button, tooltip } = await render();

    expect(button.type).toBe('button');
    expect(button.getAttribute('aria-label')).toBe('Excluir carteira Longo prazo');
    expect(button.getAttribute('aria-describedby')).toBeNull();
    expect(button.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
    expect(button.classList).toContain('text-negative');
    expect(tooltip()).toBeNull();
  });

  it('uses the neutral colors for the other icons', async () => {
    const { button } = await render('open');

    expect(button.classList).toContain('text-secondary');
    expect(button.classList).not.toContain('text-negative');
  });

  it('shows the tooltip 300 ms after keyboard focus and hides it on Esc, keeping the focus', async () => {
    const { fixture, button, tooltip } = await render();
    vi.useFakeTimers();
    document.body.appendChild(fixture.nativeElement);

    button.focus();
    vi.advanceTimersByTime(TOOLTIP_DELAY_MS - 1);
    fixture.detectChanges();
    expect(tooltip()).toBeNull();

    vi.advanceTimersByTime(1);
    fixture.detectChanges();
    expect(tooltip()?.getAttribute('role')).toBe('tooltip');
    expect(tooltip()?.textContent?.trim()).toBe('Excluir carteira');

    button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(tooltip()).toBeNull();
    expect(document.activeElement).toBe(button);
  });

  it('shows the tooltip on hover and hides it when the pointer leaves', async () => {
    const { fixture, button, tooltip } = await render();
    vi.useFakeTimers();

    button.dispatchEvent(new MouseEvent('mouseenter'));
    vi.advanceTimersByTime(TOOLTIP_DELAY_MS);
    fixture.detectChanges();
    expect(tooltip()).not.toBeNull();

    button.dispatchEvent(new MouseEvent('mouseleave'));
    fixture.detectChanges();
    expect(tooltip()).toBeNull();
  });
});
