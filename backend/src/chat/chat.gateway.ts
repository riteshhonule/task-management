import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseFilters, UsePipes, ValidationPipe, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';
import { PresenceService } from '../presence/presence.service';
import { SendMessageDto, SendMessageSocketDto } from './dto/chat.dto';
import { WsException } from '@nestjs/websockets';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ChatGateway.name);

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly chatService: ChatService,
    private readonly presenceService: PresenceService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token. Disconnecting.`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET || 'JWT_SUPER_SECRET_12345',
      });

      const userId = payload.sub;
      client.data = { userId };

      // Join user's private channel
      await client.join(String(userId));

      // Track Presence
      await this.presenceService.setUserOnline(userId);
      this.server.emit('user_online', { userId });

      this.logger.log(`User ${userId} authenticated and connected via WS. Client ID: ${client.id}`);
    } catch (err) {
      this.logger.error(`WS Authentication failed for client ${client.id}: ${err.message}`);
      client.disconnect();
    }
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data?.userId;
    if (userId) {
      // Track Absence
      await this.presenceService.setUserOffline(userId);
      this.server.emit('user_offline', { userId, lastSeen: new Date() });
      this.logger.log(`User ${userId} disconnected. Client ID: ${client.id}`);
    }
  }

  @SubscribeMessage('join_room')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody('conversationId') conversationId: number,
  ) {
    const userId = client.data.userId;
    if (!userId || !conversationId) return;

    const roomName = `conversation_${conversationId}`;
    await client.join(roomName);
    this.logger.log(`User ${userId} joined room: ${roomName}`);
  }

  @SubscribeMessage('leave_room')
  async handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody('conversationId') conversationId: number,
  ) {
    const userId = client.data.userId;
    if (!userId || !conversationId) return;

    const roomName = `conversation_${conversationId}`;
    await client.leave(roomName);
    this.logger.log(`User ${userId} left room: ${roomName}`);
  }

  @SubscribeMessage('send_message')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: SendMessageSocketDto,
  ) {
    const userId = client.data.userId;
    if (!userId) throw new WsException('Unauthorized');

    const { conversationId, message: messageDto } = data;
    
    // Save to DB
    const savedMessage = await this.chatService.sendMessage(userId, conversationId, messageDto);

    // Broadcast to room
    const roomName = `conversation_${conversationId}`;
    this.server.to(roomName).emit('receive_message', savedMessage);

    // Get all conversation members to notify them privately (to update unread badge / previews)
    const conversation = await this.chatService.getConversations(userId);
    const targetConv = conversation.find(c => c.id === conversationId);
    
    if (targetConv) {
      targetConv.members.forEach(member => {
        if (member.userId !== userId) {
          // Emit direct notification to member's private channel
          this.server.to(String(member.userId)).emit('new_chat_message', {
            message: savedMessage,
            conversationId,
          });
        }
      });
    }
  }

  @SubscribeMessage('typing_start')
  handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody('conversationId') conversationId: number,
  ) {
    const userId = client.data.userId;
    if (!userId || !conversationId) return;

    const roomName = `conversation_${conversationId}`;
    client.to(roomName).emit('typing_start', { conversationId, userId });
  }

  @SubscribeMessage('typing_stop')
  handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody('conversationId') conversationId: number,
  ) {
    const userId = client.data.userId;
    if (!userId || !conversationId) return;

    const roomName = `conversation_${conversationId}`;
    client.to(roomName).emit('typing_stop', { conversationId, userId });
  }

  @SubscribeMessage('message_read')
  async handleMessageRead(
    @ConnectedSocket() client: Socket,
    @MessageBody('conversationId') conversationId: number,
  ) {
    const userId = client.data.userId;
    if (!userId || !conversationId) return;

    // Save read receipt
    await this.chatService.markAsRead(conversationId, userId);

    // Broadcast to room
    const roomName = `conversation_${conversationId}`;
    this.server.to(roomName).emit('message_read', { conversationId, userId });
  }

  private extractToken(client: Socket): string | null {
    // Check auth object (standard client config)
    if (client.handshake.auth?.token) {
      return client.handshake.auth.token;
    }

    // Check query params
    if (client.handshake.query?.token) {
      return client.handshake.query.token as string;
    }

    // Check Authorization Header
    const authHeader = client.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.split(' ')[1];
    }

    return null;
  }
}
