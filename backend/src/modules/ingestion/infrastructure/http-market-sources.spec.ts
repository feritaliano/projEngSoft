import { LocalDate } from '../../../shared/domain/local-date';
import { HttpMarketSources, readCapped } from './http-market-sources';

const day = (iso: string) => LocalDate.parse(iso);

describe('HttpMarketSources (D59 public sources)', () => {
  const sources = new HttpMarketSources();
  let fetchMock: jest.SpyInstance;

  const answer = (status: number, body = '') =>
    fetchMock.mockResolvedValueOnce(
      new Response(status === 404 || body === '' ? null : body, { status }),
    );

  beforeEach(() => {
    fetchMock = jest.spyOn(globalThis, 'fetch');
  });

  afterEach(() => jest.restoreAllMocks());

  it('downloads the daily COTAHIST by its B3 name', async () => {
    answer(200, 'zip bytes');

    const file = await sources.cotahistDaily(day('2026-11-25'));

    expect(fetchMock).toHaveBeenCalledWith(
      'https://bvmf.bmfbovespa.com.br/InstDados/SerHist/COTAHIST_D25112026.ZIP',
      expect.objectContaining({
        signal: expect.any(AbortSignal),
        redirect: 'error',
      }),
    );
    expect(file?.fileName).toBe('COTAHIST_D25112026.ZIP');
    expect(Buffer.from(file!.bytes).toString()).toBe('zip bytes');
  });

  it('answers null for a file not published (404)', async () => {
    answer(404);

    expect(await sources.cotahistDaily(day('2026-11-20'))).toBeNull();
  });

  it('throws on any other error status, with the start of the body', async () => {
    answer(406, 'janela maior que 10 anos');

    await expect(sources.cotahistDaily(day('2026-11-25'))).rejects.toThrow(
      'COTAHIST_D25112026.ZIP answered HTTP 406: janela maior que 10 anos',
    );
  });

  it.each([
    [
      'with its network code',
      Object.assign(new TypeError('fetch failed'), {
        cause: { code: 'ENOTFOUND' },
      }),
      'failed: fetch failed (ENOTFOUND)',
    ],
    ['without a code', new Error('timeout'), 'failed: timeout'],
  ])('names the URL of a network failure %s', async (_case, error, message) => {
    fetchMock.mockRejectedValueOnce(error);

    await expect(sources.cotahistDaily(day('2026-11-25'))).rejects.toThrow(
      `GET https://bvmf.bmfbovespa.com.br/InstDados/SerHist/COTAHIST_D25112026.ZIP ${message}`,
    );
  });

  it('decodes the base64 answer of the B3 index page', async () => {
    answer(200, Buffer.from('IBOV - 2026\r\n', 'latin1').toString('base64'));

    const file = await sources.ibovYear(2026);

    const query = Buffer.from(
      '{"index":"IBOV","language":"pt-br","year":"2026"}',
    ).toString('base64');
    expect(fetchMock.mock.calls[0][0]).toBe(
      `https://sistemaswebb3-listados.b3.com.br/indexStatisticsProxy/IndexCall/GetDownloadPortfolioDay/${query}`,
    );
    expect(file?.fileName).toBe('IBOV_2026.csv');
    expect(Buffer.from(file!.bytes).toString('latin1')).toBe('IBOV - 2026\r\n');
  });

  it.each([
    ['an empty body (year without data)', 200],
    ['a 404', 404],
  ])('answers null for the IBOV on %s', async (_case, status) => {
    answer(status);

    expect(await sources.ibovYear(2027)).toBeNull();
  });

  it('refuses an IBOV answer that is not base64', async () => {
    answer(200, '<html>erro</html>');

    await expect(sources.ibovYear(2026)).rejects.toThrow(
      'did not answer base64',
    );
  });

  it('asks the SGS for the period in DD/MM/AAAA and names the file by series and dates', async () => {
    answer(200, '[]');

    const file = await sources.sgsSeries(
      'IPCA',
      day('2025-01-01'),
      day('2025-12-31'),
    );

    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados?formato=json&dataInicial=01/01/2025&dataFinal=31/12/2025',
    );
    expect(file?.fileName).toBe('sgs433_IPCA_20250101_20251231.json');
  });

  it('answers null when the SGS has no value in the period (404)', async () => {
    answer(404);

    expect(
      await sources.sgsSeries('CDI', day('2026-11-21'), day('2026-11-22')),
    ).toBeNull();
  });

  describe('readCapped (a huge answer never exhausts the worker)', () => {
    it('refuses a body announced larger than the limit', async () => {
      const response = new Response('12345', {
        headers: { 'content-length': '5' },
      });

      await expect(readCapped(response, 4)).rejects.toThrow(
        'The answer is larger than 4 bytes',
      );
    });

    it('refuses a body that grows past the limit without announcing its size', async () => {
      const chunks = ['abc', 'def'].map((text) =>
        new TextEncoder().encode(text),
      );
      const body = new ReadableStream<Uint8Array>({
        pull(controller) {
          const chunk = chunks.shift();
          if (chunk) controller.enqueue(chunk);
          else controller.close();
        },
      });

      await expect(readCapped(new Response(body), 4)).rejects.toThrow(
        'The answer is larger than 4 bytes',
      );
    });

    it('reads a body within the limit', async () => {
      expect(
        Buffer.from(await readCapped(new Response('abcd'), 4)).toString(),
      ).toBe('abcd');
    });

    it('reads an empty body', async () => {
      expect(await readCapped(new Response(null), 4)).toHaveLength(0);
    });
  });
});
