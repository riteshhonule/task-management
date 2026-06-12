import { io, Socket } from 'socket.io-client';
import { API_URL } from './api';
import { playNotificationSound } from '../utils/sound';

let socket: Socket | null = null;

const showNativeNotification = (title: string, body: string, type: string) => {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'granted' && document.hidden) {
      try {
        const options = {
          body,
          icon: '/notification-gmark-logo.jpeg',
          tag: `notification-${Date.now()}`,
          data: { type }
        };
        
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.ready.then((reg) => {
            reg.showNotification(title, options);
          }).catch(() => {
            new Notification(title, options);
          });
        } else {
          new Notification(title, options);
        }
      } catch (e) {
        console.error('Failed to show background native notification:', e);
      }
    }
  }
};

export const connectSocket = (
  userId: number,
  onNotification: (notification: any) => void,
  onAnnouncement: (announcement: any) => void,
  userRole?: string,
) => {
  if (socket) return socket;

  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

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
    if (!isAdmin) {
      playNotificationSound(`notification-${data.id}`);
    }
    showNativeNotification(data.title, data.message, data.type);
    window.dispatchEvent(new CustomEvent('sync-notifications', { detail: data }));
    if (data.type?.includes('TASK')) {
      window.dispatchEvent(new CustomEvent('sync-tasks', { detail: data }));
      window.dispatchEvent(new CustomEvent('sync-metrics'));
    } else if (data.type?.includes('PROJECT')) {
      window.dispatchEvent(new CustomEvent('sync-projects', { detail: data }));
      window.dispatchEvent(new CustomEvent('sync-metrics'));
    }
  });

  socket.on('announcement_notification', (data) => {
    if (isAdmin) return;
    onAnnouncement(data);
    playNotificationSound(`announcement-${data.title}`);
    showNativeNotification(data.title, data.message, data.type || 'ANNOUNCEMENT');
    window.dispatchEvent(new CustomEvent('sync-announcements', { detail: data }));
    window.dispatchEvent(new CustomEvent('sync-metrics'));
  });

  socket.on('task_updated', (data) => {
    console.log('WebSocket task_updated event:', data);
    window.dispatchEvent(new CustomEvent('sync-tasks', { detail: data }));
    window.dispatchEvent(new CustomEvent('sync-metrics'));
  });

  socket.on('metrics_updated', (data) => {
    console.log('WebSocket metrics_updated event:', data);
    window.dispatchEvent(new CustomEvent('sync-metrics', { detail: data }));
  });

  socket.on('project_updated', (data) => {
    console.log('WebSocket project_updated event:', data);
    window.dispatchEvent(new CustomEvent('sync-projects', { detail: data }));
    window.dispatchEvent(new CustomEvent('sync-metrics'));
  });

  socket.on('user_updated', (data) => {
    console.log('WebSocket user_updated event:', data);
    window.dispatchEvent(new CustomEvent('sync-users', { detail: data }));
    window.dispatchEvent(new CustomEvent('sync-metrics'));
  });

  socket.on('leave_updated', (data) => {
    console.log('WebSocket leave_updated event:', data);
    window.dispatchEvent(new CustomEvent('sync-leaves', { detail: data }));
    window.dispatchEvent(new CustomEvent('sync-metrics'));
  });

  socket.on('message_updated', (data) => {
    console.log('WebSocket message_updated event:', data);
    window.dispatchEvent(new CustomEvent('sync-messages', { detail: data }));
  });

  socket.on('new_message', (data) => {
    console.log('WebSocket new_message event:', data);
    if (!isAdmin) {
      playNotificationSound(`message-${data.id}`);
    }
    showNativeNotification('New Message Received', data.content, 'MESSAGE');
    window.dispatchEvent(new CustomEvent('sync-new-message', { detail: data }));
  });

  socket.on('announcement_updated', (data) => {
    console.log('WebSocket announcement_updated event:', data);
    window.dispatchEvent(new CustomEvent('sync-announcements', { detail: data }));
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

export const getSocket = () => socket;
