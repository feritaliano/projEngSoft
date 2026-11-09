import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ASSET_TYPES } from '../../operations/domain/asset-type';
import type { AssetType } from '../../operations/domain/asset-type';
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE,
  MAX_PAGE_SIZE,
  SEARCH_TERM_MAX_LENGTH,
} from '../domain/catalog';

export class AssetSearchQueryDto {
  @ApiPropertyOptional({
    example: 'itausa',
    maxLength: SEARCH_TERM_MAX_LENGTH,
    description:
      'Part of the ticker or of the issuer name, ignoring case and accents. Empty lists the whole catalog.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(SEARCH_TERM_MAX_LENGTH)
  search?: string;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: MAX_PAGE,
    default: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE)
  page?: number;

  @ApiPropertyOptional({
    minimum: 1,
    maximum: MAX_PAGE_SIZE,
    default: DEFAULT_PAGE_SIZE,
    example: DEFAULT_PAGE_SIZE,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_PAGE_SIZE)
  pageSize?: number;
}

export class AssetDto {
  @ApiProperty({
    format: 'uuid',
    example: '6b0d3a52-1f5e-4f0a-9d7c-3e2b8a1c4d90',
  })
  id: string;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'ITSA4',
    description: 'Null for fixed income (D50).',
  })
  ticker: string | null;

  @ApiProperty({ enum: ASSET_TYPES, enumName: 'AssetType', example: 'STOCK' })
  assetType: AssetType;

  @ApiProperty({
    example: 'ITSA4',
    description:
      'Ticker for stocks, FIIs, ETFs and BDRs; name for crypto; bond type and maturity year for fixed income (D50).',
  })
  displayName: string;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'Itaúsa S.A.',
    description: 'Issuer name; null for crypto.',
  })
  issuer: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    example: 'Financeiro',
    description: 'Sector of the issuer, when it has one.',
  })
  sector: string | null;
}

export class AssetPageDto {
  @ApiProperty({ type: [AssetDto] })
  items: AssetDto[];

  @ApiProperty({
    example: 1,
    description: 'Assets matching the search, across all pages.',
  })
  total: number;
}

export class BrokerDto {
  @ApiProperty({
    format: 'uuid',
    example: '0c9e7f3a-5b2d-4e81-a6c4-9d1f2b3e4a57',
  })
  id: string;

  @ApiProperty({ example: 'XP Investimentos CCTVM S.A.' })
  name: string;

  @ApiProperty({
    type: String,
    nullable: true,
    example: '02332886000104',
    description: '14 digits; null for an exchange without CNPJ (D50).',
  })
  cnpj: string | null;
}
