import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Bell, User, LogOut, CheckCheck, Volume2, Menu } from 'lucide-react';
import { notificationsApi } from '../services/api';
import { VoiceSettingsModal } from './VoiceSettingsModal';
import { NotificationCenterBase } from './NotificationCenterBase';
interface NavbarProps {
  onMenuToggle?: () => void;
  onProfileClick?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onMenuToggle, onProfileClick }) => {
  const { user, logout, notifications, fetchNotifications } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showVoiceSettings, setShowVoiceSettings] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);

  const openProfileModal = () => {
    setShowProfileDropdown(false);
    if (onProfileClick) {
      onProfileClick();
    }
  };

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
    <header className="sticky top-0 z-40 w-full bg-slate-900 border-b border-slate-900 px-4 md:px-6 py-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors mr-2"
          >
            <Menu size={20} />
          </button>
        )}
        <h1 className="text-xl font-heading font-bold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent m-0 tracking-tight">
          Task Management
        </h1>

        {/* <img
          src={DashLogo}
          alt="Gmark"
          className="w-48 md:w-48 object-contain mb-2"
        /> */}
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2.5 md:gap-4">
        {/* Voice Settings Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowVoiceSettings(!showVoiceSettings)}
            className="relative p-2 text-slate-400 hover:text-indigo-400 rounded-lg hover:bg-white/10 transition-colors"
            title="Voice Notification Settings"
          >
            <Volume2 size={20} />
          </button>

          {showVoiceSettings && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowVoiceSettings(false)}
              />
              <VoiceSettingsModal onClose={() => setShowVoiceSettings(false)} />
            </>
          )}
        </div>

        {/* Notification Bell Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
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
        <div className="relative flex items-center gap-1.5 sm:gap-2 md:gap-3 border-l border-slate-900 pl-2 sm:pl-3 md:pl-4">
          <div className="flex flex-col text-right hidden md:flex">
            <span className="text-sm font-medium text-slate-200">{user?.name}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {user?.role.replace('_', ' ')}
            </span>
          </div>

          <button
            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            className="h-9 w-9 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 hover:bg-white/15 hover:text-white transition-colors cursor-pointer relative"
          >
            <User size={18} />
          </button>

          <button
            onClick={logout}
            className="p-2 text-slate-400 hover:text-rose-450 rounded-lg hover:bg-rose-500/10 transition-colors hidden md:block"
            title="Sign out"
          >
            <LogOut size={18} />
          </button>

          {showProfileDropdown && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowProfileDropdown(false)}
              />
              <div className="absolute right-0 mt-2 top-full w-48 rounded-xl bg-slate-950 border border-slate-900 shadow-2xl z-50 py-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-4 py-2 border-b border-slate-900 md:hidden flex flex-col">
                  <span className="text-sm font-semibold text-slate-200">{user?.name}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                    {user?.role.replace('_', ' ')}
                  </span>
                </div>
                <button
                  onClick={openProfileModal}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-slate-300 hover:bg-slate-900 hover:text-white transition-colors text-left font-medium cursor-pointer"
                >
                  <User size={16} />
                  My Profile
                </button>
                <button
                  onClick={() => {
                    setShowProfileDropdown(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-rose-400 hover:bg-rose-950/30 hover:text-rose-350 transition-colors text-left font-medium cursor-pointer border-t border-slate-900"
                >
                  <LogOut size={16} />
                  Log Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>

    </header>
  );
};
