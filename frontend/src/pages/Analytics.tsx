import React, { useEffect, useState } from 'react';
import { reportsApi } from '../services/api';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { BarChart3, TrendingUp, PieChart as PieIcon, Users, Loader2 } from 'lucide-react';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#64748b'];

export const Analytics: React.FC = () => {
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const res = await reportsApi.analytics();
      setData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();

    const handleSync = () => {
      loadAnalytics();
    };

    window.addEventListener('sync-tasks', handleSync);
    window.addEventListener('sync-projects', handleSync);
    window.addEventListener('sync-metrics', handleSync);

    return () => {
      window.removeEventListener('sync-tasks', handleSync);
      window.removeEventListener('sync-projects', handleSync);
      window.removeEventListener('sync-metrics', handleSync);
    };
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 size={36} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!data) {
    return <p className="text-center text-xs text-slate-500">Failed to load performance metrics.</p>;
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <div>
        <h2 className="text-2xl font-heading font-extrabold text-slate-800 font-bold">Performance Analytics</h2>
        <p className="text-xs text-slate-550">Visualize weekly tasks productivity ratios and project trends.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Weekly Productivity AreaChart */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-sm">
          <h3 className="font-heading font-bold text-slate-850 text-sm flex items-center gap-2">
            <TrendingUp size={16} className="text-indigo-600" /> Weekly Completion Trend
          </h3>
          <div className="h-72 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.weeklyProductivity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorProductivity" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#64748b" />
                <YAxis stroke="#64748b" allowDecimals={false} />
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', borderRadius: '8px' }} />
                <Area type="monotone" dataKey="completedTasks" name="Completed Tasks" stroke="#6366f1" fillOpacity={1} fill="url(#colorProductivity)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Project Progress BarChart */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-sm">
          <h3 className="font-heading font-bold text-slate-850 text-sm flex items-center gap-2">
            <BarChart3 size={16} className="text-emerald-650" /> Tasks Breakdown by Project
          </h3>
          <div className="h-72 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.projectProgress} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', borderRadius: '8px' }} />
                <Legend />
                <Bar dataKey="totalTasks" name="Total Tasks" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completedTasks" name="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Distribution PieChart */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-sm">
          <h3 className="font-heading font-bold text-slate-850 text-sm flex items-center gap-2">
            <PieIcon size={16} className="text-amber-500" /> Tasks Status Distribution
          </h3>
          <div className="h-auto sm:h-72 min-h-[18rem] w-full text-xs flex flex-col sm:flex-row items-center justify-around gap-4 py-2">
            <div className="h-48 w-48 sm:h-60 sm:w-60 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="count"
                    nameKey="status"
                  >
                    {data.statusDistribution.map((_entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="space-y-2">
              {data.statusDistribution.map((entry: any, index: number) => (
                <div key={entry.status} className="flex items-center gap-2.5 text-xs">
                  <div className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="text-slate-500 font-medium">{entry.status.replace('_', ' ')}:</span>
                  <span className="font-bold text-slate-800">{entry.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Employee Performance Rankings Table */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-sm">
          <h3 className="font-heading font-bold text-slate-850 text-sm flex items-center gap-2">
            <Users size={16} className="text-indigo-600" /> Employee Performance Rankings
          </h3>
          
          <div className="border border-slate-200 bg-slate-50 text-xs overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/80 text-[10px] font-bold text-slate-550 uppercase tracking-widest">
                  <th className="px-4 py-4 text-center align-middle">Employee</th>
                  <th className="px-4 py-4 text-center align-middle">Tasks Assigned</th>
                  <th className="px-4 py-4 text-center align-middle">Completion Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {data.employeePerformance.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-2 py-1.5 text-center text-slate-400 align-middle">
                      No employee stats loaded.
                    </td>
                  </tr>
                ) : (
                  data.employeePerformance.map((emp: any) => (
                    <tr key={emp.name} className="hover:bg-slate-100/50">
                      <td className="px-2 py-1.5 font-bold text-slate-800 text-center align-middle">{emp.name}</td>
                      <td className="px-2 py-1.5 text-center font-medium align-middle">{emp.totalTasks}</td>
                      <td className="px-2 py-1.5 font-bold text-indigo-600 text-center align-middle">
                        {emp.completionRate}%
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
