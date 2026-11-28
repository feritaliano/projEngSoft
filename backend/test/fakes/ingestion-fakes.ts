import { createHash } from 'node:crypto';
import { LocalDate } from '../../src/shared/domain/local-date';
import {
  type IndexPoint,
  IndexValueWriter,
  LatestCloseDate,
  type MarketIndexCode,
  type QuotedAsset,
  QuoteWriter,
  type QuoteRow,
  type SgsIndexCode,
} from '../../src/modules/market-data/domain/market-data';
import {
  type Download,
  type IngestionSource,
  IngestionRuns,
  MarketSources,
  RawFiles,
  type RunEnd,
  type SourceFile,
  type SourceLock,
  SourceLocks,
} from '../../src/modules/ingestion/domain/ingestion-run';
import { linesOf } from '../factories/market-files.factory';

export interface FakeRun {
  readonly id: string;
  readonly source: IngestionSource;
  status: 'RUNNING' | RunEnd['status'];
  end?: RunEnd;
}

/** ops.ingestion_runs in memory, with the orphan rule of PrismaIngestionRuns. */
export class InMemoryIngestionRuns extends IngestionRuns {
  readonly runs: FakeRun[] = [];
  purgedBefore: Date[] = [];

  start(source: IngestionSource): Promise<string> {
    for (const run of this.runs) {
      if (run.source === source && run.status === 'RUNNING')
        run.status = 'FAILED';
    }
    const id = `run-${this.runs.length + 1}`;
    this.runs.push({ id, source, status: 'RUNNING' });
    return Promise.resolve(id);
  }

  loadedReferenceDate(
    source: IngestionSource,
    sha256: string,
  ): Promise<LocalDate | null> {
    // The latest successful load, as PrismaIngestionRuns.
    const run = this.runs.findLast(
      (r) =>
        r.source === source &&
        r.end?.status === 'SUCCEEDED' &&
        r.end.file.sha256 === sha256,
    );
    return Promise.resolve(
      run?.end?.status === 'SUCCEEDED' ? run.end.referenceDate : null,
    );
  }

  finish(runId: string, end: RunEnd): Promise<void> {
    const run = this.runs.find((r) => r.id === runId);
    if (!run) throw new Error(`no run ${runId}`);
    run.status = end.status;
    run.end = end;
    return Promise.resolve();
  }

  purgeUnsuccessfulBefore(before: Date): Promise<number> {
    this.purgedBefore.push(before);
    return Promise.resolve(0);
  }
}

export class FakeSourceLocks extends SourceLocks {
  readonly busy = new Set<IngestionSource>();
  readonly held = new Set<IngestionSource>();
  released = 0;

  tryAcquire(source: IngestionSource): Promise<SourceLock | null> {
    if (this.busy.has(source) || this.held.has(source))
      return Promise.resolve(null);
    this.held.add(source);
    return Promise.resolve({
      release: () => {
        this.held.delete(source);
        this.released++;
        return Promise.resolve();
      },
    });
  }
}

type Answer = Download | null | Error;

/** Answers of the sources by key ("cotahist:2026-11-25", "ibov:2026", "sgs:CDI"); a missing key is a 404. */
export class FakeMarketSources extends MarketSources {
  readonly answers = new Map<string, Answer>();
  readonly calls: string[] = [];

  cotahistDaily(day: LocalDate): Promise<Download | null> {
    return this.answer(`cotahist:${day.toString()}`);
  }

  ibovYear(year: number): Promise<Download | null> {
    return this.answer(`ibov:${year}`);
  }

  sgsSeries(
    code: SgsIndexCode,
    from: LocalDate,
    to: LocalDate,
  ): Promise<Download | null> {
    this.calls.push(`sgs:${code}:${from.toString()}:${to.toString()}`);
    return this.answer(`sgs:${code}`);
  }

  private answer(key: string): Promise<Download | null> {
    this.calls.push(key);
    const answer = this.answers.get(key) ?? null;
    return answer instanceof Error
      ? Promise.reject(answer)
      : Promise.resolve(answer);
  }
}

