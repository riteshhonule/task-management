import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { Bell, X } from 'lucide-react';

interface NotificationPayload {
  id?: number;
  type: string;
  title: string;
  message: string;
  createdAt?: string;
}

export const GlobalNotificationPopup: React.FC = () => {
  const { user, token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState<NotificationPayload[]>([]);

  useEffect(() => {
    if (!user || !token) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      return;
    }

    const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:3000', {
      transports: ['websocket'],
    });

    newSocket.on('connect', () => {
      newSocket.emit('register', user.id);
    });

    newSocket.on('notification', (data: NotificationPayload) => {
      setNotifications((prev) => [...prev, data]);
    });

    newSocket.on('announcement_notification', (data: NotificationPayload) => {
      setNotifications((prev) => [...prev, data]);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user, token]);

  const removeNotification = (index: number) => {
    setNotifications((prev) => prev.filter((_, i) => i !== index));
  };

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[100] flex flex-col gap-4 max-w-sm w-full p-4 pointer-events-none">
      {notifications.map((notif, index) => (
        <div
          key={`${notif.id || index}-${Date.now()}`}
          className="pointer-events-auto w-full bg-orange-50 border border-orange-200 rounded-2xl p-5 shadow-2xl shadow-orange-500/20 animate-in zoom-in-95 fade-in duration-300"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 bg-orange-100 p-2 rounded-xl text-orange-600">
              <Bell size={20} />
            </div>
            <div className="flex-1">
              <h4 className="font-heading font-bold text-orange-900">{notif.title}</h4>
              <p className="text-sm font-medium text-orange-800 mt-1 leading-relaxed">
                {notif.message}
              </p>
            </div>
            <button
              onClick={() => removeNotification(index)}
              className="text-orange-400 hover:text-orange-700 bg-orange-100/50 hover:bg-orange-200 p-1.5 rounded-lg transition-colors"
            >
              <X size={16} />
            </button>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => removeNotification(index)}
              className="px-4 py-2 bg-orange-600 text-white text-xs font-bold rounded-xl shadow-md shadow-orange-600/20 hover:bg-orange-500 transition-all"
            >
              Acknowledge
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
