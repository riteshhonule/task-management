import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto/discussion.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class TaskDiscussionService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async addComment(userId: number, taskProjectId: number, dto: CreateCommentDto) {
    const taskProject = await this.prisma.taskProject.findUnique({
      where: { id: taskProjectId },
      include: {
        task: true,
      },
    });

    if (!taskProject) {
      throw new NotFoundException('Task Project not found.');
    }

    // Create the discussion comment
    const comment = await this.prisma.taskDiscussionComment.create({
      data: {
        taskProjectId,
        userId,
        content: dto.content || '',
        replyToId: dto.replyToId || null,
        attachments: dto.attachments
          ? {
              create: dto.attachments.map((att) => ({
                filename: att.filename,
                filepath: att.filepath,
                mimetype: att.mimetype,
                size: att.size,
              })),
            }
          : undefined,
      },
      include: {
        user: { select: { id: true, name: true, role: true } },
        attachments: true,
      },
    });

    // Create Activity Timeline Log
    await this.prisma.taskTimeline.create({
      data: {
        taskProjectId,
        action: 'Comment Added',
        performedById: userId,
        details: `${comment.user.name} added a comment: "${dto.content.substring(0, 40)}..."`,
      },
    });

    // Notify other users
    // If sender is the assignee, notify the assigner (Admin)
    // If sender is the assigner, notify the assignee (Employee)
    const assigneeId = taskProject.assignedToUserId || taskProject.task.employeeId;
    const assignerId = taskProject.assignedByUserId;

    if (userId === assigneeId && assignerId) {
      await this.notificationsService.createNotification(
        assignerId,
        'TASK_COMMENT',
        'New Task Comment',
        `${comment.user.name} commented on Task #${taskProjectId}: "${dto.content.substring(0, 30)}..."`,
        { taskProjectId },
        userId,
        taskProject.taskId,
      );
    } else if (userId === assignerId && assigneeId) {
      await this.notificationsService.createNotification(
        assigneeId,
        'TASK_COMMENT',
        'New Task Comment',
        `${comment.user.name} commented on your Task #${taskProjectId}: "${dto.content.substring(0, 30)}..."`,
        { taskProjectId },
        userId,
        taskProject.taskId,
      );
    }

    // Emit live event to synchronize task updates
    this.notificationsService.broadcastEvent('task_updated', {
      action: 'comment',
      taskProjectId,
      commentId: comment.id,
    });

    return comment;
  }

  async getComments(taskProjectId: number) {
    const comments = await this.prisma.taskDiscussionComment.findMany({
      where: { taskProjectId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { id: true, name: true, role: true } },
        attachments: true,
        replyTo: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
      },
    });

    const timeline = await this.prisma.taskTimeline.findMany({
      where: { taskProjectId },
      orderBy: { createdAt: 'desc' },
      include: {
        performedBy: { select: { id: true, name: true, role: true } },
      },
    });

    return {
      comments,
      timeline,
    };
  }
}