export function download(
  fileName: string,
  text: string,
  encoding: BufferEncoding = 'latin1',
): Download {
  return { fileName, bytes: Buffer.from(text, encoding) };
}

function sha256Of(bytes: Buffer): string {
  return createHash('sha256').update(bytes).digest('hex');
}

/** The bronze zone in memory: the "path" of a file is its name; local files are registered with `addLocal`. */
export class InMemoryRawFiles extends RawFiles {
  readonly files = new Map<string, Buffer>();

  save(folder: string, year: number, content: Download): Promise<SourceFile> {
    const bytes = Buffer.from(content.bytes);
    const sha256 = sha256Of(bytes);
    const name = `${folder}/${year}/${content.fileName}_${sha256}`;
    this.files.set(name, bytes);
    return Promise.resolve({ path: name, name, sha256 });
  }

  addLocal(path: string, text: string): void {
    this.files.set(path, Buffer.from(text, 'latin1'));
  }

  open(path: string): Promise<SourceFile> {
    return Promise.resolve({
      path,
      name: path,
      sha256: sha256Of(this.bytes(path)),
    });
  }

  readText(file: SourceFile, encoding: 'latin1' | 'utf8'): Promise<string> {
    return Promise.resolve(this.bytes(file.path).toString(encoding));
  }

  lines(file: SourceFile): AsyncIterable<string> {
    return linesOf(this.bytes(file.path).toString('latin1').split(/\r?\n/));
  }

  private bytes(path: string): Buffer {
    const bytes = this.files.get(path);
    if (!bytes) throw new Error(`ENOENT: ${path}`);
    return bytes;
  }
}

/** Quotes in memory, keyed by asset and date; counts a row only when it is new or changed, like the SQL upsert. */
export class InMemoryQuoteWriter extends QuoteWriter {
  readonly rows = new Map<string, QuoteRow>();
  readonly batches: number[] = [];

  constructor(private readonly assets: Record<string, QuotedAsset>) {
    super();
  }

  quotedAssets(): Promise<ReadonlyMap<string, QuotedAsset>> {
    return Promise.resolve(new Map(Object.entries(this.assets)));
  }

  upsert(rows: readonly QuoteRow[]): Promise<number> {
    this.batches.push(rows.length);
    let written = 0;
    for (const row of rows) {
      const key = `${row.assetId}|${row.date}`;
      if (JSON.stringify(this.rows.get(key)) !== JSON.stringify(row)) written++;
      this.rows.set(key, row);
    }
    return Promise.resolve(written);
  }
}

/** The last quote date of an InMemoryQuoteWriter, as PrismaLatestCloseDate reads it from quotes. */
export class InMemoryLatestCloseDate extends LatestCloseDate {
  constructor(private readonly quotes: InMemoryQuoteWriter) {
    super();
  }

  get(): Promise<LocalDate | null> {
    const dates = [...this.quotes.rows.values()].map((row) => row.date).sort();
    const last = dates.at(-1);
    return Promise.resolve(last ? LocalDate.parse(last) : null);
  }
}

export class InMemoryIndexValueWriter extends IndexValueWriter {
  readonly values = new Map<string, string>();

  upsert(
    code: MarketIndexCode,
    points: readonly IndexPoint[],
  ): Promise<number> {
    let written = 0;
    for (const point of points) {
      const key = `${code}|${point.date}`;
      if (this.values.get(key) !== point.value) written++;
      this.values.set(key, point.value);
    }
    return Promise.resolve(written);
  }
}

/** Catalog of the COTAHIST excerpt: PETR4, KNRI11, BOVA11 and AAPL34 as in the seed; MGLU3 and IBOV11 are not in it. */
export const EXCERPT_CATALOG: Record<string, QuotedAsset> = {
  PETR4: { assetId: 'petr4', isin: 'BRPETRACNPR6' },
  KNRI11: { assetId: 'knri11', isin: 'BRKNRICTF007' },
  BOVA11: { assetId: 'bova11', isin: 'BRBOVACTF003' },
  AAPL34: { assetId: 'aapl34', isin: 'BRAAPLBDR004' },
};
