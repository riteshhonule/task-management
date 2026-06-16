import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsInt, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class DiscussionAttachmentDto {
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

export class CreateCommentDto {
  @ApiPropertyOptional({ type: String, description: 'Comment Text Content' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ type: Number, description: 'Comment ID being replied to' })
  @IsOptional()
  @IsInt()
  replyToId?: number;

  @ApiPropertyOptional({ type: [DiscussionAttachmentDto], description: 'Attached files metadata' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DiscussionAttachmentDto)
  attachments?: DiscussionAttachmentDto[];
}
