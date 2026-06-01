import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { TaskPriority, TaskStatus } from '@prisma/client';

export class UpdateTaskProjectDto {
  @IsNumber()
  @IsOptional()
  id?: number; // if present, updates existing. if missing, creates new project entry

  @IsNumber()
  @IsOptional()
  projectId?: number;

  @IsString()
  @IsOptional()
  taskDescription?: string;

  @IsString()
  @IsOptional()
  changesGivenBy?: string;

  @IsString()
  @IsOptional()
  changesSummary?: string;

  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @IsString()
  @IsOptional()
  delayReason?: string;

  @IsString()
  @IsOptional()
  blockedReason?: string;

  @IsString()
  @IsOptional()
  completedWorkDescription?: string;

  @IsNumber()
  @IsOptional()
  completionPercentage?: number;

  @IsString()
  @IsOptional()
  notes?: string;
  
  @IsString()
  @IsOptional()
  remarks?: string;

  @IsString()
  @IsOptional()
  screenshotUrl?: string;
}

export class UpdateTaskDto {
  @ApiProperty({ example: '2026-05-30T00:00:00.000Z', required: false })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({ example: '09:30 AM', required: false })
  @IsString()
  @IsOptional()
  startTime?: string;

  @ApiProperty({ example: '2026-05-30T19:00:00.000Z', required: false })
  @IsDateString()
  @IsOptional()
  expectedEndDate?: string;

  @ApiProperty({ example: 3, required: false, description: 'Reassign task (Admin only)' })
  @IsNumber()
  @IsOptional()
  employeeId?: number;

  @ApiProperty({ type: [UpdateTaskProjectDto], required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateTaskProjectDto)
  @IsOptional()
  projects?: UpdateTaskProjectDto[];
}
