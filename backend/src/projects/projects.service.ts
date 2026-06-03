import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ProjectsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async create(createProjectDto: CreateProjectDto, senderId?: number) {
    const existing = await this.prisma.project.findUnique({
      where: { name: createProjectDto.name },
    });

    if (existing) {
      if (existing.deletedAt) {
        // Restore soft-deleted project
        return this.prisma.project.update({
          where: { name: createProjectDto.name },
          data: {
            description: createProjectDto.description,
            isArchived: false,
            deletedAt: null,
          },
        });
      }
      throw new BadRequestException('Project with this name already exists.');
    }

    const project = await this.prisma.project.create({
      data: {
        name: createProjectDto.name,
        description: createProjectDto.description,
        ...(createProjectDto.allocatedUserIds && createProjectDto.allocatedUserIds.length > 0 && {
          allocations: {
            create: createProjectDto.allocatedUserIds.map((uid) => ({
              userId: uid,
              status: 'PENDING',
            })),
          },
        }),
      },
    });

    if (createProjectDto.allocatedUserIds && createProjectDto.allocatedUserIds.length > 0) {
      for (const uid of createProjectDto.allocatedUserIds) {
        await this.notificationsService.createNotification(
          uid,
          'PROJECT_ALLOCATED',
          'New Project Allocated',
          `You have been allocated to a new project: "${project.name}". Please review and accept.`,
          undefined,
          senderId
        );
      }
    }

    this.notificationsService.broadcastEvent('project_updated', { action: 'create', projectId: project.id });
    return project;
  }

  async findAll() {
    return this.prisma.project.findMany({
      where: { deletedAt: null },
      include: {
        allocations: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: number) {
    const project = await this.prisma.project.findFirst({
      where: { id, deletedAt: null },
      include: {
        allocations: {
          include: {
            user: { select: { id: true, name: true } }
          }
        }
      }
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return project;
  }

  async findMyAllocations(userId: number) {
    return this.prisma.projectAllocation.findMany({
      where: { userId },
      include: {
        project: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async acceptAllocation(userId: number, allocationId: number) {
    const allocation = await this.prisma.projectAllocation.findUnique({
      where: { id: allocationId },
      include: { project: true, user: true }
    });

    if (!allocation || allocation.userId !== userId) {
      throw new NotFoundException('Allocation not found');
    }

    const updated = await this.prisma.projectAllocation.update({
      where: { id: allocationId },
      data: { status: 'ACCEPTED' }
    });

    // Notify admins
    const admins = await this.prisma.user.findMany({
      where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } }
    });

    if (admins.length > 0) {
      await this.prisma.notification.createMany({
        data: admins.map(admin => ({
          userId: admin.id,
          type: 'PROJECT_ACCEPTED',
          title: 'Project Allocation Accepted',
          message: `${allocation.user.name} has accepted the allocation for project "${allocation.project.name}".`,
        }))
      });
    }

    this.notificationsService.broadcastEvent('project_updated', { action: 'acceptAllocation', allocationId });
    return updated;
  }

  async update(id: number, updateProjectDto: UpdateProjectDto, senderId?: number) {
    const project = await this.findOne(id);

    const { allocatedUserIds, ...rest } = updateProjectDto;
    
    const updated = await this.prisma.project.update({
      where: { id },
      data: rest,
    });

    if (allocatedUserIds) {
      // Find current allocations
      const currentAllocations = await this.prisma.projectAllocation.findMany({
        where: { projectId: id }
      });
      const currentUserIds = currentAllocations.map(a => a.userId);
      
      const toAdd = allocatedUserIds.filter(uid => !currentUserIds.includes(uid));
      const toRemove = currentUserIds.filter(uid => !allocatedUserIds.includes(uid));

      if (toRemove.length > 0) {
        await this.prisma.projectAllocation.deleteMany({
          where: { projectId: id, userId: { in: toRemove } }
        });
      }

      if (toAdd.length > 0) {
        await this.prisma.projectAllocation.createMany({
          data: toAdd.map(userId => ({
            projectId: id,
            userId,
          }))
        });

        // Notify new users
        for (const uid of toAdd) {
          await this.notificationsService.createNotification(
            uid,
            'PROJECT_ALLOCATED',
            'New Project Allocated',
            `You have been allocated to a new project: "${project.name}". Please review and accept.`,
            undefined,
            senderId
          );
        }
      }
    }

    this.notificationsService.broadcastEvent('project_updated', { action: 'update', projectId: updated.id });
    return updated;
  }

  async remove(id: number) {
    await this.findOne(id);
    const deleted = await this.prisma.project.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    this.notificationsService.broadcastEvent('project_updated', { action: 'delete', projectId: id });
    return deleted;
  }
}
