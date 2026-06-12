import React, { useEffect, useState } from 'react';
import { reportsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
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
import {
  BarChart3,
  TrendingUp,
  PieChart as PieIcon,
  Users,
  Loader2,
  Award,
  Clock,
  AlertTriangle,
  Download,
  UserCheck,
  Calendar,
  Layers,
} from 'lucide-react';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#64748b'];

export const Analytics: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  // Tabs: 'summary' (Pre-existing), 'org' (Org KPI & Leaderboard), 'individual' (Selected Employee detail)
  const [activeTab, setActiveTab] = useState<'summary' | 'org' | 'individual'>(
    isAdmin ? 'summary' : 'individual'
  );

  const [loading, setLoading] = useState(true);
  const [intelligenceLoading, setIntelligenceLoading] = useState(false);
  
  // Data States
  const [summaryData, setSummaryData] = useState<any | null>(null);
  const [intelligenceData, setIntelligenceData] = useState<any | null>(null);

  // Filter States
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | ''>('');
  const [datePreset, setDatePreset] = useState<'7days' | '30days' | 'month' | 'custom'>('30days');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Get date range payload
  const getDateRange = () => {
    const today = new Date();
    let start = new Date();
    let end = today;

    if (datePreset === '7days') {
      start.setDate(today.getDate() - 7);
    } else if (datePreset === '30days') {
      start.setDate(today.getDate() - 30);
    } else if (datePreset === 'month') {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if (datePreset === 'custom') {
      return {
        startDate: customStartDate || undefined,
        endDate: customEndDate || undefined,
      };
    }

    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    };
  };

  const loadSummary = async () => {
    if (!isAdmin) return;
    try {
      const res = await reportsApi.analytics();
      setSummaryData(res.data);
    } catch (err) {
      console.error('Failed to load summary analytics:', err);
    }
  };

  const loadIntelligence = async (empId?: number | '') => {
    try {
      setIntelligenceLoading(true);
      const { startDate, endDate } = getDateRange();
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const targetEmpId = isAdmin ? (empId !== '' ? empId : undefined) : user?.id;
      if (targetEmpId) params.employeeId = targetEmpId;

      const res = await reportsApi.performanceIntelligence(params);
      setIntelligenceData(res.data);

      if (empId === '' && res.data.individualAnalytics) {
        setSelectedEmployeeId(res.data.individualAnalytics.employeeId);
      }
    } catch (err) {
      console.error('Failed to load performance intelligence:', err);
    } finally {
      setIntelligenceLoading(false);
    }
  };

  const initData = async () => {
    setLoading(true);
    await Promise.all([loadSummary(), loadIntelligence('')]);
    setLoading(false);
  };

  // Trigger load on date preset changes
  useEffect(() => {
    initData();
  }, [datePreset, customStartDate, customEndDate]);

  const handleEmployeeChange = (empId: number) => {
    setSelectedEmployeeId(empId);
    loadIntelligence(empId);
  };

  const handleCardClick = (empId: number) => {
    setSelectedEmployeeId(empId);
    setActiveTab('individual');
    loadIntelligence(empId);
  };

  const handleDownload = async (type: 'pdf' | 'excel') => {
    try {
      const { startDate, endDate } = getDateRange();
      const params: any = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const targetEmpId = isAdmin ? selectedEmployeeId : user?.id;
      if (targetEmpId) params.employeeId = targetEmpId;

      const url = type === 'pdf'
        ? reportsApi.getPerformancePdfUrl(params)
        : reportsApi.getPerformanceExcelUrl(params);

      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        responseType: 'blob',
      });

      const blob = new Blob([response.data], { type: response.headers['content-type'] as string });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `performance-report-${targetEmpId || 'org'}.${type === 'pdf' ? 'pdf' : 'xlsx'}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  const getBadgeClass = (badge: string) => {
    switch (badge) {
      case 'Elite Performer':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'High Achiever':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'Consistent Contributor':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Solid Performer':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      default:
        return 'bg-rose-50 text-rose-700 border-rose-200';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-600';
    if (score >= 80) return 'text-indigo-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 50) return 'text-amber-600';
    return 'text-rose-600';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 size={36} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-heading font-extrabold text-slate-800 font-bold">
            Performance Analytics & Intelligence
          </h2>
          <p className="text-xs text-slate-550">
            Monitor organizational productivity metrics, track employee performance badges, and view detailed delay audits.
          </p>
        </div>

        {/* Global Date Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={datePreset}
            onChange={(e: any) => setDatePreset(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500/20"
          >
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="month">This Month</option>
            <option value="custom">Custom Range</option>
          </select>

          {datePreset === 'custom' && (
            <div className="flex items-center gap-1.5 animate-in slide-in-from-left duration-200">
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none"
              />
              <span className="text-[10px] text-slate-400">to</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none"
              />
            </div>
          )}
        </div>
      </div>

      {/* Tab Navigation (Admins Only) */}
      {isAdmin && (
        <div className="flex border-b border-slate-200 gap-6">
          <button
            onClick={() => setActiveTab('summary')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
              activeTab === 'summary'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-400 hover:text-slate-650'
            }`}
          >
            Summary Charts
          </button>
          <button
            onClick={() => setActiveTab('org')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
              activeTab === 'org'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-400 hover:text-slate-650'
            }`}
          >
            Organization Productivity
          </button>
          <button
            onClick={() => setActiveTab('individual')}
            className={`pb-3 text-xs font-bold uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
              activeTab === 'individual'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-400 hover:text-slate-650'
            }`}
          >
            Individual Performance
          </button>
        </div>
      )}

      {intelligenceLoading && (
        <div className="flex justify-center items-center py-10">
          <Loader2 size={24} className="animate-spin text-indigo-500" />
        </div>
      )}

      {/* Tab 1: Summary Overview (Original Charts) */}
      {activeTab === 'summary' && summaryData && !intelligenceLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Weekly Productivity AreaChart */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-sm">
            <h3 className="font-heading font-bold text-slate-850 text-sm flex items-center gap-2">
              <TrendingUp size={16} className="text-indigo-600" /> Weekly Completion Trend
            </h3>
            <div className="h-72 w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={summaryData.weeklyProductivity} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                <BarChart data={summaryData.projectProgress} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                      data={summaryData.statusDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="count"
                      nameKey="status"
                    >
                      {summaryData.statusDistribution.map((_entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', borderRadius: '8px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="space-y-2">
                {summaryData.statusDistribution.map((entry: any, index: number) => (
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
            
            <div className="border border-slate-200 bg-slate-50 text-xs overflow-x-auto rounded-xl">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100/80 text-[10px] font-bold text-slate-550 uppercase tracking-widest">
                    <th className="px-4 py-4 text-center align-middle">Employee</th>
                    <th className="px-4 py-4 text-center align-middle">Tasks Assigned</th>
                    <th className="px-4 py-4 text-center align-middle">Completion Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {summaryData.employeePerformance.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-2 py-3 text-center text-slate-400 align-middle">
                        No employee stats loaded.
                      </td>
                    </tr>
                  ) : (
                    summaryData.employeePerformance.map((emp: any) => (
                      <tr key={emp.name} className="hover:bg-slate-155/50">
                        <td className="px-2 py-3 font-bold text-slate-800 text-center align-middle">{emp.name}</td>
                        <td className="px-2 py-3 text-center font-medium align-middle">{emp.totalTasks}</td>
                        <td className="px-2 py-3 font-bold text-indigo-600 text-center align-middle">
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
      )}

      {/* Tab 2: Organization Productivity */}
      {activeTab === 'org' && intelligenceData && !intelligenceLoading && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Section 1: Executive Organization Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[
              { title: 'Total Employees', value: intelligenceData.orgSummary.totalEmployees, icon: <Users size={18} className="text-indigo-500" /> },
              { title: 'Active Projects', value: intelligenceData.orgSummary.totalProjects, icon: <Layers size={18} className="text-sky-500" /> },
              { title: 'Total Task Logs', value: intelligenceData.orgSummary.totalTasks, icon: <BarChart3 size={18} className="text-amber-500" /> },
              { title: 'Completed Tasks', value: intelligenceData.orgSummary.completedTasks, icon: <UserCheck size={18} className="text-emerald-500" /> },
              { title: 'Delayed Tasks', value: intelligenceData.orgSummary.delayedTasks, icon: <AlertTriangle size={18} className="text-rose-500" /> },
            ].map((kpi, idx) => (
              <div key={idx} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between h-28">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{kpi.title}</span>
                  <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-100">{kpi.icon}</div>
                </div>
                <div className="text-2xl font-heading font-black text-slate-800">{kpi.value}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Secondary KPIs */}
            {[
              { label: 'Avg Completion Rate', value: `${intelligenceData.orgSummary.avgCompletionRate}%`, detail: 'Tasks completed / assigned' },
              { label: 'Avg Performance Score', value: `${intelligenceData.orgSummary.avgPerformanceScore}/100`, detail: 'Weighted rating average' },
              { label: 'Total Invested Hours', value: `${intelligenceData.orgSummary.totalWorkingHours} hrs`, detail: 'Combined timesheet duration' },
              { label: 'Total Overdue Delay', value: `${intelligenceData.orgSummary.totalDelayHours} hrs`, detail: 'Aggregate backlog delays' },
            ].map((card, idx) => (
              <div key={idx} className="bg-slate-50/50 p-4 border border-slate-200 rounded-2xl flex flex-col justify-center">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{card.label}</span>
                <span className="text-xl font-heading font-black text-slate-800 mt-1">{card.value}</span>
                <span className="text-[10px] text-slate-450 mt-0.5">{card.detail}</span>
              </div>
            ))}
          </div>

          {/* Section 9: Admin Insights Banner */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
              <Award size={16} className="text-amber-400" /> Organizational Performance Insights
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              {[
                { label: 'Top Performer', val: intelligenceData.adminInsights.topPerformer ? `${intelligenceData.adminInsights.topPerformer.name} (${intelligenceData.adminInsights.topPerformer.score}/100)` : 'N/A', sub: 'Highest intelligence score' },
                { label: 'Most Consistent', val: intelligenceData.adminInsights.mostConsistent ? `${intelligenceData.adminInsights.mostConsistent.name} (${intelligenceData.adminInsights.mostConsistent.rate}%)` : 'N/A', sub: 'Peak task completion rate' },
                { label: 'Most Efficient', val: intelligenceData.adminInsights.mostTimeEfficient ? `${intelligenceData.adminInsights.mostTimeEfficient.name} (${intelligenceData.adminInsights.mostTimeEfficient.ratio}x)` : 'N/A', sub: 'Expected vs Actual Hours ratio' },
                { label: 'Most Delayed', val: intelligenceData.adminInsights.mostDelayed ? `${intelligenceData.adminInsights.mostDelayed.name} (${intelligenceData.adminInsights.mostDelayed.hours} hrs)` : 'N/A', sub: 'Highest delay backlog duration' },
                { label: 'Role Specialist', val: intelligenceData.adminInsights.roleSpecialist ? `${intelligenceData.adminInsights.roleSpecialist.name} (${intelligenceData.adminInsights.roleSpecialist.role})` : 'N/A', sub: `Matched ${intelligenceData.adminInsights.roleSpecialist?.rate || 0}% assignments` },
              ].map((ins, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">{ins.label}</div>
                  <div className="text-xs font-bold text-slate-100 truncate">{ins.val}</div>
                  <div className="text-[9px] text-slate-450">{ins.sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 7: Rankings Leaderboard */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-sm">
            <h3 className="font-heading font-bold text-slate-850 text-sm flex items-center gap-2">
              <TrendingUp size={16} className="text-indigo-600" /> Leaderboard Rankings
            </h3>
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-200">
                    <th className="px-4 py-3 text-center">Rank</th>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Derived Role</th>
                    <th className="px-4 py-3 text-center">Completion Rate</th>
                    <th className="px-4 py-3 text-center">Working Hours</th>
                    <th className="px-4 py-3 text-center">Delay Hours</th>
                    <th className="px-4 py-3 text-center">Performance Score</th>
                    <th className="px-4 py-3 text-center">Intelligence Badge</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {intelligenceData.leaderboard.map((emp: any, idx: number) => (
                    <tr
                      key={emp.employeeId}
                      onClick={() => handleCardClick(emp.employeeId)}
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3 text-center font-bold text-slate-650">
                        {idx + 1 === 1 ? '🥇' : idx + 1 === 2 ? '🥈' : idx + 1 === 3 ? '🥉' : idx + 1}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">{emp.name}</td>
                      <td className="px-4 py-3 text-slate-500">{emp.primaryJobRole}</td>
                      <td className="px-4 py-3 text-center text-slate-700 font-semibold">{emp.completedTasks}/{emp.totalTasks} ({emp.timelyCompletionRate}%)</td>
                      <td className="px-4 py-3 text-center text-slate-700">{emp.actualHours} hrs</td>
                      <td className="px-4 py-3 text-center text-rose-600 font-medium">{emp.delayHours} hrs</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`font-bold ${getScoreColor(emp.performanceScore)}`}>
                          {emp.performanceScore}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${getBadgeClass(emp.badge)}`}>
                          {emp.badge}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Employee Performance Grid Cards */}
          <div>
            <h3 className="font-heading font-bold text-slate-850 text-sm mb-4">Employee Performance Cards</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {intelligenceData.leaderboard.map((emp: any) => (
                <div
                  key={emp.employeeId}
                  onClick={() => handleCardClick(emp.employeeId)}
                  className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                          {emp.name}
                        </h4>
                        <p className="text-[10px] text-slate-400">{emp.email}</p>
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${getBadgeClass(emp.badge)}`}>
                        {emp.badge}
                      </span>
                    </div>

                    <div className="text-[10px] bg-slate-50 text-slate-600 rounded px-2.5 py-1 inline-block">
                      Primary Role: <strong className="text-slate-750">{emp.primaryJobRole}</strong>
                    </div>

                    {/* Completion Mini Progress Bar */}
                    <div className="pt-2.5 space-y-1">
                      <div className="flex justify-between text-[9px] font-semibold text-slate-450">
                        <span>Tasks Completed</span>
                        <span>{emp.completedTasks}/{emp.totalTasks}</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{ width: `${emp.totalTasks > 0 ? (emp.completedTasks / emp.totalTasks) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 mt-4">
                    <div className="flex items-center gap-1">
                      <Clock size={12} className="text-slate-400" />
                      <span>{emp.actualHours} hrs</span>
                    </div>
                    <div className="flex items-center gap-1 font-bold text-indigo-600">
                      <span>Score: {emp.performanceScore}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Individual Employee Performance Details */}
      {activeTab === 'individual' && intelligenceData && !intelligenceLoading && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* Controls Bar */}
          <div className="bg-white p-5 border border-slate-100 rounded-3xl flex flex-wrap items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              {isAdmin && (
                <>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Select Employee:</label>
                  <select
                    value={selectedEmployeeId}
                    onChange={(e: any) => handleEmployeeChange(Number(e.target.value))}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer shadow-sm"
                  >
                    {intelligenceData.leaderboard.map((e: any) => (
                      <option key={e.employeeId} value={e.employeeId}>
                        {e.name}
                      </option>
                    ))}
                  </select>
                </>
              )}
              {!isAdmin && (
                <div className="text-sm font-semibold text-slate-800">
                  Performance Report for: <span className="text-indigo-600 font-bold">{intelligenceData.individualAnalytics?.name}</span>
                </div>
              )}
            </div>

            {/* Export Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleDownload('excel')}
                className="rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 hover:-translate-y-0.5 px-4 py-2.5 text-xs font-bold text-slate-700 transition-all cursor-pointer flex items-center gap-2 shadow-sm"
              >
                <Download size={14} className="text-emerald-500" /> Export Excel
              </button>
              <button
                onClick={() => handleDownload('pdf')}
                className="rounded-2xl bg-indigo-600 hover:bg-indigo-700 hover:-translate-y-0.5 px-4 py-2.5 text-xs font-bold text-white transition-all cursor-pointer flex items-center gap-2 shadow-md shadow-indigo-600/20"
              >
                <Download size={14} className="text-indigo-100" /> Export PDF
              </button>
            </div>
          </div>

          {/* Individual Analytics Content */}
          {intelligenceData.individualAnalytics ? (
            <div className="space-y-8">
              {/* Profile & Performance Score Gauge */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Score Panel */}
                <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm flex flex-col items-center justify-center text-center space-y-6 relative overflow-hidden group hover:shadow-md transition-all duration-300">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-full blur-3xl opacity-30 -mr-6 -mt-6"></div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Productivity Score</h3>
                  
                  <div className="relative flex items-center justify-center">
                    <svg className="w-36 h-36 transform -rotate-90">
                      <defs>
                        <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#818cf8" />
                          <stop offset="100%" stopColor="#4f46e5" />
                        </linearGradient>
                      </defs>
                      <circle
                        cx="72"
                        cy="72"
                        r="56"
                        className="stroke-slate-100 fill-transparent"
                        strokeWidth="10"
                      />
                      <circle
                        cx="72"
                        cy="72"
                        r="56"
                        className="fill-transparent transition-all duration-1000 ease-out"
                        strokeWidth="10"
                        strokeDasharray={351.86}
                        strokeDashoffset={351.86 - (intelligenceData.individualAnalytics.performanceScore / 100) * 351.86}
                        strokeLinecap="round"
                        stroke="url(#scoreGradient)"
                      />
                    </svg>
                    
                    <div className="absolute flex flex-col items-center justify-center">
                      <span className={`text-3xl font-heading font-black tracking-tight ${getScoreColor(intelligenceData.individualAnalytics.performanceScore)}`}>
                        {intelligenceData.individualAnalytics.performanceScore}%
                      </span>
                      <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest mt-0.5">Overall</span>
                    </div>
                  </div>
                  
                  <div className="space-y-3 relative z-10">
                    <div className={`text-xs font-extrabold px-4 py-1.5 rounded-full border inline-block shadow-sm ${getBadgeClass(intelligenceData.individualAnalytics.badge)}`}>
                      {intelligenceData.individualAnalytics.badge}
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed max-w-xs mx-auto">
                      Weighted Engine: 40% Completion Rate, 25% Timely Completion, 15% Delay Reduction, 10% Task Quality, 10% Project Participation.
                    </p>
                  </div>
                </div>

                {/* Profile Details card */}
                <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm flex flex-col justify-between space-y-6 lg:col-span-2 group hover:shadow-md transition-all duration-300 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-32 h-32 bg-emerald-50 rounded-full blur-3xl opacity-20 -ml-10 -mt-10"></div>
                  
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-16 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-650 font-bold font-heading text-2xl shadow-inner shadow-indigo-100 shrink-0">
                        {intelligenceData.individualAnalytics.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-heading font-extrabold text-slate-800 text-lg leading-snug">
                          {intelligenceData.individualAnalytics.name}
                        </h3>
                        <p className="text-xs text-slate-450 font-medium">{intelligenceData.individualAnalytics.email}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div className="bg-slate-50/50 p-4 border border-slate-100 rounded-2xl relative overflow-hidden">
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Derived Job Role</div>
                        <div className="text-sm font-bold text-slate-800 mt-1">{intelligenceData.individualAnalytics.primaryJobRole}</div>
                      </div>
                      <div className="bg-slate-50/50 p-4 border border-slate-100 rounded-2xl relative overflow-hidden">
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Role Matching Rate</div>
                        <div className="text-sm font-bold text-slate-800 mt-1 flex items-center gap-1.5">
                          {intelligenceData.individualAnalytics.roleMatchRate}%
                          <span className="text-[10px] text-slate-400 font-medium">({intelligenceData.individualAnalytics.roleProductivity.matchedCount} / {intelligenceData.individualAnalytics.totalTasks} tasks)</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 border-t border-slate-100 pt-5 mt-2">
                    <div className="text-center p-2 rounded-2xl hover:bg-slate-50 transition-colors">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Tasks Assigned</span>
                      <strong className="text-slate-800 text-base font-extrabold">{intelligenceData.individualAnalytics.totalTasks}</strong>
                    </div>
                    <div className="text-center p-2 rounded-2xl hover:bg-slate-50 transition-colors">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Completed Tasks</span>
                      <strong className="text-emerald-600 text-base font-extrabold">{intelligenceData.individualAnalytics.completedTasks}</strong>
                    </div>
                    <div className="text-center p-2 rounded-2xl hover:bg-slate-50 transition-colors">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Delayed Tasks</span>
                      <strong className="text-rose-650 text-base font-extrabold">{intelligenceData.individualAnalytics.delayedTasks}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sub-KPI Highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { label: 'Time Spent Work', value: `${intelligenceData.individualAnalytics.actualHours} hrs`, icon: <Clock size={18} className="text-indigo-600" />, bgIcon: 'bg-indigo-50 border-indigo-100', sub: 'Total reported logs' },
                  { label: 'Expectation Hours', value: `${intelligenceData.individualAnalytics.expectedHours} hrs`, icon: <Calendar size={18} className="text-sky-600" />, bgIcon: 'bg-sky-50 border-sky-100', sub: 'Total tasks effort' },
                  { label: 'Delay Duration Log', value: `${intelligenceData.individualAnalytics.delayHours} hrs`, icon: <AlertTriangle size={18} className="text-rose-600" />, bgIcon: 'bg-rose-50 border-rose-100', sub: 'Overdue task logs' },
                  { label: 'Clean Approvals', value: `${intelligenceData.individualAnalytics.cleanApprovalsRate}%`, icon: <Award size={18} className="text-emerald-600" />, bgIcon: 'bg-emerald-50 border-emerald-100', sub: 'No revision tasks' },
                ].map((k, idx) => (
                  <div key={idx} className="bg-white rounded-3xl border border-slate-100 p-5 flex items-center justify-between gap-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
                    <div className="space-y-1">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">{k.label}</span>
                      <strong className="text-slate-800 text-lg font-black block">{k.value}</strong>
                      <span className="text-[10px] text-slate-450 font-medium block">{k.sub}</span>
                    </div>
                    <div className={`p-3 rounded-2xl border ${k.bgIcon} shadow-sm shrink-0`}>{k.icon}</div>
                  </div>
                ))}
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Role-Based Pie Chart */}
                <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-all duration-300">
                  <h3 className="font-heading font-extrabold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-50 pb-4 mb-4">
                    <PieIcon size={16} className="text-indigo-600" /> Role-Based Productivity Matching
                  </h3>
                  <div className="h-64 w-full text-xs flex flex-col sm:flex-row items-center justify-around gap-4">
                    <div className="h-44 w-44 shrink-0">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Matched Roles', count: intelligenceData.individualAnalytics.roleProductivity.matchedCount },
                              { name: 'Mismatched Roles', count: intelligenceData.individualAnalytics.roleProductivity.mismatchedCount },
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={45}
                            outerRadius={65}
                            paddingAngle={5}
                            dataKey="count"
                          >
                            <Cell fill="#6366f1" />
                            <Cell fill="#f43f5e" />
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', borderRadius: '8px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-indigo-500" />
                        <span className="text-slate-500 font-medium text-xs">Matched Tasks:</span>
                        <strong className="text-slate-800 text-xs">{intelligenceData.individualAnalytics.roleProductivity.matchedCount}</strong>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full bg-rose-500" />
                        <span className="text-slate-500 font-medium text-xs">Mismatched Tasks:</span>
                        <strong className="text-slate-800 text-xs">{intelligenceData.individualAnalytics.roleProductivity.mismatchedCount}</strong>
                      </div>
                      <p className="text-[10px] text-slate-450 max-w-[12rem] leading-relaxed pt-1.5 font-medium">
                        Matches assignments against the dynamic primary job role: <strong>{intelligenceData.individualAnalytics.primaryJobRole}</strong>.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Efficiency BarChart */}
                <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300">
                  <h3 className="font-heading font-extrabold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-50 pb-4 mb-4">
                    <BarChart3 size={16} className="text-emerald-650" /> Task Time Auditing
                  </h3>
                  <div className="h-64 w-full text-xs">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={intelligenceData.individualAnalytics.timeEfficiency.slice(0, 5)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="project" stroke="#64748b" />
                        <YAxis stroke="#64748b" label={{ value: 'Hours', angle: -90, position: 'insideLeft', offset: 10 }} />
                        <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', borderRadius: '8px' }} />
                        <Legend />
                        <Bar dataKey="expectedHours" name="Expected Hours" fill="#cbd5e1" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="actualHours" name="Actual Hours" fill="#6366f1" radius={[3, 3, 0, 0]} />
                        <Bar dataKey="delayHours" name="Delay Hours" fill="#ef4444" radius={[3, 3, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Weekly/Period Productivity Line/Area Trend */}
              <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300">
                <h3 className="font-heading font-extrabold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-50 pb-4 mb-4">
                  <TrendingUp size={16} className="text-indigo-600" /> Daily Workload Trend
                </h3>
                <div className="h-60 w-full text-xs">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={intelligenceData.individualAnalytics.weeklyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorIndivProductivity" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" stroke="#64748b" />
                      <YAxis stroke="#64748b" />
                      <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', color: '#0f172a', borderRadius: '8px' }} />
                      <Legend />
                      <Area type="monotone" dataKey="workingHours" name="Hours Logged" stroke="#10b981" fillOpacity={1} fill="url(#colorIndivProductivity)" strokeWidth={2} />
                      <Area type="monotone" dataKey="completedTasks" name="Completed Tasks" stroke="#6366f1" fill="none" strokeWidth={2} />
                      <Area type="monotone" dataKey="delayedTasks" name="Delayed Tasks" stroke="#f43f5e" fill="none" strokeWidth={1.5} strokeDasharray="4 4" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Project Contribution Breakdown Table */}
              <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm hover:shadow-md transition-all duration-300">
                <h3 className="font-heading font-extrabold text-slate-800 text-sm border-b border-slate-50 pb-4 mb-4">Project Contributions</h3>
                <div className="border border-slate-100 rounded-2xl overflow-hidden text-xs shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-100">
                        <th className="px-5 py-4">Project Name</th>
                        <th className="px-5 py-4 text-center">Completed Tasks</th>
                        <th className="px-5 py-4 text-center">Hours Worked</th>
                        <th className="px-5 py-4 text-center">Org Contribution % (Tasks)</th>
                        <th className="px-5 py-4 text-center">Org Contribution % (Hours)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {intelligenceData.individualAnalytics.projectContribution.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-5 py-6 text-center text-slate-400 font-medium">
                            No active project logs found for this period.
                          </td>
                        </tr>
                      ) : (
                        intelligenceData.individualAnalytics.projectContribution.map((proj: any) => (
                          <tr key={proj.projectId} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-5 py-4 font-bold text-slate-850">{proj.projectName}</td>
                            <td className="px-5 py-4 text-center text-slate-600 font-semibold">{proj.tasksCompleted}</td>
                            <td className="px-5 py-4 text-center text-slate-600 font-semibold">{proj.hoursSpent} hrs</td>
                            <td className="px-5 py-4 text-center">
                              <span className="font-extrabold text-indigo-650 bg-indigo-50/50 border border-indigo-100 px-2.5 py-1 rounded-full text-[10px]">
                                {proj.completedContributionPct}%
                              </span>
                            </td>
                            <td className="px-5 py-4 text-center">
                              <span className="font-extrabold text-emerald-600 bg-emerald-50/50 border border-emerald-100 px-2.5 py-1 rounded-full text-[10px]">
                                {proj.hoursContributionPct}%
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-center text-xs text-slate-450 py-10 font-semibold">No employee stats matching filter constraints.</p>
          )}
        </div>
      )}
    </div>
  );
};
