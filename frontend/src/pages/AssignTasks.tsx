import React, { useEffect, useState } from 'react';
import { tasksApi, projectsApi, usersApi } from '../services/api';
import { Plus, User, Search, Edit2, Trash2, Calendar, Loader2 } from 'lucide-react';

export const AssignTasks: React.FC = () => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [filterEmployee, setFilterEmployee] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Create Task Form State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [employeeId, setEmployeeId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [startTime, setStartTime] = useState('09:00 AM');
  const [expectedEnd, setExpectedEnd] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [changesGivenBy, setChangesGivenBy] = useState('');
  const [changesSummary, setChangesSummary] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Task Form State
  const [editingTask, setEditingTask] = useState<any | null>(null);
  const [editEmployeeId, setEditEmployeeId] = useState('');
  const [editProjectId, setEditProjectId] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editExpectedEnd, setEditExpectedEnd] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPriority, setEditPriority] = useState('MEDIUM');
  const [editChangesGivenBy, setEditChangesGivenBy] = useState('');
  const [editChangesSummary, setEditChangesSummary] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [tasksRes, projectsRes, usersRes] = await Promise.all([
        tasksApi.list({
          employeeId: filterEmployee || undefined,
          projectId: filterProject || undefined,
          status: filterStatus || undefined,
          search: searchQuery || undefined,
        }),
        projectsApi.list(),
        usersApi.list({ role: 'EMPLOYEE' }),
      ]);
      setTasks(tasksRes.data);
      setProjects(projectsRes.data.filter((p: any) => !p.isArchived));
      setEmployees(usersRes.data.filter((u: any) => u.role === 'EMPLOYEE'));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterEmployee, filterProject, filterStatus, searchQuery]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !projectId || !description || !expectedEnd) return;
    setIsSubmitting(true);
    try {
      await tasksApi.create({
        employeeId: parseInt(employeeId),
        projectId: parseInt(projectId),
        startTime,
        expectedCompletionDate: new Date(expectedEnd).toISOString(),
        description,
        priority,
        changesGivenBy: changesGivenBy || undefined,
        changesSummary: changesSummary || undefined,
        notes: notes || undefined,
      });

      // Clear Form
      setEmployeeId('');
      setProjectId('');
      setStartTime('09:00 AM');
      setExpectedEnd('');
      setDescription('');
      setPriority('MEDIUM');
      setChangesGivenBy('');
      setChangesSummary('');
      setNotes('');
      setShowCreateModal(false);
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditInit = (task: any) => {
    setEditingTask(task);
    setEditEmployeeId(task.employeeId.toString());
    setEditProjectId(task.projectId.toString());
    setEditStartTime(task.startTime);
    // Format to datetime-local expected string
    const expDate = new Date(task.expectedCompletionDate);
    const tzoffset = expDate.getTimezoneOffset() * 60000; //offset in milliseconds
    const localISOTime = new Date(expDate.getTime() - tzoffset).toISOString().slice(0, 16);
    setEditExpectedEnd(localISOTime);
    setEditDescription(task.description);
    setEditPriority(task.priority);
    setEditChangesGivenBy(task.changesGivenBy || '');
    setEditChangesSummary(task.changesSummary || '');
    setEditNotes(task.notes || '');
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !editEmployeeId || !editProjectId || !editDescription || !editExpectedEnd) return;
    setIsUpdating(true);
    try {
      await tasksApi.update(editingTask.id, {
        employeeId: parseInt(editEmployeeId),
        projectId: parseInt(editProjectId),
        startTime: editStartTime,
        expectedCompletionDate: new Date(editExpectedEnd).toISOString(),
        description: editDescription,
        priority: editPriority,
        changesGivenBy: editChangesGivenBy || undefined,
        changesSummary: editChangesSummary || undefined,
        notes: editNotes || undefined,
      });
      setEditingTask(null);
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await tasksApi.delete(id);
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

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

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-heading font-extrabold text-slate-800 font-bold">Delegate Tasks</h2>
          <p className="text-xs text-slate-550">Assign schedules directly, edit records, and reassign resources.</p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 hover:-translate-y-0.5 active:translate-y-0 shadow-lg shadow-indigo-600/10 transition-all flex items-center gap-2 cursor-pointer"
        >
          <Plus size={16} /> Assign Task
        </button>
      </div>

      {/* Filters Box */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Search size={16} />
          </span>
          <input
            type="text"
            placeholder="Search description/assignee..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full rounded-xl bg-white border border-slate-200 py-2 pl-9 pr-4 text-xs text-slate-805 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
          />
        </div>

        <div className="flex flex-wrap gap-3 w-full md:w-auto items-center">
          <select
            value={filterEmployee}
            onChange={(e) => setFilterEmployee(e.target.value)}
            className="rounded-xl bg-white border border-slate-200 px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Employees</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>

          <select
            value={filterProject}
            onChange={(e) => setFilterProject(e.target.value)}
            className="rounded-xl bg-white border border-slate-200 px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-xl bg-white border border-slate-200 px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">PENDING</option>
            <option value="IN_PROGRESS">IN PROGRESS</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="DELAYED">DELAYED</option>
            <option value="ON_HOLD">ON HOLD</option>
          </select>
        </div>
      </div>

      {/* Task List Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 size={36} className="animate-spin text-indigo-500" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-slate-200 text-xs text-slate-500">
          No tasks found matching your filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tasks.map((t) => (
            <div
              key={t.id}
              className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-slate-300 transition-all shadow-sm flex flex-col justify-between gap-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold">
                    <User size={13} className="text-indigo-650" /> {t.employee?.name}
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${getPriorityColor(t.priority)}`}>
                    {t.priority}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-slate-800">{t.description}</h4>

                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] text-indigo-600 bg-indigo-50 px-2 py-0.5 border border-indigo-100 rounded">
                    {t.project?.name}
                  </span>
                  <span className="text-[10px] text-slate-600 bg-slate-50 px-2 py-0.5 border border-slate-200 rounded">
                    {t.status}
                  </span>
                </div>

                {t.delayReason && (
                  <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-100 text-xs text-rose-700">
                    <strong>Delay Reason:</strong> {t.delayReason}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Calendar size={12} /> {new Date(t.date).toLocaleDateString()}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleEditInit(t)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer"
                    title="Edit Task"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    onClick={() => handleDelete(t.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Delete Task"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <h3 className="font-heading text-lg font-bold text-slate-800 mb-4">Assign Task</h3>
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Assignee (Employee)
                  </label>
                  <select
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    required
                    className="block w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                  >
                    <option value="">Select Assignee...</option>
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Project
                  </label>
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    required
                    className="block w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                  >
                    <option value="">Select Project...</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Start Time
                  </label>
                  <input
                    type="text"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    placeholder="e.g. 09:00 AM"
                    required
                    className="block w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Expected Completion
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
                  Task Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Task specifications..."
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
                    placeholder="e.g. Abhijeet Sir (optional)"
                    className="block w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              {changesGivenBy && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Changes Summary
                  </label>
                  <textarea
                    value={changesSummary}
                    onChange={(e) => setChangesSummary(e.target.value)}
                    placeholder="Brief changes details..."
                    className="block w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                  />
                </div>
              )}

              <div className="flex gap-3 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl bg-slate-100 border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-205 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-505 transition-colors flex items-center gap-2 cursor-pointer shadow-md shadow-indigo-600/10"
                >
                  {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : 'Assign Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <h3 className="font-heading text-lg font-bold text-slate-800 mb-4">Edit Task Assignment</h3>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Assignee (Employee)
                  </label>
                  <select
                    value={editEmployeeId}
                    onChange={(e) => setEditEmployeeId(e.target.value)}
                    required
                    className="block w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                  >
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Project
                  </label>
                  <select
                    value={editProjectId}
                    onChange={(e) => setEditProjectId(e.target.value)}
                    required
                    className="block w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Start Time
                  </label>
                  <input
                    type="text"
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
                    required
                    className="block w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Expected Completion
                  </label>
                  <input
                    type="datetime-local"
                    value={editExpectedEnd}
                    onChange={(e) => setEditExpectedEnd(e.target.value)}
                    required
                    className="block w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Task Description
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  required
                  className="block w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm text-slate-800 min-h-20 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Priority
                  </label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value)}
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
                    value={editChangesGivenBy}
                    onChange={(e) => setEditChangesGivenBy(e.target.value)}
                    placeholder="e.g. Mane Sir"
                    className="block w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Changes Summary
                </label>
                <textarea
                  value={editChangesSummary}
                  onChange={(e) => setEditChangesSummary(e.target.value)}
                  placeholder="Details..."
                  className="block w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                />
              </div>

              <div className="flex gap-3 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="rounded-xl bg-slate-100 border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-205 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-505 transition-colors flex items-center gap-2 cursor-pointer shadow-md shadow-indigo-600/10"
                >
                  {isUpdating ? <Loader2 size={14} className="animate-spin" /> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
