import { IsArray, IsString, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BulkDeleteTimeEntriesDto {
    @ApiProperty({ description: 'Array of time entry IDs to delete', type: [String] })
    @IsArray()
    @ArrayMinSize(1)
    @IsString({ each: true })
    ids: string[];
}
