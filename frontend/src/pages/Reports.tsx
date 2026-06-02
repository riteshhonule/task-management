import React, { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { tasksApi, projectsApi, usersApi } from '../services/api';
import { FileSpreadsheet, FileText, Search, Loader2, Calendar, Plus, X, CheckSquare } from 'lucide-react';

type TabType = 'TODAY' | 'YESTERDAY' | 'ALL' | 'COMPLETED' | 'IN_PROGRESS' | 'DELAYED' | 'PENDING';

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
  const [employeeId, setEmployeeId] = useState('');
  const [startTime, setStartTime] = useState('09:00 AM');
  const [expectedEndDate, setExpectedEndDate] = useState('');
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState<number[]>([]);
  const [projectDetails, setProjectDetails] = useState<Record<number, { id?: number, taskDescription: string, changesGivenBy: string, changesSummary: string, priority: string, notes: string }>>({});

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
        id: projectDetails[pid]?.id,
        projectId: pid,
        taskDescription: projectDetails[pid].taskDescription,
        changesGivenBy: projectDetails[pid].changesGivenBy || undefined,
        changesSummary: projectDetails[pid].changesSummary || undefined,
        priority: projectDetails[pid].priority,
        notes: projectDetails[pid].notes || undefined,
        status: projectDetails[pid]?.id ? undefined : 'PENDING',
      }));

      const emp = employees.find(e => e.id.toString() === employeeId);
      const empName = emp ? emp.name : 'Employee';

      if (editTask) {
        await tasksApi.update(editTask.id, {
          employeeId: parseInt(employeeId),
          startDate: new Date(startDate).toISOString(),
          startTime,
          expectedEndDate: new Date(expectedEndDate).toISOString(),
          projects: projectsPayload,
        });
        setSuccessPopupMessage(`Extra task allocated to ${empName}`);
      } else {
        await tasksApi.create({
          employeeId: parseInt(employeeId),
          startDate: new Date(startDate).toISOString(),
          startTime,
          expectedEndDate: new Date(expectedEndDate).toISOString(),
          projects: projectsPayload,
        });
        setSuccessPopupMessage(`Task assigned to ${empName}`);
      }

      // Clear Form
      setEditTask(null);
      setEmployeeId('');
      setSelectedProjects([]);
      setProjectDetails({});
      setStartTime('09:00 AM');
      setExpectedEndDate('');
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

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const [tasksRes, projectsRes, usersRes] = await Promise.all([
        tasksApi.list(),
        projectsApi.list(),
        usersApi.list({ role: 'EMPLOYEE' }),
      ]);
      
      // Flatten multi-project tasks
      const flatTasks: any[] = [];
      if (tasksRes.data && Array.isArray(tasksRes.data)) {
        tasksRes.data.forEach((parentTask: any) => {
          if (parentTask.projects && parentTask.projects.length > 0) {
            parentTask.projects.forEach((tp: any) => {
              flatTasks.push({
                ...tp,
                startDate: parentTask.startDate,
                startTime: parentTask.startTime,
                expectedEndDate: parentTask.expectedEndDate,
                employee: parentTask.employee,
                parentTaskId: parentTask.id,
                fullParentTask: parentTask,
                screenshotUrl: tp.updates ? tp.updates.find((u: any) => u.screenshotUrl)?.screenshotUrl : null,
              });
            });
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
      setStartTime(parentTask.startTime || '09:00 AM');
      try {
        if (parentTask.expectedEndDate) {
          const d = new Date(parentTask.expectedEndDate);
          const tzoffset = d.getTimezoneOffset() * 60000;
          setExpectedEndDate(new Date(d.getTime() - tzoffset).toISOString().split('T')[0]);
        } else {
          setExpectedEndDate('');
        }
      } catch (e) {
        setExpectedEndDate('');
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
            notes: p.notes || ''
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
    
    setStartTime(parentTask.startTime || '09:00 AM');
    
    try {
      if (parentTask.expectedEndDate) {
        const d = new Date(parentTask.expectedEndDate);
        const tzoffset = d.getTimezoneOffset() * 60000;
        setExpectedEndDate(new Date(d.getTime() - tzoffset).toISOString().split('T')[0]);
      } else {
        setExpectedEndDate('');
      }
    } catch (e) {
      setExpectedEndDate('');
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
          notes: p.notes || ''
        };
      });
    }
    setSelectedProjects(selProj);
    setProjectDetails(projDetails);
    setShowCreateModal(true);
  };

  const handleExportExcel = () => {
    window.open('http://localhost:3000/reports/export-excel', '_blank');
  };

  const handleExportPdf = () => {
    window.open('http://localhost:3000/reports/export-pdf', '_blank');
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
    }
    return filtered;
  }, [tasks, activeTab, searchQuery, filterProject, filterDate, today, yesterday]);

  const groupedTasks = useMemo(() => {
    const sorted = [...filteredTasks].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
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
      case 'DELAYED': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'BLOCKED': return 'bg-rose-100 text-rose-800 border-rose-300';
      default: return 'bg-amber-50 text-amber-700 border-amber-200';
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
              setStartTime('09:00 AM');
              setExpectedEndDate('');
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
          <button
            onClick={handleExportPdf}
            className="rounded-xl bg-rose-50 border border-rose-100 text-rose-700 hover:bg-rose-600 hover:text-white px-4 py-2.5 text-xs font-semibold transition-all flex items-center gap-1.5"
          >
            <FileText size={15} /> Export PDF
          </button>
        </div>
      </div>

      {/* Horizontal Filter Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
              activeTab === tab.id
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
                onChange={e => setFilterDate(e.target.value)}
                className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none shadow-sm text-slate-600"
              />
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
                  <thead className="sticky top-0 z-20 bg-slate-200 outline outline-1 outline-slate-400 shadow-sm">
                    <tr className="bg-slate-200 divide-x divide-slate-400">
                      <th className="sticky left-0 z-30 bg-slate-200 w-[100px] min-w-[100px] max-w-[100px] px-4 py-6 text-[13px] font-extrabold text-slate-800 uppercase tracking-wider outline outline-1 outline-slate-400 shadow-sm">Date</th>
                      <th className="sticky left-[100px] z-30 bg-slate-200 w-[150px] min-w-[150px] max-w-[150px] px-4 py-6 text-[13px] font-extrabold text-slate-800 uppercase tracking-wider outline outline-1 outline-slate-400 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Employee Name</th>
                      <th className="px-4 py-6 text-[13px] font-extrabold text-slate-800 uppercase tracking-wider">Project</th>
                      <th className="px-4 py-6 text-[13px] font-extrabold text-slate-800 uppercase tracking-wider w-[250px]">Task</th>
                      <th className="px-4 py-6 text-[13px] font-extrabold text-slate-800 uppercase tracking-wider">Completion</th>
                      <th className="px-4 py-6 text-[13px] font-extrabold text-slate-800 uppercase tracking-wider">Work Done Proof</th>
                      <th className="px-4 py-6 text-[13px] font-extrabold text-slate-800 uppercase tracking-wider">Start Time</th>
                      <th className="px-4 py-6 text-[13px] font-extrabold text-slate-800 uppercase tracking-wider">Expected End</th>
                      <th className="px-4 py-6 text-[13px] font-extrabold text-slate-800 uppercase tracking-wider">Delay (Y/N)</th>
                      <th className="px-4 py-6 text-[13px] font-extrabold text-slate-800 uppercase tracking-wider w-[200px]">Delay Reason</th>
                      <th className="px-4 py-6 text-[13px] font-extrabold text-slate-800 uppercase tracking-wider w-[250px]">Extra Note</th>
                      <th className="px-4 py-6 text-[13px] font-extrabold text-slate-800 uppercase tracking-wider w-[200px]">Reject Reason</th>
                      <th className="px-4 py-6 text-[13px] font-extrabold text-slate-800 uppercase tracking-wider text-right">Status</th>
                      <th className="px-4 py-6 text-[13px] font-extrabold text-slate-800 uppercase tracking-wider text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-400">
                    {groupedTasks.map(group => (
                      <React.Fragment key={group.dateStr}>
                        <tr className="bg-indigo-50/80 border-y border-indigo-100">
                          <td colSpan={14} className="px-3 py-3 text-sm font-bold text-indigo-900 text-left uppercase tracking-widest shadow-inner">
                            {group.displayDate}
                          </td>
                        </tr>
                        {group.tasks.map((t: any) => (
                          <tr key={t.id} className="hover:bg-slate-50 transition-colors align-top divide-x divide-slate-400">
                            <td className="sticky left-0 z-10 bg-white w-[100px] min-w-[100px] max-w-[100px] px-3 py-2.5 text-xs text-slate-500 font-medium whitespace-nowrap outline outline-1 outline-slate-400">{new Date(t.startDate).toLocaleDateString()}</td>
                            <td className="sticky left-[100px] z-10 bg-white w-[150px] min-w-[150px] max-w-[150px] px-3 py-2.5 text-xs font-bold text-slate-800 whitespace-nowrap outline outline-1 outline-slate-400 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] truncate">{t.employee?.name || 'N/A'}</td>
                            <td className="px-3 py-2.5 text-xs text-indigo-700 font-bold whitespace-nowrap">{t.project?.name || 'N/A'}</td>
                            <td className="px-3 py-2.5 text-xs text-slate-700 whitespace-normal leading-relaxed">
                              {t.changesGivenBy ? (
                                <span className="text-amber-600 font-bold bg-amber-50 px-1 py-0.5 rounded">{t.taskDescription}</span>
                              ) : (
                                t.taskDescription
                              )}
                              {t.changesSummary && <span className="text-indigo-600 font-bold ml-1.5 block mt-1">{t.changesSummary}</span>}
                            </td>
                            <td className="px-3 py-2.5 text-xs font-bold text-slate-700 whitespace-nowrap">{t.completionPercentage || 0}%</td>
                            <td className="px-3 py-2.5 text-xs text-slate-700 whitespace-nowrap">
                              {t.screenshotUrl ? (
                                <a href={`http://localhost:3000/${t.screenshotUrl}`} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline font-semibold bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 inline-block">
                                  View
                                </a>
                              ) : <span className="text-slate-300">-</span>}
                            </td>
                            <td className="px-3 py-2.5 text-xs text-slate-700 whitespace-nowrap">{t.startTime}</td>
                            <td className="px-3 py-2.5 text-xs text-slate-700 whitespace-nowrap">
                              {new Date(t.expectedEndDate).toLocaleDateString()}
                            </td>
                            <td className="px-3 py-2.5 text-xs font-bold text-slate-700 whitespace-nowrap">
                              {t.status === 'DELAYED' ? <span className="text-rose-700 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-100">Yes</span> : <span className="text-slate-400">No</span>}
                            </td>
                            <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-normal leading-relaxed">
                              {t.delayReason || <span className="text-slate-300">-</span>}
                            </td>
                            <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-normal leading-relaxed">
                              {t.completedWorkDescription ? (
                                <div><strong className="text-emerald-700 block mb-1">Work:</strong> {t.completedWorkDescription}</div>
                              ) : t.blockedReason ? (
                                <div><strong className="text-rose-700 block mb-1">Blocked:</strong> {t.blockedReason}</div>
                              ) : t.notes ? (
                                <div><strong className="text-slate-600 block mb-1">Note:</strong> {t.notes}</div>
                              ) : <span className="text-slate-300">-</span>}
                            </td>
                            <td className="px-3 py-2.5 text-xs text-rose-600 whitespace-normal leading-relaxed font-medium">
                              {t.acceptanceStatus === 'REJECTED' ? t.rejectionReason : <span className="text-slate-300">-</span>}
                            </td>
                            <td className="px-3 py-2.5 text-xs text-right whitespace-nowrap">
                              {t.acceptanceStatus === 'REJECTED' ? (
                                <span className="px-3 py-1.5 rounded-lg font-bold border inline-block bg-rose-50 text-rose-700 border-rose-200">
                                  REJECTED
                                </span>
                              ) : t.acceptanceStatus === 'PENDING' ? (
                                <span className="px-3 py-1.5 rounded-lg font-bold border inline-block bg-amber-50 text-amber-700 border-amber-200">
                                  PENDING ACCEPTANCE
                                </span>
                              ) : (
                                <span className={`px-3 py-1.5 rounded-lg font-bold border inline-block ${getStatusColor(t.status)}`}>
                                  {(t.status || '').replace('_', ' ')}
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-xs text-right whitespace-nowrap">
                              <button onClick={() => handleEditInit(t.fullParentTask)} className="text-indigo-600 hover:text-indigo-800 font-bold bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg border border-indigo-100 transition-colors">
                                Assign Extra Task
                              </button>
                            </td>
                          </tr>
                        ))}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 sticky top-0 bg-white z-10 pb-4 border-b border-slate-100">
              <h3 className="font-heading text-xl font-bold text-slate-800">{editTask ? 'Edit & Assign Extra Task' : 'Assign New Task'}</h3>
              <button onClick={() => { setShowCreateModal(false); setEditTask(null); }} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateSubmit} className="space-y-6 text-left">
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
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Priority</label>
                            <select 
                              value={projectDetails[pid]?.priority || 'MEDIUM'} 
                              onChange={(e) => handleProjectDetailChange(pid, 'priority', e.target.value)} 
                              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
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
    </div>
  );
};
