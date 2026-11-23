import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

// Paths of the Figma icons (icon/Mais, icon/Adicionar, icon/Excluir, icon/Editar, icon/Abrir), stroked with
// currentColor to follow the theme.
const ICONS = {
  plus: { size: 16, path: 'M8 3.33333V8M8 8V12.6667M8 8H3.33333M8 8H12.6667' },
  add: { size: 18, path: 'M9 3.75V14.25M3.75 9H14.25' },
  edit: { size: 18, path: 'M10.125 4.875L13.125 7.875M3 15H6L14.25 6.75L11.25 3.75L3 12V15Z' },
  delete: {
    size: 18,
    path: 'M2.25 4.5H3.75M3.75 4.5H6M3.75 4.5L4.5 15H13.5L14.25 4.5M6 4.5H12M6 4.5V3H12V4.5M12 4.5H14.25M14.25 4.5H15.75M7.5 8.25V12.75M10.5 8.25V12.75',
  },
  open: { size: 18, path: 'M6.75 4.5L11.25 9L6.75 13.5' },
} as const;

export type IconName = keyof typeof ICONS;

/** Decorative icon of the design system: the accessible name is always on the button or link around it. */
@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex shrink-0' },
  template: `
    <svg
      aria-hidden="true"
      [attr.width]="icon().size"
      [attr.height]="icon().size"
      [attr.viewBox]="'0 0 ' + icon().size + ' ' + icon().size"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <path [attr.d]="icon().path" />
    </svg>
  `,
})
export class Icon {
  readonly name = input.required<IconName>();
  protected readonly icon = computed(() => ICONS[this.name()]);
}
