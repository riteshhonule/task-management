import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Role, TaskStatus, TaskPriority } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async create(dto: CreateTaskDto, currentUserId: number, currentUserRole: Role) {
    // If user is employee or employeeId is not provided, force own ID
    let targetEmployeeId = currentUserId;
    if (currentUserRole !== Role.EMPLOYEE && dto.employeeId) {
      targetEmployeeId = dto.employeeId;
    }

    const taskDate = dto.date ? new Date(dto.date) : new Date();
    const startOfDay = new Date(taskDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(taskDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingTask = await this.prisma.task.findFirst({
      where: {
        employeeId: targetEmployeeId,
        date: { gte: startOfDay, lte: endOfDay },
        deletedAt: null,
      },
    });

    if (existingTask) {
      throw new BadRequestException('A task has already been created for today.');
    }

    // Verify project is active
    const project = await this.prisma.project.findFirst({
      where: { id: dto.projectId, deletedAt: null },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    if (project.isArchived) {
      throw new BadRequestException('Cannot create tasks in an archived project');
    }

    const task = await this.prisma.task.create({
      data: {
        date: taskDate,
        employeeId: targetEmployeeId,
        startTime: dto.startTime,
        expectedCompletionDate: new Date(dto.expectedCompletionDate),
        projectId: dto.projectId,
        description: dto.description,
        changesGivenBy: dto.changesGivenBy,
        changesSummary: dto.changesSummary,
        priority: dto.priority || TaskPriority.MEDIUM,
        status: dto.status || TaskStatus.PENDING,
        delayReason: dto.delayReason,
        notes: dto.notes,
      },
      include: {
        project: true,
        employee: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Notify employee if assigned by someone else (Admin/SuperAdmin)
    if (currentUserId !== targetEmployeeId) {
      await this.notificationsService.createNotification(
        targetEmployeeId,
        'TASK_ASSIGNED',
        'New Task Assigned',
        `You have been assigned a new task: "${dto.description}" for project "${project.name}".`,
      );
    }

    return task;
  }

  async findAll(filters: {
    employeeId?: number;
    projectId?: number;
    status?: TaskStatus;
    priority?: TaskPriority;
    dateFilter?: string; // today, week, month, custom
    startDate?: string;
    endDate?: string;
    search?: string;
  }) {
    const whereClause: any = { deletedAt: null };

    if (filters.employeeId) {
      whereClause.employeeId = filters.employeeId;
    }
    if (filters.projectId) {
      whereClause.projectId = filters.projectId;
    }
    if (filters.status) {
      whereClause.status = filters.status;
    }
    if (filters.priority) {
      whereClause.priority = filters.priority;
    }

    // Date range filters
    const now = new Date();
    if (filters.dateFilter === 'today') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      whereClause.date = { gte: start, lte: end };
    } else if (filters.dateFilter === 'week') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
      const start = new Date(now.setDate(diff));
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      whereClause.date = { gte: start, lte: end };
    } else if (filters.dateFilter === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      whereClause.date = { gte: start, lte: end };
    } else if (filters.dateFilter === 'custom' && filters.startDate && filters.endDate) {
      whereClause.date = {
        gte: new Date(filters.startDate),
        lte: new Date(filters.endDate),
      };
    }

    if (filters.search) {
      whereClause.OR = [
        { description: { contains: filters.search, mode: 'insensitive' } },
        { employee: { name: { contains: filters.search, mode: 'insensitive' } } },
        { project: { name: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    return this.prisma.task.findMany({
      where: whereClause,
      include: {
        project: true,
        employee: {
          select: { id: true, name: true, email: true },
        },
        updates: {
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  async findOne(id: number) {
    const task = await this.prisma.task.findFirst({
      where: { id, deletedAt: null },
      include: {
        project: true,
        employee: {
          select: { id: true, name: true, email: true },
        },
        updates: {
          orderBy: { createdAt: 'desc' },
        },
        carryForwardedTo: true,
      },
    });
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    return task;
  }

  async update(id: number, dto: UpdateTaskDto, currentUserId: number, currentUserRole: Role) {
    const task = await this.findOne(id);

    // Employees can only update their own tasks
    if (currentUserRole === Role.EMPLOYEE && task.employeeId !== currentUserId) {
      throw new ForbiddenException('You can only modify your own tasks');
    }

    const previousStatus = task.status;
    const targetStatus = dto.status || previousStatus;

    // Build values to update
    const updateData: any = {};
    if (dto.date) updateData.date = new Date(dto.date);
    if (dto.startTime) updateData.startTime = dto.startTime;
    if (dto.expectedCompletionDate) updateData.expectedCompletionDate = new Date(dto.expectedCompletionDate);
    if (dto.projectId) updateData.projectId = dto.projectId;
    if (dto.description) updateData.description = dto.description;
    if (dto.changesGivenBy !== undefined) updateData.changesGivenBy = dto.changesGivenBy;
    if (dto.changesSummary !== undefined) updateData.changesSummary = dto.changesSummary;
    if (dto.priority) updateData.priority = dto.priority;
    if (dto.status) updateData.status = dto.status;
    if (dto.delayReason !== undefined) updateData.delayReason = dto.delayReason;
    if (dto.blockedReason !== undefined) updateData.blockedReason = dto.blockedReason;
    if (dto.completedWorkDescription !== undefined) updateData.completedWorkDescription = dto.completedWorkDescription;
    if (dto.completionPercentage !== undefined) updateData.completionPercentage = dto.completionPercentage;
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (currentUserRole !== Role.EMPLOYEE && dto.employeeId) {
      updateData.employeeId = dto.employeeId;
    }

    const updatedTask = await this.prisma.task.update({
      where: { id },
      data: updateData,
      include: {
        project: true,
        employee: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Write to TaskUpdate history table if status changed or remarks/screenshot provided
    if (previousStatus !== targetStatus || dto.remarks || dto.screenshotUrl) {
      await this.prisma.taskUpdate.create({
        data: {
          taskId: id,
          statusBefore: previousStatus,
          statusAfter: targetStatus,
          remarks: dto.remarks || 'Status update',
          screenshotUrl: dto.screenshotUrl,
        },
      });

      // If an employee completes a task, notify administrators
      if (targetStatus === TaskStatus.COMPLETED && previousStatus !== TaskStatus.COMPLETED) {
        const admins = await this.prisma.user.findMany({
          where: {
            role: { in: [Role.ADMIN, Role.SUPER_ADMIN] },
            deletedAt: null,
          },
          select: { id: true },
        });

        for (const admin of admins) {
          await this.notificationsService.createNotification(
            admin.id,
            'TASK_COMPLETED',
            'Task Completed',
            `Employee "${updatedTask.employee.name}" completed task: "${updatedTask.description}" in project "${updatedTask.project.name}".`,
          );
        }
      }
    }

    return updatedTask;
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.task.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async checkCarryForward(userId: number) {
    // Find incomplete tasks from yesterday or earlier
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const incompleteTasks = await this.prisma.task.findMany({
      where: {
        employeeId: userId,
        deletedAt: null,
        date: { lt: startOfToday },
        status: { in: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS, TaskStatus.DELAYED] },
        carryForwardedTo: null, // Not carried forward already
      },
      include: { project: true },
    });

    return incompleteTasks;
  }

  async handleCarryForward(taskId: number, carryForward: boolean, userId: number) {
    const task = await this.findOne(taskId);
    if (task.employeeId !== userId) {
      throw new ForbiddenException('You do not own this task');
    }

    if (task.carryForwardedTo) {
      throw new BadRequestException('Task has already been carried forward.');
    }

    if (carryForward) {
      const today = new Date();
      // Auto create new task for current day
      const newTask = await this.prisma.task.create({
        data: {
          date: today,
          employeeId: userId,
          startTime: task.startTime,
          expectedCompletionDate: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 18, 0, 0),
          projectId: task.projectId,
          description: task.description,
          changesGivenBy: task.changesGivenBy,
          changesSummary: task.changesSummary,
          priority: task.priority,
          status: TaskStatus.PENDING,
          notes: `Carried forward from yesterday (Task ID: ${task.id}).`,
          carryForwardedFromId: task.id,
        },
      });

      // Update old yesterday task status to ON_HOLD or DELAYED
      await this.prisma.task.update({
        where: { id: taskId },
        data: {
          status: TaskStatus.ON_HOLD,
          notes: `${task.notes || ''} [Carried forward to today (Task ID: ${newTask.id})].`.trim(),
        },
      });

      return { message: 'Task carried forward successfully', newTask };
    } else {
      // Mark as dismissed by keeping status as is or marking it in notes
      await this.prisma.task.update({
        where: { id: taskId },
        data: {
          notes: `${task.notes || ''} [Carry forward dismissed].`.trim(),
        },
      });
      return { message: 'Carry forward dismissed' };
    }
  }

  async getAdminDashboardMetrics() {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const [
      totalEmployees,
      tasksToday,
      completedToday,
      delayedToday,
      pendingToday,
    ] = await Promise.all([
      this.prisma.user.count({
        where: { role: Role.EMPLOYEE, deletedAt: null },
      }),
      this.prisma.task.count({
        where: {
          deletedAt: null,
          date: { gte: startOfToday, lte: endOfToday },
        },
      }),
      this.prisma.task.count({
        where: {
          deletedAt: null,
          date: { gte: startOfToday, lte: endOfToday },
          status: TaskStatus.COMPLETED,
        },
      }),
      this.prisma.task.count({
        where: {
          deletedAt: null,
          date: { gte: startOfToday, lte: endOfToday },
          status: TaskStatus.DELAYED,
        },
      }),
      this.prisma.task.count({
        where: {
          deletedAt: null,
          date: { gte: startOfToday, lte: endOfToday },
          status: TaskStatus.PENDING,
        },
      }),
    ]);

    // Active Employees definition: employee users who created/updated tasks or had activities in the last 3 days
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const activeEmployeesCount = await this.prisma.user.count({
      where: {
        role: Role.EMPLOYEE,
        deletedAt: null,
        OR: [
          { tasks: { some: { date: { gte: threeDaysAgo } } } },
          { activityLogs: { some: { createdAt: { gte: threeDaysAgo } } } },
        ],
      },
    });

    // Make sure we at least return 0 if no active employees found
    return {
      totalEmployees,
      activeEmployees: Math.max(activeEmployeesCount, 0),
      tasksAssignedToday: tasksToday,
      completedTasksToday: completedToday,
      delayedTasksToday: delayedToday,
      pendingTasksToday: pendingToday,
    };
  }
}
