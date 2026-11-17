import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiConfiguration } from '../../api/api-configuration';
import { assetsControllerSearch } from '../../api/fn/reference-data/assets-controller-search';
import { AssetPageDto } from '../../api/models';

/** Assets per page of the catalog (API default 20, maximum 100). */
export const CATALOG_PAGE_SIZE = 20;

@Injectable({ providedIn: 'root' })
export class AssetsService {
  private readonly http = inject(HttpClient);
  private readonly rootUrl = inject(ApiConfiguration).rootUrl;

  /**
   * GET /assets: by ticker or issuer name, ignoring case and accents, in ticker order; an empty search lists the
   * whole catalog.
   */
  search(search: string, page: number): Observable<AssetPageDto> {
    return assetsControllerSearch(this.http, this.rootUrl, {
      search: search || undefined,
      page,
      pageSize: CATALOG_PAGE_SIZE,
    }).pipe(map((r) => r.body));
  }
}
