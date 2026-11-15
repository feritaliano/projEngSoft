import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, ErrorHandler, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { PortfolioDto } from '../../api/models';
import { NotFoundPage } from '../../core/layout/not-found-page';
import { PortfoliosService } from './portfolios.service';

// shortcut: only the name, so the cards of the list have a destination; the Detail (frame 4) is the W4a.
@Component({
  selector: 'app-portfolio-detail-page',
  imports: [NotFoundPage],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (notFound()) {
      <app-not-found-page />
    } @else if (portfolio(); as p) {
      <h1 class="pb-12 pt-4 text-heading-lg text-primary md:pt-8 md:text-heading-xl">
        {{ p.name }}
      </h1>
    }
  `,
})
export class PortfolioDetailPage {
  protected readonly portfolio = signal<PortfolioDto | null>(null);
  protected readonly notFound = signal(false);

  constructor() {
    const errors = inject(ErrorHandler);
    const id = inject(ActivatedRoute).snapshot.paramMap.get('id') ?? '';
    inject(PortfoliosService)
      .get(id)
      .subscribe({
        next: (portfolio) => this.portfolio.set(portfolio),
        error: (error: unknown) => {
          // 404 also for another user's portfolio or a malformed id (RN02).
          if (error instanceof HttpErrorResponse && error.status === 404) this.notFound.set(true);
          else if (!(error instanceof HttpErrorResponse && error.status === 0))
            errors.handleError(error);
        },
      });
  }
}
