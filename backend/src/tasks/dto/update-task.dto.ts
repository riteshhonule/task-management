import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { TaskPriority, TaskStatus } from '@prisma/client';

export class UpdateTaskDto {
  @ApiProperty({ example: '2026-05-30T00:00:00.000Z', required: false })
  @IsDateString()
  @IsOptional()
  date?: string;

  @ApiProperty({ example: '09:30 AM', required: false })
  @IsString()
  @IsOptional()
  startTime?: string;

  @ApiProperty({ example: '2026-05-30T19:00:00.000Z', required: false })
  @IsDateString()
  @IsOptional()
  expectedCompletionDate?: string;

  @ApiProperty({ example: 1, required: false })
  @IsNumber()
  @IsOptional()
  projectId?: number;

  @ApiProperty({ example: 'Updated description details', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'Mane Sir', required: false })
  @IsString()
  @IsOptional()
  changesGivenBy?: string;

  @ApiProperty({ example: 'Change button color to blue', required: false })
  @IsString()
  @IsOptional()
  changesSummary?: string;

  @ApiProperty({ enum: TaskPriority, required: false })
  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @ApiProperty({ enum: TaskStatus, required: false })
  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @ApiProperty({ example: 'Blocked by database migration script issue', required: false })
  @IsString()
  @IsOptional()
  delayReason?: string;

  @ApiProperty({ example: 'Testing on mobile', required: false })
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ example: 'Finished the layout part', required: false })
  @IsString()
  @IsOptional()
  remarks?: string;

  @ApiProperty({ example: 'uploads/proof.png', required: false })
  @IsString()
  @IsOptional()
  screenshotUrl?: string;

  @ApiProperty({ example: 3, required: false, description: 'Reassign task (Admin only)' })
  @IsNumber()
  @IsOptional()
  employeeId?: number;
}
