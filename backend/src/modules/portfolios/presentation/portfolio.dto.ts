import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';
import { PORTFOLIO_NAME_MAX_LENGTH } from '../domain/portfolio';

// class-validator counts UTF-16 units, so the DTO only caps the size (150 characters are at most 300 units, e.g.
// emoji); PortfolioName trims and counts characters like VARCHAR(150) and is the final check (blank or over 150: a 400
// from the domain, with the same errors[].field).
export class CreatePortfolioDto {
  @ApiProperty({
    example: 'Longo prazo',
    maxLength: PORTFOLIO_NAME_MAX_LENGTH,
    description:
      'RN02: unique per user (case-sensitive), trimmed, 1 to 150 characters.',
  })
  @IsString()
  @MaxLength(PORTFOLIO_NAME_MAX_LENGTH * 2)
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
    example: 6,
    description:
      'Assets with an open position (quantity > 0), derived from the operations by the position calculator (RN09); closed positions do not count.',
  })
  assetCount: number;
}
