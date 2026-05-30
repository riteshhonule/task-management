import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { TaskPriority, TaskStatus } from '@prisma/client';

export class CreateTaskDto {
  @ApiProperty({ example: '2026-05-30T00:00:00.000Z', required: false })
  @IsDateString()
  @IsOptional()
  date?: string;

  @ApiProperty({ example: 2, required: false, description: 'Assign to specific employee (Admin only)' })
  @IsNumber()
  @IsOptional()
  employeeId?: number;

  @ApiProperty({ example: '09:00 AM' })
  @IsString()
  @IsNotEmpty()
  startTime: string;

  @ApiProperty({ example: '2026-05-30T18:00:00.000Z' })
  @IsDateString()
  @IsNotEmpty()
  expectedCompletionDate: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsNotEmpty()
  projectId: number;

  @ApiProperty({ example: 'Develop login module' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 'Abhijeet Sir', required: false })
  @IsString()
  @IsOptional()
  changesGivenBy?: string;

  @ApiProperty({ example: 'Add social logins and OAuth configs', required: false })
  @IsString()
  @IsOptional()
  changesSummary?: string;

  @ApiProperty({ enum: TaskPriority, default: TaskPriority.MEDIUM })
  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @ApiProperty({ enum: TaskStatus, default: TaskStatus.PENDING })
  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @ApiProperty({ example: 'API server slow response', required: false })
  @IsString()
  @IsOptional()
  delayReason?: string;

  @ApiProperty({ example: 'Completed tests locally', required: false })
  @IsString()
  @IsOptional()
  notes?: string;
}
