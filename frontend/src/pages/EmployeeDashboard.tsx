import React, { useEffect, useState, useMemo } from 'react';
import { tasksApi, projectsApi, uploadsApi } from '../services/api';
import {
  Plus, AlertTriangle, Search, Calendar,
  Edit, Loader2, Save, X, CheckSquare, AlertCircle
} from 'lucide-react';
import { ErrorBoundary } from '../components/ErrorBoundary';

type TabType = 'TODAY' | 'YESTERDAY' | 'ALL' | 'COMPLETED' | 'IN_PROGRESS' | 'DELAYED' | 'PENDING';

const getLocalYYYYMMDD = (d?: Date | string | number | null) => {
  if (!d) d = new Date();
  const dateObj = new Date(d);
  if (isNaN(dateObj.getTime())) return '';
  const tzoffset = dateObj.getTimezoneOffset() * 60000;
  return new Date(dateObj.getTime() - tzoffset).toISOString().split('T')[0];
};

export const EmployeeDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('TODAY');
  const [tasks, setTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filter for All Tasks
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProject, setFilterProject] = useState('');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEveningReview, setShowEveningReview] = useState(false);
  
  // Forms state
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Create Task Form
  const [startDate, setStartDate] = useState(() => getLocalYYYYMMDD());
  const [startTime, setStartTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [expectedEndDateType, setExpectedEndDateType] = useState<'today'|'tomorrow'|'custom'>('today');
  const [expectedEndDate, setExpectedEndDate] = useState('');
  
  // Multi-Project selection and details
  const [selectedProjects, setSelectedProjects] = useState<number[]>([]);
  const [projectDetails, setProjectDetails] = useState<Record<number, { taskDescription: string, changesGivenBy: string, changesSummary: string }>>({});
  
  const [showDuplicatePopup, setShowDuplicatePopup] = useState(false);
  
  // Edit / Review Task Form
  const [editTask, setEditTask] = useState<any | null>(null);
  const [editStartTime, setEditStartTime] = useState('');
  const [editExpectedEndDate, setEditExpectedEndDate] = useState('');
  const [reviewProjects, setReviewProjects] = useState<Record<number, { 
    id?: number,
    status: string, 
    completedWorkDescription: string, 
    delayReason: string, 
    blockedReason: string, 
    completionPercentage: number,
    screenshotUrl?: string,
    uploadFile?: File | null
  }>>({});
  
  const [rejectingTask, setRejectingTask] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const [taskUpdatedBanner, setTaskUpdatedBanner] = useState(false);
  const [hasPromptedEveningReview, setHasPromptedEveningReview] = useState(false);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const [tasksRes, projectsRes] = await Promise.all([
        tasksApi.list(),
        projectsApi.list(),
      ]);
      setTasks(tasksRes.data);
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

  useEffect(() => {
    const handleSyncTasks = () => {
      fetchDashboardData();
      setTaskUpdatedBanner(true);
    };

    const handleSyncGeneral = () => {
      fetchDashboardData();
    };

    window.addEventListener('sync-tasks', handleSyncTasks);
    window.addEventListener('sync-projects', handleSyncGeneral);
    window.addEventListener('sync-metrics', handleSyncGeneral);

    return () => {
      window.removeEventListener('sync-tasks', handleSyncTasks);
      window.removeEventListener('sync-projects', handleSyncGeneral);
      window.removeEventListener('sync-metrics', handleSyncGeneral);
    };
  }, []);

  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  const todayTasks = useMemo(() => tasks.filter(t => new Date(t.startDate).toDateString() === today), [tasks, today]);
  const todayTask = todayTasks.length > 0 ? todayTasks[0] : null;
  const yesterdayTask = useMemo(() => tasks.find(t => new Date(t.startDate).toDateString() === yesterday), [tasks, yesterday]);

  // Check Evening Review
  useEffect(() => {
    const currentHour = new Date().getHours();
    if (currentHour >= 18 && todayTask && !hasPromptedEveningReview) {
      const hasPendingReviews = todayTask.projects?.some((p: any) => 
        p.status === 'PENDING' || (!p.completedWorkDescription && p.status !== 'DELAYED' && p.status !== 'BLOCKED')
      );
      if (hasPendingReviews && !showEveningReview && !showCreateModal) {
        setHasPromptedEveningReview(true);
        // Removed auto handleEditInit(todayTask) to prevent forced Edit Task modal
      }
    }
  }, [todayTask, tasks, showCreateModal, showEveningReview, hasPromptedEveningReview]);

  const handleCreateTaskInit = () => {
    if (todayTask) {
      setShowDuplicatePopup(true);
    } else {
      setEditTask(null);
      setStartDate(getLocalYYYYMMDD());
      setStartTime(new Date().toTimeString().slice(0, 5));
      setExpectedEndDateType('today');
      setExpectedEndDate('');
      setSelectedProjects([]);
      setProjectDetails({});
      setShowCreateModal(true);
    }
  };

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
          [projectId]: { taskDescription: '', changesGivenBy: '', changesSummary: '' }
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

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();

    let finalExpectedEndDate = expectedEndDate;
    if (expectedEndDateType === 'today') {
      finalExpectedEndDate = startDate;
    } else if (expectedEndDateType === 'tomorrow') {
      const tomorrow = new Date(startDate);
      tomorrow.setDate(tomorrow.getDate() + 1);
      finalExpectedEndDate = getLocalYYYYMMDD(tomorrow);
    }

    if (selectedProjects.length === 0 || !startDate || !startTime || !finalExpectedEndDate) return;
    
    // Validate required description for each project
    for (const pid of selectedProjects) {
      if (!projectDetails[pid]?.taskDescription) {
        alert('Please provide a task description for all selected projects.');
        return;
      }
    }

    if (new Date(finalExpectedEndDate) < new Date(startDate)) {
      alert("Expected End Date cannot be before Start Date.");
      return;
    }

    if (editTask) {
      const reviews: Record<number, any> = {};
      selectedProjects.forEach(pid => {
        const existing = editTask.projects?.find((p: any) => p.projectId === pid);
        if (existing) {
          reviews[pid] = {
            id: existing.id,
            status: existing.status || 'PENDING',
            completedWorkDescription: existing.completedWorkDescription || '',
            delayReason: existing.delayReason || '',
            blockedReason: existing.blockedReason || '',
            completionPercentage: existing.completionPercentage || 0,
            screenshotUrl: existing.updates ? existing.updates.find((u: any) => u.screenshotUrl)?.screenshotUrl : undefined,
            uploadFile: null,
          };
        } else {
          reviews[pid] = {
            status: 'PENDING',
            completedWorkDescription: '',
            delayReason: '',
            blockedReason: '',
            completionPercentage: 0,
            uploadFile: null,
          };
        }
      });
      setReviewProjects(reviews);
      setEditStartTime(startTime);
      setEditExpectedEndDate(finalExpectedEndDate);
      setShowCreateModal(false);
      setShowEveningReview(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const projectsPayload = selectedProjects.map(pid => ({
        projectId: pid,
        taskDescription: projectDetails[pid].taskDescription,
        changesGivenBy: projectDetails[pid].changesGivenBy || undefined,
        changesSummary: projectDetails[pid].changesSummary || undefined,
        status: 'PENDING',
      }));

      await tasksApi.create({
        startDate: new Date(startDate).toISOString(),
        startTime,
        expectedEndDate: new Date(finalExpectedEndDate).toISOString(),
        projects: projectsPayload,
      });
      setShowCreateModal(false);
      setSelectedProjects([]);
      setProjectDetails({});
      await fetchDashboardData();
    } catch (err: any) {
      if (err.response?.status === 400) {
        setShowCreateModal(false);
        setShowDuplicatePopup(true);
      } else {
        console.error('Failed to create task:', err);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditInit = (task: any) => {
    setEditTask(task);
    setStartDate(task.startDate ? getLocalYYYYMMDD(task.startDate) : getLocalYYYYMMDD(new Date()));
    setStartTime(task.startTime || '');
    
    try {
      const expDate = task.expectedEndDate ? new Date(task.expectedEndDate) : new Date();
      if (isNaN(expDate.getTime())) throw new Error("Invalid date");
      const localISODate = getLocalYYYYMMDD(expDate);
      setExpectedEndDate(localISODate);
      setExpectedEndDateType('custom');
    } catch (e) {
      setExpectedEndDate(getLocalYYYYMMDD(new Date()));
      setExpectedEndDateType('custom');
    }

    const selProj: number[] = [];
    const projDetails: Record<number, any> = {};
    if (task.projects) {
      task.projects.forEach((p: any) => {
        selProj.push(p.projectId);
        projDetails[p.projectId] = {
          taskDescription: p.taskDescription || '',
          changesGivenBy: p.changesGivenBy || '',
          changesSummary: p.changesSummary || ''
        };
      });
    }
    setSelectedProjects(selProj);
    setProjectDetails(projDetails);
    
    setShowEveningReview(false);
    setShowCreateModal(true);
  };

  const handleReviewChange = (taskProjectId: number, field: string, value: any) => {
    setReviewProjects(prev => ({
      ...prev,
      [taskProjectId]: { ...prev[taskProjectId], [field]: value }
    }));
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTask) return;
    setIsSubmitting(true);
    try {
      const projectsPayload = [];
      
      for (const [idStr, review] of Object.entries(reviewProjects)) {
        const pid = parseInt(idStr);
        let finalScreenshotUrl = review.screenshotUrl;
        if (review.uploadFile) {
          const uploadRes = await uploadsApi.upload(review.uploadFile);
          finalScreenshotUrl = uploadRes.data.url;
        }

        projectsPayload.push({
          id: review.id,
          projectId: pid,
          taskDescription: projectDetails[pid]?.taskDescription,
          changesGivenBy: projectDetails[pid]?.changesGivenBy || undefined,
          changesSummary: projectDetails[pid]?.changesSummary || undefined,
          status: review.status,
          completedWorkDescription: review.status === 'COMPLETED' ? review.completedWorkDescription : undefined,
          delayReason: review.status === 'DELAYED' ? review.delayReason : undefined,
          blockedReason: review.status === 'BLOCKED' ? review.blockedReason : undefined,
          completionPercentage: Number(review.completionPercentage),
          screenshotUrl: finalScreenshotUrl,
        });
      }

      await tasksApi.update(editTask.id, {
        startDate: new Date(startDate).toISOString(),
        startTime: editStartTime,
        expectedEndDate: new Date(editExpectedEndDate).toISOString(),
        projects: projectsPayload,
      });

      setShowEveningReview(false);
      setEditTask(null);
      await fetchDashboardData();
    } catch (err) {
      console.error('Failed to submit review:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCarryForward = async (taskId: number, carryForward: boolean) => {
    try {
      await tasksApi.handleCarryForward({ taskId, carryForward });
      await fetchDashboardData();
    } catch (err) {
      console.error('Failed to carry forward:', err);
    }
  };

  // Flatten tasks for list view
  const flattenedTasks = useMemo(() => {
    const flat = [];
    for (const t of tasks) {
      if (t.projects && t.projects.length > 0) {
        for (const p of t.projects) {
          flat.push({
            ...t,
            taskId: t.id,
            projectId: p.projectId,
            project: p.project,
            taskProjectId: p.id,
            taskDescription: p.taskDescription,
            changesGivenBy: p.changesGivenBy,
            changesSummary: p.changesSummary,
            status: p.status,
            delayReason: p.delayReason,
            blockedReason: p.blockedReason,
            completedWorkDescription: p.completedWorkDescription,
            completionPercentage: p.completionPercentage,
            notes: p.notes,
            acceptanceStatus: p.acceptanceStatus,
            rejectionReason: p.rejectionReason,
            screenshotUrl: p.updates ? p.updates.find((u: any) => u.screenshotUrl)?.screenshotUrl : null,
          });
        }
      }
    }
    return flat;
  }, [tasks]);

  const handleAcceptTask = async (taskId: number) => {
    try {
      await tasksApi.acceptPending(taskId);
      fetchDashboardData();
    } catch (error) {
      console.error(error);
      alert('Failed to accept task.');
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectionReason.trim()) {
      alert("Please provide a reason for rejection.");
      return;
    }
    try {
      await tasksApi.rejectPending(rejectingTask.taskId, rejectionReason);
      setRejectingTask(null);
      setRejectionReason('');
      fetchDashboardData();
    } catch (error) {
      console.error(error);
      alert('Failed to reject task.');
    }
  };

  const filteredTasks = useMemo(() => {
    let filtered = flattenedTasks;
    if (activeTab === 'YESTERDAY') filtered = filtered.filter(t => new Date(t.startDate).toDateString() === yesterday);
    else if (activeTab === 'COMPLETED') filtered = filtered.filter(t => t.status === 'COMPLETED');
    else if (activeTab === 'IN_PROGRESS') filtered = filtered.filter(t => t.status === 'IN_PROGRESS');
    else if (activeTab === 'DELAYED') filtered = filtered.filter(t => t.status === 'DELAYED');
    else if (activeTab === 'PENDING') filtered = filtered.filter(t => t.status === 'PENDING');
    
    if (searchQuery) {
      filtered = filtered.filter(t => 
        (t.taskDescription && t.taskDescription.toLowerCase().includes(searchQuery.toLowerCase())) || 
        (t.project?.name && t.project.name.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    if (filterProject) {
      filtered = filtered.filter(t => t.projectId.toString() === filterProject);
    }
    return filtered;
  }, [flattenedTasks, activeTab, searchQuery, filterProject, yesterday]);

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

  return (
    <ErrorBoundary>
      <div className="space-y-6 animate-in fade-in duration-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-heading font-extrabold text-slate-800">My Tasks</h2>
            <p className="text-xs text-slate-550">Manage your daily work schedules and reviews.</p>
          </div>
          <button
            onClick={handleCreateTaskInit}
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2"
          >
            <Plus size={16} /> Create Today's Task
          </button>
        </div>

        {taskUpdatedBanner && (
          <div className="bg-indigo-50 border border-indigo-200 p-4 rounded-xl flex items-start justify-between shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex gap-3">
              <div className="bg-indigo-100 text-indigo-600 p-2 rounded-lg">
                <AlertTriangle size={20} />
              </div>
              <div>
                <h4 className="font-bold text-indigo-900">Admin Updated Your Tasks</h4>
                <p className="text-sm text-indigo-800 mt-0.5">An admin has allocated extra tasks or modified your current task list. The updates have been loaded automatically.</p>
              </div>
            </div>
            <button onClick={() => setTaskUpdatedBanner(false)} className="text-indigo-400 hover:text-indigo-700 bg-indigo-100 hover:bg-indigo-200 p-1.5 rounded-lg transition-colors cursor-pointer">
              <X size={16} />
            </button>
          </div>
        )}

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
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
          
          {/* TODAY'S TASK VIEW */}
          {activeTab === 'TODAY' && (
            <div className="p-6">
              {todayTasks.length === 0 ? (
                <div className="text-center py-16">
                  <div className="mx-auto w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                    <Calendar className="text-slate-400" size={24} />
                  </div>
                  <h3 className="text-lg font-heading font-bold text-slate-800 mb-2">No task logged for today</h3>
                  <p className="text-sm text-slate-500 mb-6">Start your day by logging today's assigned task.</p>
                  <button onClick={handleCreateTaskInit} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors">
                    <Plus size={16} /> Create Today's Task
                  </button>
                </div>
              ) : (
                <div className="space-y-8">
                  {todayTasks.map((task) => (
                    <div key={task.id} className="max-w-4xl mx-auto space-y-6">
                      <div className="flex justify-between items-center bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                        <div>
                          <h3 className="text-lg font-bold text-indigo-900">Today's Workspace</h3>
                          <p className="text-xs text-indigo-700 font-medium mt-1">
                            {new Date(task.startDate).toLocaleDateString()} • Started at {task.startTime} • Expected End: {new Date(task.expectedEndDate).toLocaleDateString()}
                          </p>
                        </div>
                        <button onClick={() => handleEditInit(task)} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition-colors">
                          <Edit size={16} /> Review Tasks
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {task.projects?.map((p: any) => {
                          const isNewByAdmin = p.createdAt && task.createdAt && (new Date(p.createdAt).getTime() - new Date(task.createdAt).getTime() > 60000);
                          const isEditedByAdmin = p.changesSummary || p.changesGivenBy || p.adminEditedDescription;
                          
                          return (
                          <div key={p.id} className={`border rounded-2xl p-5 shadow-sm relative overflow-hidden ${isNewByAdmin ? 'border-amber-300 bg-amber-50/50' : 'border-slate-200 bg-white'}`}>
                            <div className={`absolute top-0 left-0 w-1 h-full ${isNewByAdmin ? 'bg-amber-400' : p.status === 'COMPLETED' ? 'bg-emerald-500' : p.status === 'IN_PROGRESS' ? 'bg-indigo-500' : 'bg-slate-300'}`}></div>
                            <div className="flex justify-between items-start mb-4">
                              <div className="flex flex-col items-start gap-2">
                                <span className={`inline-block px-3 py-1 text-[10px] font-extrabold uppercase rounded-full ${isNewByAdmin ? 'bg-amber-200 text-amber-800' : 'bg-slate-100 text-slate-700'}`}>
                                  {p.project?.name}
                                </span>
                              </div>
                              <div className="flex flex-col items-end gap-1.5">
                                {(isNewByAdmin || isEditedByAdmin) && (
                                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase ${isNewByAdmin ? 'text-amber-700 bg-amber-100' : 'text-indigo-600 bg-indigo-100'}`}>
                                    Admin Update
                                  </span>
                                )}
                                  {p.acceptanceStatus === 'PENDING' ? (
                                    <div className="flex gap-1.5 mt-1">
                                      <button onClick={() => handleAcceptTask(task.id)} className="px-2 py-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded text-[9px] uppercase font-extrabold flex-1">Accept</button>
                                      <button onClick={() => setRejectingTask({ ...p, taskId: task.id })} className="px-2 py-1 bg-rose-100 text-rose-700 hover:bg-rose-200 rounded text-[9px] uppercase font-extrabold flex-1">Reject</button>
                                    </div>
                                  ) : p.acceptanceStatus === 'REJECTED' ? (
                                    <div className="flex flex-col items-end gap-1">
                                      <span className="px-2 py-1 border rounded-lg text-[10px] font-bold bg-rose-50 text-rose-700 border-rose-200">
                                        REJECTED
                                      </span>
                                      {p.rejectionReason && (
                                        <span className="text-[9px] text-rose-600 font-bold bg-white px-1.5 py-0.5 rounded border border-rose-100 max-w-[120px] truncate" title={p.rejectionReason}>
                                          {p.rejectionReason}
                                        </span>
                                      )}
                                    </div>
                                  ) : (
                                    <span className={`px-2 py-1 border rounded-lg text-[10px] font-bold ${
                                      p.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                      p.status === 'IN_PROGRESS' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                                      'bg-slate-50 text-slate-600 border-slate-200'
                                    }`}>
                                      {p.status}
                                    </span>
                                  )}
                              </div>
                            </div>
                            
                            <h4 className="font-semibold text-slate-800 text-sm mb-3">
                              {p.taskDescription}
                              {p.changesSummary && <span className="text-indigo-600 font-bold ml-1.5">{p.changesSummary}</span>}
                            </h4>
                            
                            {p.changesGivenBy && (
                              <div className="text-[10px] text-slate-500 mb-2 font-medium">
                                <span className="font-bold text-slate-400">Changes By:</span> {p.changesGivenBy}
                              </div>
                            )}

                            {p.completedWorkDescription && (
                              <div className="mt-3 p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-emerald-800 text-xs">
                                <span className="font-bold block mb-1">Completed Work Description:</span> {p.completedWorkDescription}
                              </div>
                            )}

                            {p.updates?.find((u: any) => u.screenshotUrl)?.screenshotUrl && (
                              <div className="mt-2 text-xs">
                                <a href={`http://localhost:3000/${p.updates.find((u: any) => u.screenshotUrl).screenshotUrl}`} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline font-bold inline-flex items-center gap-1">
                                  View Work Done Proof
                                </a>
                              </div>
                            )}

                            {p.delayReason && (
                              <div className="mt-3 p-3 bg-rose-50 border border-rose-100 rounded-lg text-rose-800 text-xs">
                                <span className="font-bold block mb-1">Delay Reason:</span> {p.delayReason}
                              </div>
                            )}

                            {p.blockedReason && (
                              <div className="mt-3 p-3 bg-rose-50 border border-rose-100 rounded-lg text-rose-800 text-xs">
                                <span className="font-bold block mb-1">Blocked Reason:</span> {p.blockedReason}
                              </div>
                            )}
                          </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  <div className="text-center mt-6">
                    <button onClick={() => setShowDuplicatePopup(true)} className="inline-flex items-center gap-2 rounded-xl bg-indigo-50 border border-indigo-200 px-6 py-3 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors shadow-sm">
                      <Plus size={16} /> Edit Day's Details
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}          {/* LIST VIEWS */}
          {['YESTERDAY', 'ALL', 'COMPLETED', 'IN_PROGRESS', 'DELAYED', 'PENDING'].includes(activeTab) && (
            <div className="p-6">
              {/* Carry Forward banner for YESTERDAY */}
              {activeTab === 'YESTERDAY' && yesterdayTask && yesterdayTask.projects?.some((p: any) => ['IN_PROGRESS', 'DELAYED', 'BLOCKED'].includes(p.status)) && !yesterdayTask.carryForwardedTo && (
                <div className="mb-6 p-4 rounded-xl border border-amber-200 bg-amber-50 flex items-start gap-4 max-w-4xl mx-auto shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
                  <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
                  <div className="flex-1">
                    <h4 className="font-bold text-amber-800 mb-1">Carry Forward Task</h4>
                    <p className="text-sm text-amber-700 mb-4">Would you like to continue yesterday's incomplete projects today?</p>
                    <div className="flex gap-3">
                      <button onClick={() => handleCarryForward(yesterdayTask.id, true)} className="px-4 py-2 bg-amber-600 text-white text-xs font-bold rounded-lg hover:bg-amber-700 cursor-pointer">
                        Carry Forward
                      </button>
                      <button onClick={() => handleCarryForward(yesterdayTask.id, false)} className="px-4 py-2 bg-white text-amber-800 border border-amber-200 text-xs font-bold rounded-lg hover:bg-amber-100 cursor-pointer">
                        Ignore
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Filters shown for list views */}
              <div className="flex gap-4 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="text"
                    placeholder="Search tasks..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm"
                  />
                </div>
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

              <div className="max-h-[75vh] overflow-auto rounded-2xl border border-slate-200 shadow-sm bg-white">
                <table className="w-full text-left border-collapse min-w-max">
                  <thead className="sticky top-0 z-20 bg-purple-600 outline outline-1 outline-purple-700 shadow-sm">
                    <tr className="bg-purple-600 divide-x divide-purple-500">
                      <th className="md:sticky md:left-0 md:z-30 bg-purple-600 w-[100px] min-w-[100px] max-w-[100px] px-4 py-6 text-[13px] font-extrabold text-white uppercase tracking-wider md:outline md:outline-1 md:outline-purple-700 shadow-sm">Date</th>
                      <th className="md:sticky md:left-[100px] md:z-30 bg-purple-600 w-[150px] min-w-[150px] max-w-[150px] px-4 py-6 text-[13px] font-extrabold text-white uppercase tracking-wider md:outline md:outline-1 md:outline-purple-700 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Project</th>
                      <th className="px-4 py-6 text-[13px] font-extrabold text-white uppercase tracking-wider w-[200px]">Task Description</th>
                      <th className="px-4 py-6 text-[13px] font-extrabold text-white uppercase tracking-wider">Completion</th>
                      <th className="px-4 py-6 text-[13px] font-extrabold text-white uppercase tracking-wider">Work Done Proof</th>
                      <th className="px-4 py-6 text-[13px] font-extrabold text-white uppercase tracking-wider">Start Time</th>
                      <th className="px-4 py-6 text-[13px] font-extrabold text-white uppercase tracking-wider">Expected End</th>
                      <th className="px-4 py-6 text-[13px] font-extrabold text-white uppercase tracking-wider">Delay (Y/N)</th>
                      <th className="px-4 py-6 text-[13px] font-extrabold text-white uppercase tracking-wider w-[150px]">Delay Reason</th>
                      <th className="px-4 py-6 text-[13px] font-extrabold text-white uppercase tracking-wider w-[200px]">Extra Note</th>
                      <th className="px-4 py-6 text-[13px] font-extrabold text-white uppercase tracking-wider w-[200px]">Reject Reason</th>
                      <th className="px-4 py-6 text-[13px] font-extrabold text-white uppercase tracking-wider text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-400">
                    {filteredTasks.length === 0 ? (
                      <tr>
                        <td colSpan={12} className="text-center py-12 text-slate-500 text-sm bg-white">
                          {activeTab === 'YESTERDAY' ? 'No task was logged yesterday.' : 'No tasks found matching criteria.'}
                        </td>
                      </tr>
                    ) : (
                      groupedTasks.map(group => (
                        <React.Fragment key={group.dateStr}>
                          <tr className="bg-emerald-400 border-y border-emerald-700">
                            <td colSpan={12} className="sticky left-0 z-20 bg-emerald-400 p-0 text-xs font-bold text-white text-left uppercase tracking-wider">
                              <div className="sticky left-4 px-3 py-3 inline-block">
                                {group.displayDate}
                              </div>
                            </td>
                          </tr>
                          {group.tasks.map((t, idx) => (
                            <tr key={`${t.id}-${idx}`} className="hover:bg-slate-50 transition-colors align-top divide-x divide-slate-400 bg-white">
                              <td className="md:sticky md:left-0 md:z-10 bg-white w-[100px] min-w-[100px] max-w-[100px] px-3 py-2.5 text-sm text-slate-500 font-medium whitespace-nowrap md:outline md:outline-1 md:outline-slate-400">{new Date(t.startDate).toLocaleDateString()}</td>
                              <td className="md:sticky md:left-[100px] md:z-10 bg-white w-[150px] min-w-[150px] max-w-[150px] px-3 py-2.5 text-sm text-indigo-700 font-bold whitespace-nowrap md:outline md:outline-1 md:outline-slate-400 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] truncate">{t.project?.name}</td>
                              <td className="px-3 py-2.5 text-sm text-slate-700 leading-relaxed whitespace-normal min-w-[200px]">
                                {t.taskDescription}
                                {t.changesSummary && <span className="text-indigo-600 font-bold ml-1.5 block mt-1">{t.changesSummary}</span>}
                              </td>
                              <td className="px-3 py-2.5 text-sm text-slate-700 font-bold whitespace-nowrap">{t.completionPercentage || 0}%</td>
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
                              <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-normal leading-relaxed min-w-[150px]">
                                {t.delayReason || <span className="text-slate-300">-</span>}
                              </td>
                              <td className="px-3 py-2.5 text-xs text-slate-600 whitespace-normal leading-relaxed min-w-[200px]">
                                {t.completedWorkDescription ? (
                                  <div><strong className="text-emerald-700 block mb-1">Work:</strong> {t.completedWorkDescription}</div>
                                ) : t.blockedReason ? (
                                  <div><strong className="text-rose-700 block mb-1">Blocked:</strong> {t.blockedReason}</div>
                                ) : t.notes ? (
                                  <div><strong className="text-slate-600 block mb-1">Note:</strong> {t.notes}</div>
                                ) : <span className="text-slate-300">-</span>}
                              </td>
                              <td className="px-3 py-2.5 text-xs text-rose-600 whitespace-normal leading-relaxed font-medium min-w-[200px]">
                                {t.acceptanceStatus === 'REJECTED' ? t.rejectionReason : <span className="text-slate-300">-</span>}
                              </td>
                              <td className="px-3 py-2.5 text-xs font-bold text-right whitespace-nowrap">
                                {t.acceptanceStatus === 'PENDING' ? (
                                  <div className="flex flex-col gap-1.5 items-end">
                                    <button onClick={() => handleAcceptTask(t.taskId)} className="px-3 py-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg text-[10px] uppercase font-extrabold w-full text-center cursor-pointer">Accept</button>
                                    <button onClick={() => setRejectingTask(t)} className="px-3 py-1 bg-rose-100 text-rose-700 hover:bg-rose-200 rounded-lg text-[10px] uppercase font-extrabold w-full text-center cursor-pointer">Reject</button>
                                  </div>
                                ) : t.acceptanceStatus === 'REJECTED' ? (
                                  <span className="px-3 py-1.5 rounded-lg border inline-block bg-rose-50 text-rose-700 border-rose-200">
                                    REJECTED
                                  </span>
                                ) : (
                                  <span className={`px-3 py-1.5 rounded-lg border inline-block ${
                                    t.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                    t.status === 'DELAYED' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                    t.status === 'IN_PROGRESS' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                                    t.status === 'BLOCKED' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                                    'bg-amber-50 text-amber-700 border-amber-200'
                                  }`}>
                                    {t.status.replace('_', ' ')}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Duplicate Popup */}
      {showDuplicatePopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 mb-4">
              <AlertTriangle className="h-8 w-8 text-rose-600" />
            </div>
            <h3 className="font-heading text-xl font-bold text-slate-800 mb-2">⚠ Today's Task Already Exists</h3>
            <p className="text-sm text-slate-600 mb-6">A task has already been created today. Would you like to review and edit the existing task instead?</p>
            <div className="flex justify-center gap-3">
              <button 
                onClick={() => setShowDuplicatePopup(false)} 
                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  setShowDuplicatePopup(false);
                  if (todayTask) handleEditInit(todayTask);
                }} 
                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-500 shadow-md transition-colors"
              >
                Review Existing Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6 sticky top-0 bg-white z-10 pb-4 border-b border-slate-100">
              <h3 className="font-heading text-xl font-bold text-slate-800">{editTask ? 'Edit Task' : "Create Today's Task"}</h3>
              <button onClick={() => { setShowCreateModal(false); setEditTask(null); }} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateTask} className="space-y-6">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Start Date *</label>
                  <input 
                    type="date" 
                    value={startDate} 
                    disabled
                    onChange={(e) => setStartDate(e.target.value)} 
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors text-sm font-medium bg-slate-100 text-slate-500 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Expected End Date *</label>
                  <div className="space-y-2">
                    <div className="flex gap-2 text-sm pt-2">
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input type="radio" name="endDateType" checked={expectedEndDateType === 'today'} onChange={() => setExpectedEndDateType('today')} className="accent-indigo-600" />
                        Today
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input type="radio" name="endDateType" checked={expectedEndDateType === 'tomorrow'} onChange={() => setExpectedEndDateType('tomorrow')} className="accent-indigo-600" />
                        Tomorrow
                      </label>
                      <label className="flex items-center gap-1 cursor-pointer">
                        <input type="radio" name="endDateType" checked={expectedEndDateType === 'custom'} onChange={() => setExpectedEndDateType('custom')} className="accent-indigo-600" />
                        Custom
                      </label>
                    </div>
                    {expectedEndDateType === 'custom' && (
                      <input 
                        type="date" 
                        value={expectedEndDate} 
                        min={startDate}
                        onChange={(e) => setExpectedEndDate(e.target.value)} 
                        required 
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 animate-in fade-in" 
                      />
                    )}
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Start Time *</label>
                  <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required className="w-full md:w-1/2 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20" />
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
                      <div key={pid} className="p-4 rounded-xl border border-indigo-100 bg-white shadow-sm space-y-4">
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
                            placeholder={`What are you working on for ${project?.name}?`} 
                            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 min-h-[80px]" 
                          />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Changes Given By (Optional)</label>
                            <input 
                              type="text" 
                              value={projectDetails[pid]?.changesGivenBy || ''} 
                              onChange={(e) => handleProjectDetailChange(pid, 'changesGivenBy', e.target.value)} 
                              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20" 
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Changes Summary</label>
                            <input 
                              type="text" 
                              value={projectDetails[pid]?.changesSummary || ''} 
                              onChange={(e) => handleProjectDetailChange(pid, 'changesSummary', e.target.value)} 
                              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20" 
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="pt-6 pb-6 sticky bottom-0 bg-white border-t border-slate-100 flex justify-end gap-3 mt-8 -mx-6 px-6">
                <button type="button" onClick={() => { setShowCreateModal(false); setEditTask(null); }} className="px-5 py-2.5 rounded-xl text-sm font-bold bg-slate-100 text-slate-600 hover:bg-slate-200">Cancel</button>
                <button type="submit" disabled={isSubmitting || selectedProjects.length === 0} className="px-5 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-500 shadow-md disabled:opacity-50 flex items-center gap-2">
                  {isSubmitting && <Loader2 size={16} className="animate-spin" />} {editTask ? 'Next' : 'Submit Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Evening Review Modal (Multi-Project) */}
      {showEveningReview && editTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <ErrorBoundary>
            <div className="w-full max-w-3xl rounded-2xl border border-slate-700 bg-white shadow-2xl animate-in slide-in-from-bottom-10 duration-300 max-h-[90vh] flex flex-col">
              <div className="bg-slate-900 px-6 py-4 flex items-center justify-between rounded-t-2xl shrink-0">
                <h3 className="font-heading text-lg font-bold text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                  Today's Work Review
                </h3>
                <button onClick={() => { setShowEveningReview(false); setEditTask(null); }} className="text-slate-400 hover:text-white">
                  <X size={20} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6">
                <form id="review-form" onSubmit={handleReviewSubmit} className="space-y-8">
                  
                  {/* Per Project Review */}
                  <div className="space-y-6">
                    {selectedProjects.map((pid) => {
                      const reviewState = reviewProjects[pid];
                      const project = projects.find(pr => pr.id === pid);
                      if (!reviewState || !project) return null;

                      return (
                        <div key={pid} className="border border-slate-200 rounded-2xl p-5 shadow-sm bg-white relative overflow-hidden">
                          <div className={`absolute top-0 left-0 w-1 h-full ${reviewState.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                          
                          <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-3">
                            <div>
                              <span className="inline-block px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-extrabold uppercase rounded-lg mb-2">
                                {project.name}
                              </span>
                              <h5 className="font-bold text-slate-800 text-sm">{projectDetails[pid]?.taskDescription}</h5>
                            </div>
                          </div>

                          <div className="space-y-5">
                            <div>
                              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Status</label>
                              <div className="flex flex-wrap gap-2">
                                {['PENDING', 'COMPLETED', 'IN_PROGRESS', 'DELAYED', 'BLOCKED'].map((st) => (
                                  <label key={st} className={`flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition-all ${reviewState.status === st ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
                                    <input 
                                      type="radio" 
                                      name={`status-${pid}`} 
                                      value={st} 
                                      checked={reviewState.status === st} 
                                      onChange={(e) => handleReviewChange(pid, 'status', e.target.value)} 
                                      className="w-3.5 h-3.5 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                                      required
                                    />
                                    <span className="text-xs font-bold">{st.replace('_', ' ')}</span>
                                  </label>
                                ))}
                              </div>
                            </div>

                            {reviewState.status === 'COMPLETED' && (
                              <div className="animate-in fade-in slide-in-from-top-2">
                                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Completed Work Description</label>
                                <textarea 
                                  value={reviewState.completedWorkDescription} 
                                  onChange={(e) => handleReviewChange(pid, 'completedWorkDescription', e.target.value)} 
                                  required 
                                  placeholder="What was completed?"
                                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 min-h-[60px]" 
                                />
                              </div>
                            )}

                            {reviewState.status === 'DELAYED' && (
                              <div className="animate-in fade-in slide-in-from-top-2">
                                <label className="block text-xs font-bold text-rose-600 uppercase tracking-wider mb-1.5">Delay Reason</label>
                                <textarea 
                                  value={reviewState.delayReason} 
                                  onChange={(e) => handleReviewChange(pid, 'delayReason', e.target.value)} 
                                  required 
                                  placeholder="Why was the task delayed?"
                                  className="w-full rounded-xl border border-rose-200 bg-rose-50/30 px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500/20" 
                                />
                              </div>
                            )}

                            {reviewState.status === 'BLOCKED' && (
                              <div className="animate-in fade-in slide-in-from-top-2">
                                <label className="block text-xs font-bold text-rose-600 uppercase tracking-wider mb-1.5">Blocked Reason</label>
                                <textarea 
                                  value={reviewState.blockedReason} 
                                  onChange={(e) => handleReviewChange(pid, 'blockedReason', e.target.value)} 
                                  required 
                                  placeholder="What is blocking this task?"
                                  className="w-full rounded-xl border border-rose-200 bg-rose-50/30 px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500/20" 
                                />
                              </div>
                            )}

                            <div className="animate-in fade-in slide-in-from-top-2 mt-4 p-3 bg-indigo-50/50 border border-indigo-200 border-dashed rounded-xl relative">
                              <label className="block text-xs font-bold text-indigo-900 uppercase tracking-wider mb-1.5 flex justify-between items-center">
                                Work Done Proof (Screenshot / Document)
                                <span className="text-[9px] font-black bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full uppercase tracking-widest">Optional</span>
                              </label>
                              <input 
                                type="file" 
                                onChange={(e) => handleReviewChange(pid, 'uploadFile', e.target.files ? e.target.files[0] : null)}
                                className="w-full text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-100 file:text-indigo-700 hover:file:bg-indigo-200 cursor-pointer" 
                              />
                            </div>

                            <div className="flex gap-4 items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                              <div className="flex-1">
                                <label className="flex justify-between items-end mb-1.5">
                                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Completion</span>
                                  <span className="text-xs font-extrabold text-indigo-600">{reviewState.completionPercentage}%</span>
                                </label>
                                <input 
                                  type="range" 
                                  min="0" 
                                  max="100" 
                                  step="5"
                                  value={reviewState.completionPercentage} 
                                  onChange={(e) => handleReviewChange(pid, 'completionPercentage', Number(e.target.value))}
                                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" 
                                />
                              </div>
                            </div>

                          </div>
                        </div>
                      );
                    })}
                  </div>

                </form>
              </div>

              <div className="shrink-0 p-4 border-t border-slate-200 bg-white rounded-b-2xl">
                <button 
                  type="submit" 
                  form="review-form"
                  disabled={isSubmitting} 
                  className="w-full py-3.5 rounded-xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2 transition-all"
                >
                  {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} 
                  Submit Review
                </button>
              </div>

            </div>
          </ErrorBoundary>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectingTask && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
              <div className="p-2 bg-rose-100 text-rose-600 rounded-lg">
                <AlertCircle size={24} />
              </div>
              <h3 className="font-heading text-xl font-bold text-slate-800">Reject Task Assignment</h3>
            </div>
            
            <p className="text-sm text-slate-600 mb-4 font-medium">
              You are rejecting the task: <span className="font-bold text-slate-800">"{rejectingTask.taskDescription || rejectingTask.project?.name || 'Task'}"</span>
            </p>
            
            <div className="mb-6">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Reason for rejection *</label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-colors text-sm font-medium resize-none h-32"
                placeholder="Explain why you cannot accept this task right now..."
                required
              />
            </div>
            
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => { setRejectingTask(null); setRejectionReason(''); }} 
                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleRejectSubmit} 
                className="px-5 py-2.5 rounded-xl text-sm font-bold bg-rose-600 text-white hover:bg-rose-500 shadow-md transition-colors flex items-center gap-2"
              >
                Submit Rejection
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
    </ErrorBoundary>
  );
};
