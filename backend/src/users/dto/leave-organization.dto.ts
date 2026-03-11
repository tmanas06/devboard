import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LeaveOrganizationDto {
  @ApiProperty({ description: 'Organization ID to leave' })
  @IsNotEmpty()
  @IsString()
  organizationId: string;
}


