import { ChangeDetectionStrategy, Component } from '@angular/core';

// shortcut: title only, so the navigation has a destination; the catalog (frame 7) is the W4.
@Component({
  selector: 'app-assets-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<h1 class="pb-12 pt-4 text-heading-lg text-primary md:pt-8 md:text-heading-xl">
    Ativos
  </h1>`,
})
export class AssetsPage {}
