import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Mail,
  Megaphone,
  CalendarDays,
  FileSpreadsheet,
  BarChart3,
  KeyRound,
  Users,
  Bell,
  X,
  ClipboardList,
} from 'lucide-react';

import sidebarLogo from '../assets/sidebar-logo.png';

interface SidebarProps {
  onClose?: () => void;
}


export const Sidebar: React.FC<SidebarProps> = ({ onClose }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  // Dynamic navigation items based on authorization role
  const menuItems: { path: string; name: string; icon: React.ReactNode; disabled?: boolean }[] = isAdmin
    ? [
      { path: '/admin', name: 'Overview', icon: <LayoutDashboard size={18} /> },
      { path: '/reports', name: 'Daily Reviews', icon: <FileSpreadsheet size={18} /> },
      { path: '/employees', name: 'Employees', icon: <Users size={18} /> },
      { path: '/projects', name: 'Projects', icon: <FolderKanban size={18} /> },

      { path: '/messages', name: 'Messages Center', icon: <Mail size={18} /> },
      { path: '/announcements', name: 'Announcements', icon: <Megaphone size={18} /> },
      { path: '/analytics', name: 'Performance', icon: <BarChart3 size={18} /> },
      { path: '/notifications', name: 'Notifications', icon: <Bell size={18} /> },
      { path: '/assign-tasks', name: 'Delegate Tasks', icon: <CheckSquare size={18} /> },

      { path: '/leaves', name: 'Leaves Board', icon: <CalendarDays size={18} /> },
    ]
    : [
      { path: '/dashboard', name: 'My Tasks', icon: <LayoutDashboard size={18} /> },
      { path: '/allocated-projects', name: 'Allocated Projects', icon: <FolderKanban size={18} /> },
      { path: '/assign-task', name: 'Assign Task', icon: <ClipboardList size={18} /> },
      { path: '/assign-tasks', name: 'Delegate Tasks', icon: <CheckSquare size={18} /> },
      { path: '/messages', name: 'Messages Center', icon: <Mail size={18} /> },
      { path: '/announcements', name: 'Announcements', icon: <Megaphone size={18} /> },
      { path: '/change-password', name: 'Security', icon: <KeyRound size={18} /> },
      { path: '/notifications', name: 'Notifications', icon: <Bell size={18} /> },
      { path: '/leaves', name: 'My Leaves', icon: <CalendarDays size={18} /> },
    ];


  return (
    <aside className="w-64 h-full bg-slate-950 border-r border-slate-900 px-4 py-6 flex flex-col justify-between">
      <div className="space-y-6">
        <div className="flex items-center justify-between px-3 pb-4 border-b border-slate-900">
          <div className="flex items-center gap-2">
            {/* <div className="h-8 w-8 rounded-lg bg-indigo-500 flex items-center justify-center font-heading font-black text-white text-base">
              TF
            </div> */}

            {/* <div>
              <h3 className="font-heading font-semibold text-slate-200 text-sm">Taskflow Management</h3>
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Workspace</span>
            </div> */}
            {/* add logo here  */}
            <img
              src={sidebarLogo}
              alt="Gmark"
              className="w-48 md:w-48 object-contain mb-2"
            />
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          )}
        </div>

        <nav className="space-y-1.5 flex-1 overflow-y-auto max-h-[calc(100vh-200px)] scrollbar-hide">
          {menuItems.map((item) => (
            item.disabled ? (
              <div
                key={item.path}
                onClick={() => alert('Build in progress...')}
                className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium border border-transparent text-slate-600 opacity-50 cursor-pointer hover:bg-slate-900/50"
                title="This section is currently disabled"
              >
                {item.icon}
                <span>{item.name}</span>
              </div>
            ) : (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${isActive
                    ? 'bg-indigo-600/15 text-indigo-400 border border-indigo-500/20 font-semibold shadow-lg shadow-indigo-500/5'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200 border border-transparent'
                  }`
                }
              >
                {item.icon}
                <span>{item.name}</span>
              </NavLink>
            )
          ))}
        </nav>
      </div>

      <div className="px-3 py-4 bg-slate-900/40 border border-slate-900 rounded-2xl">
        <div className="text-[10px] text-slate-500 font-medium">Logged in as</div>
        <div className="text-xs text-slate-300 font-semibold truncate mt-0.5">{user?.email}</div>
      </div>
    </aside>
  );
};
