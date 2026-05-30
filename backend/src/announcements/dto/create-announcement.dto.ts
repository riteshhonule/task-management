import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateAnnouncementDto {
  @ApiProperty({ example: 'Meeting at 4 PM' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'We will discuss the SHG deployment plan and deadlines.' })
  @IsString()
  @IsNotEmpty()
  content: string;
}
