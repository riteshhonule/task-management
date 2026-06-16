import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConversationDto, UpdateGroupDto, AddMembersDto, SendMessageDto } from './dto/chat.dto';
import { ChatType, ChatRole, Role } from '@prisma/client';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  async createConversation(creatorId: number, dto: CreateConversationDto) {
    const { type, userIds, name, description, avatarUrl } = dto;
    const allMembers = Array.from(new Set([creatorId, ...userIds]));

    if (type === ChatType.DIRECT) {
      if (allMembers.length !== 2) {
        throw new BadRequestException('Direct chats must have exactly 2 members.');
      }
      const otherUserId = allMembers.find((id) => id !== creatorId);

      // Check if direct chat already exists
      const existingDirect = await this.prisma.chatConversation.findFirst({
        where: {
          type: ChatType.DIRECT,
          deletedAt: null,
          AND: [
            { members: { some: { userId: creatorId } } },
            { members: { some: { userId: otherUserId } } },
          ],
        },
        include: {
          members: {
            include: {
              user: {
                select: { id: true, name: true, email: true, role: true },
              },
            },
          },
        },
      });

      if (existingDirect) {
        return existingDirect;
      }
    }

    // Create new conversation
    const conversation = await this.prisma.chatConversation.create({
      data: {
        type,
        name: type === ChatType.GROUP ? name : null,
        description: type === ChatType.GROUP ? description : null,
        avatarUrl: type === ChatType.GROUP ? avatarUrl : null,
        members: {
          create: allMembers.map((userId) => ({
            userId,
            role: type === ChatType.GROUP && userId === creatorId ? ChatRole.ADMIN : ChatRole.MEMBER,
          })),
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        },
      },
    });

    return conversation;
  }

  async getConversations(userId: number, search?: string) {
    const userConversations = await this.prisma.chatConversation.findMany({
      where: {
        deletedAt: null,
        members: {
          some: { userId },
        },
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                {
                  members: {
                    some: {
                      user: {
                        name: { contains: search, mode: 'insensitive' },
                      },
                      userId: { not: userId },
                    },
                  },
                },
              ],
            }
          : {}),
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        },
        messages: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            sender: {
              select: { id: true, name: true },
            },
            attachments: true,
          },
        },
      },
      orderBy: {
        updatedAt: 'desc',
      },
    });

    // Calculate unread counts
    const conversationsWithUnreads = await Promise.all(
      userConversations.map(async (conv) => {
        const lastMsg = conv.messages[0] || null;

        // Fetch unread count: messages in this conversation created after the user's last read receipt,
        // or messages that this user has not read yet.
        const unreadCount = await this.prisma.chatMessage.count({
          where: {
            conversationId: conv.id,
            senderId: { not: userId },
            deletedAt: null,
            reads: {
              none: {
                userId,
              },
            },
          },
        });

        return {
          id: conv.id,
          type: conv.type,
          name: conv.name,
          description: conv.description,
          avatarUrl: conv.avatarUrl,
          createdAt: conv.createdAt,
          updatedAt: conv.updatedAt,
          members: conv.members,
          lastMessage: lastMsg,
          unreadCount,
        };
      }),
    );

    return conversationsWithUnreads;
  }

  async getMessages(conversationId: number, userId: number, limit = 50, cursor?: number) {
    // Check membership
    const membership = await this.prisma.chatMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this conversation.');
    }

    const messages = await this.prisma.chatMessage.findMany({
      where: {
        conversationId,
        deletedAt: null,
      },
      take: limit + 1, // Fetch an extra message to determine if there is a next page
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0, // Skip the cursor itself if provided
      orderBy: {
        createdAt: 'desc', // Fetch newest first
      },
      include: {
        sender: {
          select: { id: true, name: true, email: true, role: true },
        },
        attachments: true,
        reactions: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
        replyTo: {
          include: {
            sender: { select: { id: true, name: true } },
          },
        },
        sharedTask: {
          include: {
            assignedTo: { select: { id: true, name: true } },
            project: { select: { id: true, name: true } },
          },
        },
      },
    });

    let nextCursor: number | undefined = undefined;
    if (messages.length > limit) {
      const nextItem = messages.pop();
      nextCursor = nextItem.id;
    }

    // Return messages in chronological order (reverse the list)
    return {
      messages: messages.reverse(),
      nextCursor,
    };
  }

  async sendMessage(senderId: number, conversationId: number, dto: SendMessageDto) {
    // Check membership
    const membership = await this.prisma.chatMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId: senderId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this conversation.');
    }

    const message = await this.prisma.chatMessage.create({
      data: {
        conversationId,
        senderId,
        content: dto.content || '',
        replyToId: dto.replyToId || null,
        sharedTaskId: dto.sharedTaskId || null,
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
        sender: {
          select: { id: true, name: true, email: true, role: true },
        },
        attachments: true,
        replyTo: {
          include: {
            sender: { select: { id: true, name: true } },
          },
        },
        sharedTask: {
          include: {
            assignedTo: { select: { id: true, name: true } },
            project: { select: { id: true, name: true } },
          },
        },
        reactions: true,
      },
    });

    // Update conversation updatedAt timestamp to bump it in chat list
    await this.prisma.chatConversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    // Auto mark as read for sender
    await this.prisma.chatMessageRead.create({
      data: {
        messageId: message.id,
        userId: senderId,
      },
    }).catch(() => {}); // ignore duplicates if any

    return message;
  }

  async markAsRead(conversationId: number, userId: number) {
    // Find all unread messages in the conversation for the user
    const unreadMessages = await this.prisma.chatMessage.findMany({
      where: {
        conversationId,
        senderId: { not: userId },
        deletedAt: null,
        reads: {
          none: {
            userId,
          },
        },
      },
      select: { id: true },
    });

    if (unreadMessages.length === 0) return { count: 0 };

    const readReceiptsData = unreadMessages.map((m) => ({
      messageId: m.id,
      userId,
    }));

    await this.prisma.chatMessageRead.createMany({
      data: readReceiptsData,
      skipDuplicates: true,
    });

    return { count: unreadMessages.length };
  }

  async toggleReaction(messageId: number, userId: number, emoji: string) {
    const existing = await this.prisma.chatMessageReaction.findUnique({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId,
          emoji,
        },
      },
    });

    if (existing) {
      await this.prisma.chatMessageReaction.delete({
        where: {
          messageId_userId_emoji: {
            messageId,
            userId,
            emoji,
          },
        },
      });
      return { action: 'removed', emoji };
    } else {
      await this.prisma.chatMessageReaction.create({
        data: {
          messageId,
          userId,
          emoji,
        },
      });
      return { action: 'added', emoji };
    }
  }

  async updateGroup(conversationId: number, userId: number, dto: UpdateGroupDto) {
    // Verify user is an admin of the group or system admin
    const isSystemAdmin = await this.isSystemAdmin(userId);
    const member = await this.prisma.chatMember.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });

    if (!isSystemAdmin && (!member || member.role !== ChatRole.ADMIN)) {
      throw new ForbiddenException('Only group admins or system admins can update group settings.');
    }

    return this.prisma.chatConversation.update({
      where: { id: conversationId },
      data: {
        name: dto.name,
        description: dto.description,
        avatarUrl: dto.avatarUrl,
      },
    });
  }

  async addMembers(conversationId: number, userId: number, dto: AddMembersDto) {
    const isSystemAdmin = await this.isSystemAdmin(userId);
    const member = await this.prisma.chatMember.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });

    if (!isSystemAdmin && (!member || member.role !== ChatRole.ADMIN)) {
      throw new ForbiddenException('Only group admins or system admins can add members.');
    }

    const membersData = dto.userIds.map((uid) => ({
      conversationId,
      userId: uid,
      role: ChatRole.MEMBER,
    }));

    await this.prisma.chatMember.createMany({
      data: membersData,
      skipDuplicates: true,
    });

    return this.prisma.chatConversation.findUnique({
      where: { id: conversationId },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });
  }

  async removeMember(conversationId: number, userId: number, targetUserId: number) {
    const isSystemAdmin = await this.isSystemAdmin(userId);
    const member = await this.prisma.chatMember.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });

    // Users can remove themselves (leave group)
    const isLeaving = userId === targetUserId;

    if (!isLeaving && !isSystemAdmin && (!member || member.role !== ChatRole.ADMIN)) {
      throw new ForbiddenException('Only group admins or system admins can remove members.');
    }

    await this.prisma.chatMember.delete({
      where: {
        conversationId_userId: {
          conversationId,
          userId: targetUserId,
        },
      },
    });

    return { success: true, left: isLeaving };
  }

  async editMessage(messageId: number, userId: number, newContent: string) {
    const message = await this.prisma.chatMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Message not found.');
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException('You can only edit your own messages.');
    }

    return this.prisma.chatMessage.update({
      where: { id: messageId },
      data: {
        content: newContent,
        isEdited: true,
      },
      include: {
        sender: {
          select: { id: true, name: true },
        },
      },
    });
  }

  async deleteMessage(messageId: number, userId: number, userRole: string) {
    const message = await this.prisma.chatMessage.findUnique({
      where: { id: messageId },
      include: {
        conversation: {
          include: {
            members: {
              where: { userId },
            },
          },
        },
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found.');
    }

    const isOwner = message.senderId === userId;
    const isSystemAdmin = userRole === Role.ADMIN || userRole === Role.SUPER_ADMIN;
    const isGroupAdmin = message.conversation.members[0]?.role === ChatRole.ADMIN;

    if (!isOwner && !isSystemAdmin && !isGroupAdmin) {
      throw new ForbiddenException('You do not have permission to delete this message.');
    }

    if (message.isDeleted) {
      // Set replyToId to null for all replies to prevent foreign key constraint violations
      await this.prisma.chatMessage.updateMany({
        where: { replyToId: messageId },
        data: { replyToId: null },
      });
      // Delete message from DB
      await this.prisma.chatMessage.delete({
        where: { id: messageId },
      });
      return { id: messageId, isDeleted: true, isHardDeleted: true };
    }

    // Soft delete message
    return this.prisma.chatMessage.update({
      where: { id: messageId },
      data: {
        isDeleted: true,
        content: 'Message deleted',
      },
    });
  }

  private async isSystemAdmin(userId: number): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    return user?.role === Role.ADMIN || user?.role === Role.SUPER_ADMIN;
  }
}
