import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ApiConfiguration } from '../../api/api-configuration';
import { operationsControllerCreate } from '../../api/fn/operations/operations-controller-create';
import { operationsControllerDelete } from '../../api/fn/operations/operations-controller-delete';
import { operationsControllerGet } from '../../api/fn/operations/operations-controller-get';
import { operationsControllerList } from '../../api/fn/operations/operations-controller-list';
import { operationsControllerPreview } from '../../api/fn/operations/operations-controller-preview';
import { operationsControllerUpdate } from '../../api/fn/operations/operations-controller-update';
import { brokersControllerList } from '../../api/fn/reference-data/brokers-controller-list';
import {
  AssetType,
  BrokerDto,
  CreateOperationDto,
  OperationDto,
  OperationPageDto,
  OperationPreview,
  PreviewOperationDto,
} from '../../api/models';

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

  /** GET of one operation, for the edit mode; 404 when it no longer exists or is another user's. */
  get(portfolioId: string, operationId: string): Observable<OperationDto> {
    return operationsControllerGet(this.http, this.rootUrl, { id: portfolioId, operationId }).pipe(
      map((r) => r.body),
    );
  }

  /** POST: 400 by field + code (D56), 422 with `violation` (RN07, RN10). */
  create(portfolioId: string, body: CreateOperationDto): Observable<OperationDto> {
    return operationsControllerCreate(this.http, this.rootUrl, { id: portfolioId, body }).pipe(
      map((r) => r.body),
    );
  }

  /** PATCH with the whole form: the backend recalculates from the earlier of the two dates (RN09). */
  update(
    portfolioId: string,
    operationId: string,
    body: CreateOperationDto,
  ): Observable<OperationDto> {
    return operationsControllerUpdate(this.http, this.rootUrl, {
      id: portfolioId,
      operationId,
      body,
    }).pipe(map((r) => r.body));
  }

  /** DELETE: 422 with `violation` when a later sell would exceed the position (RN10). */
  remove(portfolioId: string, operationId: string): Observable<void> {
    return operationsControllerDelete(this.http, this.rootUrl, {
      id: portfolioId,
      operationId,
    }).pipe(map(() => undefined));
  }

  /** Resumo da operação (D42): calculated as saving would, nothing saved. */
  preview(portfolioId: string, body: PreviewOperationDto): Observable<OperationPreview> {
    return operationsControllerPreview(this.http, this.rootUrl, { id: portfolioId, body }).pipe(
      map((r) => r.body),
    );
  }

  /** GET /brokers, by name. */
  brokers(): Observable<BrokerDto[]> {
    return brokersControllerList(this.http, this.rootUrl).pipe(map((r) => r.body));
  }
}
