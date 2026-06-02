import React, { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from '../context/AuthContext';
import { Bell, X, CheckCircle, Edit, MessageSquare, Megaphone, CheckSquare } from 'lucide-react';
import { voiceService } from '../services/voiceService';
import { tasksApi } from '../services/api';

interface NotificationPayload {
  id?: number;
  type: string;
  title: string;
  message: string;
  createdAt?: string;
  metadata?: any;
}

export const GlobalNotificationPopup: React.FC = () => {
  const { user, token } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [notifications, setNotifications] = useState<NotificationPayload[]>([]);
  const [rejectingIndex, setRejectingIndex] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

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
      let priority = 3;
      if (data.type === 'MANDATORY_RESPONSE') priority = 1;
      else if (data.type === 'TASK_ASSIGNED' || data.type === 'PROJECT_ALLOCATED') priority = 2;
      voiceService.announce(data.message, priority);
    });

    newSocket.on('announcement_notification', (data: NotificationPayload) => {
      setNotifications((prev) => [...prev, data]);
      voiceService.announce(data.message, 3);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user, token]);

  const removeNotification = (index: number) => {
    setNotifications((prev) => prev.filter((_, i) => i !== index));
    if (rejectingIndex === index) setRejectingIndex(null);
  };

  const handleAcceptTask = async (notif: NotificationPayload, index: number) => {
    try {
      if (notif.metadata?.taskId) {
        await tasksApi.acceptPending(notif.metadata.taskId);
        removeNotification(index);
        // Force reload of dashboard if we're on it
        window.dispatchEvent(new Event('focus'));
      }
    } catch (error) {
      console.error(error);
      alert('Failed to accept tasks');
    }
  };

  const handleRejectTask = async (notif: NotificationPayload, index: number) => {
    try {
      if (!rejectionReason.trim()) {
        alert('Please provide a reason');
        return;
      }
      if (notif.metadata?.taskId) {
        await tasksApi.rejectPending(notif.metadata.taskId, rejectionReason);
        removeNotification(index);
        setRejectionReason('');
        window.dispatchEvent(new Event('focus'));
      }
    } catch (error) {
      console.error(error);
      alert('Failed to reject tasks');
    }
  };

  if (notifications.length === 0) return null;

  const getStyleForType = (type: string) => {
    switch (type) {
      case 'TASK_COMPLETED':
        return {
          bg: 'bg-emerald-500',
          lightBg: 'bg-emerald-50',
          border: 'border-emerald-200',
          icon: <CheckSquare size={24} className="text-emerald-600" />,
          iconBg: 'bg-emerald-100',
          title: 'text-emerald-900',
          text: 'text-emerald-800',
          btn: 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20'
        };
      case 'PROJECT_ALLOCATED':
      case 'TASK_ASSIGNED':
      case 'TASK_UPDATED':
      case 'TASK_DELETED':
      case 'TASK_CREATED_BY_EMP':
        return {
          bg: 'bg-indigo-500',
          lightBg: 'bg-indigo-50',
          border: 'border-indigo-200',
          icon: <Edit size={24} className="text-indigo-600" />,
          iconBg: 'bg-indigo-100',
          title: 'text-indigo-900',
          text: 'text-indigo-800',
          btn: 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20'
        };
      case 'MESSAGE':
      case 'MESSAGE_RESPONSE':
        return {
          bg: 'bg-purple-500',
          lightBg: 'bg-purple-50',
          border: 'border-purple-200',
          icon: <MessageSquare size={24} className="text-purple-600" />,
          iconBg: 'bg-purple-100',
          title: 'text-purple-900',
          text: 'text-purple-800',
          btn: 'bg-purple-600 hover:bg-purple-500 shadow-purple-500/20'
        };
      case 'ANNOUNCEMENT':
        return {
          bg: 'bg-amber-500',
          lightBg: 'bg-amber-50',
          border: 'border-amber-200',
          icon: <Megaphone size={24} className="text-amber-600" />,
          iconBg: 'bg-amber-100',
          title: 'text-amber-900',
          text: 'text-amber-800',
          btn: 'bg-amber-600 hover:bg-amber-500 shadow-amber-500/20'
        };
      default:
        return {
          bg: 'bg-slate-800',
          lightBg: 'bg-white',
          border: 'border-slate-200',
          icon: <Bell size={24} className="text-slate-600" />,
          iconBg: 'bg-slate-100',
          title: 'text-slate-900',
          text: 'text-slate-700',
          btn: 'bg-slate-800 hover:bg-slate-700 shadow-slate-500/20'
        };
    }
  };

  const highlightText = (text: string) => {
    // Highlight items in quotes like Employee "John Doe"
    let parsed = text.replace(/"(.*?)"/g, '<span class="font-bold underline decoration-2 underline-offset-2">$1</span>');
    // Highlight "projects: A, B, C."
    parsed = parsed.replace(/projects:\s*(.*?)\./g, 'projects: <span class="font-bold bg-white/50 px-1 py-0.5 rounded">$1</span>.');
    return <span dangerouslySetInnerHTML={{ __html: parsed }} />;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center pointer-events-none p-4 sm:p-6 bg-slate-900/20 backdrop-blur-sm transition-all">
      <div className="flex flex-col gap-4 max-w-lg w-full">
        {notifications.map((notif, index) => {
          const style = getStyleForType(notif.type);
          return (
            <div
              key={`${notif.id || index}-${Date.now()}`}
              className={`pointer-events-auto w-full ${style.lightBg} border ${style.border} rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 fade-in slide-in-from-bottom-4 duration-300 relative overflow-hidden`}
            >
              <div className={`absolute top-0 left-0 w-1.5 h-full ${style.bg}`} />
              <div className="flex items-start gap-4">
                <div className={`mt-1 ${style.iconBg} p-3 rounded-2xl`}>
                  {style.icon}
                </div>
                <div className="flex-1 pt-1">
                  <div className={`text-[10px] font-extrabold uppercase tracking-widest ${style.title} opacity-70 mb-1`}>
                    {notif.type.replace(/_/g, ' ')}
                  </div>
                  <h4 className={`text-lg font-heading font-extrabold ${style.title} tracking-tight leading-none`}>
                    {notif.title}
                  </h4>
                  <p className={`text-[15px] font-medium ${style.text} mt-2.5 leading-relaxed`}>
                    {highlightText(notif.message)}
                  </p>
                </div>
                <button
                  onClick={() => removeNotification(index)}
                  className={`text-slate-400 hover:text-slate-700 bg-white/50 hover:bg-white p-2 rounded-xl transition-colors`}
                >
                  <X size={20} />
                </button>
              </div>
              <div className="mt-5 flex justify-end">
                {(notif.type === 'TASK_ASSIGNED' || notif.type === 'PROJECT_ALLOCATED') && notif.metadata?.taskId ? (
                  rejectingIndex === index ? (
                    <div className="w-full">
                      <textarea 
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Reason for rejection..."
                        className="w-full p-3 border border-slate-200 rounded-xl text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                        autoFocus
                      />
                      <div className="flex justify-end gap-2">
                        <button onClick={() => setRejectingIndex(null)} className="px-4 py-2 text-sm font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
                        <button onClick={() => handleRejectTask(notif, index)} className="px-4 py-2 text-sm font-bold bg-rose-600 text-white hover:bg-rose-500 rounded-xl shadow-md transition-colors">Submit</button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2 w-full justify-end">
                      <button
                        onClick={() => handleAcceptTask(notif, index)}
                        className={`px-5 py-2.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 text-sm font-bold rounded-xl transition-all shadow-sm`}
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => setRejectingIndex(index)}
                        className={`px-5 py-2.5 bg-rose-100 text-rose-700 hover:bg-rose-200 text-sm font-bold rounded-xl transition-all shadow-sm`}
                      >
                        Reject
                      </button>
                    </div>
                  )
                ) : (
                  <button
                    onClick={() => removeNotification(index)}
                    className={`px-5 py-2.5 ${style.btn} text-white text-sm font-bold rounded-xl shadow-lg transition-all hover:-translate-y-0.5 active:translate-y-0 flex items-center gap-2`}
                  >
                    <CheckCircle size={16} /> Got it
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
