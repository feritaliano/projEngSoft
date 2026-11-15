import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ErrorHandler } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideApiConfiguration } from '../../api/api-configuration';
import { PortfolioDetailPage } from './portfolio-detail-page';

const API = 'http://api.test';

describe('PortfolioDetailPage (placeholder until the W4a)', () => {
  let http: HttpTestingController;
  let handleError: ReturnType<typeof vi.fn>;

  const open = async (status: 200 | 404 | 500) => {
    const harness = await RouterTestingHarness.create('/carteiras/p1');
    const request = http.expectOne({ method: 'GET', url: `${API}/api/v1/portfolios/p1` });
    if (status === 200) {
      request.flush({
        id: 'p1',
        name: 'Longo prazo',
        operationCount: 11,
        assetCount: 6,
        lastTradeDate: null,
      });
    } else {
      request.flush({ title: 'Error', status }, { status, statusText: 'Error' });
    }
    await harness.fixture.whenStable();
    return harness.routeNativeElement as HTMLElement;
  };

  beforeEach(() => {
    handleError = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideApiConfiguration(API),
        provideRouter([{ path: 'carteiras/:id', component: PortfolioDetailPage }]),
        { provide: ErrorHandler, useValue: { handleError } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('shows the name of the portfolio', async () => {
    const element = await open(200);

    expect(element.querySelector('h1')?.textContent?.trim()).toBe('Longo prazo');
  });

  it('shows the 404 page for a portfolio that does not exist or belongs to another user (RN02)', async () => {
    const element = await open(404);

    expect(element.querySelector('h1')?.textContent?.trim()).toBe('Página não encontrada');
    expect(handleError).not.toHaveBeenCalled();
  });

  it('reports an unexpected failure', async () => {
    await open(500);

    expect(handleError).toHaveBeenCalledTimes(1);
  });
});
