import React, { useEffect, useState } from 'react';
import { tasksApi, usersApi } from '../services/api';
import { Users, UserCheck, CalendarDays, CheckCircle2, AlertTriangle, PlayCircle, Loader2, UserPlus } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('EMPLOYEE');
  const [isCreating, setIsCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchMetrics = async () => {
    try {
      const res = await tasksApi.getMetrics();
      setMetrics(res.data);
    } catch (err) {
      console.error('Failed to load admin metrics:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const res = await usersApi.list();
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      await Promise.all([fetchMetrics(), fetchUsers()]);
    } catch (err) {
      console.error('Error loading admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) return;
    setIsCreating(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await usersApi.create({
        name,
        email,
        password,
        role,
      });
      setSuccessMsg(`Employee "${name}" created successfully.`);
      setName('');
      setEmail('');
      setPassword('');
      setRole('EMPLOYEE');
      // Refresh metrics and employee directory
      await Promise.all([fetchMetrics(), fetchUsers()]);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Failed to register employee. Try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const getRoleBadgeClass = (r: string) => {
    switch (r) {
      case 'SUPER_ADMIN':
        return 'text-rose-700 bg-rose-50 border-rose-100';
      case 'ADMIN':
        return 'text-indigo-700 bg-indigo-50 border-indigo-100';
      default:
        return 'text-emerald-700 bg-emerald-50 border-emerald-100';
    }
  };

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
    },
    {
      name: 'Active Staff (3d)',
      value: metrics?.activeEmployees ?? 0,
      icon: <UserCheck size={20} className="text-emerald-400" />,
      bg: 'bg-emerald-500/5 border-emerald-500/10',
    },
    {
      name: 'Tasks Today',
      value: metrics?.tasksAssignedToday ?? 0,
      icon: <CalendarDays size={20} className="text-sky-400" />,
      bg: 'bg-sky-500/5 border-sky-500/10',
    },
    {
      name: 'Completed Today',
      value: metrics?.completedTasksToday ?? 0,
      icon: <CheckCircle2 size={20} className="text-emerald-400" />,
      bg: 'bg-emerald-500/5 border-emerald-500/10',
    },
    {
      name: 'Delayed Today',
      value: metrics?.delayedTasksToday ?? 0,
      icon: <AlertTriangle size={20} className="text-rose-400" />,
      bg: 'bg-rose-500/5 border-rose-500/10',
    },
    {
      name: 'Pending Tasks',
      value: metrics?.pendingTasksToday ?? 0,
      icon: <PlayCircle size={20} className="text-amber-400" />,
      bg: 'bg-amber-500/5 border-amber-500/10',
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
            className={`bg-white rounded-2xl p-5 border shadow-sm flex flex-col justify-between h-32 transition-all hover:scale-[1.02] hover:shadow-md ${card.bg}`}
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
        <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-sm">
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

      {/* Employee Management Module */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Register User Form */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-sm h-fit">
          <h3 className="font-heading font-bold text-slate-800 text-sm flex items-center gap-2">
            <UserPlus size={16} className="text-indigo-600" /> Create Employee
          </h3>
          <p className="text-[11px] text-slate-500">Create new staff accounts. They can immediately log in with these credentials.</p>
          
          <form onSubmit={handleCreateUser} className="space-y-4">
            {errorMsg && (
              <div className="p-3 text-xs bg-rose-50 border border-rose-100 text-rose-700 rounded-xl">
                {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="p-3 text-xs bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl">
                {successMsg}
              </div>
            )}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Jane Doe"
                required
                className="block w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. jane@company.com"
                required
                className="block w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                required
                minLength={6}
                className="block w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                System Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="block w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-500"
              >
                <option value="EMPLOYEE">Employee</option>
                <option value="ADMIN">Admin</option>
                <option value="SUPER_ADMIN">Super Admin</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={isCreating}
              className="w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-600/10"
            >
              {isCreating ? <Loader2 size={14} className="animate-spin" /> : 'Register User'}
            </button>
          </form>
        </div>

        {/* Directory List */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="font-heading font-bold text-slate-800 text-sm">Employee Directory</h3>
              <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[10px] text-slate-500 border border-slate-200 font-bold">
                {users.length} Registered
              </span>
            </div>

            <div className="rounded-xl border border-slate-200 overflow-hidden mt-4">
              <div className="max-h-[350px] overflow-y-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100/50 text-[10px] font-bold text-slate-500 uppercase tracking-widest sticky top-0 z-10">
                      <th className="px-4 py-3 bg-slate-100/80 backdrop-blur-md">Name</th>
                      <th className="px-4 py-3 bg-slate-100/80 backdrop-blur-md">Email</th>
                      <th className="px-4 py-3 bg-slate-100/80 backdrop-blur-md">Role</th>
                      <th className="px-4 py-3 bg-slate-100/80 backdrop-blur-md text-right">Created</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs text-slate-700 bg-white">
                    {loadingUsers ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center">
                          <Loader2 size={20} className="animate-spin text-indigo-500 mx-auto" />
                        </td>
                      </tr>
                    ) : users.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                          No employees registered.
                        </td>
                      </tr>
                    ) : (
                      users.map((u) => (
                        <tr key={u.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-semibold text-slate-800">{u.name}</td>
                          <td className="px-4 py-3 text-slate-600">{u.email}</td>
                          <td className="px-4 py-3">
                            <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded border ${getRoleBadgeClass(u.role)}`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-slate-500">
                            {new Date(u.createdAt).toLocaleDateString()}
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
      </div>
    </div>
  );
};
