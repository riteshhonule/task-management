import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsArray, IsNotEmpty, IsOptional, IsString, IsInt, ArrayMinSize, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ChatType } from '@prisma/client';

export class ChatAttachmentDto {
  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  filename: string;

  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  filepath: string;

  @ApiProperty({ type: String })
  @IsString()
  @IsNotEmpty()
  mimetype: string;

  @ApiProperty({ type: Number })
  @IsInt()
  size: number;
}

// ... CreateConversationDto, UpdateGroupDto, AddMembersDto ... (unchanged)

export class CreateConversationDto {
  @ApiProperty({ enum: ChatType, description: 'Type of conversation (DIRECT or GROUP)' })
  @IsEnum(ChatType)
  type: ChatType;

  @ApiProperty({ type: [Number], description: 'Member User IDs to include in the conversation' })
  @IsArray()
  @IsInt({ each: true })
  @ArrayMinSize(1)
  userIds: number[];

  @ApiPropertyOptional({ type: String, description: 'Group Chat Name' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ type: String, description: 'Group Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: String, description: 'Group Avatar Image URL' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}

export class UpdateGroupDto {
  @ApiPropertyOptional({ type: String, description: 'Group Name' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional({ type: String, description: 'Group Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: String, description: 'Group Avatar Image URL' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}

export class AddMembersDto {
  @ApiProperty({ type: [Number], description: 'User IDs to add to the group' })
  @IsArray()
  @IsInt({ each: true })
  @ArrayMinSize(1)
  userIds: number[];
}

export class SendMessageDto {
  @ApiPropertyOptional({ type: String, description: 'Message Content' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ type: Number, description: 'Message ID being replied to' })
  @IsOptional()
  @IsInt()
  replyToId?: number;

  @ApiPropertyOptional({ type: Number, description: 'Task Project ID shared in message' })
  @IsOptional()
  @IsInt()
  sharedTaskId?: number;

  @ApiPropertyOptional({ type: [ChatAttachmentDto], description: 'Attached files metadata' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatAttachmentDto)
  attachments?: ChatAttachmentDto[];
}

export class ReactMessageDto {
  @ApiProperty({ type: String, description: 'Emoji reaction character' })
  @IsString()
  @IsNotEmpty()
  emoji: string;
}

export class SendMessageSocketDto {
  @ApiProperty({ type: Number })
  @IsInt()
  @IsNotEmpty()
  conversationId: number;

  @ApiProperty({ type: SendMessageDto })
  @ValidateNested()
  @Type(() => SendMessageDto)
  message: SendMessageDto;
}
