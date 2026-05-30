import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private gateway: NotificationsGateway,
  ) {}

  async createNotification(userId: number, type: string, title: string, message: string) {
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
      },
    });

    // Emit live event via websocket gateway
    this.gateway.sendToUser(userId, 'notification', notification);

    return notification;
  }

  async broadcastNotification(type: string, title: string, message: string) {
    // Get all active users to create notifications in DB
    const users = await this.prisma.user.findMany({
      where: { deletedAt: null },
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

    return notifications;
  }

  async getUserNotifications(userId: number) {
    return this.prisma.notification.findMany({
      where: { userId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async markAsRead(id: number, userId: number) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllAsRead(userId: number) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }
}
