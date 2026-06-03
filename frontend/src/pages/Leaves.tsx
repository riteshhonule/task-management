import React, { useEffect, useState } from 'react';
import { leavesApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { CalendarRange, Plus, Check, X, Loader2 } from 'lucide-react';

export const Leaves: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Apply Form State (Employee Only)
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [type, setType] = useState('CASUAL');
  const [reason, setReason] = useState('');
  const [isApplying, setIsApplying] = useState(false);

  // Approval Processing State
  const [processingId, setProcessingId] = useState<number | null>(null);

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const res = await leavesApi.list();
      setLeaves(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaves();

    const handleSyncLeaves = () => {
      fetchLeaves();
    };

    window.addEventListener('sync-leaves', handleSyncLeaves);

    return () => {
      window.removeEventListener('sync-leaves', handleSyncLeaves);
    };
  }, []);

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate || !reason.trim()) return;
    setIsApplying(true);
    try {
      await leavesApi.apply({
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        type,
        reason,
      });

      setStartDate('');
      setEndDate('');
      setType('CASUAL');
      setReason('');
      await fetchLeaves();
    } catch (err) {
      console.error(err);
    } finally {
      setIsApplying(false);
    }
  };

  const handleProcessStatus = async (id: number, status: 'APPROVED' | 'REJECTED') => {
    setProcessingId(id);
    try {
      await leavesApi.updateStatus(id, {
        status,
        remarks: `Processed by ${user?.name}`,
      });
      await fetchLeaves();
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'text-emerald-700 bg-emerald-50 border-emerald-100';
      case 'REJECTED':
        return 'text-rose-700 bg-rose-50 border-rose-100';
      default:
        return 'text-amber-700 bg-amber-50 border-amber-100';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <div>
        <h2 className="text-2xl font-heading font-extrabold text-slate-800 font-bold">Leave Management</h2>
        <p className="text-xs text-slate-550">Submit requests for time off or manage staff approvals.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Apply Leave Panel (Employee only) */}
        {!isAdmin && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 h-fit shadow-sm">
            <h3 className="font-heading font-bold text-slate-800 text-sm flex items-center gap-2">
              <CalendarRange size={16} className="text-indigo-650" /> Apply Leave
            </h3>
            <form onSubmit={handleApply} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    className="block w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    required
                    className="block w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                  Leave Type
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="block w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-500"
                >
                  <option value="CASUAL">CASUAL LEAVE</option>
                  <option value="SICK">SICK LEAVE</option>
                  <option value="PLANNED">PLANNED HOLIDAY</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                  Reason for leave
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Provide justification..."
                  required
                  className="block w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 min-h-24"
                />
              </div>

              <button
                type="submit"
                disabled={isApplying || !startDate || !endDate || !reason.trim()}
                className="w-full rounded-xl bg-indigo-600 py-3 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-indigo-600/10"
              >
                {isApplying ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Apply Request
              </button>
            </form>
          </div>
        )}

        {/* Leaves List Panel */}
        <div className={isAdmin ? 'lg:col-span-3 space-y-4' : 'lg:col-span-2 space-y-4'}>
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h3 className="font-heading font-bold text-slate-800 text-sm">
              {isAdmin ? 'Staff Leave Board' : 'My Requests history'}
            </h3>
            <span className="rounded-full bg-slate-50 px-2.5 py-0.5 text-xs text-slate-650 border border-slate-200">
              {leaves.length} Applications
            </span>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 size={24} className="animate-spin text-indigo-500" />
            </div>
          ) : leaves.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-10">No leave applications registered.</p>
          ) : (
            <div className="bg-white border border-slate-200 shadow-sm">
              <div className="max-h-[75vh] overflow-auto">
                <table className="w-full text-left border-collapse min-w-max">
                  <thead className="sticky top-0 z-20 bg-slate-200 outline outline-1 outline-slate-400 shadow-sm">
                    <tr className="bg-slate-200 divide-x divide-slate-400">
                      {isAdmin && <th className="px-4 py-4 text-xs font-extrabold text-slate-800 uppercase tracking-wider text-center align-middle">Employee Name</th>}
                      <th className="px-4 py-4 text-xs font-extrabold text-slate-800 uppercase tracking-wider text-center align-middle">Duration</th>
                      <th className="px-4 py-4 text-xs font-extrabold text-slate-800 uppercase tracking-wider w-[350px] text-center align-middle">Reason</th>
                      <th className="px-4 py-4 text-xs font-extrabold text-slate-800 uppercase tracking-wider text-center align-middle">Status</th>
                      {isAdmin && <th className="px-4 py-4 text-xs font-extrabold text-slate-800 uppercase tracking-wider text-center align-middle">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-400">
                    {leaves.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-50 transition-colors align-top divide-x divide-slate-400">
                        {isAdmin && (
                          <td className="px-2 py-1.5 text-sm font-bold text-slate-800 whitespace-nowrap text-center align-middle">
                            {l.employee?.name || 'Unknown Employee'}
                          </td>
                        )}
                        <td className="px-2 py-1.5 text-xs text-slate-600 whitespace-nowrap text-center align-middle">
                          {new Date(l.startDate).toLocaleDateString()} <span className="text-slate-400 mx-1">to</span> {new Date(l.endDate).toLocaleDateString()}
                        </td>
                        <td className="px-2 py-1.5 text-xs text-slate-700 whitespace-normal leading-relaxed text-center align-middle">
                          {l.reason}
                        </td>
                        <td className="px-2 py-1.5 text-xs whitespace-nowrap text-center align-middle">
                          <span className={`px-2.5 py-1 rounded-md font-bold border inline-block ${getStatusColor(l.status)}`}>
                            {l.status}
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="px-2 py-1.5 text-xs whitespace-nowrap text-center align-middle">
                            {l.status === 'PENDING' ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => handleProcessStatus(l.id, 'APPROVED')}
                                  disabled={processingId === l.id}
                                  className="rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700 hover:bg-emerald-600 hover:text-white px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                                >
                                  {processingId === l.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Approve
                                </button>
                                <button
                                  onClick={() => handleProcessStatus(l.id, 'REJECTED')}
                                  disabled={processingId === l.id}
                                  className="rounded-lg bg-rose-50 border border-rose-100 text-rose-700 hover:bg-rose-600 hover:text-white px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                                >
                                  {processingId === l.id ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />} Reject
                                </button>
                              </div>
                            ) : (
                              <span className="text-slate-400 text-xs italic">Reviewed</span>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
