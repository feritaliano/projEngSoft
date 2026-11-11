import { ChangeDetectionStrategy, Component } from '@angular/core';

// shortcut: title only, so the navigation has a destination; the list (frame 3) is the W3.
@Component({
  selector: 'app-portfolios-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<h1 class="pb-12 pt-4 text-heading-lg text-primary md:pt-8 md:text-heading-xl">
    Suas carteiras
  </h1>`,
})
export class PortfoliosPage {}
