import { ChangeDetectionStrategy, Component, ElementRef, viewChild } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppHeader } from './app-header';
import { ConnectionBanner } from './connection-banner';

/** Frame L: header, connection banner and the page; desktop content is 1120 px wide and centered. */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, AppHeader, ConnectionBanner],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <a
      href="#conteudo"
      class="absolute left-4 top-2 z-30 -translate-y-24 rounded-md bg-surface px-4 py-2 text-label-md text-link shadow-overlay focus:translate-y-0"
      (click)="skipToContent($event)"
      >Ir para o conteúdo</a
    >
    <app-header />
    <app-connection-banner />
    <main #main id="conteudo" tabindex="-1" class="px-4 md:px-8">
      <div class="mx-auto max-w-280">
        <router-outlet />
      </div>
    </main>
  `,
})
export class Shell {
  private readonly main = viewChild.required<ElementRef<HTMLElement>>('main');

  /** With <base href="/">, a plain #fragment link would navigate away; focus the content instead. */
  protected skipToContent(event: Event): void {
    event.preventDefault();
    this.main().nativeElement.focus();
  }
}
