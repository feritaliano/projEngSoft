import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { PortfolioDto } from '../../api/models';

/**
 * Header of the Detail and of the History (frames 4 and 6): breadcrumb, name, line below it and PortfolioTabs (D45).
 * The tabs are links between routes with aria-current, not a tablist (U5); Proventos and Metas wait for S6 and S10.
 * Without the portfolio (loading or error), only the link to the list (U7a: the name may be what failed).
 */
@Component({
  selector: 'app-portfolio-header',
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-col gap-6' },
  template: `
    <nav aria-label="Trilha de navegação">
      <ol class="flex items-center gap-2 text-body-sm text-secondary">
        <li>
          <!-- Handoff U5: touch area of 44 px on mobile and 24 px on desktop, without changing the look. -->
          <a
            routerLink="/carteiras"
            class="inline-flex min-h-11 items-center text-label-md text-link hover:underline md:min-h-6"
            >Carteiras</a
          >
        </li>
        @if (portfolio(); as p) {
          <li aria-hidden="true">/</li>
          <li aria-current="page" class="truncate">{{ p.name }}</li>
        }
      </ol>
    </nav>
    @if (portfolio(); as p) {
      <div class="flex flex-col gap-1">
        <h1 tabindex="-1" class="break-words text-heading-lg text-primary md:text-heading-xl">
          {{ p.name }}
        </h1>
        <p class="text-body-sm text-secondary">{{ subtitle() }}</p>
      </div>
      <nav aria-label="Seções da carteira" class="flex gap-6 border-b border-default">
        @for (tab of tabs; track tab.path) {
          <a
            [routerLink]="['/carteiras', p.id].concat(tab.path)"
            routerLinkActive
            ariaCurrentWhenActive="page"
            [routerLinkActiveOptions]="{ exact: true }"
            class="border-b-3 border-transparent py-3 text-label-md text-secondary hover:text-primary current:border-primary current:text-link"
            >{{ tab.label }}</a
          >
        }
      </nav>
    }
  `,
})
export class PortfolioHeader {
  readonly portfolio = input.required<PortfolioDto | null>();
  /** Line below the name, which differs between the tabs (microcopy, section 11). */
  readonly subtitle = input('');

  protected readonly tabs = [
    { label: 'Resumo', path: [] as string[] },
    { label: 'Histórico', path: ['historico'] },
  ];
}
