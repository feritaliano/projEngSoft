import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiConfiguration } from '../../api/api-configuration';
import { operationsControllerList } from '../../api/fn/operations/operations-controller-list';
import { brokersControllerList } from '../../api/fn/reference-data/brokers-controller-list';
import { AssetType, BrokerDto, OperationPageDto } from '../../api/models';

/** Handoff U5: 50 operations per page in the History, with "Carregar mais". */
export const HISTORY_PAGE_SIZE = 50;

/** Filters of the History ('' and null = all); the backend applies them to every page. */
export interface OperationFilters {
  assetId: string;
  brokerId: string;
  assetType: AssetType | null;
}

@Injectable({ providedIn: 'root' })
export class OperationsService {
  private readonly http = inject(HttpClient);
  private readonly rootUrl = inject(ApiConfiguration).rootUrl;

  /** GET /portfolios/:id/operations: most recent first (trade date, then order of entry). */
  list(portfolioId: string, filters: OperationFilters, page: number): Observable<OperationPageDto> {
    return operationsControllerList(this.http, this.rootUrl, {
      id: portfolioId,
      assetId: filters.assetId || undefined,
      brokerId: filters.brokerId || undefined,
      assetType: filters.assetType ?? undefined,
      page,
      pageSize: HISTORY_PAGE_SIZE,
    }).pipe(map((r) => r.body));
  }

  /** GET /brokers, by name. */
  brokers(): Observable<BrokerDto[]> {
    return brokersControllerList(this.http, this.rootUrl).pipe(map((r) => r.body));
  }
}
