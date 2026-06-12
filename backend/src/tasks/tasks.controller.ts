import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, ParseIntPipe, ParseBoolPipe, BadRequestException } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CurrentUser } from '../auth/current-user.decorator';
import { User, Role, TaskStatus, TaskPriority } from '@prisma/client';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';

@ApiTags('tasks')
@Controller('tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  create(@Body() createTaskDto: CreateTaskDto, @CurrentUser() user: User) {
    return this.tasksService.create(createTaskDto, user.id, user.role);
  }

  @Get()
  @ApiOperation({ summary: 'Find tasks with filtering' })
  @ApiQuery({ name: 'employeeId', required: false, type: Number })
  @ApiQuery({ name: 'projectId', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, enum: TaskStatus })
  @ApiQuery({ name: 'priority', required: false, enum: TaskPriority })
  @ApiQuery({ name: 'dateFilter', required: false, example: 'today', description: 'today, week, month, custom' })
  @ApiQuery({ name: 'startDate', required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'endDate', required: false, description: 'YYYY-MM-DD' })
  @ApiQuery({ name: 'search', required: false })
  findAll(
    @CurrentUser() user: User,
    @Query('employeeId') employeeId?: string,
    @Query('projectId') projectId?: string,
    @Query('status') status?: TaskStatus,
    @Query('priority') priority?: TaskPriority,
    @Query('dateFilter') dateFilter?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('search') search?: string,
  ) {
    let targetEmployeeId = employeeId ? parseInt(employeeId) : undefined;
    if (user.role === Role.EMPLOYEE && !employeeId) {
      targetEmployeeId = user.id;
    }

    return this.tasksService.findAll({
      employeeId: targetEmployeeId,
      projectId: projectId ? parseInt(projectId) : undefined,
      status,
      priority,
      dateFilter,
      startDate,
      endDate,
      search,
    }, user.id, user.role);
  }

  @Get('carry-forward-check')
  @ApiOperation({ summary: 'Check if current employee has any incomplete tasks from previous days' })
  checkCarryForward(@CurrentUser() user: User) {
    return this.tasksService.checkCarryForward(user.id);
  }

  @Get('my-sections')
  @ApiOperation({ summary: 'Get tasks split into 4 sections: carryForward, todaysTasks, assignedToMe, assignedByMe' })
  getMySections(@CurrentUser() user: User) {
    return this.tasksService.getTasksBySection(user.id);
  }

  @Post('carry-forward')
  @ApiOperation({ summary: 'Accept/dismiss carrying forward a yesterday task' })
  handleCarryForward(
    @CurrentUser() user: User,
    @Body('taskId', ParseIntPipe) taskId: number,
    @Body('carryForward', ParseBoolPipe) carryForward: boolean,
    @Body('reason') reason?: string,
  ) {
    return this.tasksService.handleCarryForward(taskId, carryForward, user.id, reason);
  }

  @Get('dashboard-metrics')
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get aggregated tasks metrics for the admin dashboard (Admin/SuperAdmin only)' })
  getDashboardMetrics() {
    return this.tasksService.getAdminDashboardMetrics();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a specific task' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.tasksService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a task status/details' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTaskDto: UpdateTaskDto,
    @CurrentUser() user: User,
  ) {
    return this.tasksService.update(id, updateTaskDto, user.id, user.role);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft delete a task' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    return this.tasksService.remove(id, user.id, user.role);
  }

  @Post(':id/accept-pending')
  @ApiOperation({ summary: 'Accept newly assigned projects' })
  acceptPending(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: User,
  ) {
    return this.tasksService.acceptPendingProjects(id, user.id);
  }

  @Post(':id/reject-pending')
  @ApiOperation({ summary: 'Reject newly assigned projects' })
  rejectPending(
    @Param('id', ParseIntPipe) id: number,
    @Body('reason') reason: string,
    @CurrentUser() user: User,
  ) {
    if (!reason || reason.trim() === '') {
      throw new BadRequestException('Reason is required for rejection');
    }
    return this.tasksService.rejectPendingProjects(id, user.id, reason);
  }

  @Post('project-task/:id/submit')
  @ApiOperation({ summary: 'Submit task proof, work review, and comment' })
  submitProjectTask(
    @Param('id', ParseIntPipe) id: number,
    @Body('comment') comment: string,
    @Body('proof') proof: any,
    @Body('workReview') workReview: any,
    @CurrentUser() user: User,
  ) {
    return this.tasksService.submitProjectTask(id, comment, proof, user.id, workReview);
  }

  @Post('project-task/:id/review')
  @ApiOperation({ summary: 'Review delegated task (Approve or Request Revision)' })
  reviewProjectTask(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: string,
    @Body('comment') comment: string,
    @CurrentUser() user: User,
  ) {
    return this.tasksService.reviewProjectTask(id, status, comment, user.id, user.role);
  }
}
