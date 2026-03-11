import { IsArray, IsString, IsEnum, IsNotEmpty, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TaskStatus } from '@prisma/client';

export class BulkDeleteTasksDto {
    @ApiProperty({ description: 'Array of task IDs to delete', type: [String] })
    @IsArray()
    @ArrayMinSize(1)
    @IsString({ each: true })
    ids: string[];
}

export class BulkUpdateStatusDto {
    @ApiProperty({ description: 'Array of task IDs to update', type: [String] })
    @IsArray()
    @ArrayMinSize(1)
    @IsString({ each: true })
    ids: string[];

    @ApiProperty({ description: 'New status to apply', enum: TaskStatus })
    @IsEnum(TaskStatus)
    @IsNotEmpty()
    status: TaskStatus;
}

export class BulkAssignDto {
    @ApiProperty({ description: 'Array of task IDs to reassign', type: [String] })
    @IsArray()
    @ArrayMinSize(1)
    @IsString({ each: true })
    ids: string[];

    @ApiProperty({ description: 'Array of user IDs to assign', type: [String] })
    @IsArray()
    @IsString({ each: true })
    assignedToIds: string[];
}
