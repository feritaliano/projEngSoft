import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideApiConfiguration } from '../../api/api-configuration';
import { OperationsService } from './operations.service';

const API = 'http://api.test';

describe('OperationsService', () => {
  let http: HttpTestingController;
  let service: OperationsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration(API)],
    });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(OperationsService);
  });

  afterEach(() => http.verify());

  it('lists 50 per page and sends only the filters that are set (D45)', () => {
    service.list('p1', { assetId: '', brokerId: '', assetType: null }, 1).subscribe();
    const all = http.expectOne((r) => r.url === `${API}/api/v1/portfolios/p1/operations`);
    expect(all.request.params.keys()).toEqual(['page', 'pageSize']);
    expect(all.request.params.get('pageSize')).toBe('50');
    all.flush({ items: [], total: 0 });

    service.list('p1', { assetId: 'a1', brokerId: 'b1', assetType: 'FII' }, 2).subscribe();
    const filtered = http.expectOne((r) => r.url === `${API}/api/v1/portfolios/p1/operations`);
    expect(filtered.request.params.get('assetId')).toBe('a1');
    expect(filtered.request.params.get('brokerId')).toBe('b1');
    expect(filtered.request.params.get('assetType')).toBe('FII');
    expect(filtered.request.params.get('page')).toBe('2');
    filtered.flush({ items: [], total: 0 });
  });

  it('gets, creates, updates, deletes and previews an operation on the routes of the portfolio', () => {
    const body = {
      assetId: 'a1',
      brokerId: 'b1',
      type: 'BUY' as const,
      tradeDate: '2026-10-28',
      quantity: '50',
      unitPrice: '36.00',
      fees: '4.90',
    };
    const base = `${API}/api/v1/portfolios/p1/operations`;
    service.get('p1', 'o1').subscribe();
    http.expectOne({ method: 'GET', url: `${base}/o1` }).flush({});
    const sent = (method: string, url: string) => {
      const request = http.expectOne({ method, url });
      request.flush({});
      return request.request.body;
    };
    service.create('p1', body).subscribe();
    expect(sent('POST', base)).toEqual(body);
    service.update('p1', 'o1', body).subscribe();
    expect(sent('PATCH', `${base}/o1`)).toEqual(body);
    const edit = { ...body, replacesOperationId: 'o1' };
    service.preview('p1', edit).subscribe();
    expect(sent('POST', `${base}/preview`)).toEqual(edit);
    let removed = false;
    service.remove('p1', 'o1').subscribe(() => (removed = true));
    http
      .expectOne({ method: 'DELETE', url: `${base}/o1` })
      .flush(null, { status: 204, statusText: 'No Content' });

    expect(removed).toBe(true);
  });

  it('lists the brokers', () => {
    let brokers: unknown;
    service.brokers().subscribe((list) => (brokers = list));
    http.expectOne({ method: 'GET', url: `${API}/api/v1/brokers` }).flush([]);

    expect(brokers).toEqual([]);
  });
});
