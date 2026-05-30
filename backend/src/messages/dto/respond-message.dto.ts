import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { MessageResponseStatus } from '@prisma/client';

export class RespondMessageDto {
  @ApiProperty({ enum: MessageResponseStatus })
  @IsEnum(MessageResponseStatus)
  response: MessageResponseStatus;

  @ApiProperty({ example: 'Will complete by 5 PM.', required: false })
  @IsString()
  @IsOptional()
  comment?: string;
}
