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
            acceptanceStatus: currentUserId === targetEmployeeId ? 'ACCEPTED' : 'PENDING'
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
        'New Project Task Assigned',
        `Admin assigned you a task for projects: ${task.projects.map(p => p.project?.name).join(', ')}.`,
        { taskId: task.id, taskProjectIds: task.projects.map(p => p.id) },
        currentUserId,
        task.id
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
          `Employee "${task.employee.name}" added a new task for projects: ${task.projects.map(p => p.project?.name).join(', ')}.`,
          { taskId: task.id },
          currentUserId,
          task.id
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
    let adminEditedDescriptions: string[] = [];
    let newlyAssignedProjects: string[] = [];

    // Process TaskProjects
    if (dto.projects) {
      const incomingProjectIds = dto.projects.filter(p => p.id).map(p => p.id);
      
      // Delete projects that were removed
      const projectsToDelete = task.projects.filter(p => !incomingProjectIds.includes(p.id));
      for (const p of projectsToDelete) {
        await this.prisma.taskProject.update({
          where: { id: p.id },
          data: { deletedAt: new Date() }
        });
      }

      for (const p of dto.projects) {
        if (p.id) {
          // Update existing
          const existingProject = task.projects.find(x => x.id === p.id);
          if (existingProject) {
            const previousStatus = existingProject.status;
            const targetStatus = p.status || previousStatus;
            
            let adminDescriptionChanged = false;
            let finalAdminEditedDescription = existingProject.adminEditedDescription;
            if (currentUserRole !== Role.EMPLOYEE && p.taskDescription !== existingProject.taskDescription) {
              finalAdminEditedDescription = true;
              adminDescriptionChanged = true;
            }
            
            await this.prisma.taskProject.update({
              where: { id: p.id },
              data: {
                projectId: p.projectId,
                taskDescription: p.taskDescription,
                changesGivenBy: p.changesGivenBy,
                changesSummary: p.changesSummary,
                adminEditedDescription: finalAdminEditedDescription,
                priority: p.priority,
                status: p.status,
                delayReason: p.delayReason,
                blockedReason: p.blockedReason,
                completedWorkDescription: p.completedWorkDescription,
                completionPercentage: p.completionPercentage,
                notes: p.notes,
                acceptanceStatus: p.acceptanceStatus,
                rejectionReason: p.rejectionReason,
              }
            });

            if (p.acceptanceStatus === 'REJECTED' && existingProject.acceptanceStatus !== 'REJECTED') {
              const projName = existingProject.project?.name || 'Task';
              const admins = await this.prisma.user.findMany({ where: { role: { in: [Role.ADMIN, Role.SUPER_ADMIN] }, deletedAt: null } });
              for (const admin of admins) {
                await this.notificationsService.createNotification(
                  admin.id,
                  'TASK_UPDATED',
                  'Task Rejected by Employee',
                  `Employee rejected task for project "${projName}". Reason: ${p.rejectionReason || 'No reason provided'}.`,
                  { taskId: id, taskProjectId: p.id },
                  currentUserId,
                  id
                );
              }
            }

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

            if (adminDescriptionChanged) {
              const projDetails = await this.prisma.project.findUnique({ where: { id: existingProject.projectId } });
              if (projDetails) {
                adminEditedDescriptions.push(projDetails.name);
              }
            }
          }
        } else {
          // Create new project entry in this task
          const newProjDetails = await this.prisma.project.findUnique({ where: { id: p.projectId } });
          if (newProjDetails) newlyAssignedProjects.push(newProjDetails.name);

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
              acceptanceStatus: currentUserRole === Role.EMPLOYEE ? 'ACCEPTED' : 'PENDING'
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
          `Employee "${updatedTask.employee.name}" completed projects: ${updatedTask.projects.filter(p => p.status === 'COMPLETED').map(p => p.project?.name).join(', ')}.`,
          { taskId: updatedTask.id },
          currentUserId,
          updatedTask.id
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
          `Employee "${updatedTask.employee.name}" updated their task for projects: ${updatedTask.projects.map(p => p.project?.name).join(', ')}.`,
          { taskId: updatedTask.id },
          currentUserId,
          updatedTask.id
        );
      }
    } else {
      if (updatedTask.employeeId !== currentUserId) {
        if (newlyAssignedProjects.length > 0) {
          await this.notificationsService.createNotification(
            updatedTask.employeeId,
            'TASK_ASSIGNED',
            'New Project Task Assigned',
            `An admin assigned you new project tasks for: ${newlyAssignedProjects.join(', ')}.`,
            { taskId: updatedTask.id },
            currentUserId,
            updatedTask.id
          );
        }

        if (adminEditedDescriptions.length > 0) {
          await this.notificationsService.createNotification(
            updatedTask.employeeId,
            'TASK_UPDATED',
            'Task Description Updated',
            `An admin updated your task description for projects: ${adminEditedDescriptions.join(', ')}.`,
            { taskId: updatedTask.id },
            currentUserId,
            updatedTask.id
          );
        } 
        
        if (newlyAssignedProjects.length === 0 && adminEditedDescriptions.length === 0) {
          await this.notificationsService.createNotification(
            updatedTask.employeeId,
            'TASK_UPDATED',
            'Task Updated by Admin',
            `An admin updated your task for projects: ${updatedTask.projects.map(p => p.project?.name).join(', ')}.`
          );
        }
      }
    }

    return updatedTask;
  }

  async acceptPendingProjects(taskId: number, employeeId: number) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId, employeeId, deletedAt: null },
      include: { projects: true }
    });
    if (!task) throw new NotFoundException('Task not found');
    
    await this.prisma.taskProject.updateMany({
      where: { taskId, acceptanceStatus: 'PENDING', deletedAt: null },
      data: { acceptanceStatus: 'ACCEPTED' }
    });
    return { success: true };
  }

  async rejectPendingProjects(taskId: number, employeeId: number, reason: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId, employeeId, deletedAt: null },
      include: { projects: true }
    });
    if (!task) throw new NotFoundException('Task not found');
    
    await this.prisma.taskProject.updateMany({
      where: { taskId, acceptanceStatus: 'PENDING', deletedAt: null },
      data: { acceptanceStatus: 'REJECTED', rejectionReason: reason }
    });

    const admins = await this.prisma.user.findMany({
      where: { role: { in: [Role.ADMIN, Role.SUPER_ADMIN] }, deletedAt: null },
      select: { id: true },
    });
    
    for (const admin of admins) {
      await this.notificationsService.createNotification(
        admin.id,
        'TASK_UPDATED',
        'Task Rejected by Employee',
        `Employee rejected newly assigned tasks. Reason: ${reason}`,
        { taskId },
        employeeId,
        taskId
      );
    }
    
    return { success: true };
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
          `Employee "${updated.employee.name}" deleted their task.`,
          { taskId: id },
          currentUserId,
          id
        );
      }
    } else {
      if (updated.employeeId !== currentUserId) {
        await this.notificationsService.createNotification(
          updated.employeeId,
          'TASK_DELETED',
          'Task Deleted by Admin',
          `An admin has deleted your task.`,
          { taskId: id },
          currentUserId,
          id
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
