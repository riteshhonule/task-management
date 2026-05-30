import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Bell, User, LogOut, CheckCheck } from 'lucide-react';
import { notificationsApi } from '../services/api';

export const Navbar: React.FC = () => {
  const { user, logout, notifications, fetchNotifications } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.readAll();
      await fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkRead = async (id: number) => {
    try {
      await notificationsApi.read(id);
      await fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/85 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-heading font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent m-0 tracking-tight">
          Taskflow OS
        </h1>
        <span className="hidden sm:inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 border border-slate-200">
          v1.0.0
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* Notification Bell Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 rounded-xl bg-white border border-slate-200 shadow-2xl p-4 z-50 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                <span className="font-heading font-semibold text-sm text-slate-800">Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    className="text-xs text-indigo-650 hover:text-indigo-500 font-medium flex items-center gap-1 cursor-pointer"
                  >
                    <CheckCheck size={12} /> Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-60 overflow-y-auto space-y-3">
                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4">No notifications yet.</p>
                ) : (
                  notifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => !n.isRead && handleMarkRead(n.id)}
                      className={`p-2.5 rounded-lg transition-all cursor-pointer ${
                        n.isRead ? 'bg-slate-50 hover:bg-slate-100 text-slate-500' : 'bg-indigo-50 hover:bg-indigo-100/80 border-l-2 border-indigo-500 text-slate-800 font-medium'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <h4 className="text-xs font-semibold">{n.title}</h4>
                        <span className="text-[9px] text-slate-400">
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] mt-1 leading-normal">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Info & Logout */}
        <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
          <div className="flex flex-col text-right hidden md:flex">
            <span className="text-sm font-medium text-slate-800">{user?.name}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {user?.role.replace('_', ' ')}
            </span>
          </div>

          <div className="h-9 w-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <User size={18} />
          </div>

          <button
            onClick={logout}
            className="p-2 text-slate-500 hover:text-rose-600 rounded-lg hover:bg-rose-55/20 transition-colors"
            title="Sign out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>
    </header>
  );
};
