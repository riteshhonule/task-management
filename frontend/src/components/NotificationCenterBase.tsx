import React, { useEffect, useState, useMemo, useRef } from 'react';
import { notificationsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Check, CheckCheck, Loader2 } from 'lucide-react';
import { getSocket } from '../services/socket';

interface Props {
  isDrawer?: boolean;
}

export const NotificationCenterBase: React.FC<Props> = ({ isDrawer = false }) => {
  const { notifications: contextNotifications, fetchNotifications } = useAuth();
  const [activeTab, setActiveTab] = useState<'receive' | 'send'>('receive');
  
  const [sentNotifications, setSentNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const openTimeRef = useRef<number>(Date.now());
  const timersRef = useRef<Map<number, any>>(new Map());

  const loadSent = async () => {
    try {
      const res = await notificationsApi.listSent();
      setSentNotifications(res.data);
    } catch (err) {
      console.error('Failed to load sent notifications', err);
    }
  };

  useEffect(() => {
    const initLoad = async () => {
      setLoading(true);
      await fetchNotifications();
      await loadSent();
      setLoading(false);
    };
    initLoad();
  }, []);



  // Set up socket listener for live status updates on Sent tab
  useEffect(() => {
    const handleStatusUpdate = (update: any) => {
      setSentNotifications(prev => prev.map(n => {
        if (n.id === update.id) {
          return {
            ...n,
            status: update.status,
            isDelivered: update.status === 'DELIVERED' || update.status === 'SEEN' ? true : n.isDelivered,
            deliveredAt: update.deliveredAt || n.deliveredAt,
            isRead: update.status === 'SEEN' ? true : n.isRead,
            readAt: update.readAt || n.readAt,
            readBy: update.readBy || n.readBy,
          };
        }
        return n;
      }));
    };

    const socket = getSocket();
    if (!socket) return;
    socket.on('notification_status_update', handleStatusUpdate);
    return () => {
      socket.off('notification_status_update', handleStatusUpdate);
    };
  }, []);

  const handleMarkAsRead = async (id: number) => {
    try {
      await notificationsApi.read(id);
      await fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === 'SEEN') {
      return <span className="flex items-center text-blue-500 font-bold gap-1 text-[11px]"><CheckCheck size={14} /> Seen</span>;
    }
    if (status === 'DELIVERED') {
      return <span className="flex items-center text-slate-400 font-bold gap-1 text-[11px]"><CheckCheck size={14} /> Delivered</span>;
    }
    return <span className="flex items-center text-slate-400 font-bold gap-1 text-[11px]"><Check size={14} /> Sent</span>;
  };

  const groupedSentNotifications = useMemo(() => {
    const grouped = new Map<string, any>();
    
    for (const n of sentNotifications) {
      const key = `${n.type}-${n.message}`;
      if (!grouped.has(key)) {
        grouped.set(key, n);
      } else {
        const existing = grouped.get(key);
        const priority = { 'SEEN': 3, 'DELIVERED': 2, 'SENT': 1 } as any;
        if ((priority[n.status] || 0) > (priority[existing.status] || 0)) {
          grouped.set(key, n);
        }
      }
    }
    
    return Array.from(grouped.values()).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [sentNotifications]);

  const isToday = (dateString: string) => {
    return new Date(dateString).toDateString() === new Date().toDateString();
  };

  const todayReceivedNotifications = useMemo(() => {
    return contextNotifications.filter(n => isToday(n.createdAt));
  }, [contextNotifications]);

  const todaySentNotifications = useMemo(() => {
    return groupedSentNotifications.filter(n => isToday(n.createdAt));
  }, [groupedSentNotifications]);

  // Automatically track visibility of unread notifications inside viewport
  useEffect(() => {
    if (activeTab !== 'receive' || loading) return;

    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    const callback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach(entry => {
        const idAttr = entry.target.getAttribute('data-id');
        if (!idAttr) return;
        const notificationId = parseInt(idAttr, 10);
        
        const notification = todayReceivedNotifications.find(n => n.id === notificationId);
        if (!notification || notification.isRead) {
          observer.unobserve(entry.target);
          return;
        }

        // Check if fully visible
        if (entry.isIntersecting && entry.intersectionRatio === 1) {
          if (!timersRef.current.has(notificationId)) {
            const timer = setTimeout(() => {
              const elapsed = Date.now() - openTimeRef.current;
              
              const commitRead = async () => {
                try {
                  await handleMarkAsRead(notificationId);
                  observer.unobserve(entry.target);
                } catch (err) {
                  console.error('Failed to mark visible notification as read', err);
                }
              };

              if (elapsed >= 3000) {
                commitRead();
              } else {
                const remaining = 3000 - elapsed;
                const delayTimer = setTimeout(() => {
                  commitRead();
                }, remaining);
                timersRef.current.set(notificationId, delayTimer);
              }
            }, 2000);
            
            timersRef.current.set(notificationId, timer);
          }
        } else {
          // If partially hidden or scrolled away, cancel the timer
          const existingTimer = timersRef.current.get(notificationId);
          if (existingTimer) {
            clearTimeout(existingTimer);
            timersRef.current.delete(notificationId);
          }
        }
      });
    };

    const observer = new IntersectionObserver(callback, {
      root: scrollContainer,
      threshold: 1.0,
    });

    const cards = scrollContainer.querySelectorAll('.notification-card');
    cards.forEach(card => {
      const idAttr = card.getAttribute('data-id');
      if (idAttr) {
        const nId = parseInt(idAttr, 10);
        const notification = todayReceivedNotifications.find(n => n.id === nId);
        if (notification && !notification.isRead) {
          observer.observe(card);
        }
      }
    });

    return () => {
      observer.disconnect();
      timersRef.current.forEach(timer => clearTimeout(timer));
      timersRef.current.clear();
    };
  }, [activeTab, todayReceivedNotifications, loading]);

  const containerClasses = isDrawer 
    ? 'flex flex-col h-full bg-slate-50' 
    : 'bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden';

  return (
    <div className={containerClasses}>
      {/* Tabs */}
      <div className={`flex border-b border-slate-200 shrink-0 ${isDrawer ? 'bg-white' : ''}`}>
        <button
          onClick={() => setActiveTab('send')}
          className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors ${
            activeTab === 'send'
              ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          Send
        </button>
        <button
          onClick={() => setActiveTab('receive')}
          className={`flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors ${
            activeTab === 'receive'
              ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/50'
              : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
          }`}
        >
          Receive
        </button>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center p-12 text-slate-400">
          <Loader2 size={24} className="animate-spin" />
        </div>
      ) : (
        <div ref={scrollContainerRef} className={`flex-1 overflow-y-auto p-4 sm:p-6 ${isDrawer ? 'bg-slate-50' : 'bg-slate-50 min-h-[500px]'}`}>
          {activeTab === 'receive' && (
            <div className="space-y-4">
              {todayReceivedNotifications.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8 font-medium">No received notifications for today.</p>
              ) : (
                todayReceivedNotifications.map((n) => (
                  <div
                    key={n.id}
                    data-id={n.id}
                    className={`notification-card p-4 rounded-xl border transition-all cursor-pointer ${
                      n.isRead ? 'bg-white border-slate-200' : 'bg-indigo-50 border-indigo-200 shadow-sm'
                    }`}
                    onClick={() => !n.isRead && handleMarkAsRead(n.id)}
                  >
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-1">
                        <h4 className={`text-sm ${n.isRead ? 'font-semibold text-slate-700' : 'font-extrabold text-indigo-900'}`}>
                          {n.title}
                        </h4>
                        <p className="text-xs text-slate-600 leading-relaxed">{n.message}</p>
                        <div className="flex flex-wrap items-center gap-3 mt-2">
                          {n.sender && (
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              From: {n.sender.name}
                            </span>
                          )}
                          <span className="text-[10px] font-semibold text-slate-400">
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0">
                        {n.isRead ? (
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Read</span>
                        ) : (
                          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 px-2 py-1 rounded uppercase tracking-widest">New</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'send' && (
            <div className="space-y-4">
              {todaySentNotifications.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8 font-medium">No sent notifications for today.</p>
              ) : (
                todaySentNotifications.map((n) => (
                  <div key={n.id} className="p-4 rounded-xl border bg-white border-slate-200 shadow-sm">
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold text-slate-800">{n.title}</h4>
                      <p className="text-xs text-slate-600 leading-relaxed">{n.message}</p>
                      
                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                        <span className="text-[10px] font-semibold text-slate-400">
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        
                        <div className="flex flex-col items-end gap-0.5">
                          {getStatusIcon(n.status)}
                          {n.status === 'SEEN' && n.readAt && (
                            <span className="text-[9px] text-slate-400 font-medium">
                              Seen by {n.user?.name || n.readBy || 'User'} at {new Date(n.readAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
