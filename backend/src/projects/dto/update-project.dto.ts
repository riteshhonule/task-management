import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateProjectDto {
  @ApiProperty({ example: 'SHG Portal updated description', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: false, required: false })
  @IsBoolean()
  @IsOptional()
  isArchived?: boolean;

  @ApiProperty({ example: 'SHG Portal', required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ example: [1, 2], required: false })
  @IsOptional()
  allocatedUserIds?: number[];
}
