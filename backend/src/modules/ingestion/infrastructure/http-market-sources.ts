import { Injectable } from '@nestjs/common';
import type { LocalDate } from '../../../shared/domain/local-date';
import { type Download, MarketSources } from '../domain/ingestion-run';
import { SourceFileError } from '../domain/instruments-file';

/** Daily COTAHIST, file COTAHIST_DDDMMAAAA.ZIP (fontes-poc, file 1). */
const COTAHIST_URL = 'https://bvmf.bmfbovespa.com.br/InstDados/SerHist/';
/** Download button of the B3 index page; the path is the base64 of {"index","language","year"} (fontes-poc, file 3). */
const IBOV_URL =
  'https://sistemaswebb3-listados.b3.com.br/indexStatisticsProxy/IndexCall/GetDownloadPortfolioDay/';
const SGS_URL = 'https://api.bcb.gov.br/dados/serie/bcdata.sgs.';
const SGS_SERIES = { CDI: 12, IPCA: 433 } as const;
const TIMEOUT_MS = 120_000;
const BASE64 = /^[A-Za-z0-9+/]*={0,2}$/;

/** YYYY-MM-DD → [DD, MM, YYYY]. */
const parts = (day: LocalDate) => day.toString().split('-').reverse();

/**
 * The public sources of D59 over HTTPS (no aggregator, no real-time quote). 404 means the source has no data (file not
 * published yet, day without trading, period without values); any other non-2xx status or a network error throws, and
 * the run ends as FAILED.
 */
@Injectable()
export class HttpMarketSources extends MarketSources {
  async cotahistDaily(day: LocalDate): Promise<Download | null> {
    const fileName = `COTAHIST_D${parts(day).join('')}.ZIP`;
    const bytes = await this.get(COTAHIST_URL + fileName);
    return bytes && { fileName, bytes };
  }

  async ibovYear(year: number): Promise<Download | null> {
    const query = Buffer.from(
      JSON.stringify({ index: 'IBOV', language: 'pt-br', year: String(year) }),
    ).toString('base64');
    const body = await this.get(IBOV_URL + query);
    // The answer is the CSV in base64; a year without data answers 200 with an empty body.
    const text = body ? Buffer.from(body).toString('ascii').trim() : '';
    if (text === '') return null;
    if (!BASE64.test(text)) {
      throw new SourceFileError('The B3 index page did not answer base64');
    }
    return {
      fileName: `IBOV_${year}.csv`,
      bytes: Buffer.from(text, 'base64'),
    };
  }

  async sgsSeries(
    code: 'CDI' | 'IPCA',
    from: LocalDate,
    to: LocalDate,
  ): Promise<Download | null> {
    const series = SGS_SERIES[code];
    const bytes = await this.get(
      `${SGS_URL}${series}/dados?formato=json` +
        `&dataInicial=${parts(from).join('/')}&dataFinal=${parts(to).join('/')}`,
    );
    const compact = (day: LocalDate) => day.toString().replaceAll('-', '');
    return (
      bytes && {
        fileName: `sgs${series}_${code}_${compact(from)}_${compact(to)}.json`,
        bytes,
      }
    );
  }

  private async get(url: string): Promise<Uint8Array | null> {
    let response: Response;
    let bytes: ArrayBuffer;
    try {
      response = await fetch(url, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { 'user-agent': 'carteira-b3-worker' },
      });
      if (response.status === 404) return null;
      bytes = await response.arrayBuffer();
    } catch (error) {
      // "fetch failed" alone says nothing in ops.ingestion_runs.error: add the URL and the network code.
      const cause = (error as { cause?: { code?: string } }).cause?.code;
      throw new Error(
        `GET ${url} failed: ${(error as Error).message}${cause ? ` (${cause})` : ''}`,
        { cause: error },
      );
    }
    if (!response.ok) {
      // The body tells why (e.g. the SGS limit of 10 years per query of a daily series).
      const body = Buffer.from(bytes).toString('utf8').slice(0, 300);
      throw new Error(`GET ${url} answered HTTP ${response.status}: ${body}`);
    }
    return new Uint8Array(bytes);
  }
}
