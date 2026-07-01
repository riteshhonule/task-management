import React, { useEffect, useState } from 'react';
import { tasksApi, projectsApi, usersApi, uploadsApi } from '../services/api';
import {
  ClipboardList, Plus, Loader2, X, Send, AlertCircle, Search, RefreshCw
} from 'lucide-react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useAuth } from '../context/AuthContext';
import { EditTaskModal } from '../components/EditTaskModal';
import { TimePicker } from '../components/TimePicker';
import { parseTimeToMinutes } from '../components/EditTaskModal';
import { ExpandableText } from '../components/ExpandableText';

const JOB_ROLES = ['Frontend', 'Backend', 'Full Stack', 'Testing', 'UI/UX', 'DevOps', 'Other'];

const getLocalYYYYMMDD = (d?: Date | string | null) => {
  if (!d) d = new Date();
  const dateObj = new Date(d);
  if (isNaN(dateObj.getTime())) return '';
  const tzoffset = dateObj.getTimezoneOffset() * 60000;
  return new Date(dateObj.getTime() - tzoffset).toISOString().split('T')[0];
};




export const EmployeeAssignTask: React.FC = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editModalTask, setEditModalTask] = useState<any | null>(null);
  const [editModalInitialTab, setEditModalInitialTab] = useState<'details' | 'review' | 'approve' | 'history' | 'timeline' | undefined>(undefined);
  const [assignedByMeTasks, setAssignedByMeTasks] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const getPriorityColor = (prio: string) => {
    switch (prio) {
      case 'HIGH':
        return 'text-rose-700 bg-rose-50 border-rose-200';
      case 'MEDIUM':
        return 'text-amber-700 bg-amber-50 border-amber-200';
      default:
        return 'text-emerald-700 bg-emerald-50 border-emerald-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'IN_PROGRESS': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'PENDING_REVIEW': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'REVIEW_PENDING': return 'bg-violet-50 text-violet-700 border-violet-200';
      case 'DELAYED': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'BLOCKED': return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'ON_HOLD': return 'bg-slate-100 text-slate-600 border-slate-300';
      default: return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'IN_PROGRESS': return 'IN PROGRESS';
      case 'PENDING_REVIEW': return 'IN PROGRESS';
      case 'REVIEW_PENDING': return 'REVIEW PENDING';
      case 'COMPLETED': return 'COMPLETED';
      case 'DELAYED': return 'DELAYED';
      case 'BLOCKED': return 'BLOCKED';
      case 'ON_HOLD': return 'ON HOLD';
      case 'PENDING': return 'PENDING';
      default: return (status || '').replace(/_/g, ' ');
    }
  };

  const getTaskTypeBadge = (type: string) => {
    switch (type) {
      case 'ADMIN':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">ADMIN</span>;
      case 'EMPLOYEE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">EMPLOYEE</span>;
      case 'SELF':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-100">SELF</span>;
      case 'CARRY_FORWARD':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-100">CARRY FORWARD</span>;
      case 'LEAVE':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700 border border-red-100">LEAVE</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-50 text-slate-700 border border-slate-100">{type || 'SELF'}</span>;
    }
  };

  const handleOpenEditModal = (row: any, initialTab?: 'details' | 'review' | 'approve' | 'history' | 'timeline') => {
    setEditModalInitialTab(initialTab);
    setEditModalTask({
      ...row,
      taskId: row.taskId,
      taskProjectId: row.id,
      expectedEndDate: row.expectedEndDate || row.task?.expectedEndDate,
      startDate: row.task?.startDate,
      employeeName: row.assignedTo?.name || row.task?.employee?.name,
      submissions: row.submissions || [],
      timeline: row.timeline || [],
    });
  };

  // Form State
  const [assignToId, setAssignToId] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [jobRole, setJobRole] = useState('Frontend');
  const [customJobRole, setCustomJobRole] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [mandatoryProof, setMandatoryProof] = useState(false);
  const [startTime, setStartTime] = useState('10:00 AM');
  const [endTime, setEndTime] = useState('06:00 PM');
  const [startDate, setStartDate] = useState(() => getLocalYYYYMMDD());
  const [expectedDate, setExpectedDate] = useState(() => getLocalYYYYMMDD());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const fetchData = async () => {
    try {
      setLoading(true);
      const [projRes, usersRes, sectionsRes] = await Promise.all([
        projectsApi.list(),
        usersApi.listEmployees(),
        tasksApi.getMySections(),
      ]);
      setProjects(projRes.data.filter((p: any) => !p.isArchived));
      setEmployees(usersRes.data.filter((e: any) => e.id !== user?.id && e.role === 'EMPLOYEE'));
      setAssignedByMeTasks(sectionsRes.data?.assignedByMe || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [user?.id]);

  const resetForm = () => {
    setAssignToId(''); setSelectedProjectId('');
    setTaskDescription(''); setJobRole('Frontend'); setCustomJobRole('');
    setPriority('MEDIUM'); setMandatoryProof(false);
    setStartTime('10:00 AM'); setEndTime('06:00 PM');
    setStartDate(getLocalYYYYMMDD());
    setExpectedDate(getLocalYYYYMMDD()); setErrors({});
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!assignToId) errs.assignToId = 'Please select an employee.';
    if (!selectedProjectId) errs.selectedProjectId = 'Please select a project.';
    if (!taskDescription.trim()) errs.taskDescription = 'Task description is required.';
    if (jobRole === 'Other' && !customJobRole.trim()) errs.customJobRole = 'Please specify the role.';
    if (!startDate) errs.startDate = 'Start date is required.';
    if (!expectedDate) errs.expectedDate = 'Expected completion date is required.';
    if (startDate && expectedDate && new Date(expectedDate) < new Date(startDate)) {
      errs.expectedDate = 'Expected completion date cannot be before start date.';
    }
    if (startTime && endTime) {
      const startMin = parseTimeToMinutes(startTime);
      const endMin = parseTimeToMinutes(endTime);
      if (startMin !== null && endMin !== null) {
        if (endMin <= startMin) errs.endTime = 'End time must be after start time.';
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      await tasksApi.assignEmployeeTask({
        employeeId: parseInt(assignToId),
        startDate: new Date(startDate).toISOString(),
        startTime,
        expectedEndDate: new Date(expectedDate).toISOString(),
        projects: [{
          projectId: parseInt(selectedProjectId),
          taskDescription: taskDescription.trim(),
          priority,
          status: 'PENDING',
          jobRoleType: jobRole,
          customJobRole: jobRole === 'Other' ? customJobRole : undefined,
          startTime,
          endTime,
          proofRequired: mandatoryProof,
          expectedEndDate: new Date(expectedDate).toISOString(),
        }],
      });
      resetForm();
      setShowModal(false);
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to assign task');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Flatten tasks into rows for the table
  const tableRows = assignedByMeTasks.flatMap((task: any) =>
    (task.projects || []).map((p: any) => ({ ...p, taskId: task.id, task }))
  );

  const filteredRows = tableRows.filter(row => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      row.taskDescription?.toLowerCase().includes(q) ||
      row.project?.name?.toLowerCase().includes(q) ||
      row.assignedTo?.name?.toLowerCase().includes(q) ||
      row.status?.toLowerCase().includes(q)
    );
  });

  const sortedRows = React.useMemo(() => {
    return [...filteredRows].sort((a, b) => {
      const dateB = new Date(b.createdAt || b.task?.createdAt || b.task?.startDate || 0).getTime();
      const dateA = new Date(a.createdAt || a.task?.createdAt || a.task?.startDate || 0).getTime();
      return dateB - dateA;
    });
  }, [filteredRows]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-24">
        <Loader2 size={36} className="animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">

        {/* ─── Page Header ─────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-heading font-extrabold text-slate-800 flex items-center gap-2">
              <ClipboardList size={22} className="text-indigo-600" /> Assign Task
            </h2>
            <p className="text-xs text-slate-500 mt-1">Delegate tasks to team members. You become the reviewer.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchData}
              className="p-2.5 rounded-xl border border-slate-200 text-slate-500 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-colors"
              title="Refresh"
            >
              <RefreshCw size={16} />
            </button>
            <button
              onClick={() => { resetForm(); setShowModal(true); }}
              disabled={employees.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Plus size={16} /> Assign Task
            </button>
          </div>
        </div>

        {employees.length === 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
            <AlertCircle size={16} className="text-amber-600" />
            <p className="text-sm text-amber-800">No other employees available to assign tasks to.</p>
          </div>
        )}

        {/* ─── Assigned Tasks Table ─────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Table header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Tasks Assigned By Me</h3>
              <p className="text-xs text-slate-500 mt-0.5">{tableRows.length} task{tableRows.length !== 1 ? 's' : ''} assigned</p>
            </div>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search tasks..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400/20 w-56"
              />
            </div>
          </div>

          {sortedRows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                <ClipboardList size={24} className="text-slate-400" />
              </div>
              <p className="text-sm font-semibold text-slate-600 mb-1">
                {searchQuery ? 'No matching tasks found' : 'No tasks assigned yet'}
              </p>
              <p className="text-xs text-slate-400 mb-4">
                {searchQuery ? 'Try a different search term.' : 'Click "Assign Task" to delegate your first task.'}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => { resetForm(); setShowModal(true); }}
                  disabled={employees.length === 0}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 transition-all disabled:opacity-60"
                >
                  <Plus size={14} /> Assign Task
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-max">
                <thead className="sticky top-0 z-20 bg-purple-600 outline outline-1 outline-purple-700 shadow-sm">
                  <tr className="bg-purple-600 divide-x divide-purple-500">
                    <th className="md:sticky md:left-0 md:z-30 bg-purple-600 w-[100px] min-w-[100px] max-w-[100px] px-4 py-6 text-[13px] font-extrabold text-white uppercase tracking-wider md:outline md:outline-1 md:outline-purple-700 shadow-sm">Date</th>
                    <th className="px-4 py-6 text-[13px] font-extrabold text-white uppercase tracking-wider">Role</th>
                    <th className="px-4 py-6 text-[13px] font-extrabold text-white uppercase tracking-wider">Project</th>
                    <th className="px-4 py-6 text-[13px] font-extrabold text-white uppercase tracking-wider w-[250px]">Task</th>
                    <th className="px-4 py-6 text-[13px] font-extrabold text-white uppercase tracking-wider">Start Time</th>
                    <th className="px-4 py-6 text-[13px] font-extrabold text-white uppercase tracking-wider">End Time</th>
                    <th className="px-4 py-6 text-[13px] font-extrabold text-white uppercase tracking-wider">Task Type</th>
                    <th className="px-4 py-6 text-[13px] font-extrabold text-white uppercase tracking-wider">Assigned By</th>
                    <th className="px-4 py-6 text-[13px] font-extrabold text-white uppercase tracking-wider">Assigned To</th>
                    <th className="px-4 py-6 text-[13px] font-extrabold text-white uppercase tracking-wider">Proof Req</th>
                    <th className="px-4 py-6 text-[13px] font-extrabold text-white uppercase tracking-wider">Completion</th>
                    <th className="px-4 py-6 text-[13px] font-extrabold text-white uppercase tracking-wider">Expected End</th>
                    <th className="px-4 py-6 text-[13px] font-extrabold text-white uppercase tracking-wider">Delay (Y/N)</th>
                    <th className="px-4 py-6 text-[13px] font-extrabold text-white uppercase tracking-wider w-[200px]">Delay Reason</th>
                    <th className="px-4 py-6 text-[13px] font-extrabold text-white uppercase tracking-wider">Carry Forward Count</th>
                    <th className="px-4 py-6 text-[13px] font-extrabold text-white uppercase tracking-wider">Last Carry Forward Date</th>
                    <th className="px-4 py-6 text-[13px] font-extrabold text-white uppercase tracking-wider">Overdue Days</th>
                    <th className="px-4 py-6 text-[13px] font-extrabold text-white uppercase tracking-wider w-[250px]">Extra Note</th>
                    <th className="px-4 py-6 text-[13px] font-extrabold text-white uppercase tracking-wider w-[250px]">Today's Work Summary</th>
                    <th className="px-4 py-6 text-[13px] font-extrabold text-white uppercase tracking-wider">Time Spent</th>
                    <th className="px-4 py-6 text-[13px] font-extrabold text-white uppercase tracking-wider">Blockers</th>
                    <th className="px-4 py-6 text-[13px] font-extrabold text-white uppercase tracking-wider w-[250px]">Additional Notes</th>
                    <th className="px-4 py-6 text-[13px] font-extrabold text-white uppercase tracking-wider">Change Given By</th>
                    <th className="px-4 py-6 text-[13px] font-extrabold text-white uppercase tracking-wider w-[200px]">Changes Summary</th>
                    <th className="px-4 py-6 text-[13px] font-extrabold text-white uppercase tracking-wider">Priority</th>
                    <th className="px-4 py-6 text-[13px] font-extrabold text-white uppercase tracking-wider">Work Done Proof</th>
                    <th className="px-4 py-6 text-[13px] font-extrabold text-white uppercase tracking-wider w-[200px]">Reject Reason</th>
                    <th className="px-4 py-6 text-[13px] font-extrabold text-white uppercase tracking-wider">Review and Approve</th>
                    <th className="px-4 py-6 text-[13px] font-extrabold text-white uppercase tracking-wider text-right">Status</th>
                    <th className="px-4 py-6 text-[13px] font-extrabold text-white uppercase tracking-wider text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-400">
                  {sortedRows.map((row, idx) => {
                    const t = row.task || {};
                    return (
                      <tr key={`${row.id}-${idx}`} className="hover:bg-slate-50 transition-colors align-top divide-x divide-slate-400 bg-white text-slate-700">
                        {/* 1. Date */}
                        <td className="md:sticky md:left-0 md:z-10 bg-white w-[100px] min-w-[100px] max-w-[100px] px-3 py-2.5 text-xs text-slate-500 font-medium whitespace-nowrap md:outline md:outline-1 md:outline-slate-400">
                          {t.startDate ? new Date(t.startDate).toLocaleDateString() : '—'}
                        </td>
                        {/* 3. Role */}
                        <td className="px-3 py-2.5 text-xs text-slate-700 whitespace-nowrap font-medium">
                          {row.jobRoleType === 'Other' ? row.customJobRole : (row.jobRoleType || 'N/A')}
                        </td>
                        {/* 4. Project */}
                        <td className="px-3 py-2.5 text-xs text-indigo-700 font-bold whitespace-nowrap">
                          <div className="flex flex-col gap-1 items-start">
                            <span>{row.project?.name || 'N/A'}</span>
                            {t.carryForwardedFromId && (
                              <span className="inline-block px-1.5 py-0.5 text-[9px] font-extrabold uppercase rounded bg-purple-100 text-purple-700 border border-purple-200">
                                Carry Forward
                              </span>
                            )}
                          </div>
                        </td>
                        {/* 5. Task */}
                        <td className="px-3 py-2.5 text-xs text-slate-700 whitespace-normal leading-relaxed min-w-[200px]">
                          <ExpandableText text={row.taskDescription} />
                          {row.changesSummary && <span className="text-indigo-600 font-bold ml-1.5 block mt-1">{row.changesSummary}</span>}
                        </td>
                        {/* 6. Start Time */}
                        <td className="px-3 py-2.5 text-xs text-slate-700 whitespace-nowrap">{row.startTime || 'N/A'}</td>
                        {/* 7. End Time */}
                        <td className="px-3 py-2.5 text-xs text-slate-700 whitespace-nowrap">{row.endTime || 'N/A'}</td>
                        {/* 8. Task Type */}
                        <td className="px-3 py-2.5 text-xs whitespace-nowrap">{getTaskTypeBadge(t.assignmentType)}</td>
                        {/* 9. Assigned By */}
                        <td className="px-3 py-2.5 text-xs text-slate-700 whitespace-nowrap">{t.assignedBy?.name || user?.name || 'Self'}</td>
                        {/* 10. Assigned To */}
                        <td className="px-3 py-2.5 text-xs text-slate-700 whitespace-nowrap">{row.assignedTo?.name || t.employee?.name || '—'}</td>
                        {/* 11. Proof Req */}
                        <td className="px-3 py-2.5 text-xs font-bold text-slate-600 whitespace-nowrap">{row.proofRequired ? 'Yes' : 'No'}</td>
                        {/* 12. Completion */}
                        <td className="px-3 py-2.5 text-xs text-slate-700 font-bold whitespace-nowrap">{row.completionPercentage || 0}%</td>
                        {/* 13. Expected End */}
                        <td className="px-3 py-2.5 text-xs text-slate-700 whitespace-nowrap">
                          {t.expectedEndDate ? new Date(t.expectedEndDate).toLocaleDateString() : '—'}
                        </td>
                        {/* 14. Delay (Y/N) */}
                        <td className="px-3 py-2.5 text-xs font-bold text-slate-700 whitespace-nowrap">
                          {row.status === 'DELAYED' ? <span className="text-rose-700 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-100">Yes</span> : <span className="text-slate-400">No</span>}
                        </td>
                        {/* 15. Delay Reason */}
                        <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-normal leading-relaxed min-w-[150px]">
                          {row.delayReason || <span className="text-slate-300">-</span>}
                        </td>
                        {/* 16. Carry Forward Count */}
                        <td className="px-3 py-2.5 text-xs text-slate-700 font-medium whitespace-nowrap">
                          {t.carryForwardCount ?? 0}
                        </td>
                        {/* 17. Last Carry Forward Date */}
                        <td className="px-3 py-2.5 text-xs text-slate-700 font-medium whitespace-nowrap">
                          {t.lastCarryForwardDate ? new Date(t.lastCarryForwardDate).toLocaleDateString() : <span className="text-slate-300">-</span>}
                        </td>
                        {/* 18. Overdue Days */}
                        <td className="px-3 py-2.5 text-xs text-slate-700 font-medium whitespace-nowrap">
                          {t.overdueDays > 0 ? (
                            <span className="text-rose-700 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-100 font-bold">{t.overdueDays} Days</span>
                          ) : <span className="text-slate-300">-</span>}
                        </td>
                        {/* 19. Extra Note */}
                        <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-normal leading-relaxed min-w-[150px]">
                          {row.notes || <span className="text-slate-300">-</span>}
                        </td>
                        {/* 20. Today's Work Summary */}
                        <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-normal leading-relaxed min-w-[150px]">
                          {row.completedWorkDescription ? (
                            <ExpandableText text={row.completedWorkDescription} />
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        {/* 21. Time Spent */}
                        <td className="px-3 py-2.5 text-xs text-slate-700 whitespace-nowrap">
                          {row.timeSpent || row.submissions?.[0]?.timeSpent || '-'}
                        </td>
                        {/* 22. Blockers */}
                        <td className="px-3 py-2.5 text-xs text-slate-700 whitespace-normal min-w-[120px]">
                          {row.blockers || row.submissions?.[0]?.blockers || '-'}
                        </td>
                        {/* 23. Additional Notes */}
                        <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-normal min-w-[150px]">
                          {row.submissions?.[0]?.notes || '-'}
                        </td>
                        {/* 24. Change Given By */}
                        <td className="px-3 py-2.5 text-xs text-slate-700 whitespace-nowrap">
                          {row.changesGivenBy || '-'}
                        </td>
                        {/* 25. Changes Summary */}
                        <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-normal min-w-[150px]">
                          {row.changesSummary || '-'}
                        </td>
                        {/* 26. Priority */}
                        <td className="px-3 py-2.5 text-xs text-slate-700 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getPriorityColor(row.priority)}`}>
                            {row.priority}
                          </span>
                        </td>
                        {/* 27. Work Done Proof */}
                        <td className="px-3 py-2.5 text-xs text-slate-700 whitespace-nowrap">
                          {row.screenshotUrl ? (
                            <a href={uploadsApi.getFileUrl(row.screenshotUrl)} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline font-semibold bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 inline-block">
                              View
                            </a>
                          ) : row.submissions?.[0]?.proofs && row.submissions[0].proofs.length > 0 ? (
                            <div className="flex flex-col gap-1">
                              {row.submissions[0].proofs.map((proof: any) => (
                                <a key={proof.id} href={uploadsApi.getFileUrl(proof.filepath)} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline font-semibold bg-indigo-50 px-2 py-1 rounded border border-indigo-100 inline-block text-[10px]">
                                  View Proof
                                </a>
                              ))}
                            </div>
                          ) : <span className="text-slate-300">-</span>}
                        </td>
                        {/* 28. Reject Reason */}
                        <td className="px-3 py-2.5 text-xs text-rose-600 whitespace-normal leading-relaxed font-medium min-w-[150px]">
                          {row.acceptanceStatus === 'REJECTED' ? row.rejectionReason : <span className="text-slate-300">-</span>}
                        </td>
                        {/* 29. Review and Approve */}
                        <td className="px-3 py-2.5 text-xs font-bold text-center whitespace-nowrap">
                          {row.status === 'REVIEW_PENDING' ? (
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(row, 'approve')}
                              className="px-3 py-1 bg-purple-600 text-white hover:bg-purple-700 rounded-lg text-[10px] uppercase font-extrabold cursor-pointer"
                            >
                              Review
                            </button>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        {/* 30. Status */}
                        <td className="px-3 py-2.5 text-xs font-bold text-right whitespace-nowrap">
                          {row.acceptanceStatus === 'REJECTED' ? (
                            <span className="px-3 py-1.5 rounded-lg border inline-block bg-rose-50 text-rose-700 border-rose-200">
                              REJECTED
                            </span>
                          ) : row.acceptanceStatus === 'PENDING' ? (
                            <span className="px-3 py-1.5 rounded-lg border inline-block bg-amber-50 text-amber-700 border-amber-200">
                              PENDING ACCEPTANCE
                            </span>
                          ) : (
                            <span className={`px-3 py-1.5 rounded-lg border inline-block ${getStatusColor(row.status)}`}>
                              {getStatusLabel(row.status)}
                            </span>
                          )}
                        </td>
                        {/* 31. Action */}
                        <td className="px-3 py-2.5 text-xs font-bold text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(row)}
                            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-lg text-[10px] uppercase font-bold transition-colors cursor-pointer"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ─── Assign Task Modal ────────────────────────────────────────────── */}
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
            <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden max-h-[92vh]">

              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center">
                    <ClipboardList size={20} className="text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Assign New Task</h3>
                    <p className="text-xs text-slate-500">You will be the reviewer</p>
                  </div>
                </div>
                <button onClick={() => setShowModal(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6">
                <form onSubmit={handleSubmit} className="space-y-5">

                  {/* Assign To */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                      Assign To <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={assignToId}
                      onChange={e => setAssignToId(e.target.value)}
                      className={`w-full rounded-xl border px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 ${errors.assignToId ? 'border-rose-400 bg-rose-50' : 'border-slate-200'}`}
                    >
                      <option value="">Select an employee...</option>
                      {employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                    {errors.assignToId && <p className="text-xs text-rose-600 mt-1">{errors.assignToId}</p>}
                  </div>

                  {/* Project */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                      Project <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={selectedProjectId}
                      onChange={e => setSelectedProjectId(e.target.value)}
                      className={`w-full rounded-xl border px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 ${errors.selectedProjectId ? 'border-rose-400 bg-rose-50' : 'border-slate-200'}`}
                    >
                      <option value="">Select a project...</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    {errors.selectedProjectId && <p className="text-xs text-rose-600 mt-1">{errors.selectedProjectId}</p>}
                  </div>



                  {/* Task Description */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                      Task Description <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                      value={taskDescription} onChange={e => setTaskDescription(e.target.value)}
                      placeholder="Describe the work to be done in detail..."
                      rows={3}
                      className={`w-full rounded-xl border px-4 py-3 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 resize-none ${errors.taskDescription ? 'border-rose-400 bg-rose-50' : 'border-slate-200'}`}
                    />
                    {errors.taskDescription && <p className="text-xs text-rose-600 mt-1">{errors.taskDescription}</p>}
                  </div>

                  {/* Job Role + Priority */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Job Role</label>
                      <select value={jobRole} onChange={e => setJobRole(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10">
                        {JOB_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Priority</label>
                      <select value={priority} onChange={e => setPriority(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10">
                        <option value="LOW">LOW</option>
                        <option value="MEDIUM">MEDIUM</option>
                        <option value="HIGH">HIGH</option>
                      </select>
                    </div>
                  </div>

                  {/* Custom Job Role */}
                  {jobRole === 'Other' && (
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Specify Role <span className="text-rose-500">*</span></label>
                      <input
                        type="text" value={customJobRole} onChange={e => setCustomJobRole(e.target.value)}
                        placeholder="e.g. Data Analyst, Mobile Dev..."
                        className={`w-full rounded-xl border px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 ${errors.customJobRole ? 'border-rose-400 bg-rose-50' : 'border-slate-200'}`}
                      />
                      {errors.customJobRole && <p className="text-xs text-rose-600 mt-1">{errors.customJobRole}</p>}
                    </div>
                  )}

                  {/* Mandatory Proof */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Mandatory Proof</label>
                    <div className="grid grid-cols-2 gap-3">
                      {[{ label: 'YES — Required', value: true }, { label: 'NO — Not Required', value: false }].map(opt => (
                        <button
                          key={String(opt.value)} type="button" onClick={() => setMandatoryProof(opt.value)}
                          className={`py-2.5 rounded-xl border text-xs font-bold transition-all ${
                            mandatoryProof === opt.value
                              ? opt.value
                                ? 'bg-rose-600 text-white border-rose-600 shadow-md'
                                : 'bg-slate-800 text-white border-slate-800 shadow-md'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >{opt.label}</button>
                      ))}
                    </div>
                  </div>

                  {/* Start / End Time */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Start Time</label>
                      <TimePicker value={startTime} onChange={val => setStartTime(val)} />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">End Time</label>
                      <TimePicker value={endTime} onChange={val => setEndTime(val)} className={errors.endTime ? 'border-rose-450 rounded-xl' : ''} />
                      {errors.endTime && <p className="text-xs text-rose-600 mt-1">{errors.endTime}</p>}
                    </div>
                  </div>

                  {/* Start Date & Expected Completion Date */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                        Start Date <span className="text-rose-500">*</span>
                      </label>
                      <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                        className={`w-full rounded-xl border px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 ${errors.startDate ? 'border-rose-400 bg-rose-50' : 'border-slate-200'}`} />
                      {errors.startDate && <p className="text-xs text-rose-600 mt-1">{errors.startDate}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                        Expected End Date <span className="text-rose-500">*</span>
                      </label>
                      <input type="date" value={expectedDate} min={startDate} onChange={e => setExpectedDate(e.target.value)}
                        className={`w-full rounded-xl border px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 ${errors.expectedDate ? 'border-rose-400 bg-rose-50' : 'border-slate-200'}`} />
                      {errors.expectedDate && <p className="text-xs text-rose-600 mt-1">{errors.expectedDate}</p>}
                    </div>
                  </div>

                  {/* Info note */}
                  <div className="flex items-start gap-2.5 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                    <AlertCircle size={13} className="text-indigo-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-indigo-700 leading-relaxed">
                      <strong>You will be the reviewer.</strong> Once the employee submits, you'll be notified to approve or request revision.
                    </p>
                  </div>

                  {/* Submit */}
                  <button type="submit" disabled={isSubmitting}
                    className="w-full py-3.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                    {isSubmitting ? 'Assigning...' : 'Assign Task'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* ─── EditTaskModal ──────────────────────────────────────────────── */}
        {editModalTask && (
          <EditTaskModal
            task={editModalTask}
            initialTab={editModalInitialTab}
            onClose={() => {
              setEditModalTask(null);
              setEditModalInitialTab(undefined);
            }}
            onSuccess={() => {
              setEditModalTask(null);
              setEditModalInitialTab(undefined);
              fetchData();
            }}
          />
        )}
      </div>
    </ErrorBoundary>
  );
};
