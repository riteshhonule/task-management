import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { LeaveStatus } from '@prisma/client';

export class UpdateLeaveStatusDto {
  @ApiProperty({ enum: LeaveStatus })
  @IsEnum(LeaveStatus)
  @IsNotEmpty()
  status: LeaveStatus;

  @ApiProperty({ example: 'Approved, make sure to transition your active tasks.', required: false })
  @IsString()
  @IsOptional()
  remarks?: string;
}
