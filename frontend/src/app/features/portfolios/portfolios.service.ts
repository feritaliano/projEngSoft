import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiConfiguration } from '../../api/api-configuration';
import { portfoliosControllerCreate } from '../../api/fn/portfolios/portfolios-controller-create';
import { portfoliosControllerDelete } from '../../api/fn/portfolios/portfolios-controller-delete';
import { portfoliosControllerGet } from '../../api/fn/portfolios/portfolios-controller-get';
import { portfoliosControllerList } from '../../api/fn/portfolios/portfolios-controller-list';
import { PortfolioDto } from '../../api/models';

/** Portfolios of the signed-in user (RN02): another user's portfolio answers 404. */
@Injectable({ providedIn: 'root' })
export class PortfoliosService {
  private readonly http = inject(HttpClient);
  private readonly rootUrl = inject(ApiConfiguration).rootUrl;

  /** GET /portfolios: in creation order, no pagination in the S1. */
  list(): Observable<PortfolioDto[]> {
    return portfoliosControllerList(this.http, this.rootUrl).pipe(map((r) => r.body));
  }

  get(id: string): Observable<PortfolioDto> {
    return portfoliosControllerGet(this.http, this.rootUrl, { id }).pipe(map((r) => r.body));
  }

  /** POST /portfolios: 400 (REQUIRED, TOO_LONG) and 409 (ALREADY_EXISTS) come with field "name". */
  create(name: string): Observable<PortfolioDto> {
    return portfoliosControllerCreate(this.http, this.rootUrl, { body: { name } }).pipe(
      map((r) => r.body),
    );
  }

  /** DELETE /portfolios/:id: the operations go with it (cascade). */
  remove(id: string): Observable<void> {
    return portfoliosControllerDelete(this.http, this.rootUrl, { id }).pipe(map(() => undefined));
  }
}
