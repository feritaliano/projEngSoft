import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';
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
}
