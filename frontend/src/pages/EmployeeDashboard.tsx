import React, { useEffect, useState, useMemo } from 'react';
import { tasksApi, projectsApi, uploadsApi } from '../services/api';
import {
  Plus, Clock, AlertTriangle, Upload, Search, Calendar,
  Edit, ArrowRight, Loader2, Save, X, User
} from 'lucide-react';

type TabType = 'TODAY' | 'YESTERDAY' | 'ALL' | 'COMPLETED' | 'IN_PROGRESS' | 'DELAYED' | 'PENDING';

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
  const [showDuplicatePopup, setShowDuplicatePopup] = useState(false);
  const [showEveningReview, setShowEveningReview] = useState(false);
  
  // Forms state
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Create Task Form
  const [startTime, setStartTime] = useState('09:00 AM');
  const [expectedEnd, setExpectedEnd] = useState('');
  const [projectId, setProjectId] = useState('');
  const [description, setDescription] = useState('');
  const [changesGivenBy, setChangesGivenBy] = useState('');
  const [changesSummary, setChangesSummary] = useState('');
  
  // Edit / Review Task Form
  const [editTask, setEditTask] = useState<any | null>(null);
  const [reviewStatus, setReviewStatus] = useState('');
  const [completedWork, setCompletedWork] = useState('');
  const [delayReason, setDelayReason] = useState('');
  const [blockedReason, setBlockedReason] = useState('');
  const [completionPercentage, setCompletionPercentage] = useState<number>(0);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

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

  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  const todayTask = useMemo(() => tasks.find(t => new Date(t.date).toDateString() === today), [tasks, today]);
  const yesterdayTask = useMemo(() => tasks.find(t => new Date(t.date).toDateString() === yesterday), [tasks, yesterday]);

  // Check Evening Review
  useEffect(() => {
    const currentHour = new Date().getHours();
    // Evening workflow triggers at 6 PM (18:00) or later
    if (currentHour >= 18 && todayTask) {
      const isReviewSubmitted = todayTask.status !== 'PENDING' && (todayTask.completedWorkDescription || todayTask.status === 'DELAYED' || todayTask.status === 'BLOCKED');
      if (!isReviewSubmitted) {
        setEditTask(todayTask);
        setReviewStatus(todayTask.status === 'PENDING' ? '' : todayTask.status);
        setCompletedWork(todayTask.completedWorkDescription || '');
        setDelayReason(todayTask.delayReason || '');
        setBlockedReason(todayTask.blockedReason || '');
        setCompletionPercentage(todayTask.completionPercentage || 0);
        setShowEveningReview(true);
      }
    }
  }, [todayTask, tasks]);

  const handleCreateTaskInit = () => {
    if (todayTask) {
      setShowDuplicatePopup(true);
    } else {
      setShowCreateModal(true);
    }
  };

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
        changesGivenBy: changesGivenBy || undefined,
        changesSummary: changesSummary || undefined,
        status: 'PENDING',
      });
      setShowCreateModal(false);
      setProjectId('');
      setDescription('');
      setChangesGivenBy('');
      setChangesSummary('');
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
    setReviewStatus(task.status);
    setCompletedWork(task.completedWorkDescription || '');
    setDelayReason(task.delayReason || '');
    setBlockedReason(task.blockedReason || '');
    setCompletionPercentage(task.completionPercentage || 0);
    setShowEveningReview(true);
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTask || !reviewStatus) return;
    setIsSubmitting(true);
    try {
      let screenshotUrl = editTask.screenshotUrl;
      if (uploadFile) {
        const uploadRes = await uploadsApi.upload(uploadFile);
        screenshotUrl = uploadRes.data.url;
      }

      await tasksApi.update(editTask.id, {
        status: reviewStatus,
        completedWorkDescription: reviewStatus === 'COMPLETED' ? completedWork : undefined,
        delayReason: reviewStatus === 'DELAYED' ? delayReason : undefined,
        blockedReason: reviewStatus === 'BLOCKED' ? blockedReason : undefined,
        completionPercentage: Number(completionPercentage),
        screenshotUrl,
      });

      setShowEveningReview(false);
      setUploadFile(null);
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

  const filteredTasks = useMemo(() => {
    let filtered = tasks;
    if (activeTab === 'COMPLETED') filtered = filtered.filter(t => t.status === 'COMPLETED');
    else if (activeTab === 'IN_PROGRESS') filtered = filtered.filter(t => t.status === 'IN_PROGRESS');
    else if (activeTab === 'DELAYED') filtered = filtered.filter(t => t.status === 'DELAYED');
    else if (activeTab === 'PENDING') filtered = filtered.filter(t => t.status === 'PENDING');
    
    if (searchQuery) {
      filtered = filtered.filter(t => t.description.toLowerCase().includes(searchQuery.toLowerCase()) || 
        t.project?.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    if (filterProject) {
      filtered = filtered.filter(t => t.projectId.toString() === filterProject);
    }
    return filtered;
  }, [tasks, activeTab, searchQuery, filterProject]);

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
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
          
          {/* TODAY'S TASK VIEW */}
          {activeTab === 'TODAY' && (
            <div className="p-6">
              {!todayTask ? (
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
                <div className="max-w-3xl mx-auto border border-indigo-100 bg-indigo-50/30 rounded-2xl p-6 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 text-[10px] font-extrabold uppercase rounded-full mb-2">
                        {todayTask.project?.name}
                      </span>
                      <h3 className="text-xl font-heading font-bold text-slate-800">{todayTask.description}</h3>
                    </div>
                    <span className="px-3 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600">
                      {todayTask.status}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm mb-6 bg-white p-4 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-slate-400 text-xs font-semibold uppercase block mb-1">Date</span>
                      <span className="font-medium text-slate-800">{new Date(todayTask.date).toLocaleDateString()}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-xs font-semibold uppercase block mb-1">Task Source</span>
                      <span className="font-medium text-slate-800">{todayTask.employeeId === todayTask.createdById ? 'Self Created' : 'Admin Assigned'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-xs font-semibold uppercase block mb-1">Timing</span>
                      <span className="font-medium text-slate-800">{todayTask.startTime} - {new Date(todayTask.expectedCompletionDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                    {todayTask.changesGivenBy && (
                      <div>
                        <span className="text-slate-400 text-xs font-semibold uppercase block mb-1">Changes By</span>
                        <span className="font-medium text-slate-800">{todayTask.changesGivenBy}</span>
                      </div>
                    )}
                  </div>
                  
                  {todayTask.changesSummary && (
                    <div className="mb-6 bg-amber-50 border border-amber-100 rounded-xl p-4">
                      <span className="text-amber-800 text-xs font-semibold uppercase block mb-1">Changes Summary</span>
                      <span className="text-sm text-amber-900">{todayTask.changesSummary}</span>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button onClick={() => handleEditInit(todayTask)} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition-colors">
                      <Edit size={16} /> Edit Task / Review
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* YESTERDAY'S TASK VIEW */}
          {activeTab === 'YESTERDAY' && (
            <div className="p-6">
              {!yesterdayTask ? (
                <div className="text-center py-16 text-slate-500">No task was logged yesterday.</div>
              ) : (
                <div className="max-w-3xl mx-auto">
                  {['IN_PROGRESS', 'DELAYED', 'BLOCKED'].includes(yesterdayTask.status) && !yesterdayTask.carryForwardedTo && !todayTask && (
                    <div className="mb-6 p-4 rounded-xl border border-amber-200 bg-amber-50 flex items-start gap-4">
                      <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
                      <div className="flex-1">
                        <h4 className="font-bold text-amber-800 mb-1">Carry Forward Task</h4>
                        <p className="text-sm text-amber-700 mb-4">Would you like to continue yesterday's task today?</p>
                        <div className="flex gap-3">
                          <button onClick={() => handleCarryForward(yesterdayTask.id, true)} className="px-4 py-2 bg-amber-600 text-white text-xs font-bold rounded-lg hover:bg-amber-700">
                            Carry Forward
                          </button>
                          <button onClick={() => handleCarryForward(yesterdayTask.id, false)} className="px-4 py-2 bg-white text-amber-800 border border-amber-200 text-xs font-bold rounded-lg hover:bg-amber-100">
                            Ignore
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="border border-slate-200 rounded-2xl p-6 shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-heading font-bold text-slate-800">{yesterdayTask.description}</h3>
                      <span className="px-3 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-bold text-slate-600">
                        {yesterdayTask.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">Project: <span className="font-semibold">{yesterdayTask.project?.name}</span></p>
                    <p className="text-sm text-slate-600">Date: <span className="font-semibold">{new Date(yesterdayTask.date).toLocaleDateString()}</span></p>
                    {yesterdayTask.status === 'DELAYED' && yesterdayTask.delayReason && (
                      <div className="mt-4 p-3 bg-rose-50 border border-rose-100 rounded-lg text-rose-800 text-sm">
                        <span className="font-bold">Delay Reason:</span> {yesterdayTask.delayReason}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* LIST VIEWS (ALL / COMPLETED / IN_PROGRESS / DELAYED / PENDING) */}
          {['ALL', 'COMPLETED', 'IN_PROGRESS', 'DELAYED', 'PENDING'].includes(activeTab) && (
            <div className="p-6">
              {activeTab === 'ALL' && (
                <div className="flex gap-4 mb-6">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      type="text"
                      placeholder="Search tasks..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <select 
                    value={filterProject}
                    onChange={e => setFilterProject(e.target.value)}
                    className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none"
                  >
                    <option value="">All Projects</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="max-h-[75vh] overflow-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 z-20 bg-slate-200 outline outline-1 outline-slate-400 shadow-sm">
                    <tr className="bg-slate-200 divide-x divide-slate-400">
                      <th className="px-5 py-4 text-xs font-extrabold text-slate-800 uppercase tracking-wider">Date</th>
                      <th className="px-5 py-4 text-xs font-extrabold text-slate-800 uppercase tracking-wider">Project</th>
                      <th className="px-5 py-4 text-xs font-extrabold text-slate-800 uppercase tracking-wider w-[200px]">Task</th>
                      <th className="px-5 py-4 text-xs font-extrabold text-slate-800 uppercase tracking-wider">Completion</th>
                      <th className="px-5 py-4 text-xs font-extrabold text-slate-800 uppercase tracking-wider">Screenshot</th>
                      <th className="px-5 py-4 text-xs font-extrabold text-slate-800 uppercase tracking-wider">Start Time</th>
                      <th className="px-5 py-4 text-xs font-extrabold text-slate-800 uppercase tracking-wider">Expected End</th>
                      <th className="px-5 py-4 text-xs font-extrabold text-slate-800 uppercase tracking-wider">Delay (Y/N)</th>
                      <th className="px-5 py-4 text-xs font-extrabold text-slate-800 uppercase tracking-wider w-[150px]">Delay Reason</th>
                      <th className="px-5 py-4 text-xs font-extrabold text-slate-800 uppercase tracking-wider w-[200px]">Extra Note</th>
                      <th className="px-5 py-4 text-xs font-extrabold text-slate-800 uppercase tracking-wider text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-400">
                    {filteredTasks.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="text-center py-12 text-slate-500 text-sm">No tasks found matching criteria.</td>
                      </tr>
                    ) : (
                      filteredTasks.map(t => (
                        <tr key={t.id} className="hover:bg-slate-50 transition-colors align-top divide-x divide-slate-400">
                          <td className="px-5 py-5 text-sm text-slate-500 font-medium whitespace-nowrap">{new Date(t.date).toLocaleDateString()}</td>
                          <td className="px-5 py-5 text-sm text-indigo-700 font-bold whitespace-nowrap">{t.project?.name}</td>
                          <td className="px-5 py-5 text-sm text-slate-700 leading-relaxed whitespace-normal min-w-[200px]">
                            {t.description}
                          </td>
                          <td className="px-5 py-5 text-sm text-slate-700 font-bold whitespace-nowrap">{t.completionPercentage || 0}%</td>
                          <td className="px-5 py-5 text-xs text-slate-700 whitespace-nowrap">
                            {t.screenshotUrl ? (
                              <a href={`http://localhost:3000/${t.screenshotUrl}`} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline font-semibold bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 inline-block">
                                View
                              </a>
                            ) : <span className="text-slate-300">-</span>}
                          </td>
                          <td className="px-5 py-5 text-xs text-slate-700 whitespace-nowrap">{t.startTime}</td>
                          <td className="px-5 py-5 text-xs text-slate-700 whitespace-nowrap">
                            {new Date(t.expectedCompletionDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="px-5 py-5 text-xs font-bold text-slate-700 whitespace-nowrap">
                            {t.status === 'DELAYED' ? <span className="text-rose-700 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-100">Yes</span> : <span className="text-slate-400">No</span>}
                          </td>
                          <td className="px-5 py-5 text-xs text-slate-600 whitespace-normal leading-relaxed min-w-[150px]">
                            {t.delayReason || <span className="text-slate-300">-</span>}
                          </td>
                          <td className="px-5 py-5 text-xs text-slate-600 whitespace-normal leading-relaxed min-w-[200px]">
                            {t.completedWorkDescription ? (
                              <div><strong className="text-emerald-700 block mb-1">Work:</strong> {t.completedWorkDescription}</div>
                            ) : t.blockedReason ? (
                              <div><strong className="text-rose-700 block mb-1">Blocked:</strong> {t.blockedReason}</div>
                            ) : t.notes ? (
                              <div><strong className="text-slate-600 block mb-1">Note:</strong> {t.notes}</div>
                            ) : <span className="text-slate-300">-</span>}
                          </td>
                          <td className="px-5 py-5 text-xs font-bold text-right whitespace-nowrap">
                            <span className={`px-3 py-1.5 rounded-lg border inline-block ${
                              t.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              t.status === 'DELAYED' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                              t.status === 'IN_PROGRESS' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                              t.status === 'BLOCKED' ? 'bg-rose-100 text-rose-800 border-rose-300' :
                              'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {t.status.replace('_', ' ')}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODALS */}

      {/* Duplicate Popup */}
      {showDuplicatePopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-center">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 mx-auto mb-4">
              <AlertTriangle size={24} />
            </div>
            <h3 className="font-heading text-lg font-bold text-slate-800 mb-2">Today's Task Already Exists</h3>
            <p className="text-sm text-slate-500 mb-6">A task has already been created for today. Would you like to edit the existing task?</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setShowDuplicatePopup(false)} className="px-4 py-2 bg-slate-100 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-200">
                Cancel
              </button>
              <button 
                onClick={() => {
                  setShowDuplicatePopup(false);
                  if (todayTask) handleEditInit(todayTask);
                }} 
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-500 shadow-md"
              >
                Edit Existing Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-heading text-xl font-bold text-slate-800">Create Today's Task</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Project</label>
                <select value={projectId} onChange={(e) => setProjectId(e.target.value)} required className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20">
                  <option value="">Select Project</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Task Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} required placeholder="What are you working on?" className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 min-h-[80px]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Start Time</label>
                  <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Expected End Time</label>
                  <input type="datetime-local" value={expectedEnd} onChange={(e) => setExpectedEnd(e.target.value)} required className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Changes Given By (Optional)</label>
                <input type="text" value={changesGivenBy} onChange={(e) => setChangesGivenBy(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20" />
              </div>
              {changesGivenBy && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Changes Summary</label>
                  <textarea value={changesSummary} onChange={(e) => setChangesSummary(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20" />
                </div>
              )}
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-5 py-2.5 rounded-xl text-sm font-bold bg-slate-100 text-slate-600 hover:bg-slate-200">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-500 shadow-md disabled:opacity-50 flex items-center gap-2">
                  {isSubmitting && <Loader2 size={16} className="animate-spin" />} Submit Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Evening Review Modal (Mandatory popup style) */}
      {showEveningReview && editTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4">
          <div className="w-full max-w-xl rounded-2xl border border-slate-700 bg-white shadow-2xl animate-in slide-in-from-bottom-10 duration-300 max-h-[90vh] overflow-y-auto">
            <div className="bg-slate-900 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="font-heading text-lg font-bold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                Today's Work Review
              </h3>
              {/* No close button if mandatory, but we'll allow closing if it's manually triggered */}
              <button onClick={() => setShowEveningReview(false)} className="text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleReviewSubmit} className="p-6 space-y-5">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-2">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">Assigned Task</span>
                <p className="text-sm font-semibold text-slate-800">{editTask.description}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Today's Status</label>
                <div className="flex flex-wrap gap-3">
                  {['COMPLETED', 'IN_PROGRESS', 'DELAYED', 'BLOCKED'].map((st) => (
                    <label key={st} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border cursor-pointer transition-all ${reviewStatus === st ? 'border-indigo-500 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
                      <input 
                        type="radio" 
                        name="status" 
                        value={st} 
                        checked={reviewStatus === st} 
                        onChange={(e) => setReviewStatus(e.target.value)} 
                        className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500"
                        required
                      />
                      <span className="text-sm font-bold">{st.replace('_', ' ')}</span>
                    </label>
                  ))}
                </div>
              </div>

              {reviewStatus === 'COMPLETED' && (
                <div className="animate-in fade-in slide-in-from-top-2">
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Completed Work Description</label>
                  <textarea 
                    value={completedWork} 
                    onChange={(e) => setCompletedWork(e.target.value)} 
                    required 
                    placeholder="E.g. Created Order APIs, Added Status Flow..."
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 min-h-[100px]" 
                  />
                </div>
              )}

              {reviewStatus === 'DELAYED' && (
                <div className="animate-in fade-in slide-in-from-top-2">
                  <label className="block text-xs font-bold text-rose-600 uppercase tracking-wider mb-1.5">Delay Reason</label>
                  <textarea 
                    value={delayReason} 
                    onChange={(e) => setDelayReason(e.target.value)} 
                    required 
                    placeholder="Why was the task delayed?"
                    className="w-full rounded-xl border border-rose-200 bg-rose-50/30 px-4 py-3 text-sm focus:ring-2 focus:ring-rose-500/20" 
                  />
                </div>
              )}

              {reviewStatus === 'BLOCKED' && (
                <div className="animate-in fade-in slide-in-from-top-2">
                  <label className="block text-xs font-bold text-rose-600 uppercase tracking-wider mb-1.5">Blocked Reason</label>
                  <textarea 
                    value={blockedReason} 
                    onChange={(e) => setBlockedReason(e.target.value)} 
                    required 
                    placeholder="What is blocking this task?"
                    className="w-full rounded-xl border border-rose-200 bg-rose-50/30 px-4 py-3 text-sm focus:ring-2 focus:ring-rose-500/20" 
                  />
                </div>
              )}

              <div>
                <label className="flex justify-between items-end mb-1.5">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Completion Percentage</span>
                  <span className="text-sm font-extrabold text-indigo-600">{completionPercentage}%</span>
                </label>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  step="5"
                  value={completionPercentage} 
                  onChange={(e) => setCompletionPercentage(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600" 
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">Upload Screenshot (Optional)</label>
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-20 border border-slate-300 border-dashed rounded-xl cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <p className="text-sm text-slate-500">
                        {uploadFile ? <span className="font-bold text-indigo-600">{uploadFile.name}</span> : 'Click to upload'}
                      </p>
                    </div>
                    <input type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files && setUploadFile(e.target.files[0])} />
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <button 
                  type="submit" 
                  disabled={isSubmitting || !reviewStatus} 
                  className="w-full py-3.5 rounded-xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2 transition-all"
                >
                  {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} 
                  Submit Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
