import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { MessageType } from '@prisma/client';

export class CreateMessageDto {
  @ApiProperty({ example: 'Complete CRM changes today.' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ enum: MessageType, default: MessageType.NORMAL })
  @IsEnum(MessageType)
  @IsOptional()
  type?: MessageType;

  @ApiProperty({ example: [2, 3], required: false, description: 'List of recipient employee user IDs' })
  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  recipientIds?: number[];

  @ApiProperty({ example: false, default: false })
  @IsBoolean()
  @IsOptional()
  isEveryone?: boolean;
}
