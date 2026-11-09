import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { isAssetType } from '../../operations/domain/asset-type';
import {
  AssetCatalog,
  AssetRecord,
  AssetSearch,
  InconsistentAssetError,
} from '../domain/catalog';

interface AssetRow {
  id: string;
  ticker: string | null;
  type: string;
  issuer: string | null;
  sector: string | null;
  crypto_name: string | null;
  fixed_income_type: string | null;
  maturity_date: Date | null;
}

const FROM_ACTIVE_ASSETS = Prisma.sql`
  FROM assets a
  LEFT JOIN issuers i ON i.id = a.issuer_id
  LEFT JOIN sectors s ON s.id = i.sector_id
  LEFT JOIN crypto_assets c ON c.asset_id = a.id
  LEFT JOIN fixed_income_bonds fb ON fb.asset_id = a.id
  LEFT JOIN fixed_income_types ft ON ft.id = fb.fixed_income_type_id
  WHERE a.is_active`;

const SELECT_ASSET = Prisma.sql`
  SELECT a.id, a.ticker, a.type::text AS type, i.name AS issuer, s.name AS sector, c.name AS crypto_name,
         ft.name AS fixed_income_type, fb.maturity_date`;

/** `%`, `_` and `\` typed by the user are literal characters, not LIKE wildcards. */
function containsPattern(term: string): string {
  return `%${term.toLowerCase().replace(/[\\%_]/g, '\\$&')}%`;
}

/** Ticker or issuer name containing the term, ignoring case and accents (unaccent). */
function searchFilter(term: string | null): Prisma.Sql {
  if (term === null) {
    return Prisma.empty;
  }
  const pattern = containsPattern(term);
  return Prisma.sql`
    AND (unaccent(lower(a.ticker)) LIKE unaccent(${pattern}::text)
      OR unaccent(lower(i.name)) LIKE unaccent(${pattern}::text))`;
}

function toRecord(row: AssetRow): AssetRecord {
  if (!isAssetType(row.type)) {
    throw new InconsistentAssetError(row.id, `has unknown type ${row.type}`);
  }
  return {
    id: row.id,
    ticker: row.ticker,
    assetType: row.type,
    issuer: row.issuer,
    sector: row.sector,
    cryptoName: row.crypto_name,
    fixedIncomeTypeName: row.fixed_income_type,
    // maturity_date is a DATE: Prisma returns it at UTC midnight.
    maturityDate: row.maturity_date?.toISOString().slice(0, 10) ?? null,
  };
}

/** Read-only query service of the catalog (CQRS, D25): parameterized SQL, never concatenated. */
@Injectable()
export class PrismaAssetCatalog extends AssetCatalog {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async search(
    search: AssetSearch,
  ): Promise<{ records: AssetRecord[]; total: number }> {
    const filter = searchFilter(search.term);
    const [rows, [{ total }]] = await Promise.all([
      this.prisma.$queryRaw<AssetRow[]>`
        ${SELECT_ASSET} ${FROM_ACTIVE_ASSETS} ${filter}
        ORDER BY a.ticker ASC NULLS LAST, ft.name, fb.maturity_date, a.id
        LIMIT ${search.pageSize} OFFSET ${(search.page - 1) * search.pageSize}`,
      this.prisma.$queryRaw<{ total: number }[]>`
        SELECT count(*)::int AS total ${FROM_ACTIVE_ASSETS} ${filter}`,
    ]);
    return { records: rows.map(toRecord), total };
  }

  async findByTicker(ticker: string): Promise<AssetRecord | null> {
    const [row] = await this.prisma.$queryRaw<AssetRow[]>`
      ${SELECT_ASSET} ${FROM_ACTIVE_ASSETS} AND a.ticker = ${ticker}`;
    return row ? toRecord(row) : null;
  }
}
