import type { LocalDate } from '../../../shared/domain/local-date';
import type { SgsIndexCode } from '../../market-data/domain/market-data';

/**
 * Source codes of ops.ingestion_runs, one run per execution and source (BD-3). The table only checks the format
 * (CHECK ingestion_runs_source_check: upper case, digits and _); the list of sources lives here.
 */
export const DAILY_SOURCES = [
  'B3_COTAHIST',
  'B3_IBOV',
  'BCB_SGS_CDI',
  'BCB_SGS_IPCA',
] as const;
export type IngestionSource = (typeof DAILY_SOURCES)[number];

/** A file of the bronze zone (arquitetura 3.1), or a local file given to a command. */
export interface SourceFile {
  readonly path: string;
  /** Recorded in ingestion_runs.file_name: path inside the bronze folder, or the base name of a local file. */
  readonly name: string;
  readonly sha256: string;
}

export type RunEnd =
  | {
      readonly status: 'SUCCEEDED';
      readonly file: SourceFile;
      readonly referenceDate: LocalDate;
      readonly rowsRead: number;
      readonly rowsWritten: number;
      readonly rowsRejected: number;
    }
  | {
      readonly status: 'NO_FILE';
      readonly referenceDate: LocalDate;
      readonly file?: SourceFile;
    }
  | {
      readonly status: 'FAILED';
      readonly error: string;
      readonly file?: SourceFile;
    };

/** Port: ops.ingestion_runs (ingestion owns it, arquitetura 7.2). */
export abstract class IngestionRuns {
  /**
   * Opens a RUNNING run of the source. Call only while holding the source lock: a RUNNING run found then was left by a
   * worker that stopped, and is closed as FAILED first.
   */
  abstract start(source: IngestionSource): Promise<string>;

  /** Reference date of an earlier successful load of this file (same hash) from the source, or null (D27). */
  abstract loadedReferenceDate(
    source: IngestionSource,
    sha256: string,
  ): Promise<LocalDate | null>;

  abstract finish(runId: string, end: RunEnd): Promise<void>;

  /** Deletes NO_FILE and FAILED runs started before the instant; SUCCEEDED runs stay, they make files idempotent. */
  abstract purgeUnsuccessfulBefore(before: Date): Promise<number>;
}

export interface SourceLock {
  release(): Promise<void>;
}

/** Port: one ingestion of a source at a time, across processes (advisory lock, D24). */
export abstract class SourceLocks {
  /** null when another process holds the lock of the source. */
  abstract tryAcquire(source: IngestionSource): Promise<SourceLock | null>;
}

/** A file as downloaded: name of the source (e.g. COTAHIST_D25112026.ZIP) and its bytes. */
export interface Download {
  readonly fileName: string;
  readonly bytes: Uint8Array;
}

/** Port: the public files of the B3 and the BCB SGS API (D59). Each returns null when the source has no data (404). */
export abstract class MarketSources {
  /** Daily COTAHIST (ZIP); null when not published yet or when there was no trading that day. */
  abstract cotahistDaily(day: LocalDate): Promise<Download | null>;

  /** Yearly Ibovespa file of the B3 index page, decoded CSV (Latin-1). */
  abstract ibovYear(year: number): Promise<Download | null>;

  /** JSON of an SGS series between two dates (CDI: 12; IPCA: 433). */
  abstract sgsSeries(
    code: SgsIndexCode,
    from: LocalDate,
    to: LocalDate,
  ): Promise<Download | null>;
}

/** Port: the bronze zone (data/raw, arquitetura 3.1) and local files given to the commands. */
export abstract class RawFiles {
  /** Saves a download, once, as <folder>/<year>/<name>_<sha256>.<ext>; a file already there is never rewritten. */
  abstract save(
    folder: string,
    year: number,
    download: Download,
  ): Promise<SourceFile>;

  abstract open(path: string): Promise<SourceFile>;

  abstract readText(
    file: SourceFile,
    encoding: 'latin1' | 'utf8',
  ): Promise<string>;

  /** Lines of a COTAHIST, from a ZIP with one file or from the TXT, read as Latin-1 without loading it whole. */
  abstract lines(file: SourceFile): AsyncIterable<string>;
}
