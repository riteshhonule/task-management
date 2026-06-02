import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Bell, User, LogOut, CheckCheck, Volume2, Menu } from 'lucide-react';
import { notificationsApi } from '../services/api';
import { VoiceSettingsModal } from './VoiceSettingsModal';
import { NotificationCenterBase } from './NotificationCenterBase';

interface NavbarProps {
  onMenuToggle?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onMenuToggle }) => {
  const { user, logout, notifications, fetchNotifications } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);

  const isToday = (dateString: string) => {
    return new Date(dateString).toDateString() === new Date().toDateString();
  };

  const unreadCount = notifications.filter((n) => !n.isRead && isToday(n.createdAt)).length;

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.readAll();
      await fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };



  return (
    <header className="sticky top-0 z-40 w-full bg-white/85 backdrop-blur-md border-b border-slate-200 px-4 md:px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors mr-2"
          >
            <Menu size={20} />
          </button>
        )}
        <h1 className="text-xl font-heading font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent m-0 tracking-tight">
          Taskflow OS
        </h1>
        <span className="hidden sm:inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 border border-slate-200">
          v1.0.0
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* Voice Settings Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowVoiceSettings(!showVoiceSettings)}
            className="relative p-2 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition-colors"
            title="Voice Notification Settings"
          >
            <Volume2 size={20} />
          </button>
          
          {showVoiceSettings && <VoiceSettingsModal onClose={() => setShowVoiceSettings(false)} />}
        </div>

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
            <>
              <div 
                className="fixed inset-0 z-40"
                onClick={() => setShowNotifications(false)} 
              />
              <div className="fixed inset-x-4 top-16 sm:inset-auto sm:absolute sm:right-0 sm:top-auto sm:mt-3 sm:w-[450px] sm:max-w-[calc(100vw-2rem)] rounded-2xl bg-white border border-slate-200 shadow-2xl z-50 animate-in fade-in sm:zoom-in-95 duration-200 flex flex-col overflow-hidden h-[calc(100vh-6rem)] sm:h-[600px] max-h-[80vh]">
                <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                      <Bell size={16} />
                    </div>
                    <div>
                      <h2 className="font-heading font-extrabold text-sm text-slate-800 flex items-center gap-2">
                        Notifications {unreadCount > 0 && <span className="bg-rose-500 text-white text-[9px] px-1.5 py-0.5 rounded-full">{unreadCount}</span>}
                      </h2>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllRead}
                        className="text-[10px] text-indigo-700 hover:text-indigo-800 font-bold flex items-center gap-1 cursor-pointer bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg transition-colors"
                      >
                        <CheckCheck size={12} /> Mark all read
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="flex-1 overflow-hidden relative bg-slate-50 flex flex-col">
                  <NotificationCenterBase isDrawer={true} />
                </div>
              </div>
            </>
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
