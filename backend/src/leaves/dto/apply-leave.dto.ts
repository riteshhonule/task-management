import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class ApplyLeaveDto {
  @ApiProperty({ example: '2026-06-01T00:00:00.000Z' })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({ example: '2026-06-05T00:00:00.000Z' })
  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @ApiProperty({ example: 'Sick Leave' })
  @IsString()
  @IsNotEmpty()
  leaveType: string;

  @ApiProperty({ example: 'Family vacation' })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiProperty({ example: 'http://example.com/attachment.jpg', required: false })
  @IsString()
  @IsOptional()
  attachmentUrl?: string;
}
