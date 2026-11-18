import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import {
  type CatalogBatchResult,
  type CatalogConflict,
  type CatalogEntry,
  CatalogWriter,
} from '../domain/catalog-entry';

/** Two loads at once wait for each other per batch; a batch of 500 entries takes milliseconds. */
const BATCH_OPTIONS = {
  isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
  maxWait: 30_000,
  timeout: 60_000,
};

/**
 * Upsert of the catalog by natural key (arquitetura 6.3), one transaction per batch, every statement on the same `tx`.
 * Issuer by name (the key the seed uses when there is no CNPJ): created if missing, never updated. Asset by ticker:
 * inserted, or updated only when a column differs, so a second load changes no row; its issuer is kept.
 */
@Injectable()
export class PrismaCatalogWriter extends CatalogWriter {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  upsert(entries: readonly CatalogEntry[]): Promise<CatalogBatchResult> {
    return this.prisma.$transaction(async (tx) => {
      // Serializes loads: the issuer NOT EXISTS below is not safe against a concurrent insert of the same name.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('catalog-load'))`;

      const conflicts = await tx.$queryRaw<CatalogConflict[]>`
        SELECT v.ticker, v.isin, a.ticker AS "existingTicker"
        FROM unnest(${entries.map((e) => e.ticker)}::text[], ${entries.map((e) => e.isin)}::text[]) AS v(ticker, isin)
        JOIN assets a ON a.isin = v.isin AND a.ticker IS DISTINCT FROM v.ticker`;
      const skipped = new Set(conflicts.map((c) => c.ticker));
      const rows = entries.filter((e) => !skipped.has(e.ticker));

      const issuersCreated = await tx.$executeRaw`
        INSERT INTO issuers (name, kind)
        SELECT DISTINCT ON (v.name) v.name, v.kind::issuer_kind
        FROM unnest(
          ${rows.map((e) => e.issuerName)}::text[],
          ${rows.map((e) => e.issuerKind)}::text[],
          ${rows.map((e) => e.ticker)}::text[]
        ) AS v(name, kind, ticker)
        WHERE NOT EXISTS (SELECT 1 FROM issuers i WHERE i.name = v.name)
          -- An existing asset keeps its issuer, so a renamed company would only leave an orphan issuer.
          AND NOT EXISTS (SELECT 1 FROM assets a WHERE a.ticker = v.ticker)
        ORDER BY v.name, v.kind`;

      const assetsWritten = await tx.$executeRaw`
        INSERT INTO assets (issuer_id, ticker, isin, type, share_class, bdr_program, is_active)
        -- CHECKs run on the candidate row before ON CONFLICT: an existing asset whose issuer name is new (and so was
        -- not created above) offers its own issuer, which the update keeps.
        SELECT COALESCE(
                 (SELECT i.id FROM issuers i WHERE i.name = v.issuer_name ORDER BY i.id LIMIT 1),
                 (SELECT a.issuer_id FROM assets a WHERE a.ticker = v.ticker)),
               v.ticker, v.isin, v.type::asset_type, v.share_class::share_class, v.bdr_program::bdr_program, v.is_active
        FROM unnest(
          ${rows.map((e) => e.ticker)}::text[],
          ${rows.map((e) => e.isin)}::text[],
          ${rows.map((e) => e.type)}::text[],
          ${rows.map((e) => e.shareClass)}::text[],
          ${rows.map((e) => e.bdrProgram)}::text[],
          ${rows.map((e) => e.isActive)}::boolean[],
          ${rows.map((e) => e.issuerName)}::text[]
        ) AS v(ticker, isin, type, share_class, bdr_program, is_active, issuer_name)
        ON CONFLICT (ticker) DO UPDATE SET
          isin = EXCLUDED.isin, type = EXCLUDED.type, share_class = EXCLUDED.share_class,
          bdr_program = EXCLUDED.bdr_program, is_active = EXCLUDED.is_active
        WHERE (assets.isin, assets.type, assets.share_class, assets.bdr_program, assets.is_active)
          IS DISTINCT FROM (EXCLUDED.isin, EXCLUDED.type, EXCLUDED.share_class, EXCLUDED.bdr_program, EXCLUDED.is_active)`;

      return { issuersCreated, assetsWritten, conflicts };
    }, BATCH_OPTIONS);
  }
}
