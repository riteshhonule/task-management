import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Track userId -> socketId for targeted messages
  private activeClients = new Map<number, string>();

  handleConnection(client: Socket) {
    console.log(`WebSocket client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`WebSocket client disconnected: ${client.id}`);
    for (const [userId, socketId] of this.activeClients.entries()) {
      if (socketId === client.id) {
        this.activeClients.delete(userId);
        break;
      }
    }
  }

  @SubscribeMessage('register')
  handleRegister(client: Socket, userId: number) {
    console.log(`User ${userId} registered to socket ${client.id}`);
    this.activeClients.set(userId, client.id);
    return { status: 'registered' };
  }

  sendToUser(userId: number, event: string, data: any) {
    const socketId = this.activeClients.get(userId);
    if (socketId) {
      this.server.to(socketId).emit(event, data);
    }
  }

  broadcast(event: string, data: any) {
    this.server.emit(event, data);
  }
}
