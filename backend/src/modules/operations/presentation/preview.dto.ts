import { ApiProperty, ApiPropertyOptional, ApiSchema } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { CreateOperationDto, RuleViolationDto } from './operation.dto';
import { DerivedValueDto } from './position.dto';

/** The body of POST operations, plus the operation being edited in edit mode (D42). */
export class PreviewOperationDto extends CreateOperationDto {
  @ApiPropertyOptional({
    format: 'uuid',
    example: '9a4e1c27-6d3b-4f80-b5a2-1e7c9d0f3b64',
    description:
      'Edit mode: the operation that this body replaces in the simulation. An operation that does not exist or belongs to another portfolio is a 400 with code NOT_FOUND on this field.',
  })
  @IsOptional()
  @IsUUID('all')
  replacesOperationId?: string;
}

@ApiSchema({
  name: 'OperationPreview',
  description:
    'Resumo da operação (D42, frame 5): calculated as saving would, nothing saved. Before and after are measured at the date of the operation.',
})
export class OperationPreviewDto {
  @ApiProperty({
    type: DerivedValueDto,
    description: 'OPERATION_GROSS: quantity × unit price.',
  })
  grossAmount: DerivedValueDto;

  @ApiProperty({
    type: DerivedValueDto,
    description:
      'OPERATION_TOTAL_BUY (gross + fees) on a buy; OPERATION_NET_SELL (gross − fees) on a sell.',
  })
  netAmount: DerivedValueDto;

  @ApiProperty({
    type: String,
    nullable: true,
    example: '100',
    description:
      'Units held before the operation, at its date (decimal string, no trace). Null only when the change breaks the timeline at an earlier sell (RN10, an edit that moves a buy past a sell that needed it).',
  })
  positionBefore: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    example: '150',
    description:
      'Units held after the operation, at its date. Null when the operation is itself the offending sell (RN07) or positionBefore is null.',
  })
  positionAfter: string | null;

  @ApiProperty({
    type: DerivedValueDto,
    nullable: true,
    description:
      'AVG_PRICE_BUY before the operation; null without units (RN08) or when positionBefore is null.',
  })
  averagePriceBefore: DerivedValueDto | null;

  @ApiProperty({
    type: DerivedValueDto,
    nullable: true,
    description:
      'AVG_PRICE_BUY after the operation (a sell keeps it, RN06); null without units after it (RN08) or when positionAfter is null.',
  })
  averagePriceAfter: DerivedValueDto | null;

  @ApiPropertyOptional({
    type: DerivedValueDto,
    nullable: true,
    description:
      'REALIZED_PROFIT (estimated): present on a sell only; null when positionAfter is null.',
  })
  realizedProfit?: DerivedValueDto | null;

  @ApiPropertyOptional({
    type: RuleViolationDto,
    description:
      'Present when saving would be rejected (RN07, RN10): the same object as the `violation` of the 422.',
  })
  violation?: RuleViolationDto;
}
