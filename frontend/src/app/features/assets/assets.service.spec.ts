import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideApiConfiguration } from '../../api/api-configuration';
import { AssetsService } from './assets.service';

const API = 'http://api.test';

describe('AssetsService', () => {
  let http: HttpTestingController;
  let service: AssetsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideApiConfiguration(API)],
    });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(AssetsService);
  });

  afterEach(() => http.verify());

  it('searches 20 per page and leaves the search out when empty', () => {
    service.search('', 1).subscribe();
    const all = http.expectOne((r) => r.url === `${API}/api/v1/assets`);
    expect(all.request.params.keys()).toEqual(['page', 'pageSize']);
    expect(all.request.params.get('pageSize')).toBe('20');
    all.flush({ items: [], total: 0 });

    service.search('itausa', 2).subscribe();
    const search = http.expectOne((r) => r.url === `${API}/api/v1/assets`);
    expect(search.request.params.get('search')).toBe('itausa');
    expect(search.request.params.get('page')).toBe('2');
    search.flush({ items: [], total: 0 });
  });
});
