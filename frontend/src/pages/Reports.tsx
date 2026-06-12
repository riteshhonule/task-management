import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { tasksApi, projectsApi, usersApi, leavesApi, API_URL, uploadsApi } from '../services/api';
import { FileSpreadsheet, Search, Loader2, Calendar, Plus, X, CheckSquare } from 'lucide-react';
import { EditTaskModal } from '../components/EditTaskModal';
import { TimePicker } from '../components/TimePicker';
import { parseTimeToMinutes } from '../components/EditTaskModal';

type TabType = 'TODAY' | 'YESTERDAY' | 'ALL' | 'COMPLETED' | 'IN_PROGRESS' | 'DELAYED' | 'PENDING';

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

const renderTaskTypeBadge = (type: string) => {
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

export const Reports: React.FC = () => {
  const [urlParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const tab = urlParams.get('tab');
    if (tab && ['TODAY', 'YESTERDAY', 'ALL', 'COMPLETED', 'IN_PROGRESS', 'DELAYED', 'PENDING'].includes(tab)) {
      return tab as TabType;
    }
    return 'TODAY';
  });
  const [tasks, setTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Create Task Form State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [successPopupMessage, setSuccessPopupMessage] = useState('');
  const [editTask, setEditTask] = useState<any>(null);
  const [editModalTask, setEditModalTask] = useState<any | null>(null);
  const [editModalInitialTab, setEditModalInitialTab] = useState<'details' | 'review' | 'approve' | 'history' | 'timeline' | undefined>(undefined);

  const handleOpenEditModal = (p: any, parentTask: any, initialTab?: any) => {
    setEditModalInitialTab(initialTab);
    setEditModalTask({
      ...p,
      taskId: parentTask.id || p.taskId,
      taskProjectId: p.id || p.taskProjectId || p.id,
      expectedEndDate: p.expectedEndDate || parentTask.expectedEndDate,
      startDate: parentTask.startDate,
      employeeName: parentTask.employee?.name || p.employeeName || parentTask.employeeName,
      submissions: p.submissions || [],
      timeline: p.timeline || [],
    });
  };

  const [employeeId, setEmployeeId] = useState('');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState<number[]>([]);
  const [projectDetails, setProjectDetails] = useState<Record<number, {
    id?: number;
    taskDescription: string;
    changesGivenBy: string;
    changesSummary: string;
    priority: string;
    startTime?: string;
    endTime?: string;
    jobRoleType?: string;
    customJobRole?: string;
    proofRequired?: boolean;
    expectedEndDate?: string;
  }>>({});

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
          [projectId]: {
            taskDescription: '',
            changesGivenBy: '',
            changesSummary: '',
            priority: 'MEDIUM',
            startTime: '09:00',
            endTime: '18:00',
            jobRoleType: 'Frontend',
            customJobRole: '',
            proofRequired: false,
            expectedEndDate: startDate || new Date().toISOString().split('T')[0],
          }
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
    if (!employeeId || selectedProjects.length === 0) return;

    for (const pid of selectedProjects) {
      if (!projectDetails[pid]?.taskDescription) {
        alert('Please provide a task description for all selected projects.');
        return;
      }
      if (!projectDetails[pid]?.expectedEndDate) {
        alert('Please provide an expected end date for all selected projects.');
        return;
      }
      const st = projectDetails[pid]?.startTime;
      const et = projectDetails[pid]?.endTime;
      if (st && et) {
        const startMin = parseTimeToMinutes(st);
        const endMin = parseTimeToMinutes(et);
        if (startMin !== null && endMin !== null) {
          if (endMin <= startMin) {
            alert('End Time must be after Start Time.');
            return;
          }
        }
      }
    }

    setIsSubmitting(true);
    try {
      const projectsPayload = selectedProjects.map(pid => ({
        id: projectDetails[pid]?.id,
        projectId: pid,
        taskDescription: projectDetails[pid].taskDescription,
        changesGivenBy: projectDetails[pid].changesGivenBy || undefined,
        changesSummary: projectDetails[pid].changesSummary || undefined,
        priority: projectDetails[pid].priority || 'MEDIUM',
        status: projectDetails[pid]?.id ? undefined : 'PENDING',
        startTime: projectDetails[pid].startTime || '09:00 AM',
        endTime: projectDetails[pid].endTime || '06:00 PM',
        jobRoleType: projectDetails[pid].jobRoleType || 'Frontend',
        customJobRole: projectDetails[pid].jobRoleType === 'Other' ? projectDetails[pid].customJobRole : undefined,
        proofRequired: projectDetails[pid].proofRequired || false,
        expectedEndDate: projectDetails[pid].expectedEndDate ? new Date(projectDetails[pid].expectedEndDate).toISOString() : undefined,
      }));

      const projectExpectedDates = selectedProjects
        .map(pid => projectDetails[pid]?.expectedEndDate ? new Date(projectDetails[pid].expectedEndDate) : null)
        .filter(d => d !== null) as Date[];
      const maxExpectedDate = projectExpectedDates.length > 0 
        ? new Date(Math.max(...projectExpectedDates.map(d => d.getTime())))
        : new Date(startDate);

      const emp = employees.find(e => e.id.toString() === employeeId);
      const empName = emp ? emp.name : 'Employee';

      if (editTask) {
        await tasksApi.update(editTask.id, {
          employeeId: parseInt(employeeId),
          startDate: new Date(startDate).toISOString(),
          startTime: projectsPayload[0]?.startTime || '09:00 AM',
          expectedEndDate: maxExpectedDate.toISOString(),
          projects: projectsPayload,
        });
        setSuccessPopupMessage(`Extra task allocated to ${empName}`);
      } else {
        await tasksApi.create({
          employeeId: parseInt(employeeId),
          startDate: new Date(startDate).toISOString(),
          startTime: projectsPayload[0]?.startTime || '09:00 AM',
          expectedEndDate: maxExpectedDate.toISOString(),
          projects: projectsPayload,
        });
        setSuccessPopupMessage(`Task assigned to ${empName}`);
      }

      // Clear Form
      setEditTask(null);
      setEmployeeId('');
      setSelectedProjects([]);
      setProjectDetails({});
      setShowCreateModal(false);
      await fetchDashboardData();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || err.message || 'Failed to assign task');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Search & Filter for All Tasks
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('');

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const [tasksRes, projectsRes, usersRes, leavesRes] = await Promise.all([
        tasksApi.list(),
        projectsApi.list(),
        usersApi.list({ role: 'EMPLOYEE' }),
        leavesApi.list(),
      ]);

      // Flatten multi-project tasks
      const flatTasks: any[] = [];
      if (tasksRes.data && Array.isArray(tasksRes.data)) {
        tasksRes.data.forEach((parentTask: any) => {
          if (parentTask.projects && parentTask.projects.length > 0) {
            parentTask.projects.forEach((tp: any) => {
              flatTasks.push({
                ...parentTask,
                ...tp,
                taskId: parentTask.id,
                projectId: tp.projectId,
                project: tp.project,
                taskProjectId: tp.id,
                taskDescription: tp.taskDescription,
                changesGivenBy: tp.changesGivenBy,
                changesSummary: tp.changesSummary,
                status: tp.status,
                delayReason: tp.delayReason,
                blockedReason: tp.blockedReason,
                completedWorkDescription: tp.completedWorkDescription,
                completionPercentage: tp.completionPercentage,
                notes: tp.notes,
                acceptanceStatus: tp.acceptanceStatus,
                rejectionReason: tp.rejectionReason,
                screenshotUrl: tp.updates ? tp.updates.find((u: any) => u.screenshotUrl)?.screenshotUrl : null,
                adminComment: tp.adminComment,
                adminCommentUpdatedAt: tp.adminCommentUpdatedAt,
                adminCommentUpdatedById: tp.adminCommentUpdatedById,
                adminCommentUpdatedBy: tp.adminCommentUpdatedBy,
                createdAt: tp.createdAt,
                assignedByUserId: tp.assignedByUserId,
                assignedBy: tp.assignedBy,
                assignedToUserId: tp.assignedToUserId,
                assignedTo: tp.assignedTo,
                assignmentType: tp.assignmentType,
                priority: tp.priority,
                jobRoleType: tp.jobRoleType,
                customJobRole: tp.customJobRole,
                startTime: tp.startTime,
                endTime: tp.endTime,
                proofRequired: tp.proofRequired,
                reviewStatus: tp.reviewStatus,
                submissions: tp.submissions,
                timeline: tp.timeline,
                startDate: parentTask.startDate,
                parentStartTime: parentTask.startTime,
                expectedEndDate: parentTask.expectedEndDate,
                employee: parentTask.employee,
                parentTaskId: parentTask.id,
                fullParentTask: parentTask,
              });
            });
          }
        });
      }

      if (leavesRes.data && Array.isArray(leavesRes.data)) {
        leavesRes.data.forEach((leave: any) => {
          if (leave.status !== 'APPROVED') return;
          const startVal = new Date(leave.startDate);
          const endVal = new Date(leave.endDate);
          let current = new Date(
            startVal.getUTCFullYear(),
            startVal.getUTCMonth(),
            startVal.getUTCDate(),
            0, 0, 0, 0
          );
          const end = new Date(
            endVal.getUTCFullYear(),
            endVal.getUTCMonth(),
            endVal.getUTCDate(),
            0, 0, 0, 0
          );

          while (current <= end) {
            const dateCopy = new Date(current);
            flatTasks.push({
              id: `leave-${leave.id}-${dateCopy.toISOString().split('T')[0]}`,
              startDate: dateCopy.toISOString(),
              startTime: '-',
              expectedEndDate: leave.endDate,
              employee: leave.employee,
              employeeName: leave.employee?.name || 'Unknown',
              projectId: 0,
              project: { name: 'LEAVE' },
              taskDescription: leave.reason,
              status: 'ON_LEAVE',
              leaveType: leave.leaveType,
              leaveReason: leave.reason,
              parentTaskId: null,
              fullParentTask: null,
            });
            current.setDate(current.getDate() + 1);
          }
        });
      }

      setTasks(flatTasks);
      setProjects(projectsRes.data.filter((p: any) => !p.isArchived));
      setEmployees(usersRes.data.filter((u: any) => u.role === 'EMPLOYEE'));
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    const handleSync = () => {
      fetchDashboardData();
    };

    window.addEventListener('sync-tasks', handleSync);
    window.addEventListener('sync-projects', handleSync);
    window.addEventListener('sync-users', handleSync);

    return () => {
      window.removeEventListener('sync-tasks', handleSync);
      window.removeEventListener('sync-projects', handleSync);
      window.removeEventListener('sync-users', handleSync);
    };
  }, []);

  useEffect(() => {
    const tab = urlParams.get('tab');
    if (tab && ['TODAY', 'YESTERDAY', 'ALL', 'COMPLETED', 'IN_PROGRESS', 'DELAYED', 'PENDING'].includes(tab)) {
      setActiveTab(tab as TabType);
    }
  }, [urlParams]);

  const handleEmployeeOrDateChange = (newEmployeeId: string, newDate: string) => {
    setEmployeeId(newEmployeeId);
    setStartDate(newDate);

    if (!newEmployeeId || !newDate) {
      setEditTask(null);
      setSelectedProjects([]);
      setProjectDetails({});
      return;
    }

    const existingTask = tasks.find(t => {
      if (t.employee?.id.toString() !== newEmployeeId) return false;

      const tDate = new Date(t.startDate);
      const tzoffset = tDate.getTimezoneOffset() * 60000;
      const localISODate = new Date(tDate.getTime() - tzoffset).toISOString().split('T')[0];

      return localISODate === newDate;
    });

    if (existingTask) {
      const parentTask = existingTask.fullParentTask;
      setEditTask(parentTask);

      const selProj: number[] = [];
      const projDetails: Record<number, any> = {};
      if (parentTask.projects) {
        parentTask.projects.forEach((p: any) => {
          selProj.push(p.projectId);
          projDetails[p.projectId] = {
            id: p.id,
            taskDescription: p.taskDescription || '',
            changesGivenBy: p.changesGivenBy || '',
            changesSummary: p.changesSummary || '',
            priority: p.priority || 'MEDIUM',
            startTime: p.startTime || '09:00',
            endTime: p.endTime || '18:00',
            jobRoleType: p.jobRoleType || 'Frontend',
            customJobRole: p.customJobRole || '',
            proofRequired: p.proofRequired || false,
            expectedEndDate: p.expectedEndDate ? new Date(p.expectedEndDate).toISOString().split('T')[0] : (parentTask.expectedEndDate ? new Date(parentTask.expectedEndDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
          };
        });
      }
      setSelectedProjects(selProj);
      setProjectDetails(projDetails);
    } else {
      setEditTask(null);
      setSelectedProjects([]);
      setProjectDetails({});
    }
  };

  const handleEditInit = (parentTask: any) => {
    setEditTask(parentTask);
    setEmployeeId(parentTask.employee?.id?.toString() || '');

    try {
      const d = new Date(parentTask.startDate);
      const tzoffset = d.getTimezoneOffset() * 60000;
      setStartDate(new Date(d.getTime() - tzoffset).toISOString().split('T')[0]);
    } catch (e) {
      setStartDate(new Date().toISOString().split('T')[0]);
    }

    const selProj: number[] = [];
    const projDetails: Record<number, any> = {};
    if (parentTask.projects) {
      parentTask.projects.forEach((p: any) => {
        selProj.push(p.projectId);
        projDetails[p.projectId] = {
          id: p.id,
          taskDescription: p.taskDescription || '',
          changesGivenBy: p.changesGivenBy || '',
          changesSummary: p.changesSummary || '',
          priority: p.priority || 'MEDIUM',
          startTime: p.startTime || '09:00',
          endTime: p.endTime || '18:00',
          jobRoleType: p.jobRoleType || 'Frontend',
          customJobRole: p.customJobRole || '',
          proofRequired: p.proofRequired || false,
          expectedEndDate: p.expectedEndDate ? new Date(p.expectedEndDate).toISOString().split('T')[0] : (parentTask.expectedEndDate ? new Date(parentTask.expectedEndDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
        };
      });
    }
    setSelectedProjects(selProj);
    setProjectDetails(projDetails);
    setShowCreateModal(true);
  };

  const getBackendDateParam = () => {
    if (filterDate) return filterDate;
    if (filterYear && filterMonth) return `${filterYear}-${filterMonth}`;
    if (filterYear) return filterYear;
    if (filterMonth) return `${new Date().getFullYear()}-${filterMonth}`;
    return '';
  };

  const handleExportExcel = () => {
    const params = new URLSearchParams();
    if (activeTab) params.append('tab', activeTab);
    const dateParam = getBackendDateParam();
    if (dateParam) params.append('date', dateParam);
    if (filterProject) params.append('projectId', filterProject);
    if (searchQuery) params.append('search', searchQuery);
    const token = localStorage.getItem('token');
    if (token) params.append('token', token);

    window.open(`${API_URL}/reports/export-excel?${params.toString()}`, '_blank');
  };

  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  const filteredTasks = useMemo(() => {
    let filtered = tasks;

    if (activeTab === 'TODAY') {
      filtered = filtered.filter(t => new Date(t.startDate).toDateString() === today);
    } else if (activeTab === 'YESTERDAY') {
      filtered = filtered.filter(t => new Date(t.startDate).toDateString() === yesterday);
    } else if (activeTab === 'COMPLETED') {
      filtered = filtered.filter(t => t.status === 'COMPLETED');
    } else if (activeTab === 'IN_PROGRESS') {
      filtered = filtered.filter(t => t.status === 'IN_PROGRESS');
    } else if (activeTab === 'DELAYED') {
      filtered = filtered.filter(t => t.status === 'DELAYED');
    } else if (activeTab === 'PENDING') {
      filtered = filtered.filter(t => t.status === 'PENDING');
    }

    if (searchQuery) {
      filtered = filtered.filter(t =>
        (t.taskDescription || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.project?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.employee?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (filterProject) {
      filtered = filtered.filter(t => t.projectId.toString() === filterProject);
    }
    if (filterDate) {
      filtered = filtered.filter(t => {
        const d = new Date(t.startDate);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}` === filterDate;
      });
    } else {
      if (filterYear) {
        filtered = filtered.filter(t => new Date(t.startDate).getFullYear().toString() === filterYear);
      }
      if (filterMonth) {
        filtered = filtered.filter(t => {
          const d = new Date(t.startDate);
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          return mm === filterMonth;
        });
      }
    }
    return filtered;
  }, [tasks, activeTab, searchQuery, filterProject, filterDate, filterMonth, filterYear, today, yesterday]);

  const groupedTasks = useMemo(() => {
    const sorted = [...filteredTasks].sort((a, b) => {
      const timeB = new Date(b.createdAt || b.startDate).getTime();
      const timeA = new Date(a.createdAt || a.startDate).getTime();
      return timeB - timeA;
    });
    const groups: { dateStr: string, displayDate: string, tasks: any[] }[] = [];

    sorted.forEach(t => {
      const dStr = new Date(t.startDate).toDateString();
      let group = groups.find(g => g.dateStr === dStr);
      if (!group) {
        group = {
          dateStr: dStr,
          displayDate: new Date(t.startDate).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
          tasks: []
        };
        groups.push(group);
      }
      group.tasks.push(t);
    });
    return groups;
  }, [filteredTasks]);

  const tabs: { id: TabType, label: string }[] = [
    { id: 'TODAY', label: "Today's Task" },
    { id: 'YESTERDAY', label: "Yesterday's Task" },
    { id: 'ALL', label: "All Tasks" },
    { id: 'COMPLETED', label: "Completed" },
    { id: 'IN_PROGRESS', label: "In Progress" },
    { id: 'DELAYED', label: "Delayed" },
    { id: 'PENDING', label: "Pending" },
  ];

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

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-heading font-extrabold text-slate-800">All Employee Tasks</h2>
          <p className="text-xs text-slate-550">Monitor and review daily work schedules across all employees.</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => {
              setEditTask(null);
              setEmployeeId('');
              setStartDate(new Date().toISOString().split('T')[0]);
              setSelectedProjects([]);
              setProjectDetails({});
              setShowCreateModal(true);
            }}
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 hover:-translate-y-0.5 active:translate-y-0 shadow-lg shadow-indigo-600/10 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={15} /> Assign Task
          </button>
          <button
            onClick={handleExportExcel}
            className="rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 hover:bg-emerald-600 hover:text-white px-4 py-2.5 text-xs font-semibold transition-all flex items-center gap-1.5"
          >
            <FileSpreadsheet size={15} /> Export Excel
          </button>
        </div>
      </div>

      {/* Horizontal Filter Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${activeTab === tab.id
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 size={36} className="animate-spin text-indigo-500" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Filters for non-today/yesterday tabs */}
          {['ALL', 'COMPLETED', 'IN_PROGRESS', 'DELAYED', 'PENDING'].includes(activeTab) && (
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Search by task, project, or employee name..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm"
                />
              </div>
              <input
                type="date"
                value={filterDate}
                onChange={e => {
                  setFilterDate(e.target.value);
                  setFilterMonth('');
                  setFilterYear('');
                }}
                className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none shadow-sm text-slate-600"
              />
              <select
                value={filterMonth}
                onChange={e => {
                  setFilterMonth(e.target.value);
                  setFilterDate('');
                }}
                className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none shadow-sm text-slate-600 min-w-[120px]"
              >
                <option value="">All Months</option>
                <option value="01">January</option>
                <option value="02">February</option>
                <option value="03">March</option>
                <option value="04">April</option>
                <option value="05">May</option>
                <option value="06">June</option>
                <option value="07">July</option>
                <option value="08">August</option>
                <option value="09">September</option>
                <option value="10">October</option>
                <option value="11">November</option>
                <option value="12">December</option>
              </select>
              <select
                value={filterYear}
                onChange={e => {
                  setFilterYear(e.target.value);
                  setFilterDate('');
                }}
                className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none shadow-sm text-slate-600 min-w-[120px]"
              >
                <option value="">All Years</option>
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
                <option value="2023">2023</option>
              </select>
              <select
                value={filterProject}
                onChange={e => setFilterProject(e.target.value)}
                className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none shadow-sm min-w-[150px]"
              >
                <option value="">All Projects</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          {filteredTasks.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
              <Calendar className="mx-auto text-slate-300 mb-3" size={32} />
              <h3 className="text-lg font-bold text-slate-700">No Tasks Found</h3>
              <p className="text-sm text-slate-500">There are no employee tasks matching the current filters.</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 shadow-sm">
              <div className="max-h-[75vh] overflow-auto">
                <table className="w-full text-left border-collapse min-w-max">
                  <thead className="sticky top-0 z-20 bg-purple-600 outline outline-1 outline-purple-700 shadow-sm">
                    <tr className="bg-purple-600 divide-x divide-purple-500">
                      <th className="md:sticky md:left-0 md:z-30 bg-purple-600 w-[100px] min-w-[100px] max-w-[100px] px-4 py-6 text-[13px] font-extrabold text-white uppercase tracking-wider md:outline md:outline-1 md:outline-purple-700 shadow-sm">Date</th>
                      <th className="md:sticky md:left-[100px] md:z-30 bg-purple-600 w-[150px] min-w-[150px] max-w-[150px] px-4 py-6 text-[13px] font-extrabold text-white uppercase tracking-wider md:outline md:outline-1 md:outline-purple-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Employee Name</th>
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
                    {groupedTasks.map(group => (
                      <React.Fragment key={group.dateStr}>
                        <tr className="bg-emerald-400 border-y border-emerald-700">
                          <td colSpan={31} className="sticky left-0 z-10 bg-emerald-400 p-0 text-xs font-bold text-white text-left uppercase tracking-wider">
                            <div className="sticky left-4 px-3 py-3 inline-block">
                              {group.displayDate}
                            </div>
                          </td>
                        </tr>
                        {group.tasks.map((t: any) => {
                          const isOnLeaveRow = t.status === 'ON_LEAVE';
                          
                          if (isOnLeaveRow) {
                            return (
                              <tr key={t.id} className="bg-red-50 hover:bg-red-100 transition-colors align-top divide-x divide-red-200 border-y-2 border-red-500">
                                <td className="md:sticky md:left-0 md:z-10 bg-red-50 w-[100px] min-w-[100px] max-w-[100px] px-3 py-2.5 text-xs text-red-700 font-medium whitespace-nowrap md:outline md:outline-1 md:outline-red-200">{new Date(t.startDate).toLocaleDateString()}</td>
                                <td className="md:sticky md:left-[100px] md:z-10 bg-red-50 w-[150px] min-w-[150px] max-w-[150px] px-3 py-2.5 text-xs font-bold text-red-900 whitespace-nowrap md:outline md:outline-1 md:outline-red-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] truncate">{t.employeeName}</td>
                                <td className="px-3 py-2.5 text-xs text-red-700 font-bold whitespace-nowrap">LEAVE</td>
                                <td colSpan={28} className="px-3 py-2.5 text-xs text-red-950 whitespace-normal leading-relaxed">
                                  <strong className="block text-red-800 mb-1">Leave Type: {t.leaveType}</strong>
                                  <span>Reason: {t.leaveReason}</span>
                                </td>
                              </tr>
                            );
                          }

                          return (
                            <tr key={t.id} className="hover:bg-slate-50 transition-colors align-top divide-x divide-slate-400 bg-white">
                              {/* 1. Date */}
                              <td className="md:sticky md:left-0 md:z-10 bg-white w-[100px] min-w-[100px] max-w-[100px] px-3 py-2.5 text-xs text-slate-500 font-medium whitespace-nowrap md:outline md:outline-1 md:outline-slate-400">{new Date(t.startDate).toLocaleDateString()}</td>
                              {/* 2. Employee Name */}
                              <td className="md:sticky md:left-[100px] md:z-10 bg-white w-[150px] min-w-[150px] max-w-[150px] px-3 py-2.5 text-xs font-bold text-slate-800 whitespace-nowrap md:outline md:outline-1 md:outline-slate-400 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] truncate">{t.employee?.name || t.employeeName || 'N/A'}</td>
                              {/* 3. Role */}
                              <td className="px-3 py-2.5 text-xs text-slate-700 whitespace-nowrap">
                                {t.jobRoleType === 'Other' ? t.customJobRole : (t.jobRoleType || 'N/A')}
                              </td>
                              {/* 4. Project */}
                              <td className="px-3 py-2.5 text-xs text-indigo-700 font-bold whitespace-nowrap">{t.project?.name || 'N/A'}</td>
                              {/* 5. Task */}
                              <td className="px-3 py-2.5 text-xs text-slate-700 whitespace-normal leading-relaxed min-w-[200px]">
                                {t.taskDescription}
                              </td>
                              {/* 6. Start Time */}
                              <td className="px-3 py-2.5 text-xs text-slate-700 whitespace-nowrap">{t.startTime || 'N/A'}</td>
                              {/* 7. End Time */}
                              <td className="px-3 py-2.5 text-xs text-slate-700 whitespace-nowrap">{t.endTime || 'N/A'}</td>
                              {/* 8. Task Type */}
                              <td className="px-3 py-2.5 text-xs text-slate-700 whitespace-nowrap">{renderTaskTypeBadge(t.assignmentType)}</td>
                              {/* 9. Assigned By */}
                              <td className="px-3 py-2.5 text-xs text-slate-700 whitespace-nowrap">{t.assignedBy?.name || 'Self'}</td>
                              {/* 10. Assigned To */}
                              <td className="px-3 py-2.5 text-xs text-slate-700 whitespace-nowrap">{t.assignedTo?.name || t.employee?.name || 'N/A'}</td>
                              {/* 11. Proof Req */}
                              <td className="px-3 py-2.5 text-xs text-slate-700 whitespace-nowrap">{t.proofRequired ? 'Yes' : 'No'}</td>
                              {/* 12. Completion */}
                              <td className="px-3 py-2.5 text-xs font-bold text-slate-700 whitespace-nowrap">{t.completionPercentage || 0}%</td>
                              {/* 13. Expected End */}
                              <td className="px-3 py-2.5 text-xs text-slate-700 whitespace-nowrap">
                                {new Date(t.expectedEndDate).toLocaleDateString()}
                              </td>
                              {/* 14. Delay (Y/N) */}
                              <td className="px-3 py-2.5 text-xs font-bold text-slate-700 whitespace-nowrap">
                                {t.status === 'DELAYED' ? <span className="text-rose-700 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-100">Yes</span> : <span className="text-slate-400">No</span>}
                              </td>
                              {/* 15. Delay Reason */}
                              <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-normal leading-relaxed min-w-[150px]">
                                {t.delayReason || <span className="text-slate-300">-</span>}
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
                                {t.notes || <span className="text-slate-300">-</span>}
                              </td>
                              {/* 20. Today's Work Summary */}
                              <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-normal leading-relaxed min-w-[150px]">
                                {t.completedWorkDescription || <span className="text-slate-300">-</span>}
                              </td>
                              {/* 21. Time Spent */}
                              <td className="px-3 py-2.5 text-xs text-slate-700 whitespace-nowrap">
                                {t.timeSpent || t.submissions?.[0]?.timeSpent || '-'}
                              </td>
                              {/* 22. Blockers */}
                              <td className="px-3 py-2.5 text-xs text-slate-700 whitespace-normal min-w-[120px]">
                                {t.blockers || t.submissions?.[0]?.blockers || '-'}
                              </td>
                              {/* 23. Additional Notes */}
                              <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-normal min-w-[150px]">
                                {t.submissions?.[0]?.notes || '-'}
                              </td>
                              {/* 24. Change Given By */}
                              <td className="px-3 py-2.5 text-xs text-slate-700 whitespace-nowrap">
                                {t.changesGivenBy || '-'}
                              </td>
                              {/* 25. Changes Summary */}
                              <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-normal min-w-[150px]">
                                {t.changesSummary || '-'}
                              </td>
                              {/* 26. Priority */}
                              <td className="px-3 py-2.5 text-xs text-slate-700 whitespace-nowrap">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getPriorityColor(t.priority)}`}>
                                  {t.priority}
                                </span>
                              </td>
                              {/* 27. Work Done Proof */}
                              <td className="px-3 py-2.5 text-xs text-slate-700 whitespace-nowrap">
                                {t.screenshotUrl ? (
                                  <a href={uploadsApi.getFileUrl(t.screenshotUrl)} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline font-semibold bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 inline-block">
                                    View
                                  </a>
                                ) : t.submissions?.[0]?.proofs && t.submissions[0].proofs.length > 0 ? (
                                  <div className="flex flex-col gap-1">
                                    {t.submissions[0].proofs.map((proof: any) => (
                                      <a key={proof.id} href={uploadsApi.getFileUrl(proof.filepath)} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline font-semibold bg-indigo-50 px-2 py-1 rounded border border-indigo-100 inline-block text-[10px]">
                                        View Proof
                                      </a>
                                    ))}
                                  </div>
                                ) : <span className="text-slate-300">-</span>}
                              </td>
                              {/* 28. Reject Reason */}
                              <td className="px-3 py-2.5 text-xs text-rose-600 whitespace-normal leading-relaxed font-medium min-w-[150px]">
                                {t.acceptanceStatus === 'REJECTED' ? t.rejectionReason : <span className="text-slate-300">-</span>}
                              </td>
                              {/* 29. Review and Approve */}
                              <td className="px-3 py-2.5 text-xs font-bold text-center whitespace-nowrap">
                                {t.status === 'REVIEW_PENDING' ? (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditModal(t, t.fullParentTask || t, 'approve')}
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
                                {t.acceptanceStatus === 'REJECTED' ? (
                                  <span className="px-3 py-1.5 rounded-lg border inline-block bg-rose-50 text-rose-700 border-rose-200">
                                    REJECTED
                                  </span>
                                ) : t.acceptanceStatus === 'PENDING' ? (
                                  <span className="px-3 py-1.5 rounded-lg border inline-block bg-amber-50 text-amber-700 border-amber-200">
                                    PENDING ACCEPTANCE
                                  </span>
                                ) : (
                                  <span className={`px-3 py-1.5 rounded-lg border inline-block ${getStatusColor(t.status)}`}>
                                    {getStatusLabel(t.status)}
                                  </span>
                                )}
                              </td>
                              {/* 31. Action */}
                              <td className="px-3 py-2.5 text-xs text-right whitespace-nowrap">
                                <button onClick={() => handleEditInit(t.fullParentTask || t)} className="text-indigo-600 hover:text-indigo-800 font-bold bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-100 transition-colors">
                                  Assign Extra Task
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {successPopupMessage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-emerald-100 p-8 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckSquare size={32} />
            </div>
            <h3 className="text-xl font-heading font-bold text-slate-800 mb-2">Success</h3>
            <p className="text-sm font-medium text-slate-600 mb-6">{successPopupMessage}</p>
            <button onClick={() => setSuccessPopupMessage('')} className="w-full bg-indigo-600 text-white rounded-xl py-3 font-bold hover:bg-indigo-500 transition-colors shadow-md shadow-indigo-600/20">
              OK
            </button>
          </div>
        </div>
      )}

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-white sticky top-0 z-20 shrink-0">
              <h3 className="font-heading text-xl font-bold text-slate-800">{editTask ? 'Edit & Assign Extra Task' : 'Assign New Task'}</h3>
              <button onClick={() => { setShowCreateModal(false); setEditTask(null); }} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-6 text-left">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Assignee (Employee) *
                  </label>
                  <select
                    value={employeeId}
                    onChange={(e) => handleEmployeeOrDateChange(e.target.value, startDate)}
                    required
                    className="block w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 cursor-pointer"
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
                    onChange={(e) => handleEmployeeOrDateChange(employeeId, e.target.value)}
                    required
                    disabled
                    className="block w-full rounded-xl bg-slate-100 border border-slate-200 px-3 py-2 text-sm text-slate-500 cursor-not-allowed opacity-80"
                  />
                </div>
              </div>



              <div className="border-t border-slate-200 pt-6 text-left">
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
                <div className="space-y-6 pt-4 border-t border-slate-200 text-left">
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
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Priority *</label>
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
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Job Role Type *</label>
                            <select 
                              value={projectDetails[pid]?.jobRoleType || 'Frontend'} 
                              onChange={(e) => handleProjectDetailChange(pid, 'jobRoleType', e.target.value)} 
                              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20"
                            >
                              <option value="Frontend">Frontend</option>
                              <option value="Backend">Backend</option>
                              <option value="Full Stack">Full Stack</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                        </div>

                        {projectDetails[pid]?.jobRoleType === 'Other' && (
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Enter Role Name *</label>
                            <input 
                              type="text"
                              required
                              placeholder="UI/UX, Testing, DevOps, etc."
                              value={projectDetails[pid]?.customJobRole || ''}
                              onChange={(e) => handleProjectDetailChange(pid, 'customJobRole', e.target.value)}
                              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20"
                            />
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Start Time *</label>
                            <TimePicker 
                              value={projectDetails[pid]?.startTime || '09:00 AM'}
                              onChange={(val) => handleProjectDetailChange(pid, 'startTime', val)}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">End Time *</label>
                            <TimePicker 
                              value={projectDetails[pid]?.endTime || '06:00 PM'}
                              onChange={(val) => handleProjectDetailChange(pid, 'endTime', val)}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-550 uppercase tracking-wider mb-1.5">Expected End Date *</label>
                          <input
                            type="date"
                            required
                            value={projectDetails[pid]?.expectedEndDate || ''}
                            min={startDate}
                            onChange={(e) => handleProjectDetailChange(pid, 'expectedEndDate', e.target.value)}
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 bg-white"
                          />
                        </div>

                        <div className="flex items-center gap-2 py-1">
                          <input 
                            type="checkbox"
                            id={`proof-req-${pid}`}
                            checked={projectDetails[pid]?.proofRequired || false}
                            onChange={(e) => handleProjectDetailChange(pid, 'proofRequired', e.target.checked as any)}
                            className="w-4 h-4 text-indigo-600 bg-white border-slate-300 rounded focus:ring-indigo-500"
                          />
                          <label htmlFor={`proof-req-${pid}`} className="text-xs font-bold text-slate-500 cursor-pointer uppercase tracking-wider">
                            Mandatory Work Proof Required
                          </label>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
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

              </div>

              <div className="flex gap-3 justify-end p-6 border-t border-slate-200 bg-white sticky bottom-0 z-20 shrink-0">
                <button
                  type="button"
                  onClick={() => { setShowCreateModal(false); setEditTask(null); }}
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

      {/* ─── Edit Task Modal ─── */}
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
            fetchDashboardData();
          }}
        />
      )}
    </div>
  );
};
