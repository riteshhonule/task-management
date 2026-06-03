import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { tasksApi } from '../services/api';
import { Users, UserCheck, CalendarDays, CheckCircle2, AlertTriangle, PlayCircle, Loader2 } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMetrics = async () => {
    try {
      const res = await tasksApi.getMetrics();
      setMetrics(res.data);
    } catch (err) {
      console.error('Failed to load admin metrics:', err);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      await fetchMetrics();
    } catch (err) {
      console.error('Error loading admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    const handleSync = () => {
      fetchMetrics();
    };

    window.addEventListener('sync-metrics', handleSync);
    window.addEventListener('sync-tasks', handleSync);
    window.addEventListener('sync-projects', handleSync);
    window.addEventListener('sync-users', handleSync);

    return () => {
      window.removeEventListener('sync-metrics', handleSync);
      window.removeEventListener('sync-tasks', handleSync);
      window.removeEventListener('sync-projects', handleSync);
      window.removeEventListener('sync-users', handleSync);
    };
  }, []);



  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loader2 size={36} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  const statCards = [
    {
      name: 'Total Employees',
      value: metrics?.totalEmployees ?? 0,
      icon: <Users size={20} className="text-indigo-400" />,
      bg: 'bg-indigo-500/5 border-indigo-500/10',
      path: '/employees',
    },
    {
      name: 'Active Staff (3d)',
      value: metrics?.activeEmployees ?? 0,
      icon: <UserCheck size={20} className="text-emerald-400" />,
      bg: 'bg-emerald-500/5 border-emerald-500/10',
      path: '/employees',
    },
    {
      name: 'Tasks Today',
      value: metrics?.tasksAssignedToday ?? 0,
      icon: <CalendarDays size={20} className="text-sky-400" />,
      bg: 'bg-sky-500/5 border-sky-500/10',
      path: '/reports?tab=TODAY',
    },
    {
      name: 'Completed Today',
      value: metrics?.completedTasksToday ?? 0,
      icon: <CheckCircle2 size={20} className="text-emerald-400" />,
      bg: 'bg-emerald-500/5 border-emerald-500/10',
      path: '/reports?tab=COMPLETED',
    },
    {
      name: 'Delayed Today',
      value: metrics?.delayedTasksToday ?? 0,
      icon: <AlertTriangle size={20} className="text-rose-400" />,
      bg: 'bg-rose-500/5 border-rose-500/10',
      path: '/reports?tab=DELAYED',
    },
    {
      name: 'Pending Tasks',
      value: metrics?.pendingTasksToday ?? 0,
      icon: <PlayCircle size={20} className="text-amber-400" />,
      bg: 'bg-amber-500/5 border-amber-500/10',
      path: '/reports?tab=PENDING',
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <div>
        <h2 className="text-2xl font-heading font-extrabold text-slate-800 font-bold">Admin overview</h2>
        <p className="text-xs text-slate-500">Monitor employee activities, task logs, and daily completions.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-5">
        {statCards.map((card) => (
          <div
            key={card.name}
            onClick={() => navigate(card.path)}
            className={`bg-white rounded-2xl p-5 border shadow-sm flex flex-col justify-between h-32 transition-all hover:scale-[1.02] hover:shadow-md cursor-pointer ${card.bg}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{card.name}</span>
              <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-100">{card.icon}</div>
            </div>
            <div className="text-3xl font-heading font-black text-slate-900">{card.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-sm">
          <h3 className="font-heading font-bold text-slate-800 text-sm">System Status</h3>
          <p className="text-xs text-slate-550 leading-relaxed">
            All system processes (WebSocket Gateways, REST API Endpoints, and Database Transports) are fully operational. Access documentation via the Swagger UI route <span className="text-indigo-600 font-semibold font-mono">/api</span>.
          </p>

          <div className="pt-4 grid grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl">
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">REST API Server</div>
              <div className="text-xs font-bold text-emerald-600 mt-2 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Operational
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-150 rounded-xl">
              <div className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">WebSocket Gateway</div>
              <div className="text-xs font-bold text-emerald-600 mt-2 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Connected
              </div>
            </div>
          </div>
        </div> */}
      </div>


      <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-sm">
        <h3 className="font-heading font-bold text-slate-800 text-sm">Quick Action Guide</h3>
        <ul className="text-xs text-slate-600 space-y-3">
          <li className="flex items-start gap-2">
            <span className="h-5 w-5 shrink-0 rounded bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-[10px]">1</span>
            <span>Go to <strong className="text-slate-800">Projects</strong> to manage active items or archive old codes.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="h-5 w-5 shrink-0 rounded bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-[10px]">2</span>
            <span>Go to <strong className="text-slate-800">Delegate Tasks</strong> to directly schedule or reassign items to employees.</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="h-5 w-5 shrink-0 rounded bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-[10px]">3</span>
            <span>Go to <strong className="text-slate-800">Messages Center</strong> to broadcast alerts or request mandatory response acknowledgements.</span>
          </li>
        </ul>
      </div>
    </div>
  );
};
