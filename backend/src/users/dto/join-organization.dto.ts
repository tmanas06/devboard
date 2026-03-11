import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class JoinOrganizationDto {
  @ApiProperty({ description: 'Organization ID to join' })
  @IsNotEmpty()
  @IsString()
  organizationId: string;

  @ApiPropertyOptional({
    description: 'User role in the organization',
    enum: ['ORG_ADMIN', 'MEMBER'],
    default: 'MEMBER',
  })
  @IsOptional()
  @IsEnum(['ORG_ADMIN', 'MEMBER'])
  role?: 'ORG_ADMIN' | 'MEMBER';
}

