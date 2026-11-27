import { parseArgs } from 'node:util';
import {
  commandPath,
  period,
  runIngestCommand,
  UsageError,
} from './ingest-command';
import { IngestIndexes } from './modules/ingestion/application/ingest-indexes.use-case';
import type { RunOutcome } from './modules/ingestion/application/ingestion-runner';
import { LocalDate } from './shared/domain/local-date';

const USAGE =
  'Usage: npm run ingest:indexes -- --from AAAA-MM-DD --to AAAA-MM-DD [--ibov-file <IBOV_AAAA.csv>]';

interface Args {
  readonly from: LocalDate;
  readonly to: LocalDate;
  readonly ibovFile?: string;
}

function parse(): Args {
  const { values } = parseArgs({
    options: {
      from: { type: 'string' },
      to: { type: 'string' },
      'ibov-file': { type: 'string' },
    },
  });
  const [from, to] = period(values.from, values.to);
  const ibovFile = values['ibov-file'];
  if (
    ibovFile !== undefined &&
    from.toString().slice(0, 4) !== to.toString().slice(0, 4)
  ) {
    throw new UsageError(
      '--ibov-file holds one year: give --from and --to of that year',
    );
  }
  return { from, to, ibovFile: ibovFile && commandPath(ibovFile) };
}

/**
 * npm run ingest:indexes (K6, D64): CDI and IPCA from the BCB SGS and the Ibovespa from the B3 index page, for a period
 * (e.g. a whole year), downloaded to the bronze zone; the Ibovespa can come from a CSV already downloaded instead.
 */
void runIngestCommand('IngestIndexes', USAGE, parse, async (app, args) => {
  const ingest = app.get(IngestIndexes);
  const outcomes: RunOutcome[] = [
    await ingest.sgs('CDI', args.from, args.to),
    await ingest.sgs('IPCA', args.from, args.to),
  ];
  // The B3 publishes one Ibovespa file per year.
  const [first, last] = [args.from, args.to].map((d) =>
    Number(d.toString().slice(0, 4)),
  );
  for (let year = first; year <= last; year++) {
    const from = year === first ? args.from : LocalDate.parse(`${year}-01-01`);
    const to = year === last ? args.to : LocalDate.parse(`${year}-12-31`);
    outcomes.push(await ingest.ibov(from, to, { localFile: args.ibovFile }));
  }
  return outcomes;
});
