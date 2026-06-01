import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query, ParseIntPipe, ParseBoolPipe } from '@nestjs/common';
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
    // Employees can only fetch their own tasks, except in admin overview mode (which they shouldn't access)
    let targetEmployeeId = employeeId ? parseInt(employeeId) : undefined;
    if (user.role === Role.EMPLOYEE) {
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
    });
  }

  @Get('carry-forward-check')
  @ApiOperation({ summary: 'Check if current employee has any incomplete tasks from previous days' })
  checkCarryForward(@CurrentUser() user: User) {
    return this.tasksService.checkCarryForward(user.id);
  }

  @Post('carry-forward')
  @ApiOperation({ summary: 'Accept/dismiss carrying forward a yesterday task' })
  handleCarryForward(
    @CurrentUser() user: User,
    @Body('taskId', ParseIntPipe) taskId: number,
    @Body('carryForward', ParseBoolPipe) carryForward: boolean,
  ) {
    return this.tasksService.handleCarryForward(taskId, carryForward, user.id);
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
  @Roles(Role.ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Soft delete a task (Admin/SuperAdmin only)' })
  remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: User) {
    return this.tasksService.remove(id, user.id, user.role);
  }
}
