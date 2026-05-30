import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateProjectDto {
  @ApiProperty({ example: 'SHG' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Self Help Group portal description', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}
