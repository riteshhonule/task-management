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
}
