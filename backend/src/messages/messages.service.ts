import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { RespondMessageDto } from './dto/respond-message.dto';
import { Role, MessageType, MessageResponseStatus } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class MessagesService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async create(dto: CreateMessageDto, senderId: number) {
    const message = await this.prisma.message.create({
      data: {
        senderId,
        content: dto.content,
        type: dto.type || MessageType.NORMAL,
        recipientIds: dto.recipientIds || [],
        isEveryone: dto.isEveryone || false,
      },
    });

    // Resolve recipients
    let recipients: number[] = [];
    if (dto.isEveryone) {
      const employees = await this.prisma.user.findMany({
        where: { role: Role.EMPLOYEE, deletedAt: null },
        select: { id: true },
      });
      recipients = employees.map((e) => e.id);
    } else if (dto.recipientIds) {
      recipients = dto.recipientIds;
    }

    // Broadcast real-time message event to all recipients
    for (const userId of recipients) {
      await this.notificationsService.sendLiveMessage(userId, message);
    }

    return message;
  }

  async respond(messageId: number, dto: RespondMessageDto, employeeId: number) {
    const message = await this.prisma.message.findFirst({
      where: { id: messageId, deletedAt: null },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }



    // Check authorization
    const isRecipient = message.isEveryone || message.recipientIds.includes(employeeId);
    if (!isRecipient) {
      throw new ForbiddenException('You are not a recipient of this message.');
    }

    // Save or update response
    const existingResponse = await this.prisma.messageResponse.findFirst({
      where: { messageId, employeeId },
    });

    let messageResponse;
    if (existingResponse) {
      messageResponse = await this.prisma.messageResponse.update({
        where: { id: existingResponse.id },
        data: {
          response: dto.response,
          comment: dto.comment,
          respondedAt: new Date(),
        },
      });
    } else {
      messageResponse = await this.prisma.messageResponse.create({
        data: {
          messageId,
          employeeId,
          response: dto.response,
          comment: dto.comment,
        },
      });
    }

    // Create activity log
    await this.prisma.activityLog.create({
      data: {
        userId: employeeId,
        action: 'MESSAGE_RESPONSE',
        details: `Responded ${dto.response} to mandatory message ID ${messageId}`,
      },
    });

    // Notify the admin sender
    await this.notificationsService.createNotification(
      message.senderId,
      'MESSAGE_RESPONSE',
      'Mandatory Message Response',
      `Employee responded "${dto.response}" to your request: "${message.content.substring(0, 30)}..."`,
      undefined,
      employeeId
    );

    return messageResponse;
  }

  async findAllSent(senderId: number) {
    return this.prisma.message.findMany({
      where: { senderId, deletedAt: null },
      include: {
        responses: {
          include: {
            employee: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findUserMessages(userId: number) {
    // Return all messages targeting this user
    return this.prisma.message.findMany({
      where: {
        deletedAt: null,
        OR: [
          { isEveryone: true },
          { recipientIds: { has: userId } },
        ],
      },
      include: {
        sender: {
          select: { id: true, name: true, email: true },
        },
        responses: {
          where: { employeeId: userId },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getPendingMessages(userId: number) {
    const messages = await this.prisma.message.findMany({
      where: {
        deletedAt: null,
        OR: [
          { isEveryone: true },
          { recipientIds: { has: userId } },
        ],
      },
      include: {
        sender: {
          select: { id: true, name: true, email: true },
        },
        responses: {
          where: { employeeId: userId },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Filter messages where user has NOT responded
    return messages.filter((m) => m.responses.length === 0);
  }
}
