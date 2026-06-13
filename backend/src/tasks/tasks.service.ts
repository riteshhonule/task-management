import { Injectable, ForbiddenException, NotFoundException, BadRequestException, HttpException, HttpStatus } from '@nestjs/common';
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
    if (dto.employeeId) {
      if (currentUserRole === Role.EMPLOYEE && dto.employeeId !== currentUserId) {
        const targetUser = await this.prisma.user.findFirst({
          where: { id: dto.employeeId, deletedAt: null }
        });
        if (!targetUser) {
          throw new NotFoundException('Target employee not found');
        }
        if (targetUser.role !== Role.EMPLOYEE) {
          throw new BadRequestException('You can only delegate tasks to other Employees.');
        }
        targetEmployeeId = dto.employeeId;
      } else if (currentUserRole !== Role.EMPLOYEE) {
        targetEmployeeId = dto.employeeId;
      }
    }

    const taskDate = dto.startDate ? new Date(dto.startDate) : new Date();
    taskDate.setHours(0, 0, 0, 0);

    if (currentUserRole === Role.EMPLOYEE) {
      const onLeave = await this.prisma.leave.findFirst({
        where: {
          employeeId: targetEmployeeId,
          status: 'APPROVED',
          deletedAt: null,
          startDate: { lte: taskDate },
          endDate: { gte: taskDate },
        },
      });

      if (onLeave) {
        throw new BadRequestException('You cannot create tasks or submit reviews because you are currently on leave.');
      }
    }

    const nextDay = new Date(taskDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // Employees can create multiple tasks per day (no one-task-per-day restriction)
    const isSelfNewTask = currentUserId === targetEmployeeId && currentUserRole === Role.EMPLOYEE;

    if (!dto.projects || dto.projects.length === 0) {
      throw new BadRequestException('At least one project must be selected');
    }

    const projectExpectedDates = dto.projects
      .map(p => p.expectedEndDate ? new Date(p.expectedEndDate) : null)
      .filter(d => d !== null) as Date[];
    const computedExpectedEndDate = dto.expectedEndDate
      ? new Date(dto.expectedEndDate)
      : (projectExpectedDates.length > 0 ? new Date(Math.max(...projectExpectedDates.map(d => d.getTime()))) : taskDate);

    const task = await this.prisma.task.create({
      data: {
        startDate: taskDate,
        employeeId: targetEmployeeId,
        startTime: dto.startTime,
        expectedEndDate: computedExpectedEndDate,
        projects: {
          create: dto.projects.map(p => {
            const isNewSelfTask = currentUserId === targetEmployeeId && currentUserRole === Role.EMPLOYEE;
            const taskType = isNewSelfTask 
              ? 'NEW_TASK'
              : (currentUserRole === Role.EMPLOYEE ? 'EMPLOYEE_ASSIGNED_TASK' : 'ADMIN_ASSIGNED_TASK');

            return {
              projectId: p.projectId,
              taskDescription: p.taskDescription,
              changesGivenBy: p.changesGivenBy,
              changesSummary: p.changesSummary,
              priority: p.priority || TaskPriority.MEDIUM,
              status: isNewSelfTask ? TaskStatus.PENDING_REVIEW : (p.status || TaskStatus.PENDING),
              delayReason: p.delayReason,
              completedWorkDescription: p.completedWorkDescription,
              completionPercentage: p.completionPercentage,
              blockedReason: p.blockedReason,
              acceptanceStatus: isNewSelfTask ? 'ACCEPTED' : (currentUserId === targetEmployeeId ? 'ACCEPTED' : 'PENDING'),
              adminComment: p.adminComment,
              adminCommentUpdatedAt: p.adminComment ? new Date() : null,
              adminCommentUpdatedById: p.adminComment ? currentUserId : null,
              startTime: p.startTime,
              endTime: p.endTime,
              jobRoleType: p.jobRoleType,
              customJobRole: p.customJobRole,
              proofRequired: p.proofRequired || false,
              assignedByUserId: currentUserId,
              assignedToUserId: targetEmployeeId,
              assignmentType: currentUserId === targetEmployeeId ? 'SELF' : (currentUserRole === Role.EMPLOYEE ? 'EMPLOYEE' : 'ADMIN'),
              reviewStatus: 'PENDING',
              taskType: taskType as any,
              expectedEndDate: p.expectedEndDate ? new Date(p.expectedEndDate) : computedExpectedEndDate,
              timeline: {
                create: {
                  action: 'Task Created',
                  performedById: currentUserId,
                  details: isNewSelfTask ? 'New task created (pending admin review)' : (currentUserId === targetEmployeeId ? 'Task created' : 'Task assigned'),
                }
              }
            };
          })
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

    this.notificationsService.broadcastEvent('task_updated', { action: 'create', taskId: task.id });
    this.notificationsService.broadcastEvent('metrics_updated', {});
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
  }, currentUserId?: number, currentUserRole?: Role) {
    const whereClause: any = { deletedAt: null };

    if (currentUserRole === Role.EMPLOYEE && currentUserId) {
      whereClause.OR = [
        { employeeId: currentUserId },
        {
          projects: {
            some: {
              deletedAt: null,
              assignedByUserId: currentUserId,
            },
          },
        },
      ];
      if (filters.employeeId) {
        whereClause.employeeId = filters.employeeId;
      }
    } else {
      if (filters.employeeId) {
        whereClause.employeeId = filters.employeeId;
      }
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

    const tasks = await this.prisma.task.findMany({
      where: whereClause,
      include: {
        projects: { 
          where: { deletedAt: null },
          include: { 
            project: true,
            updates: { orderBy: { createdAt: 'desc' } },
            assignedBy: { select: { id: true, name: true, email: true } },
            assignedTo: { select: { id: true, name: true, email: true } },
            submissions: { 
              include: { 
                proofs: true, 
                revisions: { include: { reviewer: { select: { name: true } } } },
                approvals: { include: { reviewer: { select: { name: true } } } }
              }, 
              orderBy: { createdAt: 'desc' } 
            },
            timeline: { 
              include: { performedBy: { select: { name: true } } }, 
              orderBy: { createdAt: 'asc' } 
            }
          } 
        },
        employee: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { startDate: 'desc' },
    });

    const formattedTasks = [];
    for (const t of tasks) {
      formattedTasks.push(await this.formatTaskWithCarryForwardDetails(t));
    }
    return formattedTasks;
  }

  async findOne(id: number) {
    const task = await this.prisma.task.findFirst({
      where: { id, deletedAt: null },
      include: {
        projects: { 
          where: { deletedAt: null },
          include: { 
            project: true,
            updates: { orderBy: { createdAt: 'desc' } },
            assignedBy: { select: { id: true, name: true, email: true } },
            assignedTo: { select: { id: true, name: true, email: true } },
            submissions: { 
              include: { 
                proofs: true, 
                revisions: { include: { reviewer: { select: { name: true } } } },
                approvals: { include: { reviewer: { select: { name: true } } } }
              }, 
              orderBy: { createdAt: 'desc' } 
            },
            timeline: { 
              include: { performedBy: { select: { name: true } } }, 
              orderBy: { createdAt: 'asc' } 
            }
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
    return this.formatTaskWithCarryForwardDetails(task);
  }

  async update(id: number, dto: UpdateTaskDto, currentUserId: number, currentUserRole: Role) {
    const task = await this.findOne(id);

    if (currentUserRole === Role.EMPLOYEE) {
      const isAssignee = task.employeeId === currentUserId;
      const isDelegator = task.projects.some(p => p.assignedByUserId === currentUserId);
      if (!isAssignee && !isDelegator) {
        throw new ForbiddenException('You can only modify tasks you assigned or are assigned to you');
      }
    }

    if (currentUserRole === Role.EMPLOYEE) {
      const taskDate = new Date(task.startDate);
      taskDate.setHours(0, 0, 0, 0);

      const onLeave = await this.prisma.leave.findFirst({
        where: {
          employeeId: currentUserId,
          status: 'APPROVED',
          deletedAt: null,
          startDate: { lte: taskDate },
          endDate: { gte: taskDate },
        },
      });

      if (onLeave) {
        throw new BadRequestException('You cannot create tasks or submit reviews because you are currently on leave.');
      }
    }

    const updateData: any = {};
    if (dto.startDate) updateData.startDate = new Date(dto.startDate);
    if (dto.startTime) updateData.startTime = dto.startTime;
    if (dto.expectedEndDate) updateData.expectedEndDate = new Date(dto.expectedEndDate);
    if (dto.employeeId) {
      if (currentUserRole === Role.EMPLOYEE && dto.employeeId !== currentUserId) {
        const targetUser = await this.prisma.user.findFirst({
          where: { id: dto.employeeId, deletedAt: null }
        });
        if (!targetUser) {
          throw new NotFoundException('Target employee not found');
        }
        if (targetUser.role !== Role.EMPLOYEE) {
          throw new BadRequestException('You can only delegate tasks to other Employees.');
        }
        updateData.employeeId = dto.employeeId;
      } else if (currentUserRole !== Role.EMPLOYEE) {
        updateData.employeeId = dto.employeeId;
      }
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
    let adminCommentUpdatedProjects: string[] = [];

    // Process TaskProjects
    if (dto.projects) {
      const incomingProjectIds = dto.projects.filter(p => p.id).map(p => p.id);
      
      // Only delete projects that were explicitly removed when the caller is an admin/delegator
      // Employees updating their own work status or partial updates should NOT cause other projects to be deleted
      if (currentUserRole !== Role.EMPLOYEE && !dto.partialUpdate) {
        const projectsToDelete = task.projects.filter(p => !incomingProjectIds.includes(p.id));
        for (const p of projectsToDelete) {
          await this.prisma.taskProject.update({
            where: { id: p.id },
            data: { deletedAt: new Date() }
          });
        }
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

            let adminCommentChanged = false;
            let finalAdminComment = existingProject.adminComment;
            let finalAdminCommentUpdatedAt = existingProject.adminCommentUpdatedAt;
            let finalAdminCommentUpdatedById = existingProject.adminCommentUpdatedById;

            if (currentUserRole !== Role.EMPLOYEE && p.adminComment !== undefined && p.adminComment !== existingProject.adminComment) {
              adminCommentChanged = true;
              finalAdminComment = p.adminComment;
              finalAdminCommentUpdatedAt = new Date();
              finalAdminCommentUpdatedById = currentUserId;
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
                acceptanceStatus: p.acceptanceStatus,
                rejectionReason: p.rejectionReason,
                adminComment: finalAdminComment,
                adminCommentUpdatedAt: finalAdminCommentUpdatedAt,
                adminCommentUpdatedById: finalAdminCommentUpdatedById,
                startTime: p.startTime,
                endTime: p.endTime,
                jobRoleType: p.jobRoleType,
                customJobRole: p.customJobRole,
                proofRequired: p.proofRequired,
                expectedEndDate: p.expectedEndDate ? new Date(p.expectedEndDate) : undefined,
              }
            });

            if (adminCommentChanged) {
              const projDetails = await this.prisma.project.findUnique({ where: { id: existingProject.projectId } });
              if (projDetails) {
                adminCommentUpdatedProjects.push(projDetails.name);
              }
            }

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
              acceptanceStatus: currentUserRole === Role.EMPLOYEE ? 'ACCEPTED' : 'PENDING',
              adminComment: p.adminComment,
              adminCommentUpdatedAt: p.adminComment ? new Date() : null,
              adminCommentUpdatedById: p.adminComment ? currentUserId : null,
              startTime: p.startTime,
              endTime: p.endTime,
              jobRoleType: p.jobRoleType,
              customJobRole: p.customJobRole,
              proofRequired: p.proofRequired || false,
              assignedByUserId: currentUserId,
              assignedToUserId: task.employeeId,
              assignmentType: currentUserId === task.employeeId ? 'SELF' : (currentUserRole === Role.EMPLOYEE ? 'EMPLOYEE' : 'ADMIN'),
              reviewStatus: 'PENDING',
              expectedEndDate: p.expectedEndDate ? new Date(p.expectedEndDate) : (dto.expectedEndDate ? new Date(dto.expectedEndDate) : new Date(task.startDate)),
              timeline: {
                create: {
                  action: 'Task Created',
                  performedById: currentUserId,
                  details: currentUserId === task.employeeId ? 'Task created' : 'Task assigned',
                }
              }
            }
          });
        }
      }

      const activeProjects = await this.prisma.taskProject.findMany({
        where: { taskId: id, deletedAt: null }
      });
      const activeDates = activeProjects
        .map(proj => proj.expectedEndDate)
        .filter(d => d !== null) as Date[];
      if (activeDates.length > 0) {
        const maxExpectedDate = new Date(Math.max(...activeDates.map(d => d.getTime())));
        await this.prisma.task.update({
          where: { id },
          data: { expectedEndDate: maxExpectedDate }
        });
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

        if (adminCommentUpdatedProjects.length > 0) {
          await this.notificationsService.createNotification(
            updatedTask.employeeId,
            'TASK_UPDATED',
            'Admin Comment Updated',
            'Admin updated instructions for your task.',
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
        
        if (newlyAssignedProjects.length === 0 && adminEditedDescriptions.length === 0 && adminCommentUpdatedProjects.length === 0) {
          await this.notificationsService.createNotification(
            updatedTask.employeeId,
            'TASK_UPDATED',
            'Task Updated by Admin',
            `An admin updated your task for projects: ${updatedTask.projects.map(p => p.project?.name).join(', ')}.`
          );
        }
      }
    }

    this.notificationsService.broadcastEvent('task_updated', { action: 'update', taskId: updatedTask.id });
    this.notificationsService.broadcastEvent('metrics_updated', {});
    return updatedTask;
  }

  async acceptPendingProjects(taskId: number, employeeId: number) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId, employeeId, deletedAt: null },
      include: { projects: true, employee: true }
    });
    if (!task) throw new NotFoundException('Task not found');
    
    await this.prisma.taskProject.updateMany({
      where: { taskId, acceptanceStatus: 'PENDING', deletedAt: null },
      data: { acceptanceStatus: 'ACCEPTED' }
    });

    const admins = await this.prisma.user.findMany({
      where: { role: { in: [Role.ADMIN, Role.SUPER_ADMIN] }, deletedAt: null },
      select: { id: true },
    });
    
    const employeeName = task.employee?.name || 'Employee';
    for (const admin of admins) {
      await this.notificationsService.createNotification(
        admin.id,
        'TASK_ACCEPTED',
        'Task Accepted',
        `Employee "${employeeName}" has accepted the assigned task.`,
        { taskId },
        employeeId,
        taskId
      );
    }

    this.notificationsService.broadcastEvent('task_updated', { action: 'accept', taskId });
    this.notificationsService.broadcastEvent('metrics_updated', {});
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
    
    this.notificationsService.broadcastEvent('task_updated', { action: 'reject', taskId });
    this.notificationsService.broadcastEvent('metrics_updated', {});
    return { success: true };
  }

  async remove(id: number, currentUserId: number, currentUserRole: Role) {
    const taskProject = await this.prisma.taskProject.findUnique({
      where: { id, deletedAt: null },
      include: { task: { include: { projects: { where: { deletedAt: null } }, employee: true } } }
    });

    if (!taskProject) {
      throw new NotFoundException('Task project not found');
    }

    const isCreator = taskProject.assignedByUserId === currentUserId;
    if (!isCreator) {
      throw new HttpException({
        success: false,
        message: "You are not authorized to delete this task"
      }, HttpStatus.FORBIDDEN);
    }

    const taskId = taskProject.taskId;
    const siblingProjects = taskProject.task.projects.filter(p => p.id !== id);

    // Delete task approvals linked to submissions of this task project
    await this.prisma.taskApproval.deleteMany({
      where: {
        taskSubmission: {
          taskProjectId: id
        }
      }
    });

    // Delete task submissions for this task project
    await this.prisma.taskSubmission.deleteMany({
      where: {
        taskProjectId: id
      }
    });

    // Delete task updates for this task project
    await this.prisma.taskUpdate.deleteMany({
      where: {
        taskProjectId: id
      }
    });

    // Delete task timelines for this task project
    await this.prisma.taskTimeline.deleteMany({
      where: {
        taskProjectId: id
      }
    });

    // Delete the task project
    await this.prisma.taskProject.delete({
      where: { id }
    });

    // If this was the only project in the parent Task, we should delete the parent Task
    if (siblingProjects.length === 0) {
      // Clean up carryForwardedFromId references to prevent foreign key errors
      await this.prisma.task.updateMany({
        where: { carryForwardedFromId: taskId },
        data: { carryForwardedFromId: null }
      });

      await this.prisma.attachment.deleteMany({
        where: { taskId }
      });

      await this.prisma.taskCarryForward.deleteMany({
        where: { taskId }
      });

      await this.prisma.task.delete({
        where: { id: taskId }
      });
    } else {
      // If there are sibling projects, update the parent Task's expectedEndDate
      const projectExpectedDates = siblingProjects
        .map(p => p.expectedEndDate ? new Date(p.expectedEndDate) : null)
        .filter(d => d !== null) as Date[];
      
      const newExpectedEndDate = projectExpectedDates.length > 0 
        ? new Date(Math.max(...projectExpectedDates.map(d => d.getTime())))
        : taskProject.task.startDate;

      await this.prisma.task.update({
        where: { id: taskId },
        data: { expectedEndDate: newExpectedEndDate }
      });
    }

    // Send notifications if employee deleted their self-assigned task
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
          `Employee "${taskProject.task.employee.name}" deleted their task project.`,
          { taskId }
        );
      }
    } else {
      // If deleted by admin, notify employee
      if (taskProject.task.employeeId !== currentUserId) {
        await this.notificationsService.createNotification(
          taskProject.task.employeeId,
          'TASK_DELETED',
          'Task Deleted by Admin',
          `An admin has deleted your task project.`,
          { taskId }
        );
      }
    }

    this.notificationsService.broadcastEvent('task_updated', { action: 'delete', taskId });
    this.notificationsService.broadcastEvent('metrics_updated', {});
    
    return {
      success: true,
      message: "Task deleted successfully"
    };
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

  async formatTaskWithCarryForwardDetails(task: any) {
    if (!task) return null;

    let carryForwardCount = 0;
    let lastCarryForwardDate: Date | null = null;
    let currentId = task.carryForwardedFromId;

    const visited = new Set<number>();
    while (currentId) {
      if (visited.has(currentId)) break;
      visited.add(currentId);

      const parentTask = await this.prisma.task.findUnique({
        where: { id: currentId },
        select: { carryForwardedFromId: true, startDate: true }
      });

      if (!parentTask) break;

      carryForwardCount++;
      if (carryForwardCount === 1) {
        lastCarryForwardDate = parentTask.startDate;
      }
      currentId = parentTask.carryForwardedFromId;
    }

    const today = new Date();
    const formattedProjects = task.projects.map((tp: any) => {
      let overdueDays = 0;
      const expectedEndDate = new Date(task.expectedEndDate);
      if (tp.status !== TaskStatus.COMPLETED && today.getTime() > expectedEndDate.getTime()) {
        overdueDays = Math.ceil((today.getTime() - expectedEndDate.getTime()) / (1000 * 60 * 60 * 24));
      }

      return {
        ...tp,
        carryForwardCount,
        lastCarryForwardDate,
        overdueDays,
      };
    });

    return {
      ...task,
      projects: formattedProjects,
    };
  }

  async handleCarryForward(taskId: number, carryForward: boolean, userId: number, reason?: string) {
    const fs = require('fs');
    try {
      fs.appendFileSync('debug.log', `[${new Date().toISOString()}] handleCarryForward: taskId=${taskId} (${typeof taskId}), carryForward=${carryForward}, userId=${userId}, reason=${reason}\n`);
    } catch (e) {}
    console.log('[DEBUG] handleCarryForward called with:', { taskId, carryForward, userId, reason });
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, deletedAt: null },
      include: {
        projects: {
          where: { deletedAt: null },
          include: { project: true }
        },
        employee: {
          select: { id: true, name: true, email: true },
        },
        carryForwardedTo: true,
      }
    });
    console.log('[DEBUG] handleCarryForward task lookup result:', task);

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.employeeId !== userId) {
      throw new ForbiddenException('You do not own this task');
    }

    if (task.carryForwardedTo) {
      throw new BadRequestException('Task has already been carried forward.');
    }

    if (carryForward) {
      const today = new Date();
      const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const expectedEndDate = new Date(task.expectedEndDate);
      const expectedDateOnly = new Date(expectedEndDate.getFullYear(), expectedEndDate.getMonth(), expectedEndDate.getDate());

      const isDeadlineReachedOrOverdue = expectedDateOnly.getTime() <= todayDate.getTime();

      if (isDeadlineReachedOrOverdue) {
        if (!reason || reason.trim().length < 20) {
          throw new BadRequestException('Delay reason is required and must be at least 20 characters.');
        }
      }

      const incompleteProjects = task.projects.filter(p => 
        ([TaskStatus.PENDING, TaskStatus.IN_PROGRESS, TaskStatus.DELAYED] as TaskStatus[]).includes(p.status)
      );

      let newExpectedEndDate = new Date(task.expectedEndDate);
      if (expectedDateOnly.getTime() <= todayDate.getTime()) {
        newExpectedEndDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 18, 0, 0);
      }

      const newTask = await this.prisma.task.create({
        data: {
          startDate: todayDate,
          employeeId: userId,
          startTime: task.startTime,
          expectedEndDate: newExpectedEndDate,
          carryForwardedFromId: task.id,
          projects: {
            create: incompleteProjects.map(p => ({
              projectId: p.projectId,
              taskDescription: p.taskDescription,
              changesGivenBy: p.changesGivenBy,
              changesSummary: p.changesSummary,
              priority: p.priority,
              // Carry-forward tasks are always IN_PROGRESS — they represent active work being continued
              status: TaskStatus.IN_PROGRESS,
              completionPercentage: p.completionPercentage,
              notes: `Carried forward.`,
              acceptanceStatus: 'ACCEPTED',
            }))
          }
        },
      });

      for (const p of incompleteProjects) {
        const oldStatus = p.status;
        const newStatus = isDeadlineReachedOrOverdue ? TaskStatus.DELAYED : TaskStatus.ON_HOLD;

        await this.prisma.taskProject.update({
          where: { id: p.id },
          data: {
            status: newStatus,
            delayReason: isDeadlineReachedOrOverdue ? reason : null,
            notes: `${p.notes || ''} [Carried forward to today]`.trim(),
          },
        });

        await this.prisma.taskUpdate.create({
          data: {
            taskProjectId: p.id,
            statusBefore: oldStatus,
            statusAfter: newStatus,
            remarks: isDeadlineReachedOrOverdue 
              ? `Carried forward (Deadline Reached/Overdue). Reason: ${reason}`
              : 'Carried forward (Future Deadline)',
          }
        });
      }

      // Create TaskCarryForward entry
      await this.prisma.taskCarryForward.create({
        data: {
          taskId: task.id,
          employeeId: userId,
          fromDate: task.startDate,
          toDate: todayDate,
          reason: isDeadlineReachedOrOverdue ? reason : null,
          isDeadlineCarryForward: isDeadlineReachedOrOverdue,
        }
      });

      const employeeName = task.employee?.name || 'Employee';
      const formattedFromDate = task.startDate.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
      const formattedToDate = today.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });

      // Notifications
      const admins = await this.prisma.user.findMany({
        where: { role: { in: [Role.ADMIN, Role.SUPER_ADMIN] }, deletedAt: null },
        select: { id: true },
      });

      const adminMessage = `Employee "${employeeName}" carried forward task from ${formattedFromDate} to ${formattedToDate}.${isDeadlineReachedOrOverdue ? ` Reason: ${reason}` : ''}`;
      for (const admin of admins) {
        await this.notificationsService.createNotification(
          admin.id,
          'TASK_UPDATED',
          'Task Carried Forward',
          adminMessage,
          { taskId: newTask.id, oldTaskId: task.id, isOverdue: isDeadlineReachedOrOverdue },
          userId,
          newTask.id
        );
      }

      await this.notificationsService.createNotification(
        userId,
        'TASK_UPDATED',
        'Task Carried Forward Successfully',
        `Your task from ${formattedFromDate} has been carried forward to ${formattedToDate}.`,
        { taskId: newTask.id, oldTaskId: task.id },
        userId,
        newTask.id
      );

      // Create Activity Log
      await this.prisma.activityLog.create({
        data: {
          userId,
          action: 'TASK_CARRY_FORWARD',
          details: `Task carried forward\nFrom: ${formattedFromDate}\nTo: ${formattedToDate}\nBy: ${employeeName}`
        }
      });

      this.notificationsService.broadcastEvent('task_updated', { action: 'carry_forward', taskId });
      this.notificationsService.broadcastEvent('metrics_updated', {});
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
      this.notificationsService.broadcastEvent('task_updated', { action: 'carry_forward_dismiss', taskId });
      this.notificationsService.broadcastEvent('metrics_updated', {});
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
      carriedForwardToday,
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
      this.prisma.task.count({
        where: {
          deletedAt: null,
          startDate: { gte: startOfToday, lte: endOfToday },
          carryForwardedFromId: { not: null },
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
      carriedForwardToday,
    };
  }

  async submitProjectTask(
    taskProjectId: number,
    comment: string,
    proof: any,
    employeeId: number,
    workReview?: {
      workSummary?: string;
      completionPercentage?: number;
      timeSpent?: number;
      blockers?: string;
      additionalNotes?: string;
    }
  ) {
    const taskProject = await this.prisma.taskProject.findUnique({
      where: { id: taskProjectId },
      include: { task: true, project: true },
    });

    if (!taskProject) {
      throw new NotFoundException('Task project not found');
    }

    // Allow submission if employee is the task owner OR was assigned the task
    const isOwner = taskProject.task.employeeId === employeeId;
    const isAssignee = taskProject.assignedToUserId === employeeId;
    if (!isOwner && !isAssignee) {
      throw new BadRequestException('You are not authorized to submit work for this task');
    }

    if (taskProject.proofRequired) {
      if (!proof || !proof.url) {
        throw new BadRequestException('Work proof is mandatory for this task');
      }
    }

    const isRevisionResubmit = taskProject.status === TaskStatus.REVISION_REQUIRED;

    // Completion Logic per spec:
    // proofRequired = false AND priority != HIGH AND not admin-assigned → COMPLETED directly
    // proofRequired = true OR priority = HIGH OR admin-assigned → REVIEW_PENDING (awaits reviewer approval)
    const isSelfAssigned = taskProject.assignedByUserId === taskProject.assignedToUserId;
    const requiresReview = !isSelfAssigned && (taskProject.proofRequired || taskProject.priority === TaskPriority.HIGH);

    let targetStatus: TaskStatus = TaskStatus.COMPLETED;
    let timelineAction = 'Completed';
    let timelineDetails = comment ? `Completed task: ${comment}` : 'Completed task (no proof required)';

    if (requiresReview) {
      targetStatus = TaskStatus.REVIEW_PENDING;
      timelineAction = isRevisionResubmit ? 'Proof Uploaded Again' : 'Review Submitted';
      timelineDetails = isRevisionResubmit
        ? `Resubmitted proof after revision: ${comment || 'No comment'}`
        : (comment ? `Submitted review: ${comment}` : 'Submitted review for approval');
    }

    // Build proof create data if proof exists
    const proofsData = proof && proof.url ? [
      {
        filename: proof.filename || 'proof',
        filepath: proof.url,
        mimetype: proof.mimetype || 'application/octet-stream',
        size: proof.size || 0,
      }
    ] : [];

    const submission = await this.prisma.taskSubmission.create({
      data: {
        taskProjectId,
        employeeId,
        comment: comment || null,
        timeSpent: workReview?.timeSpent || null,
        blockers: workReview?.blockers || null,
        notes: workReview?.additionalNotes || null,
        proofs: proofsData.length > 0 ? { create: proofsData } : undefined,
      },
    });

    // Build update data for task project
    const updateData: any = {
      status: targetStatus,
      reviewStatus: targetStatus === TaskStatus.COMPLETED ? 'APPROVED' : 'REVIEW_PENDING',
      completedWorkDescription: workReview?.workSummary || comment || null,
      completionPercentage: workReview?.completionPercentage ?? taskProject.completionPercentage,
      timeSpent: workReview?.timeSpent ?? taskProject.timeSpent,
      blockers: workReview?.blockers || taskProject.blockers,
    };

    // On approval path (no proof), also set approved fields
    if (targetStatus === TaskStatus.COMPLETED) {
      updateData.approvedDate = new Date();
      updateData.approvalComment = 'Auto-approved (no proof required)';
    }

    await this.prisma.taskProject.update({
      where: { id: taskProjectId },
      data: updateData,
    });

    // Timeline entry
    await this.prisma.taskTimeline.create({
      data: {
        taskProjectId,
        action: timelineAction,
        performedById: employeeId,
        details: timelineDetails,
      },
    });

    // If proof was uploaded, add a separate 'Proof Uploaded' event
    if (proofsData.length > 0) {
      await this.prisma.taskTimeline.create({
        data: {
          taskProjectId,
          action: 'Proof Uploaded',
          performedById: employeeId,
          details: `Proof file: ${proof.filename || 'attachment'}`,
        },
      });
    }

    // Determine reviewer to notify
    const reviewerId = taskProject.assignedByUserId;
    const notificationTitle = targetStatus === TaskStatus.COMPLETED ? 'Task Completed' : 'Task Review Submitted';
    const notificationMsg = targetStatus === TaskStatus.COMPLETED
      ? `Task completed for project "${taskProject.project.name}".`
      : `Review submitted for project "${taskProject.project.name}". Please review.`;

    // Notify the reviewer (assigner)
    if (reviewerId && reviewerId !== employeeId) {
      await this.notificationsService.createNotification(
        reviewerId,
        'TASK_REVIEW_SUBMITTED',
        notificationTitle,
        notificationMsg,
        { taskId: taskProject.taskId, taskProjectId },
        employeeId,
        taskProject.taskId
      );
    }

    // Always notify admins if it's an admin-assigned or self-created task
    if (taskProject.assignmentType === 'ADMIN' || taskProject.assignmentType === 'SELF') {
      const admins = await this.prisma.user.findMany({
        where: { role: { in: [Role.ADMIN, Role.SUPER_ADMIN] }, deletedAt: null },
        select: { id: true },
      });
      for (const admin of admins) {
        if (admin.id !== reviewerId) {
          await this.notificationsService.createNotification(
            admin.id,
            'TASK_REVIEW_SUBMITTED',
            notificationTitle,
            notificationMsg,
            { taskId: taskProject.taskId, taskProjectId },
            employeeId,
            taskProject.taskId
          );
        }
      }
    }

    this.notificationsService.broadcastEvent('task_updated', { action: 'submit', taskId: taskProject.taskId });
    this.notificationsService.broadcastEvent('metrics_updated', {});
    return { success: true, submissionId: submission.id };
  }

  async reviewProjectTask(taskProjectId: number, status: string, comment: string, reviewerId: number, reviewerRole: Role) {
    const taskProject = await this.prisma.taskProject.findUnique({
      where: { id: taskProjectId },
      include: { task: { include: { employee: true } }, project: true, submissions: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });

    if (!taskProject) {
      throw new NotFoundException('Task project not found');
    }

    const isAssigner = taskProject.assignedByUserId === reviewerId;
    const isAdmin = reviewerRole === Role.ADMIN || reviewerRole === Role.SUPER_ADMIN;

    if (!isAdmin && !isAssigner) {
      throw new BadRequestException('You are not authorized to review this task. Only the assigner or an admin can review.');
    }

    const latestSubmission = taskProject.submissions[0];
    if (!latestSubmission) {
      throw new BadRequestException('No submission found for this task project to review');
    }

    if (status !== 'APPROVED' && status !== 'REVISION_REQUIRED') {
      throw new BadRequestException('Invalid review status. Must be APPROVED or REVISION_REQUIRED');
    }

    if (status === 'REVISION_REQUIRED' && (!comment || comment.trim() === '')) {
      throw new BadRequestException('Comment is required for revision requests');
    }

    if (status === 'APPROVED') {
      await this.prisma.taskApproval.create({
        data: {
          taskSubmissionId: latestSubmission.id,
          reviewerId,
          comment: comment || 'Approved',
        },
      });

      await this.prisma.taskProject.update({
        where: { id: taskProjectId },
        data: {
          status: TaskStatus.COMPLETED,
          reviewStatus: 'APPROVED',
          approvedById: reviewerId,
          approvedDate: new Date(),
          approvalComment: comment || 'Approved',
        },
      });

      await this.prisma.taskTimeline.create({
        data: {
          taskProjectId,
          action: 'Approved',
          performedById: reviewerId,
          details: comment || 'Approved task submission',
        },
      });

      await this.prisma.taskTimeline.create({
        data: {
          taskProjectId,
          action: 'Completed',
          performedById: reviewerId,
          details: 'Task marked as Completed after approval',
        },
      });
    } else if (status === 'REVISION_REQUIRED') {
      await this.prisma.taskRevision.create({
        data: {
          taskSubmissionId: latestSubmission.id,
          reviewerId,
          comment,
        },
      });

      await this.prisma.taskProject.update({
        where: { id: taskProjectId },
        data: {
          status: TaskStatus.REVISION_REQUIRED,
          reviewStatus: 'REVISION_REQUIRED',
        },
      });

      await this.prisma.taskTimeline.create({
        data: {
          taskProjectId,
          action: 'Revision Requested',
          performedById: reviewerId,
          details: comment,
        },
      });
    }

    const notificationTitle = status === 'APPROVED' ? 'Task Approved ✓' : 'Revision Required';
    const notificationMsg = status === 'APPROVED'
      ? `Your task for project "${taskProject.project.name}" has been approved and marked complete.`
      : `Your task for project "${taskProject.project.name}" requires revision. Reason: "${comment}".`;

    await this.notificationsService.createNotification(
      taskProject.task.employeeId,
      status === 'APPROVED' ? 'TASK_APPROVED' : 'TASK_REVISION_REQUIRED',
      notificationTitle,
      notificationMsg,
      { taskId: taskProject.taskId, taskProjectId },
      reviewerId,
      taskProject.taskId
    );

    // Also notify the assigned-to user if different from task owner
    if (taskProject.assignedToUserId && taskProject.assignedToUserId !== taskProject.task.employeeId) {
      await this.notificationsService.createNotification(
        taskProject.assignedToUserId,
        status === 'APPROVED' ? 'TASK_APPROVED' : 'TASK_REVISION_REQUIRED',
        notificationTitle,
        notificationMsg,
        { taskId: taskProject.taskId, taskProjectId },
        reviewerId,
        taskProject.taskId
      );
    }

    this.notificationsService.broadcastEvent('task_updated', { action: 'review', taskId: taskProject.taskId });
    this.notificationsService.broadcastEvent('metrics_updated', {});
    return { success: true };
  }

  // ─── MY SECTIONS ──────────────────────────────────────────────────────────
  // Returns 4 separated task buckets for the employee dashboard.
  async getTasksBySection(userId: number) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const includeClause = {
      project: true,
      updates: { orderBy: { createdAt: 'desc' as const } },
      assignedBy: { select: { id: true, name: true, email: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
      adminCommentUpdatedBy: { select: { id: true, name: true } },
      submissions: {
        include: {
          proofs: true,
          revisions: {
            include: { reviewer: { select: { id: true, name: true } } },
            orderBy: { createdAt: 'desc' as const },
          },
          approvals: {
            include: { reviewer: { select: { id: true, name: true } } },
            orderBy: { createdAt: 'desc' as const },
          },
        },
        orderBy: { createdAt: 'desc' as const },
      },
      timeline: {
        include: { performedBy: { select: { id: true, name: true } } },
        orderBy: { createdAt: 'asc' as const },
      },
      approvedBy: { select: { id: true, name: true } },
    };

    // Section A: Carry Forward Tasks (today, carryForwardedFromId set, owned by user)
    const carryForwardTasks = await this.prisma.task.findMany({
      where: {
        employeeId: userId,
        deletedAt: null,
        carryForwardedFromId: { not: null },
        startDate: { gte: todayStart, lte: todayEnd },
      },
      include: {
        projects: { where: { deletedAt: null }, include: includeClause },
        employee: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Section B: Today's Tasks (NEW_TASK, owned by user, today, no carry forward)
    const todaysTasks = await this.prisma.task.findMany({
      where: {
        employeeId: userId,
        deletedAt: null,
        carryForwardedFromId: null,
        startDate: { gte: todayStart, lte: todayEnd },
        projects: {
          some: {
            taskType: 'NEW_TASK',
            assignedByUserId: userId,
            deletedAt: null,
          },
        },
      },
      include: {
        // Only include projects that belong to this section (self-created NEW_TASKs)
        projects: {
          where: {
            taskType: 'NEW_TASK',
            assignedByUserId: userId,
            deletedAt: null,
          },
          include: includeClause,
        },
        employee: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Section C: Tasks Assigned To Me by others (across all dates)
    const assignedToMeTasks = await this.prisma.task.findMany({
      where: {
        deletedAt: null,
        projects: {
          some: {
            assignedToUserId: userId,
            assignedByUserId: { not: userId },
            deletedAt: null,
          },
        },
      },
      include: {
        projects: {
          where: { assignedToUserId: userId, assignedByUserId: { not: userId }, deletedAt: null },
          include: includeClause,
        },
        employee: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Section D: Tasks Assigned By Me to others (across all dates)
    const assignedByMeTasks = await this.prisma.task.findMany({
      where: {
        deletedAt: null,
        projects: {
          some: {
            assignedByUserId: userId,
            assignedToUserId: { not: userId },
            deletedAt: null,
          },
        },
      },
      include: {
        projects: {
          where: { assignedByUserId: userId, assignedToUserId: { not: userId }, deletedAt: null },
          include: includeClause,
        },
        employee: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const fmt = async (tasks: any[]) => {
      const result = [];
      for (const t of tasks) {
        result.push(await this.formatTaskWithCarryForwardDetails(t));
      }
      return result;
    };

    return {
      carryForward: await fmt(carryForwardTasks),
      todaysTasks: await fmt(todaysTasks),
      assignedToMe: await fmt(assignedToMeTasks),
      assignedByMe: await fmt(assignedByMeTasks),
    };
  }
}
