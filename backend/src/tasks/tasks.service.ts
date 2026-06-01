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
    let targetEmployeeId = currentUserId;
    if (currentUserRole !== Role.EMPLOYEE && dto.employeeId) {
      targetEmployeeId = dto.employeeId;
    }

    const taskDate = dto.startDate ? new Date(dto.startDate) : new Date();
    taskDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(taskDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const existingTask = await this.prisma.task.findFirst({
      where: {
        employeeId: targetEmployeeId,
        startDate: { gte: taskDate, lt: nextDay },
        deletedAt: null,
      },
    });

    if (existingTask) {
      throw new BadRequestException('A task already exists for this employee on this date');
    }

    if (!dto.projects || dto.projects.length === 0) {
      throw new BadRequestException('At least one project must be selected');
    }

    const task = await this.prisma.task.create({
      data: {
        startDate: taskDate,
        employeeId: targetEmployeeId,
        startTime: dto.startTime,
        expectedEndDate: new Date(dto.expectedEndDate),
        projects: {
          create: dto.projects.map(p => ({
            projectId: p.projectId,
            taskDescription: p.taskDescription,
            changesGivenBy: p.changesGivenBy,
            changesSummary: p.changesSummary,
            priority: p.priority || TaskPriority.MEDIUM,
            status: p.status || TaskStatus.PENDING,
            delayReason: p.delayReason,
            notes: p.notes,
            completedWorkDescription: p.completedWorkDescription,
            completionPercentage: p.completionPercentage,
            blockedReason: p.blockedReason,
          }))
        }
      },
      include: {
        projects: { include: { project: true } },
        employee: { select: { id: true, name: true, email: true } },
      },
    });

    // Notify employee if assigned by someone else (Admin/SuperAdmin)
    if (currentUserId !== targetEmployeeId) {
      await this.notificationsService.createNotification(
        targetEmployeeId,
        'TASK_ASSIGNED',
        'New Task Assigned',
        `You have been assigned a new multi-project task with ${dto.projects.length} project(s).`,
      );
    } else {
      const admins = await this.prisma.user.findMany({
        where: { role: { in: [Role.ADMIN, Role.SUPER_ADMIN] }, deletedAt: null },
        select: { id: true },
      });
      for (const admin of admins) {
        await this.notificationsService.createNotification(
          admin.id,
          'TASK_CREATED_BY_EMP',
          'Task Created',
          `Employee "${task.employee.name}" added a new task with ${dto.projects.length} project(s).`
        );
      }
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
    
    // Project/status/priority filters now apply to the relation
    if (filters.projectId || filters.status || filters.priority || filters.search) {
      whereClause.projects = { some: { deletedAt: null } };
      
      if (filters.projectId) {
        whereClause.projects.some.projectId = filters.projectId;
      }
      if (filters.status) {
        whereClause.projects.some.status = filters.status;
      }
      if (filters.priority) {
        whereClause.projects.some.priority = filters.priority;
      }
      if (filters.search) {
        whereClause.projects.some.OR = [
          { taskDescription: { contains: filters.search, mode: 'insensitive' } },
          { project: { name: { contains: filters.search, mode: 'insensitive' } } },
        ];
      }
    }

    // Date range filters
    const now = new Date();
    if (filters.dateFilter === 'today') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      whereClause.startDate = { gte: start, lte: end };
    } else if (filters.dateFilter === 'week') {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      const start = new Date(now.setDate(diff));
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      whereClause.startDate = { gte: start, lte: end };
    } else if (filters.dateFilter === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      whereClause.startDate = { gte: start, lte: end };
    } else if (filters.dateFilter === 'custom' && filters.startDate && filters.endDate) {
      whereClause.startDate = {
        gte: new Date(filters.startDate),
        lte: new Date(filters.endDate),
      };
    }

    return this.prisma.task.findMany({
      where: whereClause,
      include: {
        projects: { 
          where: { deletedAt: null },
          include: { 
            project: true,
            updates: { orderBy: { createdAt: 'desc' } }
          } 
        },
        employee: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  async findOne(id: number) {
    const task = await this.prisma.task.findFirst({
      where: { id, deletedAt: null },
      include: {
        projects: { 
          where: { deletedAt: null },
          include: { 
            project: true,
            updates: { orderBy: { createdAt: 'desc' } }
          } 
        },
        employee: {
          select: { id: true, name: true, email: true },
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

    if (currentUserRole === Role.EMPLOYEE && task.employeeId !== currentUserId) {
      throw new ForbiddenException('You can only modify your own tasks');
    }

    const updateData: any = {};
    if (dto.startDate) updateData.startDate = new Date(dto.startDate);
    if (dto.startTime) updateData.startTime = dto.startTime;
    if (dto.expectedEndDate) updateData.expectedEndDate = new Date(dto.expectedEndDate);
    if (currentUserRole !== Role.EMPLOYEE && dto.employeeId) {
      updateData.employeeId = dto.employeeId;
    }

    let updatedTask;
    
    // Process top level Task updates
    if (Object.keys(updateData).length > 0) {
      await this.prisma.task.update({
        where: { id },
        data: updateData,
      });
    }

    let completionNotified = false;

    // Process TaskProjects
    if (dto.projects && dto.projects.length > 0) {
      for (const p of dto.projects) {
        if (p.id) {
          // Update existing
          const existingProject = task.projects.find(x => x.id === p.id);
          if (existingProject) {
            const previousStatus = existingProject.status;
            const targetStatus = p.status || previousStatus;
            
            await this.prisma.taskProject.update({
              where: { id: p.id },
              data: {
                projectId: p.projectId,
                taskDescription: p.taskDescription,
                changesGivenBy: p.changesGivenBy,
                changesSummary: p.changesSummary,
                priority: p.priority,
                status: p.status,
                delayReason: p.delayReason,
                blockedReason: p.blockedReason,
                completedWorkDescription: p.completedWorkDescription,
                completionPercentage: p.completionPercentage,
                notes: p.notes,
              }
            });

            if (previousStatus !== targetStatus || p.remarks || p.screenshotUrl) {
              await this.prisma.taskUpdate.create({
                data: {
                  taskProjectId: p.id,
                  statusBefore: previousStatus,
                  statusAfter: targetStatus,
                  remarks: p.remarks || 'Status update',
                  screenshotUrl: p.screenshotUrl,
                },
              });
            }

            if (targetStatus === TaskStatus.COMPLETED && previousStatus !== TaskStatus.COMPLETED) {
              completionNotified = true;
            }
          }
        } else {
          // Create new project entry in this task
          await this.prisma.taskProject.create({
            data: {
              taskId: id,
              projectId: p.projectId,
              taskDescription: p.taskDescription,
              changesGivenBy: p.changesGivenBy,
              changesSummary: p.changesSummary,
              priority: p.priority || TaskPriority.MEDIUM,
              status: p.status || TaskStatus.PENDING,
              delayReason: p.delayReason,
              blockedReason: p.blockedReason,
              completedWorkDescription: p.completedWorkDescription,
              completionPercentage: p.completionPercentage,
              notes: p.notes,
            }
          });
        }
      }
    }

    updatedTask = await this.findOne(id);

    if (completionNotified) {
      const admins = await this.prisma.user.findMany({
        where: { role: { in: [Role.ADMIN, Role.SUPER_ADMIN] }, deletedAt: null },
        select: { id: true },
      });
      for (const admin of admins) {
        await this.notificationsService.createNotification(
          admin.id,
          'TASK_COMPLETED',
          'Task Completed',
          `Employee "${updatedTask.employee.name}" completed one or more projects in their daily task.`,
        );
      }
    }

    if (currentUserRole === Role.EMPLOYEE) {
      const admins = await this.prisma.user.findMany({
        where: { role: { in: [Role.ADMIN, Role.SUPER_ADMIN] }, deletedAt: null },
        select: { id: true },
      });
      for (const admin of admins) {
        await this.notificationsService.createNotification(
          admin.id,
          'TASK_UPDATED',
          'Task Updated',
          `Employee "${updatedTask.employee.name}" updated their daily task.`
        );
      }
    } else {
      if (updatedTask.employeeId !== currentUserId) {
        await this.notificationsService.createNotification(
          updatedTask.employeeId,
          'TASK_UPDATED',
          'Task Updated by Admin',
          `An admin has updated your daily task.`
        );
      }
    }

    return updatedTask;
  }

  async remove(id: number, currentUserId: number, currentUserRole: Role) {
    const task = await this.findOne(id);
    const updated = await this.prisma.task.update({
      where: { id },
      data: { deletedAt: new Date() },
      include: { employee: true },
    });

    if (currentUserRole === Role.EMPLOYEE) {
      const admins = await this.prisma.user.findMany({
        where: { role: { in: [Role.ADMIN, Role.SUPER_ADMIN] }, deletedAt: null },
        select: { id: true },
      });
      for (const admin of admins) {
        await this.notificationsService.createNotification(
          admin.id,
          'TASK_DELETED',
          'Task Deleted',
          `Employee "${updated.employee.name}" deleted their task.`
        );
      }
    } else {
      if (updated.employeeId !== currentUserId) {
        await this.notificationsService.createNotification(
          updated.employeeId,
          'TASK_DELETED',
          'Task Deleted by Admin',
          `An admin has deleted your task.`
        );
      }
    }
    return updated;
  }

  async checkCarryForward(userId: number) {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const incompleteTasks = await this.prisma.task.findMany({
      where: {
        employeeId: userId,
        deletedAt: null,
        startDate: { lt: startOfToday },
        projects: { some: { status: { in: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS, TaskStatus.DELAYED] } } },
        carryForwardedTo: null,
      },
      include: { projects: { include: { project: true } } },
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
      
      const incompleteProjects = task.projects.filter(p => 
        ([TaskStatus.PENDING, TaskStatus.IN_PROGRESS, TaskStatus.DELAYED] as TaskStatus[]).includes(p.status)
      );

      const newTask = await this.prisma.task.create({
        data: {
          startDate: today,
          employeeId: userId,
          startTime: task.startTime,
          expectedEndDate: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 18, 0, 0),
          carryForwardedFromId: task.id,
          projects: {
            create: incompleteProjects.map(p => ({
              projectId: p.projectId,
              taskDescription: p.taskDescription,
              changesGivenBy: p.changesGivenBy,
              changesSummary: p.changesSummary,
              priority: p.priority,
              status: TaskStatus.PENDING,
              notes: `Carried forward from yesterday.`,
            }))
          }
        },
      });

      for (const p of incompleteProjects) {
        await this.prisma.taskProject.update({
          where: { id: p.id },
          data: {
            status: TaskStatus.ON_HOLD,
            notes: `${p.notes || ''} [Carried forward to today].`.trim(),
          },
        });
      }

      return { message: 'Task carried forward successfully', newTask };
    } else {
      // Just mark notes for incomplete ones
      const incompleteProjects = task.projects.filter(p => 
        ([TaskStatus.PENDING, TaskStatus.IN_PROGRESS, TaskStatus.DELAYED] as TaskStatus[]).includes(p.status)
      );
      for (const p of incompleteProjects) {
        await this.prisma.taskProject.update({
          where: { id: p.id },
          data: {
            notes: `${p.notes || ''} [Carry forward dismissed].`.trim(),
          },
        });
      }
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
      completedProjectsToday,
      delayedProjectsToday,
      pendingProjectsToday,
    ] = await Promise.all([
      this.prisma.user.count({
        where: { role: Role.EMPLOYEE, deletedAt: null },
      }),
      this.prisma.task.count({
        where: {
          deletedAt: null,
          startDate: { gte: startOfToday, lte: endOfToday },
        },
      }),
      this.prisma.taskProject.count({
        where: {
          deletedAt: null,
          task: { startDate: { gte: startOfToday, lte: endOfToday } },
          status: TaskStatus.COMPLETED,
        },
      }),
      this.prisma.taskProject.count({
        where: {
          deletedAt: null,
          task: { startDate: { gte: startOfToday, lte: endOfToday } },
          status: TaskStatus.DELAYED,
        },
      }),
      this.prisma.taskProject.count({
        where: {
          deletedAt: null,
          task: { startDate: { gte: startOfToday, lte: endOfToday } },
          status: TaskStatus.PENDING,
        },
      }),
    ]);

    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const activeEmployeesCount = await this.prisma.user.count({
      where: {
        role: Role.EMPLOYEE,
        deletedAt: null,
        OR: [
          { tasks: { some: { startDate: { gte: threeDaysAgo } } } },
          { activityLogs: { some: { createdAt: { gte: threeDaysAgo } } } },
        ],
      },
    });

    return {
      totalEmployees,
      activeEmployees: Math.max(activeEmployeesCount, 0),
      tasksAssignedToday: tasksToday, // number of daily task sheets
      completedTasksToday: completedProjectsToday, // number of completed projects
      delayedTasksToday: delayedProjectsToday,
      pendingTasksToday: pendingProjectsToday,
    };
  }
}
