import React, { useEffect, useState } from 'react';
import { usersApi } from '../services/api';
import { UserPlus, Loader2 } from 'lucide-react';

export const Employees: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('EMPLOYEE');
  const [isCreating, setIsCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await usersApi.list();
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();

    const handleSyncUsers = () => {
      fetchUsers();
    };

    window.addEventListener('sync-users', handleSyncUsers);

    return () => {
      window.removeEventListener('sync-users', handleSyncUsers);
    };
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
        mobileNumber: mobileNumber || undefined,
        password,
        role,
      });
      setSuccessMsg(`Employee "${name}" created successfully.`);
      setName('');
      setEmail('');
      setMobileNumber('');
      setPassword('');
      setRole('EMPLOYEE');
      await fetchUsers();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.response?.data?.message || 'Failed to register employee. Try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const [showForm, setShowForm] = useState(false);

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

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-heading font-extrabold text-slate-800 font-bold">Employees Directory</h2>
          <p className="text-xs text-slate-500">Manage staff accounts, assign roles, and track onboarding.</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 shadow-sm transition-colors"
        >
          <UserPlus size={16} /> Add New Employee
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-2xl max-w-md w-full relative">
            <button onClick={() => setShowForm(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
              <span className="sr-only">Close</span>
              &times;
            </button>
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
                  Mobile Number
                </label>
                <input
                  type="text"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="e.g. +1 234 567 8900"
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
                  placeholder="e.g. jane@gmark.com"
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
        </div>
      )}

      {/* Directory List */}
      <div className="bg-white border border-slate-200 p-6 space-y-4 shadow-sm flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="font-heading font-bold text-slate-800 text-sm">Employee Directory</h3>
            <span className="rounded-full bg-slate-50 px-2 py-0.5 text-[10px] text-slate-500 border border-slate-200 font-bold">
              {users.length} Registered
            </span>
          </div>

          <div className="border border-slate-200 mt-4">
            <div className="max-h-[75vh] overflow-y-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100/50 text-[13px] font-bold text-slate-500 uppercase tracking-widest sticky top-0 z-10">
                    <th className="px-4 py-6 bg-slate-100/80 backdrop-blur-md text-center align-middle">Name</th>
                    <th className="px-4 py-6 bg-slate-100/80 backdrop-blur-md text-center align-middle">Mobile Number</th>
                    <th className="px-4 py-6 bg-slate-100/80 backdrop-blur-md text-center align-middle">Email</th>
                    <th className="px-4 py-6 bg-slate-100/80 backdrop-blur-md text-center align-middle">Role</th>
                    <th className="px-4 py-6 bg-slate-100/80 backdrop-blur-md text-center align-middle">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs text-slate-700 bg-white">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-2.5 text-center align-middle">
                        <Loader2 size={20} className="animate-spin text-indigo-500 mx-auto" />
                      </td>
                    </tr>
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-2.5 text-center text-slate-500 align-middle">
                        No employees registered.
                      </td>
                    </tr>
                  ) : (
                    users.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2.5 font-semibold text-slate-800 text-center align-middle">{u.name}</td>
                        <td className="px-3 py-2.5 text-slate-600 text-center align-middle">{u.mobileNumber || '-'}</td>
                        <td className="px-3 py-2.5 text-slate-600 text-center align-middle">{u.email}</td>
                        <td className="px-3 py-2.5 text-center align-middle">
                          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded border ${getRoleBadgeClass(u.role)}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-slate-500 text-center align-middle">
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
  );
};
