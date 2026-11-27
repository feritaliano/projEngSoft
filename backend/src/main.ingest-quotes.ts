import { parseArgs } from 'node:util';
import {
  commandPath,
  period,
  runIngestCommand,
  UsageError,
} from './ingest-command';
import {
  IngestQuotes,
  type QuotesRun,
} from './modules/ingestion/application/ingest-quotes.use-case';

const USAGE = [
  'Usage: npm run ingest:quotes -- --file <COTAHIST_A2025.ZIP | COTAHIST_DDDMMAAAA.ZIP | .TXT>',
  '       npm run ingest:quotes -- --from AAAA-MM-DD --to AAAA-MM-DD',
].join('\n');

type Args = { file: string } | { range: ReturnType<typeof period> };

function parse(): Args {
  const { values } = parseArgs({
    options: {
      file: { type: 'string' },
      from: { type: 'string' },
      to: { type: 'string' },
    },
  });
  if (values.file !== undefined) {
    if (values.from !== undefined || values.to !== undefined) {
      throw new UsageError('--file does not take --from or --to');
    }
    return { file: commandPath(values.file) };
  }
  return { range: period(values.from, values.to) };
}

/**
 * npm run ingest:quotes (K6, D64): quotes of a local COTAHIST (annual or daily), or the reprocess of a period, downloading
 * each daily file to the bronze zone (history and plan B of the demonstration). One run of B3_COTAHIST per file.
 */
void runIngestCommand(
  'IngestQuotes',
  USAGE,
  parse,
  async (app, args, logger) => {
    const ingest = app.get(IngestQuotes);
    const runs: QuotesRun[] =
      'file' in args
        ? [await ingest.fromFile(args.file)]
        : await ingest.forPeriod(...args.range);
    for (const { outcome, report } of runs) {
      if (report && (report.outsideCatalog > 0 || report.rejected > 0)) {
        logger.log(
          {
            file: outcome.file,
            outsideCatalog: report.outsideCatalog,
            rejected: report.rejected,
            rejectedExamples: report.rejectedExamples,
          },
          'Quotes not loaded',
        );
      }
    }
    return runs.map((run) => run.outcome);
  },
);
