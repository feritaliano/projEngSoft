import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideApiConfiguration } from '../../api/api-configuration';
import { PortfolioDto } from '../../api/models';
import { PortfoliosService } from './portfolios.service';

const API = 'http://api.test';
const LONGO: PortfolioDto = {
  id: 'p1',
  name: 'Longo prazo',
  operationCount: 11,
  assetCount: 6,
  lastTradeDate: '2026-10-28',
};

describe('PortfoliosService', () => {
  let http: HttpTestingController;
  let service: PortfoliosService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration(API)],
    });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(PortfoliosService);
  });

  afterEach(() => http.verify());

  it('lists, gets, creates and deletes through the generated client', () => {
    const seen: unknown[] = [];
    service.list().subscribe((list) => seen.push(list));
    http.expectOne({ method: 'GET', url: `${API}/api/v1/portfolios` }).flush([LONGO]);

    service.get('p1').subscribe((p) => seen.push(p));
    http.expectOne({ method: 'GET', url: `${API}/api/v1/portfolios/p1` }).flush(LONGO);

    service.create('Longo prazo').subscribe((p) => seen.push(p));
    const create = http.expectOne({ method: 'POST', url: `${API}/api/v1/portfolios` });
    expect(create.request.body).toEqual({ name: 'Longo prazo' });
    create.flush(LONGO, { status: 201, statusText: 'Created' });

    service.remove('p1').subscribe(() => seen.push('deleted'));
    http
      .expectOne({ method: 'DELETE', url: `${API}/api/v1/portfolios/p1` })
      .flush(null, { status: 204, statusText: 'No Content' });

    expect(seen).toEqual([[LONGO], LONGO, LONGO, 'deleted']);
  });
});
