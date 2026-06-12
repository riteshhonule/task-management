import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from './notifications.gateway';
import { FirebaseService } from '../firebase/firebase.service';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private gateway: NotificationsGateway,
    private firebaseService: FirebaseService,
  ) {}

  async createNotification(userId: number, type: string, title: string, message: string, metadata?: any, senderId?: number, relatedTaskId?: number) {
    const userObj = await this.prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      select: { role: true },
    });

    if (!userObj) {
      return null;
    }

    if (userObj.role === 'ADMIN' || userObj.role === 'SUPER_ADMIN') {
      const isOverdue = (type === 'TASK_UPDATED' && metadata?.isOverdue === true) || 
                        title.toLowerCase().includes('overdue') || 
                        message.toLowerCase().includes('overdue') ||
                        message.toLowerCase().includes('delay reason');

      const isReview = type === 'TASK_REVIEW_SUBMITTED' || 
                       title.toLowerCase().includes('review');

      const isLeave = type === 'LEAVE_REQUEST';

      const isMessageResponse = type === 'MESSAGE_RESPONSE';

      const isTaskRejection = type === 'TASK_UPDATED' && title === 'Task Rejected by Employee';

      const isCritical = isOverdue || isReview || isLeave || isMessageResponse || isTaskRejection;

      if (!isCritical) {
        return null;
      }

      if (isOverdue && !title.startsWith('[HIGH PRIORITY]')) {
        title = `[HIGH PRIORITY] ${title}`;
      }
    }

    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        senderId,
        relatedTaskId,
        status: 'SENT',
      },
      include: {
        sender: { select: { name: true, role: true } },
        user: { select: { name: true, role: true } }
      }
    });

    // Emit live event via websocket gateway to receiver
    this.gateway.sendToUser(userId, 'notification', { ...notification, metadata });

    const pushMetadata = {
      ...metadata,
      notificationId: String(notification.id),
      type: notification.type,
    };

    // Send push notification
    if (type.includes('TASK')) {
      await this.firebaseService.sendTaskNotification(userId, title, message, pushMetadata);
    } else if (type.includes('PROJECT')) {
      await this.firebaseService.sendProjectNotification(userId, title, message, pushMetadata);
    } else {
      await this.firebaseService.sendToUser(userId, title, message, pushMetadata);
    }

    return notification;
  }

  async sendLiveMessage(userId: number, message: any) {
    this.gateway.sendToUser(userId, 'new_message', message);
  }

  broadcastEvent(event: string, data: any) {
    this.gateway.broadcast(event, data);
  }

  async broadcastNotification(type: string, title: string, message: string) {
    // Get all active users whose role is NOT ADMIN or SUPER_ADMIN
    const users = await this.prisma.user.findMany({
      where: { 
        deletedAt: null,
        role: { notIn: ['ADMIN', 'SUPER_ADMIN'] }
      },
      select: { id: true },
    });

    const notifications = await Promise.all(
      users.map((u) =>
        this.prisma.notification.create({
          data: {
            userId: u.id,
            type,
            title,
            message,
          },
        }),
      ),
    );

    // Emit broadcast event
    this.gateway.broadcast('announcement_notification', {
      type,
      title,
      message,
    });

    // Send push notification broadcast
    const userIds = users.map(u => u.id);
    await this.firebaseService.sendAnnouncement(userIds, title, message);

    return notifications;
  }

  async getUserNotifications(userId: number) {
    const notifications = await this.prisma.notification.findMany({
      where: { userId, deletedAt: null },
      include: {
        sender: { select: { name: true, role: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Mark undelivered as DELIVERED
    const undelivered = notifications.filter(n => !n.isDelivered && n.status === 'SENT');
    if (undelivered.length > 0) {
      await this.prisma.notification.updateMany({
        where: { id: { in: undelivered.map(n => n.id) } },
        data: { isDelivered: true, deliveredAt: new Date(), status: 'DELIVERED' }
      });
      // Notify senders about delivery
      for (const n of undelivered) {
        if (n.senderId) {
          this.gateway.sendToUser(n.senderId, 'notification_status_update', {
            id: n.id,
            status: 'DELIVERED',
            deliveredAt: new Date(),
          });
        }
      }
    }

    return notifications;
  }

  async getSentNotifications(senderId: number) {
    return this.prisma.notification.findMany({
      where: { senderId, deletedAt: null },
      include: {
        user: { select: { name: true, role: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markAsRead(id: number, userId: number) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
      include: { user: true }
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    const updated = await this.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date(), seenAt: new Date(), status: 'SEEN' },
    });

    if (updated.senderId) {
      this.gateway.sendToUser(updated.senderId, 'notification_status_update', {
        id: updated.id,
        status: 'SEEN',
        readAt: updated.readAt,
        readBy: notification.user?.name,
      });
    }

    return updated;
  }

  async markAllAsRead(userId: number) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date(), seenAt: new Date(), status: 'SEEN' },
    });
  }
}
