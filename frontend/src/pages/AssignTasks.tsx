import React, { useEffect, useState } from 'react';
import { tasksApi, projectsApi, usersApi } from '../services/api';
import { Plus, User, Search, Edit2, Trash2, Calendar, Loader2, CheckSquare, X } from 'lucide-react';
import { ErrorBoundary } from '../components/ErrorBoundary';

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
  const [extraForTaskId, setExtraForTaskId] = useState<number | null>(null);
  const [employeeId, setEmployeeId] = useState('');
  const [startTime, setStartTime] = useState('09:00 AM');
  const [expectedEndDate, setExpectedEndDate] = useState('');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Multi-Project logic
  const [selectedProjects, setSelectedProjects] = useState<number[]>([]);
  const [projectDetails, setProjectDetails] = useState<Record<number, { taskDescription: string, changesGivenBy: string, changesSummary: string, priority: string, notes: string }>>({});

  // Edit Task Form State
  const [editingTask, setEditingTask] = useState<any | null>(null);
  const [editEmployeeId, setEditEmployeeId] = useState('');
  const [editStartTime, setEditStartTime] = useState('');
  const [editExpectedEndDate, setEditExpectedEndDate] = useState('');
  const [editReviewProjects, setEditReviewProjects] = useState<Record<number, any>>({});
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

    const handleSync = () => {
      loadData();
    };

    window.addEventListener('sync-tasks', handleSync);
    window.addEventListener('sync-projects', handleSync);
    window.addEventListener('sync-users', handleSync);

    return () => {
      window.removeEventListener('sync-tasks', handleSync);
      window.removeEventListener('sync-projects', handleSync);
      window.removeEventListener('sync-users', handleSync);
    };
  }, [filterEmployee, filterProject, filterStatus, searchQuery]);

  const handleProjectToggle = (projectId: number) => {
    setSelectedProjects(prev => {
      if (prev.includes(projectId)) {
        const next = prev.filter(id => id !== projectId);
        const newDetails = { ...projectDetails };
        delete newDetails[projectId];
        setProjectDetails(newDetails);
        return next;
      } else {
        setProjectDetails(prev => ({
          ...prev,
          [projectId]: { taskDescription: '', changesGivenBy: '', changesSummary: '', priority: 'MEDIUM', notes: '' }
        }));
        return [...prev, projectId];
      }
    });
  };

  const handleProjectDetailChange = (projectId: number, field: string, value: string) => {
    setProjectDetails(prev => ({
      ...prev,
      [projectId]: { ...prev[projectId], [field]: value }
    }));
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || selectedProjects.length === 0 || !expectedEndDate) return;
    
    for (const pid of selectedProjects) {
      if (!projectDetails[pid]?.taskDescription) {
        alert('Please provide a task description for all selected projects.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const projectsPayload = selectedProjects.map(pid => ({
        projectId: pid,
        taskDescription: projectDetails[pid].taskDescription,
        changesGivenBy: projectDetails[pid].changesGivenBy || undefined,
        changesSummary: projectDetails[pid].changesSummary || undefined,
        priority: projectDetails[pid].priority,
        notes: projectDetails[pid].notes || undefined,
        status: 'PENDING',
      }));

      if (extraForTaskId) {
        await tasksApi.update(extraForTaskId, {
          projects: projectsPayload,
        });
      } else {
        await tasksApi.create({
          employeeId: parseInt(employeeId),
          startDate: new Date(startDate).toISOString(),
          startTime,
          expectedEndDate: new Date(expectedEndDate).toISOString(),
          projects: projectsPayload,
        });
      }

      // Clear Form
      setExtraForTaskId(null);
      setEmployeeId('');
      setSelectedProjects([]);
      setProjectDetails({});
      setStartTime('09:00 AM');
      setExpectedEndDate('');
      setShowCreateModal(false);
      await loadData();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || err.message || 'Failed to assign task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddExtraTaskInit = (task: any) => {
    setExtraForTaskId(task.id);
    setEmployeeId(task.employeeId.toString());
    setSelectedProjects([]);
    setProjectDetails({});
    setStartTime(task.startTime);
    try {
      const expDate = task.expectedEndDate ? new Date(task.expectedEndDate) : new Date();
      if (isNaN(expDate.getTime())) throw new Error("Invalid date");
      const tzoffset = expDate.getTimezoneOffset() * 60000;
      const localISODate = new Date(expDate.getTime() - tzoffset).toISOString().split('T')[0];
      setExpectedEndDate(localISODate);
    } catch (e) {
      setExpectedEndDate(new Date().toISOString().split('T')[0]);
    }
    setShowCreateModal(true);
  };

  const handleEditInit = (task: any) => {
    setEditingTask(task);
    setEditEmployeeId(task.employeeId.toString());
    setEditStartTime(task.startTime || '');
    
    try {
      const expDate = task.expectedEndDate ? new Date(task.expectedEndDate) : new Date();
      if (isNaN(expDate.getTime())) throw new Error("Invalid date");
      const tzoffset = expDate.getTimezoneOffset() * 60000;
      const localISODate = new Date(expDate.getTime() - tzoffset).toISOString().split('T')[0];
      setEditExpectedEndDate(localISODate);
    } catch (e) {
      setEditExpectedEndDate(new Date().toISOString().split('T')[0]);
    }

    const reviews: Record<number, any> = {};
    if (task.projects) {
      task.projects.forEach((p: any) => {
        reviews[p.id] = {
          id: p.id,
          projectId: p.projectId,
          taskDescription: p.taskDescription || '',
          changesGivenBy: p.changesGivenBy || '',
          changesSummary: p.changesSummary || '',
          priority: p.priority || 'MEDIUM',
          status: p.status || 'PENDING',
          delayReason: p.delayReason || '',
          blockedReason: p.blockedReason || '',
          completedWorkDescription: p.completedWorkDescription || '',
          completionPercentage: p.completionPercentage || 0,
          notes: p.notes || '',
        };
      });
    }
    setEditReviewProjects(reviews);
  };

  const handleEditReviewChange = (taskProjectId: number, field: string, value: any) => {
    setEditReviewProjects(prev => ({
      ...prev,
      [taskProjectId]: { ...prev[taskProjectId], [field]: value }
    }));
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !editEmployeeId || !editExpectedEndDate) return;
    setIsUpdating(true);
    try {
      const projectsPayload = Object.values(editReviewProjects).map(r => ({
        id: r.id,
        projectId: r.projectId,
        taskDescription: r.taskDescription,
        changesGivenBy: r.changesGivenBy || undefined,
        changesSummary: r.changesSummary || undefined,
        priority: r.priority,
        status: r.status,
        delayReason: r.delayReason || undefined,
        blockedReason: r.blockedReason || undefined,
        completedWorkDescription: r.completedWorkDescription || undefined,
        completionPercentage: Number(r.completionPercentage),
        notes: r.notes || undefined,
      }));

      await tasksApi.update(editingTask.id, {
        employeeId: parseInt(editEmployeeId),
        startTime: editStartTime,
        expectedEndDate: new Date(editExpectedEndDate).toISOString(),
        projects: projectsPayload,
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
    if (!window.confirm('Are you sure you want to delete this daily task?')) return;
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
    <ErrorBoundary>
      <div className="space-y-8 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-heading font-extrabold text-slate-800 font-bold">Delegate Tasks</h2>
          <p className="text-xs text-slate-550">Assign schedules directly, edit records, and reassign resources.</p>
        </div>

        <button
          onClick={() => {
            const todayStr = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];
            setExtraForTaskId(null);
            setEmployeeId('');
            setStartDate(todayStr);
            setExpectedEndDate(todayStr);
            setShowCreateModal(true);
          }}
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
            <option value="BLOCKED">BLOCKED</option>
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
        <div className="grid grid-cols-1 gap-6">
          {tasks.map((t) => (
            <div
              key={t.id}
              className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between gap-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-1.5 text-slate-800 text-sm font-semibold">
                  <User size={16} className="text-indigo-650" /> {t.employee?.name}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleAddExtraTaskInit(t)}
                    className="p-1.5 rounded-lg text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 transition-colors cursor-pointer flex items-center gap-1"
                    title="Add Extra Task"
                  >
                    <Plus size={13} /> <span className="text-[10px] font-bold">Extra</span>
                  </button>
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

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {t.projects?.map((p: any) => (
                  <div key={p.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded border text-indigo-700 bg-indigo-50 border-indigo-100">
                        {p.project?.name}
                      </span>
                      <div className="flex gap-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${getPriorityColor(p.priority)}`}>
                          {p.priority}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded border text-slate-600 bg-white">
                          {p.status}
                        </span>
                      </div>
                    </div>
                    <h4 className="text-sm font-bold text-slate-800 mb-2">{p.taskDescription}</h4>
                    {p.delayReason && (
                      <div className="mt-2 p-2 rounded-lg bg-rose-50 border border-rose-100 text-xs text-rose-700">
                        <strong>Delay:</strong> {p.delayReason}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-end text-xs text-slate-500 mt-2">
                <span className="flex items-center gap-1">
                  <Calendar size={12} /> {new Date(t.startDate).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 sticky top-0 bg-white z-10 pb-4 border-b border-slate-100">
              <h3 className="font-heading text-xl font-bold text-slate-800">Assign New Task</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Assignee (Employee) *
                  </label>
                  <select
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    required
                    className="block w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
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
                    Start Date *
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    disabled
                    className="block w-full rounded-xl bg-slate-100 border border-slate-200 px-3 py-2 text-sm text-slate-500 cursor-not-allowed opacity-80"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Start Time *
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    required
                    className="block w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Expected End Date *
                  </label>
                  <input
                    type="date"
                    value={expectedEndDate}
                    min={startDate}
                    onChange={(e) => setExpectedEndDate(e.target.value)}
                    required
                    className="block w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div className="border-t border-slate-200 pt-6">
                <label className="block text-sm font-bold text-slate-800 mb-3">Select Projects *</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {projects.map(p => (
                    <label key={p.id} className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-colors ${selectedProjects.includes(p.id) ? 'border-indigo-500 bg-indigo-50 text-indigo-800 shadow-sm' : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600'}`}>
                      <input
                        type="checkbox"
                        checked={selectedProjects.includes(p.id)}
                        onChange={() => handleProjectToggle(p.id)}
                        className="w-4 h-4 text-indigo-600 bg-white border-slate-300 rounded focus:ring-indigo-500"
                      />
                      <span className="text-sm font-bold">{p.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {selectedProjects.length > 0 && (
                <div className="space-y-6 pt-4 border-t border-slate-200">
                  <h4 className="text-sm font-bold text-slate-800">Project Details</h4>
                  {selectedProjects.map(pid => {
                    const project = projects.find(p => p.id === pid);
                    return (
                      <div key={pid} className="p-4 rounded-xl border border-indigo-100 bg-slate-50 shadow-sm space-y-4">
                        <div className="flex items-center gap-2 border-b border-indigo-50 pb-2 mb-2">
                          <CheckSquare className="text-indigo-600" size={16} />
                          <h5 className="font-bold text-indigo-900">{project?.name}</h5>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Task Description *</label>
                          <textarea 
                            value={projectDetails[pid]?.taskDescription || ''} 
                            onChange={(e) => handleProjectDetailChange(pid, 'taskDescription', e.target.value)} 
                            required 
                            placeholder={`What needs to be done for ${project?.name}?`} 
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 min-h-[60px]" 
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Priority</label>
                            <select 
                              value={projectDetails[pid]?.priority || 'MEDIUM'} 
                              onChange={(e) => handleProjectDetailChange(pid, 'priority', e.target.value)} 
                              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20"
                            >
                              <option value="LOW">LOW</option>
                              <option value="MEDIUM">MEDIUM</option>
                              <option value="HIGH">HIGH</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Changes Given By</label>
                            <input 
                              type="text" 
                              value={projectDetails[pid]?.changesGivenBy || ''} 
                              onChange={(e) => handleProjectDetailChange(pid, 'changesGivenBy', e.target.value)} 
                              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20" 
                            />
                          </div>
                        </div>
                        <div className="mt-4">
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Admin Instructions (Changes Summary)</label>
                          <textarea 
                            value={projectDetails[pid]?.changesSummary || ''} 
                            onChange={(e) => handleProjectDetailChange(pid, 'changesSummary', e.target.value)} 
                            placeholder="Detail any changes, instructions, or feedback for the employee here..."
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 min-h-[60px]" 
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex gap-3 justify-end pt-3 border-t border-slate-200 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-xl bg-slate-100 border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-205 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || selectedProjects.length === 0}
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
          <div className="w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 sticky top-0 bg-white z-10 pb-4 border-b border-slate-100">
              <h3 className="font-heading text-lg font-bold text-slate-800">Edit Task Assignment</h3>
              <button onClick={() => setEditingTask(null)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Assignee
                  </label>
                  <select
                    value={editEmployeeId}
                    onChange={(e) => setEditEmployeeId(e.target.value)}
                    required
                    className="block w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-500"
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
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={editStartTime}
                    onChange={(e) => setEditStartTime(e.target.value)}
                    required
                    className="block w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Expected End Date
                  </label>
                  <input
                    type="date"
                    value={editExpectedEndDate}
                    onChange={(e) => setEditExpectedEndDate(e.target.value)}
                    required
                    className="block w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-200">
                <h4 className="text-sm font-bold text-slate-800">Project Specifics</h4>
                {editingTask.projects?.map((p: any) => {
                  const rev = editReviewProjects[p.id];
                  if (!rev) return null;
                  return (
                    <div key={p.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded border text-indigo-700 bg-indigo-50 border-indigo-100">
                          {p.project?.name}
                        </span>
                      </div>
                      
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Task Description</label>
                        <textarea
                          value={rev.taskDescription}
                          onChange={(e) => handleEditReviewChange(p.id, 'taskDescription', e.target.value)}
                          required
                          className="block w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm text-slate-800 min-h-[60px]"
                        />
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Priority</label>
                          <select
                            value={rev.priority}
                            onChange={(e) => handleEditReviewChange(p.id, 'priority', e.target.value)}
                            className="block w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm text-slate-800"
                          >
                            <option value="LOW">LOW</option>
                            <option value="MEDIUM">MEDIUM</option>
                            <option value="HIGH">HIGH</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Status</label>
                          <select
                            value={rev.status}
                            onChange={(e) => handleEditReviewChange(p.id, 'status', e.target.value)}
                            className="block w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm text-slate-800"
                          >
                            <option value="PENDING">PENDING</option>
                            <option value="IN_PROGRESS">IN PROGRESS</option>
                            <option value="COMPLETED">COMPLETED</option>
                            <option value="DELAYED">DELAYED</option>
                            <option value="ON_HOLD">ON HOLD</option>
                            <option value="BLOCKED">BLOCKED</option>
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Changes Given By</label>
                          <input
                            type="text"
                            value={rev.changesGivenBy || ''}
                            onChange={(e) => handleEditReviewChange(p.id, 'changesGivenBy', e.target.value)}
                            className="block w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm text-slate-800"
                          />
                        </div>
                      </div>
                      <div className="mt-4">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Admin Instructions (Changes Summary)</label>
                        <textarea
                          value={rev.changesSummary || ''}
                          onChange={(e) => handleEditReviewChange(p.id, 'changesSummary', e.target.value)}
                          placeholder="Detail any changes, instructions, or feedback for the employee here..."
                          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 min-h-[60px]"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-3 justify-end pt-3 border-t border-slate-200">
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
    </ErrorBoundary>
  );
};
