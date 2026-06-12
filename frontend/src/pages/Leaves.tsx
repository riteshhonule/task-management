import React, { useEffect, useState, useMemo } from 'react';
import { leavesApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { CalendarRange, Plus, Loader2, Paperclip } from 'lucide-react';

export const Leaves: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  const [leaves, setLeaves] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Apply Form State (Employee Only)
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [leaveType, setLeaveType] = useState('Casual Leave');
  const [reason, setReason] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [isApplying, setIsApplying] = useState(false);

  // Admin filter state
  const [activeFilter, setActiveFilter] = useState<'TODAY' | 'WEEK' | 'MONTH' | 'ALL'>('ALL');

  const fetchLeaves = async () => {
    try {
      setLoading(true);
      const res = await leavesApi.list();
      setLeaves(res.data);
    } catch (err) {
      console.error('Failed to fetch leaves:', err);
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
    if (!startDate || !endDate || !reason.trim() || !leaveType) {
      alert("Please fill in all required fields.");
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      alert("End Date cannot be before Start Date.");
      return;
    }

    setIsApplying(true);
    try {
      await leavesApi.apply({
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        leaveType,
        reason,
        attachmentUrl: attachmentUrl.trim() || undefined,
      });

      setStartDate('');
      setEndDate('');
      setLeaveType('Casual Leave');
      setReason('');
      setAttachmentUrl('');
      await fetchLeaves();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || err.message || "Failed to submit leave request.");
    } finally {
      setIsApplying(false);
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

  // Filter leaves for Admin Board
  const filteredLeaves = useMemo(() => {
    if (!isAdmin) return leaves;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    if (activeFilter === 'TODAY') {
      return leaves.filter(l => {
        const start = new Date(l.startDate);
        const end = new Date(l.endDate);
        return start <= todayEnd && end >= todayStart;
      });
    }

    if (activeFilter === 'WEEK') {
      const currentDay = now.getDay();
      const diff = now.getDate() - currentDay + (currentDay === 0 ? -6 : 1); // Monday
      const monday = new Date(now.setDate(diff));
      monday.setHours(0, 0, 0, 0);

      const sunday = new Date(monday);
      sunday.setDate(sunday.getDate() + 6); // Sunday
      sunday.setHours(23, 59, 59, 999);

      return leaves.filter(l => {
        const start = new Date(l.startDate);
        const end = new Date(l.endDate);
        return start <= sunday && end >= monday;
      });
    }

    if (activeFilter === 'MONTH') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      return leaves.filter(l => {
        const start = new Date(l.startDate);
        const end = new Date(l.endDate);
        return start <= lastDay && end >= firstDay;
      });
    }

    return leaves;
  }, [leaves, activeFilter, isAdmin]);

  const calculateDays = (startStr: string, endStr: string) => {
    const start = new Date(startStr);
    const end = new Date(endStr);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;
    const startUTC = Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate());
    const endUTC = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate());
    const diffTime = Math.abs(endUTC - startUTC);
    return Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <div>
        <h2 className="text-2xl font-heading font-extrabold text-slate-800 font-bold">
          {isAdmin ? 'Staff Leaves Board' : 'My Leaves'}
        </h2>
        <p className="text-xs text-slate-550">
          {isAdmin ? 'Monitor active and upcoming staff leave records.' : 'Submit requests for time off and view your leaves history.'}
        </p>
      </div>

      {isAdmin && (
        <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-4">
          {(['ALL', 'TODAY', 'WEEK', 'MONTH'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                activeFilter === filter
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {filter === 'ALL' ? 'All Leaves' : filter === 'TODAY' ? 'Today' : filter === 'WEEK' ? 'This Week' : 'This Month'}
            </button>
          ))}
        </div>
      )}

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
                    Start Date *
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
                    End Date *
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
                  Leave Type *
                </label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                  required
                  className="block w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-500"
                >
                  <option value="Casual Leave">Casual Leave</option>
                  <option value="Sick Leave">Sick Leave</option>
                  <option value="Emergency Leave">Emergency Leave</option>
                  <option value="Half Day">Half Day</option>
                  <option value="Work From Home">Work From Home</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                  Reason for leave *
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Provide justification..."
                  required
                  className="block w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 min-h-24"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                  Attachment URL (Optional)
                </label>
                <input
                  type="url"
                  value={attachmentUrl}
                  onChange={(e) => setAttachmentUrl(e.target.value)}
                  placeholder="Link to supporting document..."
                  className="block w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={isApplying || !startDate || !endDate || !reason.trim()}
                className="w-full rounded-xl bg-indigo-600 py-3 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-indigo-600/10"
              >
                {isApplying ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Submit Leave
              </button>
            </form>
          </div>
        )}

        {/* Leaves List Panel */}
        <div className={isAdmin ? 'lg:col-span-3 space-y-4' : 'lg:col-span-2 space-y-4'}>
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h3 className="font-heading font-bold text-slate-800 text-sm">
              {isAdmin ? 'Staff Leave Records' : 'My Requests History'}
            </h3>
            <span className="rounded-full bg-slate-50 px-2.5 py-0.5 text-xs text-slate-650 border border-slate-200">
              {filteredLeaves.length} Applications
            </span>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 size={24} className="animate-spin text-indigo-500" />
            </div>
          ) : filteredLeaves.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-10">No leave applications registered.</p>
          ) : (
            <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
              <div className="max-h-[75vh] overflow-auto">
                <table className="w-full text-left border-collapse min-w-max">
                  <thead className="sticky top-0 z-20 bg-slate-200 outline outline-1 outline-slate-400 shadow-sm">
                    <tr className="bg-slate-200 divide-x divide-slate-450">
                      {isAdmin && (
                        <>
                          <th className="px-4 py-4 text-xs font-extrabold text-slate-800 uppercase tracking-wider text-center align-middle">Employee Name</th>
                          <th className="px-4 py-4 text-xs font-extrabold text-slate-800 uppercase tracking-wider text-center align-middle">Department</th>
                        </>
                      )}
                      <th className="px-4 py-4 text-xs font-extrabold text-slate-800 uppercase tracking-wider text-center align-middle">Leave Type</th>
                      <th className="px-4 py-4 text-xs font-extrabold text-slate-800 uppercase tracking-wider text-center align-middle">Start Date</th>
                      <th className="px-4 py-4 text-xs font-extrabold text-slate-800 uppercase tracking-wider text-center align-middle">End Date</th>
                      <th className="px-4 py-4 text-xs font-extrabold text-slate-800 uppercase tracking-wider text-center align-middle">Total Days</th>
                      <th className="px-4 py-4 text-xs font-extrabold text-slate-800 uppercase tracking-wider w-[300px] text-center align-middle">Reason</th>
                      {!isAdmin && <th className="px-4 py-4 text-xs font-extrabold text-slate-800 uppercase tracking-wider text-center align-middle">Attachment</th>}
                      {isAdmin && <th className="px-4 py-4 text-xs font-extrabold text-slate-800 uppercase tracking-wider text-center align-middle">Created Date</th>}
                      <th className="px-4 py-4 text-xs font-extrabold text-slate-800 uppercase tracking-wider text-center align-middle">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-400">
                    {filteredLeaves.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-50 transition-colors align-top divide-x divide-slate-400">
                        {isAdmin && (
                          <>
                            <td className="px-3 py-3.5 text-xs font-bold text-slate-800 whitespace-nowrap text-center align-middle">
                              {l.employee?.name || 'Unknown Employee'}
                            </td>
                            <td className="px-3 py-3.5 text-xs text-slate-500 whitespace-nowrap text-center align-middle">
                              Tech
                            </td>
                          </>
                        )}
                        <td className="px-3 py-3.5 text-xs font-bold text-indigo-700 whitespace-nowrap text-center align-middle">
                          {l.leaveType || 'Casual Leave'}
                        </td>
                        <td className="px-3 py-3.5 text-xs text-slate-600 whitespace-nowrap text-center align-middle">
                          {(() => {
                            const d = new Date(l.startDate);
                            return isNaN(d.getTime()) ? '-' : `${d.getUTCMonth() + 1}/${d.getUTCDate()}/${d.getUTCFullYear()}`;
                          })()}
                        </td>
                        <td className="px-3 py-3.5 text-xs text-slate-600 whitespace-nowrap text-center align-middle">
                          {(() => {
                            const d = new Date(l.endDate);
                            return isNaN(d.getTime()) ? '-' : `${d.getUTCMonth() + 1}/${d.getUTCDate()}/${d.getUTCFullYear()}`;
                          })()}
                        </td>
                        <td className="px-3 py-3.5 text-xs font-bold text-slate-700 whitespace-nowrap text-center align-middle">
                          {calculateDays(l.startDate, l.endDate)}
                        </td>
                        <td className="px-3 py-3.5 text-xs text-slate-700 whitespace-normal leading-relaxed text-center align-middle max-w-[300px]">
                          {l.reason}
                          {l.attachmentUrl && (
                            <a
                              href={l.attachmentUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-indigo-600 hover:underline font-bold mt-1.5 flex items-center justify-center gap-1"
                            >
                              <Paperclip size={12} /> View Document
                            </a>
                          )}
                        </td>
                        {!isAdmin && (
                          <td className="px-3 py-3.5 text-xs text-center align-middle">
                            {l.attachmentUrl ? (
                              <a
                                href={l.attachmentUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-indigo-650 hover:underline font-bold"
                              >
                                View Link
                              </a>
                            ) : (
                              <span className="text-slate-350">-</span>
                            )}
                          </td>
                        )}
                        {isAdmin && (
                          <td className="px-3 py-3.5 text-xs text-slate-500 whitespace-nowrap text-center align-middle">
                            {new Date(l.createdAt).toLocaleDateString()}
                          </td>
                        )}
                        <td className="px-3 py-3.5 text-xs whitespace-nowrap text-center align-middle">
                          <span className={`px-2.5 py-1 rounded-md font-extrabold border inline-block ${getStatusColor(l.status)}`}>
                            {l.status}
                          </span>
                        </td>
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
