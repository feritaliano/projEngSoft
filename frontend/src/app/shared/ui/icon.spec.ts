import { TestBed } from '@angular/core/testing';
import { Icon } from './icon';

describe('Icon', () => {
  it('draws the Figma icon with currentColor, hidden from screen readers', async () => {
    const fixture = TestBed.createComponent(Icon);
    fixture.componentRef.setInput('name', 'delete');
    await fixture.whenStable();
    const svg: SVGElement = fixture.nativeElement.querySelector('svg');

    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('stroke')).toBe('currentColor');
    expect(svg.getAttribute('width')).toBe('18');
    expect(svg.querySelector('path')?.getAttribute('d')).toMatch(/^M2\.25 4\.5/);

    fixture.componentRef.setInput('name', 'plus');
    await fixture.whenStable();
    expect(svg.getAttribute('viewBox')).toBe('0 0 16 16');
  });
});
