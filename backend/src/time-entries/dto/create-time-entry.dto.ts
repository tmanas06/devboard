import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsDateString,
  IsNumber,
  IsArray,
  Min,
  Max,
} from 'class-validator';

export class CreateTimeEntryDto {
  @ApiPropertyOptional({ example: 'org_cuid1234567890' })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiPropertyOptional({ example: 'user_cuid1234567890' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ example: ['task_cuid1', 'task_cuid2'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  taskIds?: string[];

  @ApiProperty({ example: '2025-01-07T09:00:00Z' })
  @IsNotEmpty()
  @IsDateString()
  startTime: string;

  @ApiProperty({ example: '2025-01-07T17:30:00Z' })
  @IsNotEmpty()
  @IsDateString()
  endTime: string;

  @ApiProperty({ example: 8.5 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0.1)
  @Max(24, { message: 'Maximum 24 hours allowed per entry' })
  hours: number;

  @ApiPropertyOptional({ example: 'Worked on user authentication feature' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  isBillable?: boolean;
}
