import { io, Socket } from 'socket.io-client';

const API_URL = 'http://localhost:3000';
let socket: Socket | null = null;

export const connectSocket = (
  userId: number,
  onNotification: (notification: any) => void,
  onAnnouncement: (announcement: any) => void,
) => {
  if (socket) return socket;

  socket = io(API_URL, {
    transports: ['websocket'],
  });

  socket.on('connect', () => {
    console.log('Websocket connected to backend.');
    // Register user to private channel
    socket?.emit('register', userId);
  });

  socket.on('notification', (data) => {
    onNotification(data);
  });

  socket.on('announcement_notification', (data) => {
    onAnnouncement(data);
  });

  socket.on('disconnect', () => {
    console.log('Websocket disconnected.');
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
