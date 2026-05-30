import { Controller, Get, Post, Body, Patch, Param, UseGuards, ParseIntPipe } from '@nestjs/common';
import { LeavesService } from './leaves.service';
import { ApplyLeaveDto } from './dto/apply-leave.dto';
import { UpdateLeaveStatusDto } from './dto/update-leave-status.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { User, Role } from '@prisma/client';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('leaves')
@Controller('leaves')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class LeavesController {
  constructor(private readonly leavesService: LeavesService) {}

  @Post()
  @ApiOperation({ summary: 'Apply for a new leave request (all users)' })
  apply(@Body() applyLeaveDto: ApplyLeaveDto, @CurrentUser() user: User) {
    return this.leavesService.apply(applyLeaveDto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get leave requests (Employees see own, Admins see all)' })
  findAll(@CurrentUser() user: User) {
    return this.leavesService.findAll(user.id, user.role);
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Approve or reject a leave request (Admin/SuperAdmin only)' })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateLeaveStatusDto: UpdateLeaveStatusDto,
    @CurrentUser() user: User,
  ) {
    return this.leavesService.updateStatus(id, updateLeaveStatusDto, user.id);
  }
}
