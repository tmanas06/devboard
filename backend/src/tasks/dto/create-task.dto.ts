import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsDateString,
  IsArray,
  MinLength,
  MaxLength,
} from 'class-validator';
import { TaskStatus, TaskPriority } from '@prisma/client';

export class CreateTaskDto {
  @ApiPropertyOptional({ example: 'cuid1234567890' })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiPropertyOptional({ example: ['user_cuid1', 'user_cuid2'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  assignedToIds?: string[];

  @ApiProperty({ example: 'Implement user authentication' })
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({ example: 'Add JWT-based authentication with refresh tokens' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: TaskStatus, example: TaskStatus.TODO })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({ enum: TaskPriority, example: TaskPriority.MEDIUM })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({ example: 8.5 })
  @IsOptional()
  @IsNumber()
  estimatedHours?: number;

  @ApiPropertyOptional({ example: '2025-12-31T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  boardOrder?: number;

  @ApiPropertyOptional({ example: ['task_cuid1', 'task_cuid2'], type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  blockedByIds?: string[];
}
