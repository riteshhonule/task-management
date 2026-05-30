import React, { useEffect, useState } from 'react';
import { tasksApi, projectsApi, uploadsApi } from '../services/api';
import {
  Plus,
  Clock,
  Calendar,
  AlertTriangle,
  Upload,
  UserCheck,
  Send,
  Loader2,
} from 'lucide-react';

export const EmployeeDashboard: React.FC = () => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Task Creation Form State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [startTime, setStartTime] = useState('09:00 AM');
  const [expectedEnd, setExpectedEnd] = useState('');
  const [projectId, setProjectId] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [changesGivenBy, setChangesGivenBy] = useState('');
  const [changesSummary, setChangesSummary] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Task Update Modal State
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [updateStatus, setUpdateStatus] = useState('');
  const [updateRemarks, setUpdateRemarks] = useState('');
  const [updateDelayReason, setUpdateDelayReason] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUpdatingTask, setIsUpdatingTask] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const [tasksRes, projectsRes] = await Promise.all([
        tasksApi.list(),
        projectsApi.list(),
      ]);
      setTasks(tasksRes.data);
      // Filter out archived projects
      setProjects(projectsRes.data.filter((p: any) => !p.isArchived));
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !description || !expectedEnd) return;
    setIsSubmitting(true);
    try {
      await tasksApi.create({
        startTime,
        expectedCompletionDate: new Date(expectedEnd).toISOString(),
        projectId: parseInt(projectId),
        description,
        priority,
        changesGivenBy: changesGivenBy || undefined,
        changesSummary: changesSummary || undefined,
        notes: notes || undefined,
      });

      // Reset Form
      setStartTime('09:00 AM');
      setExpectedEnd('');
      setProjectId('');
      setDescription('');
      setPriority('MEDIUM');
      setChangesGivenBy('');
      setChangesSummary('');
      setNotes('');
      setShowCreateModal(false);
      
      // Reload lists
      await fetchDashboardData();
    } catch (err) {
      console.error('Failed to create task:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask) return;
    setIsUpdatingTask(true);
    try {
      let screenshotUrl = selectedTask.screenshotUrl;

      // Handle upload if present
      if (uploadFile) {
        const uploadRes = await uploadsApi.upload(uploadFile);
        screenshotUrl = uploadRes.data.url;
      }

      await tasksApi.update(selectedTask.id, {
        status: updateStatus,
        remarks: updateRemarks,
        delayReason: updateStatus === 'DELAYED' ? updateDelayReason : undefined,
        screenshotUrl,
      });

      setUploadFile(null);
      setSelectedTask(null);
      await fetchDashboardData();
    } catch (err) {
      console.error('Failed to update task:', err);
    } finally {
      setIsUpdatingTask(false);
    }
  };

  // Helper arrays for rendering tabs
  const todayTasks = tasks.filter((t) => {
    const d = new Date(t.date).toDateString();
    const today = new Date().toDateString();
    return d === today;
  });

  const carryOverTasks = tasks.filter((t) => {
    const d = new Date(t.date).toDateString();
    const today = new Date().toDateString();
    return d !== today && t.status !== 'COMPLETED';
  });

  const getPriorityColor = (prio: string) => {
    switch (prio) {
      case 'HIGH':
        return 'text-rose-700 bg-rose-50 border-rose-100';
      case 'MEDIUM':
        return 'text-amber-700 bg-amber-50 border-amber-100';
      default:
        return 'text-emerald-700 bg-emerald-50 border-emerald-100';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'text-emerald-700 bg-emerald-50 border-emerald-100';
      case 'IN_PROGRESS':
        return 'text-indigo-700 bg-indigo-50 border-indigo-100';
      case 'DELAYED':
        return 'text-rose-700 bg-rose-50 border-rose-100';
      case 'ON_HOLD':
        return 'text-slate-605 bg-slate-50 border-slate-200';
      default:
        return 'text-amber-700 bg-amber-50 border-amber-100';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header Cards */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-heading font-extrabold text-slate-800">My Workspace</h2>
          <p className="text-xs text-slate-550">Record your schedules, update status logs, and submit proofs.</p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 hover:-translate-y-0.5 active:translate-y-0 shadow-lg shadow-indigo-600/10 transition-all flex items-center gap-2 cursor-pointer"
        >
          <Plus size={16} /> Log Daily Task
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 size={36} className="animate-spin text-indigo-500" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Tasks List Area */}
          <div className="lg:col-span-2 space-y-8">
            {/* Today's Tasks */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <Calendar size={16} className="text-indigo-600" />
                <h3 className="font-heading font-bold text-slate-800 text-sm">Today's Tasks</h3>
                <span className="ml-auto rounded-full bg-slate-50 px-2.5 py-0.5 text-xs text-slate-600 border border-slate-200">
                  {todayTasks.length}
                </span>
              </div>

              {todayTasks.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50">
                  <p className="text-xs text-slate-500">No tasks logged for today yet. Use the 'Log Daily Task' button above to get started.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {todayTasks.map((t) => (
                    <div
                      key={t.id}
                      className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-slate-300 transition-all shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-bold text-indigo-600 tracking-wider uppercase bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                            {t.project?.name}
                          </span>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${getPriorityColor(t.priority)}`}>
                            {t.priority}
                          </span>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${getStatusColor(t.status)}`}>
                            {t.status.replace('_', ' ')}
                          </span>
                        </div>
                        <h4 className="text-sm font-semibold text-slate-805">{t.description}</h4>
                        {t.changesGivenBy && (
                          <p className="text-xs text-slate-550">
                            <span className="text-slate-700 font-medium">Changes given by:</span> {t.changesGivenBy} — {t.changesSummary}
                          </p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-slate-500 mt-2">
                          <span className="flex items-center gap-1">
                            <Clock size={12} /> {t.startTime}
                          </span>
                          <span>
                            Expected: {new Date(t.expectedCompletionDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => {
                            setSelectedTask(t);
                            setUpdateStatus(t.status);
                            setUpdateRemarks(t.updates?.[0]?.remarks || '');
                            setUpdateDelayReason(t.delayReason || '');
                          }}
                          className="w-full sm:w-auto rounded-xl bg-slate-100 border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 hover:text-slate-800 transition-colors cursor-pointer"
                        >
                          Update Status
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Overdue/Carry Over Tasks */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <AlertTriangle size={16} className="text-amber-600" />
                <h3 className="font-heading font-bold text-slate-800 text-sm">Incomplete Tasks (Overdue)</h3>
                <span className="ml-auto rounded-full bg-slate-50 px-2.5 py-0.5 text-xs text-slate-600 border border-slate-200">
                  {carryOverTasks.length}
                </span>
              </div>

              {carryOverTasks.length === 0 ? (
                <div className="p-6 text-center rounded-2xl border border-slate-200 bg-slate-50/50 text-xs text-slate-500">
                  Great job! You have no outstanding overdue tasks.
                </div>
              ) : (
                <div className="space-y-4">
                  {carryOverTasks.map((t) => (
                    <div
                      key={t.id}
                      className="bg-white rounded-2xl p-5 border border-amber-200 hover:border-slate-300 transition-all shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-bold text-indigo-600 uppercase">{t.project?.name}</span>
                          <span className="text-[9px] text-slate-500">
                            Logged on: {new Date(t.date).toLocaleDateString()}
                          </span>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${getStatusColor(t.status)}`}>
                            {t.status}
                          </span>
                        </div>
                        <h4 className="text-sm font-semibold text-slate-800">{t.description}</h4>
                      </div>

                      <div className="shrink-0">
                        <button
                          onClick={() => {
                            setSelectedTask(t);
                            setUpdateStatus(t.status);
                            setUpdateRemarks(t.updates?.[0]?.remarks || '');
                            setUpdateDelayReason(t.delayReason || '');
                          }}
                          className="rounded-xl bg-slate-100 border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 hover:text-slate-800 transition-colors cursor-pointer"
                        >
                          Update Status
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Quick Metrics sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 shadow-sm">
              <h3 className="font-heading font-bold text-slate-805 text-slate-800 text-sm">Performance Stats</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Tasks Completed</div>
                  <div className="text-xl font-heading font-extrabold text-indigo-600 mt-1">
                    {tasks.filter((t) => t.status === 'COMPLETED').length}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Total Logged</div>
                  <div className="text-xl font-heading font-extrabold text-slate-800 mt-1">{tasks.length}</div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <div className="text-xs text-slate-600 font-medium">Daily Completion Rate</div>
                <div className="flex items-center gap-3 mt-1.5">
                  <div className="h-2 bg-slate-100 rounded-full flex-1 overflow-hidden">
                    <div
                      className="h-full bg-indigo-650 rounded-full"
                      style={{
                        width: `${
                          tasks.length > 0
                            ? (tasks.filter((t) => t.status === 'COMPLETED').length / tasks.length) * 100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-800">
                    {tasks.length > 0
                      ? Math.round(
                          (tasks.filter((t) => t.status === 'COMPLETED').length / tasks.length) * 100
                        )
                      : 0}
                    %
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 shadow-sm">
              <h3 className="font-heading font-bold text-slate-800 text-sm">Leave Calendar</h3>
              <p className="text-xs text-slate-550">Need time off? Quick apply via leaves tab.</p>
              <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Leaves taken this year</span>
                <span className="font-bold text-slate-800">0 Days</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE TASK DRAWER/DIALOG MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <h3 className="font-heading text-lg font-bold text-slate-800 mb-4">Log Daily Task</h3>
            
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Start Time
                  </label>
                  <input
                    type="text"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    placeholder="e.g. 09:30 AM"
                    required
                    className="block w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Expected Completion Date & Time
                  </label>
                  <input
                    type="datetime-local"
                    value={expectedEnd}
                    onChange={(e) => setExpectedEnd(e.target.value)}
                    required
                    className="block w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Select Project
                </label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  required
                  className="block w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                >
                  <option value="">Choose project...</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-505 uppercase tracking-wider mb-1.5">
                  Task Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What will you work on?"
                  required
                  className="block w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 min-h-20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Priority
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="block w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Changes Given By
                  </label>
                  <input
                    type="text"
                    value={changesGivenBy}
                    onChange={(e) => setChangesGivenBy(e.target.value)}
                    placeholder="e.g. Mane Sir (optional)"
                    className="block w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              {changesGivenBy && (
                <div>
                  <label className="block text-xs font-bold text-slate-505 uppercase tracking-wider mb-1.5">
                    Changes Summary
                  </label>
                  <textarea
                    value={changesSummary}
                    onChange={(e) => setChangesSummary(e.target.value)}
                    placeholder="Summary of changes given..."
                    className="block w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Internal Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any additional notes..."
                  className="block w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl bg-slate-100 border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-indigo-650 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-550 transition-colors flex items-center gap-2 cursor-pointer shadow-md shadow-indigo-600/10"
                >
                  {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Log Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPDATE STATUS MODAL */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="font-heading text-lg font-bold text-slate-800 mb-1">Update Task Status</h3>
            <p className="text-xs text-slate-500 mb-4 truncate">{selectedTask.description}</p>

            <form onSubmit={handleUpdateTaskSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Status
                </label>
                <select
                  value={updateStatus}
                  onChange={(e) => setUpdateStatus(e.target.value)}
                  className="block w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                >
                  <option value="PENDING">PENDING</option>
                  <option value="IN_PROGRESS">IN PROGRESS</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="DELAYED">DELAYED</option>
                  <option value="ON_HOLD">ON HOLD</option>
                </select>
              </div>

              {updateStatus === 'DELAYED' && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Delay Reason
                  </label>
                  <textarea
                    value={updateDelayReason}
                    onChange={(e) => setUpdateDelayReason(e.target.value)}
                    placeholder="Provide justification for the delay..."
                    required
                    className="block w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Remarks / Work done summary
                </label>
                <textarea
                  value={updateRemarks}
                  onChange={(e) => setUpdateRemarks(e.target.value)}
                  placeholder="Summary of work completed..."
                  required
                  className="block w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Upload Screenshot Proof (Optional)
                </label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-24 border border-slate-200 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload size={18} className="text-slate-500 mb-1" />
                      <p className="text-[10px] text-slate-500">
                        {uploadFile ? (
                          <span className="text-indigo-650 font-semibold">{uploadFile.name}</span>
                        ) : (
                          'Click to upload screenshot'
                        )}
                      </p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => e.target.files && setUploadFile(e.target.files[0])}
                    />
                  </label>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setSelectedTask(null)}
                  className="rounded-xl bg-slate-100 border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingTask}
                  className="rounded-xl bg-indigo-650 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-550 transition-colors flex items-center gap-2 cursor-pointer shadow-md shadow-indigo-600/10"
                >
                  {isUpdatingTask ? <Loader2 size={14} className="animate-spin" /> : <UserCheck size={14} />} Save Updates
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
