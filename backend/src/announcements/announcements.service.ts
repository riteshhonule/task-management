import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AnnouncementsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async create(dto: CreateAnnouncementDto, creatorId: number) {
    const announcement = await this.prisma.announcement.create({
      data: {
        title: dto.title,
        content: dto.content,
        creatorId,
      },
    });

    // Send global system notification
    await this.notificationsService.broadcastNotification(
      'ANNOUNCEMENT',
      announcement.title,
      announcement.content,
    );

    return announcement;
  }

  async findAll(userId: number) {
    const announcements = await this.prisma.announcement.findMany({
      where: { deletedAt: null },
      include: {
        creator: {
          select: { id: true, name: true, email: true },
        },
        acks: {
          where: { userId },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Map to include a simple boolean acknowledged flag
    return announcements.map((a) => ({
      id: a.id,
      title: a.title,
      content: a.content,
      creator: a.creator,
      createdAt: a.createdAt,
      acknowledged: a.acks.length > 0,
    }));
  }

  async acknowledge(id: number, userId: number) {
    const announcement = await this.prisma.announcement.findFirst({
      where: { id, deletedAt: null },
    });

    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }

    const existing = await this.prisma.announcementAck.findFirst({
      where: { announcementId: id, userId },
    });

    if (existing) {
      return { message: 'Already acknowledged' };
    }

    await this.prisma.announcementAck.create({
      data: {
        announcementId: id,
        userId,
      },
    });

    this.notificationsService.broadcastEvent('announcement_updated', { action: 'acknowledge', announcementId: id });

    return { message: 'Announcement acknowledged successfully' };
  }

  async getAcks(id: number) {
    const announcement = await this.prisma.announcement.findFirst({
      where: { id, deletedAt: null },
    });

    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }

    return this.prisma.announcementAck.findMany({
      where: { announcementId: id, deletedAt: null },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { acknowledgedAt: 'desc' },
    });
  }

  async remove(id: number) {
    const announcement = await this.prisma.announcement.findFirst({
      where: { id, deletedAt: null },
    });

    if (!announcement) {
      throw new NotFoundException('Announcement not found');
    }

    const deleted = await this.prisma.announcement.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    this.notificationsService.broadcastEvent('announcement_updated', { action: 'delete', announcementId: id });

    return deleted;
  }
}
