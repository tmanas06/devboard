import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsDateString } from 'class-validator';

export enum ExportFormat {
  CSV = 'csv',
  PDF = 'pdf',
}

export class ExportTimeEntriesDto {
  @ApiProperty({ enum: ExportFormat, example: 'csv' })
  @IsEnum(ExportFormat)
  format: ExportFormat;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ example: '2025-01-01T00:00:00Z' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2025-01-31T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
