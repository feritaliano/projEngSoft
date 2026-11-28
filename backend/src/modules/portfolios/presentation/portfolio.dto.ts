import {
  ApiProperty,
  ApiPropertyOptional,
  ApiSchema,
  getSchemaPath,
} from '@nestjs/swagger';
import { IsString } from 'class-validator';
import type { MarketDataRef } from '../../market-data/domain/market-data';
import type {
  DerivedValue,
  PortfolioReturns,
} from '../../operations/domain/derived-value';
import { PORTFOLIO_NAME_MAX_LENGTH } from '../domain/portfolio';

// class-validator counts UTF-16 units, so the length is left to PortfolioName, which trims and counts characters like
// VARCHAR(150): blank is REQUIRED and over 150 is TOO_LONG { max: 150 } (D56), from the domain, with the same
// errors[].field. A cap in UTF-16 units here would answer TOO_LONG with a max the client cannot show.
// Fastify's body limit bounds the size of the request.
export class CreatePortfolioDto {
  @ApiProperty({
    example: 'Longo prazo',
    maxLength: PORTFOLIO_NAME_MAX_LENGTH,
    description:
      'RN02: unique per user (case-sensitive), trimmed, 1 to 150 characters.',
  })
  @IsString()
  name: string;
}

export class PortfolioDto {
  @ApiProperty({
    format: 'uuid',
    example: '3f1c2b9e-8d4a-4c6f-9b1e-2a7d5c8e0f13',
  })
  id: string;

  @ApiProperty({ example: 'Longo prazo' })
  name: string;

  @ApiProperty({
    example: 11,
    description:
      'Operations of the portfolio, counted in the query (D41). Shown when confirming the deletion: they go with it.',
  })
  operationCount: number;

  @ApiProperty({
    type: String,
    format: 'date',
    nullable: true,
    example: '2026-10-28',
    description:
      'Trade date of the most recent operation (header "9 operações · última em 28/10/2026"); null without operations.',
  })
  lastTradeDate: string | null;

  @ApiProperty({
    example: 6,
    description:
      'Assets with an open position (quantity > 0), derived from the operations by the position calculator (RN09); closed positions do not count.',
  })
  assetCount: number;

  // S1+ (D64). The schemas belong to operations: referenced by name, since a module imports only the
  // application and domain of another.

  @ApiPropertyOptional({
    allOf: [{ $ref: getSchemaPath('DerivedValue') }],
    description:
      'PORTFOLIO_EQUITY ("Patrimônio", B8): the same value as in GET /portfolios/{id}/summary.',
  })
  equity?: DerivedValue;

  @ApiPropertyOptional({
    allOf: [{ $ref: getSchemaPath('MarketData') }],
    description: 'Date and source of the close the equity used (D27).',
  })
  marketData?: MarketDataRef;

  @ApiPropertyOptional({
    allOf: [{ $ref: getSchemaPath('PortfolioReturns') }],
    description:
      'Rentabilidade total and 12 meses of the card (B10): the same as GET /portfolios/{id}/performance, without the chart.',
  })
  returns?: PortfolioReturns;
}

@ApiSchema({
  name: 'PortfolioTotals',
  description:
    'Header of the list of portfolios: "Patrimônio somado · dados de mercado de {closeDate}" (B8, D64).',
})
export class PortfolioTotalsDto {
  @ApiProperty({
    allOf: [{ $ref: getSchemaPath('DerivedValue') }],
    description:
      'USER_EQUITY: sum of the equity of every portfolio of the user; one `portfolios` input per portfolio (source PORTFOLIO), "0" without portfolios.',
  })
  equity: DerivedValue;

  @ApiProperty({
    allOf: [{ $ref: getSchemaPath('MarketData') }],
    description: 'Date and source of the close the equity used (D27).',
  })
  marketData: MarketDataRef;
}
