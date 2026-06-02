import React from 'react';
import { NotificationCenterBase } from '../components/NotificationCenterBase';

export const NotificationsModule: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-200 h-full">
      <div>
        <h2 className="text-2xl font-heading font-extrabold text-slate-800">Notifications Center</h2>
        <p className="text-xs text-slate-500">Track and manage your sent and received notifications.</p>
      </div>

      <NotificationCenterBase isDrawer={false} />
    </div>
  );
};
