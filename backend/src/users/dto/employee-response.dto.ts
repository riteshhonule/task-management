import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class EmployeeResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'employee@gmark.com' })
  email: string;

  @ApiProperty({ example: 'John Doe' })
  name: string;

  @ApiProperty({ enum: Role, default: Role.EMPLOYEE })
  role: Role;

  @ApiProperty({ example: '1234567890', required: false })
  mobileNumber?: string;

  @ApiProperty({ example: 'Frontend Developer', required: false })
  jobRole?: string;

  @ApiProperty({ example: '2026-06-06T00:00:00.000Z' })
  createdAt: Date;
}
