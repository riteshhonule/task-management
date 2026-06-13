import React, { useEffect, useState, useMemo } from 'react';
import { tasksApi, projectsApi, uploadsApi, leavesApi } from '../services/api';
import {
  Plus, AlertTriangle, Search, Calendar,
  Edit, Loader2, Save, X, CheckSquare, AlertCircle, Upload, ChevronRight,
  Clock, ClipboardList
} from 'lucide-react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useAuth } from '../context/AuthContext';
import { EditTaskModal } from '../components/EditTaskModal';
import { TimePicker } from '../components/TimePicker';
import { parseTimeToMinutes } from '../components/EditTaskModal';

type TabType = 'TODAY' | 'YESTERDAY' | 'ALL' | 'COMPLETED' | 'IN_PROGRESS' | 'DELAYED' | 'PENDING';

const getLocalYYYYMMDD = (d?: Date | string | number | null) => {
  if (!d) d = new Date();
  const dateObj = new Date(d);
  if (isNaN(dateObj.getTime())) return '';
  const tzoffset = dateObj.getTimezoneOffset() * 60000;
  return new Date(dateObj.getTime() - tzoffset).toISOString().split('T')[0];
};

export const EmployeeDashboard: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('TODAY');
  const [tasks, setTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [leaves, setLeaves] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingTaskId, setDeletingTaskId] = useState<number | null>(null);

  // Search & Filter for All Tasks
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProject, setFilterProject] = useState('');

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEveningReview, setShowEveningReview] = useState(false);
  
  // Reusable Edit Modal state
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
  
  // Forms state
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const DRAFT_KEY = 'employee_task_draft';

  const loadDraft = () => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  };

  const saveDraft = (selectedProjs: number[], projDetails: Record<number, any>) => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ selectedProjects: selectedProjs, projectDetails: projDetails }));
    } catch {}
  };

  const clearDraft = () => {
    try { localStorage.removeItem(DRAFT_KEY); } catch {}
  };

  // Create Task Form
  const [startDate, setStartDate] = useState(() => getLocalYYYYMMDD());
  const [startTime, setStartTime] = useState(() => new Date().toTimeString().slice(0, 5));
  
  // Multi-Project selection and details
  const [selectedProjects, setSelectedProjects] = useState<number[]>(() => {
    const draft = loadDraft();
    return draft?.selectedProjects || [];
  });
  const [projectDetails, setProjectDetails] = useState<Record<number, {
    taskDescription: string;
    changesGivenBy: string;
    changesSummary: string;
    priority: string;
    jobRoleType: string;
    customJobRole: string;
    startTime: string;
    endTime: string;
    proofRequired: boolean;
    expectedEndDate?: string;
  }>>(() => {
    const draft = loadDraft();
    return draft?.projectDetails || {};
  });

  const [showDuplicatePopup, setShowDuplicatePopup] = useState(false);
  
  // Edit / Review Task Form
  const [editTask, setEditTask] = useState<any | null>(null);
  const [editStartTime, setEditStartTime] = useState('');
  const [reviewProjects, setReviewProjects] = useState<Record<number, { 
    id?: number,
    status: string, 
    completedWorkDescription: string, 
    delayReason: string, 
    blockedReason: string, 
    completionPercentage: number,
    screenshotUrl?: string,
    uploadFile?: File | null,
    expectedEndDate?: string,
  }>>({});
  
  const [rejectingTask, setRejectingTask] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const [taskUpdatedBanner, setTaskUpdatedBanner] = useState(false);
  const [hasPromptedEveningReview, setHasPromptedEveningReview] = useState(false);

  const getPriorityColor = (prio: string) => {
    switch (prio) {
      case 'HIGH':
        return 'text-rose-700 bg-rose-50 border-rose-105';
      case 'MEDIUM':
        return 'text-amber-700 bg-amber-50 border-amber-105';
      default:
        return 'text-emerald-700 bg-emerald-50 border-emerald-105';
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


  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const [tasksRes, projectsRes, leavesRes] = await Promise.all([
        tasksApi.list(),
        projectsApi.list(),
        leavesApi.list(),
      ]);
      setTasks(tasksRes.data);
      setProjects(projectsRes.data.filter((p: any) => !p.isArchived));
      setLeaves(leavesRes.data);
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
    const draft = loadDraft();
    setEditTask(null);
    setStartDate(getLocalYYYYMMDD());
    setStartTime(new Date().toTimeString().slice(0, 5));
    if (draft && draft.selectedProjects?.length > 0) {
      setSelectedProjects(draft.selectedProjects);
      setProjectDetails(draft.projectDetails || {});
    } else {
      setSelectedProjects([]);
      setProjectDetails({});
    }
    setShowCreateModal(true);
  };

  const handleProjectToggle = (projectId: number) => {
    setSelectedProjects(prev => {
      if (prev.includes(projectId)) {
        const next = prev.filter(id => id !== projectId);
        const newDetails = { ...projectDetails };
        delete newDetails[projectId];
        setProjectDetails(newDetails);
        saveDraft(next, newDetails);
        return next;
      } else {
        const newDetailEntry = { 
          taskDescription: '', 
          changesGivenBy: '', 
          changesSummary: '',
          priority: 'MEDIUM',
          jobRoleType: 'Frontend',
          customJobRole: '',
          startTime: '09:00',
          endTime: '18:00',
          proofRequired: false,
          expectedEndDate: startDate || getLocalYYYYMMDD(),
        };
        const newDetails = { ...projectDetails, [projectId]: newDetailEntry };
        setProjectDetails(newDetails);
        const next = [...prev, projectId];
        saveDraft(next, newDetails);
        return next;
      }
    });
  };

  const handleProjectDetailChange = (projectId: number, field: string, value: string) => {
    setProjectDetails(prev => {
      const updated = {
        ...prev,
        [projectId]: { ...prev[projectId], [field]: value }
      };
      saveDraft(selectedProjects, updated);
      return updated;
    });
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedProjects.length === 0 || !startDate || !startTime) return;
    
    // Validate required description, expectedEndDate for each project and start/end time chronological order
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
            expectedEndDate: projectDetails[pid]?.expectedEndDate || (existing.expectedEndDate ? getLocalYYYYMMDD(existing.expectedEndDate) : getLocalYYYYMMDD(editTask.expectedEndDate)),
          };
        } else {
          reviews[pid] = {
            status: 'PENDING',
            completedWorkDescription: '',
            delayReason: '',
            blockedReason: '',
            completionPercentage: 0,
            uploadFile: null,
            expectedEndDate: projectDetails[pid]?.expectedEndDate || getLocalYYYYMMDD(),
          };
        }
      });
      setReviewProjects(reviews);
      setEditStartTime(startTime);
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
        priority: projectDetails[pid].priority || 'MEDIUM',
        jobRoleType: projectDetails[pid].jobRoleType || 'Frontend',
        customJobRole: projectDetails[pid].jobRoleType === 'Other' ? projectDetails[pid].customJobRole : undefined,
        startTime: projectDetails[pid].startTime || '09:00 AM',
        endTime: projectDetails[pid].endTime || '06:00 PM',
        proofRequired: projectDetails[pid].proofRequired || false,
        expectedEndDate: projectDetails[pid].expectedEndDate ? new Date(projectDetails[pid].expectedEndDate).toISOString() : undefined,
      }));

      const projectExpectedDates = selectedProjects
        .map(pid => projectDetails[pid]?.expectedEndDate ? new Date(projectDetails[pid].expectedEndDate) : null)
        .filter(d => d !== null) as Date[];
      const maxExpectedDate = projectExpectedDates.length > 0 
        ? new Date(Math.max(...projectExpectedDates.map(d => d.getTime())))
        : new Date(startDate);

      await tasksApi.create({
        startDate: new Date(startDate).toISOString(),
        startTime: projectsPayload[0]?.startTime || '09:00 AM',
        expectedEndDate: maxExpectedDate.toISOString(),
        projects: projectsPayload,
      });
      setShowCreateModal(false);
      setSelectedProjects([]);
      setProjectDetails({});
      clearDraft();
      await fetchDashboardData();
    } catch (err: any) {
      console.error('Failed to create task:', err);
      alert(err.response?.data?.message || 'Failed to create task. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditInit = (task: any) => {
    setEditTask(task);
    setStartDate(task.startDate ? getLocalYYYYMMDD(task.startDate) : getLocalYYYYMMDD(new Date()));
    setStartTime(task.startTime || '');
    const selProj: number[] = [];
    const projDetails: Record<number, any> = {};
    if (task.projects) {
      task.projects.forEach((p: any) => {
        selProj.push(p.projectId);
        projDetails[p.projectId] = {
          taskDescription: p.taskDescription || '',
          changesGivenBy: p.changesGivenBy || '',
          changesSummary: p.changesSummary || '',
          priority: p.priority || 'MEDIUM',
          jobRoleType: p.jobRoleType || 'Frontend',
          customJobRole: p.customJobRole || '',
          startTime: p.startTime || '09:00',
          endTime: p.endTime || '18:00',
          proofRequired: p.proofRequired || false,
          expectedEndDate: p.expectedEndDate ? getLocalYYYYMMDD(p.expectedEndDate) : (task.expectedEndDate ? getLocalYYYYMMDD(task.expectedEndDate) : getLocalYYYYMMDD()),
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
          expectedEndDate: review.expectedEndDate ? new Date(review.expectedEndDate).toISOString() : undefined,
        });
      }

      const projectExpectedDates = Object.values(reviewProjects)
        .map(r => r.expectedEndDate ? new Date(r.expectedEndDate) : null)
        .filter(d => d !== null) as Date[];
      const maxExpectedDate = projectExpectedDates.length > 0 
        ? new Date(Math.max(...projectExpectedDates.map(d => d.getTime())))
        : new Date(startDate);

      await tasksApi.update(editTask.id, {
        startDate: new Date(startDate).toISOString(),
        startTime: editStartTime,
        expectedEndDate: maxExpectedDate.toISOString(),
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
            adminComment: p.adminComment,
            adminCommentUpdatedAt: p.adminCommentUpdatedAt,
            adminCommentUpdatedById: p.adminCommentUpdatedById,
            adminCommentUpdatedBy: p.adminCommentUpdatedBy,
            createdAt: p.createdAt,
            assignedByUserId: p.assignedByUserId,
            assignedBy: p.assignedBy,
            assignedToUserId: p.assignedToUserId,
            assignedTo: p.assignedTo,
            assignmentType: p.assignmentType,
            priority: p.priority,
            jobRoleType: p.jobRoleType,
            customJobRole: p.customJobRole,
            startTime: p.startTime,
            endTime: p.endTime,
            proofRequired: p.proofRequired,
            reviewStatus: p.reviewStatus,
            submissions: p.submissions,
            histories: p.histories,
          });
        }
      }
    }

    if (leaves && Array.isArray(leaves)) {
      leaves.forEach((leave: any) => {
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
          flat.push({
            id: `leave-${leave.id}-${dateCopy.toISOString().split('T')[0]}`,
            startDate: dateCopy.toISOString(),
            startTime: '-',
            expectedEndDate: leave.endDate,
            employeeName: leave.employee?.name || user?.name || 'Self',
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

    return flat;
  }, [tasks, leaves]);

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
    if (activeTab === 'TODAY') filtered = filtered.filter(t => new Date(t.startDate).toDateString() === today);
    else if (activeTab === 'YESTERDAY') filtered = filtered.filter(t => new Date(t.startDate).toDateString() === yesterday);
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
  }, [flattenedTasks, activeTab, searchQuery, filterProject, today, yesterday]);

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

  const todayGroupedProjects = useMemo(() => {
    const carryForward: any[] = [];
    const selfTasks: any[] = [];
    const assignedTasks: any[] = [];

    todayTasks.forEach(task => {
      task.projects?.forEach((p: any) => {
        const projectWithTask = { ...p, parentTask: task };
        if (task.carryForwardedFromId) {
          carryForward.push(projectWithTask);
        } else if (p.assignmentType === 'SELF' || (!p.assignedByUserId || p.assignedByUserId === user?.id)) {
          selfTasks.push(projectWithTask);
        } else {
          assignedTasks.push(projectWithTask);
        }
      });
    });

    return { carryForward, selfTasks, assignedTasks };
  }, [todayTasks, user?.id]);

  const renderTodayGroupGrid = (title: string, icon: React.ReactNode, projectsList: any[], type: 'CARRY_FORWARD' | 'SELF' | 'ASSIGNED') => {
    if (projectsList.length === 0) return null;
    
    let headingBg = 'bg-slate-50 border-slate-200';
    let iconBg = 'bg-slate-100 text-slate-600';
    let accentBorder = 'border-slate-200';

    if (type === 'CARRY_FORWARD') {
      headingBg = 'bg-amber-50/50 border-amber-100/70';
      iconBg = 'bg-amber-100/80 text-amber-700';
      accentBorder = 'border-amber-200/65';
    } else if (type === 'SELF') {
      headingBg = 'bg-purple-50/40 border-purple-100/60';
      iconBg = 'bg-purple-100/80 text-purple-700';
      accentBorder = 'border-purple-200/50';
    } else if (type === 'ASSIGNED') {
      headingBg = 'bg-indigo-50/45 border-indigo-100/65';
      iconBg = 'bg-indigo-100/85 text-indigo-700';
      accentBorder = 'border-indigo-200/50';
    }

    return (
      <div className={`border rounded-2xl overflow-hidden shadow-sm bg-white ${accentBorder}`}>
        <div className={`flex items-center gap-3 px-5 py-4 border-b ${headingBg}`}>
          <div className={`p-2 rounded-xl ${iconBg} shrink-0`}>
            {icon}
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800 tracking-wide">{title}</h4>
            <p className="text-[11px] text-slate-500 font-medium">{projectsList.length} task{projectsList.length !== 1 ? 's' : ''} active</p>
          </div>
        </div>

        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {projectsList.map((p) => {
              const task = p.parentTask;
              const isNewByAdmin = p.createdAt && task?.createdAt && (new Date(p.createdAt).getTime() - new Date(task.createdAt).getTime() > 60000);
              const isEditedByAdmin = p.changesSummary || p.changesGivenBy || p.adminEditedDescription;
              
              return (
                <div 
                  key={p.id} 
                  className={`group border rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-0.5 relative overflow-hidden bg-white ${
                    isNewByAdmin ? 'border-amber-300 bg-amber-50/30' : 'border-slate-100'
                  }`}
                >
                  <div className={`absolute top-0 left-0 w-1 h-full transition-all duration-300 group-hover:w-1.5 ${
                    p.status === 'COMPLETED' ? 'bg-emerald-500' :
                    p.status === 'IN_PROGRESS' ? 'bg-indigo-500' :
                    p.status === 'DELAYED' ? 'bg-rose-500' :
                    p.status === 'BLOCKED' ? 'bg-red-650' : 'bg-slate-300'
                  }`}></div>

                  <div className="flex justify-between items-start mb-3 gap-2">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="inline-block px-2 py-0.5 text-[9px] font-extrabold uppercase rounded-full bg-slate-100 text-slate-600 tracking-wider">
                        {p.project?.name}
                      </span>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      {(isNewByAdmin || isEditedByAdmin) && (
                        <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                          Admin Update
                        </span>
                      )}

                      {p.acceptanceStatus === 'PENDING' ? (
                        <div className="flex gap-1.5 mt-0.5">
                          <button onClick={() => handleAcceptTask(task.id)} className="px-2 py-0.5 bg-emerald-100 hover:bg-emerald-250 text-emerald-800 rounded text-[9px] uppercase font-black transition-colors cursor-pointer">Accept</button>
                          <button onClick={() => setRejectingTask({ ...p, taskId: task.id })} className="px-2 py-0.5 bg-rose-100 hover:bg-rose-250 text-rose-800 rounded text-[9px] uppercase font-black transition-colors cursor-pointer">Reject</button>
                        </div>
                      ) : p.acceptanceStatus === 'REJECTED' ? (
                        <span className="px-2 py-0.5 border rounded-lg text-[9px] font-extrabold bg-rose-50 text-rose-700 border-rose-200 uppercase tracking-wider">
                          REJECTED
                        </span>
                      ) : (
                        <span className={`px-2 py-0.5 border rounded-lg text-[9px] font-extrabold tracking-wide uppercase ${getStatusColor(p.status)}`}>
                          {getStatusLabel(p.status)}
                        </span>
                      )}
                    </div>
                  </div>

                  <h5 className="font-bold text-slate-800 text-xs leading-relaxed mb-3">
                    {p.taskDescription}
                    {p.changesSummary && <span className="text-indigo-600 font-extrabold ml-1.5 bg-indigo-50 px-1 py-0.5 rounded text-[10px] inline-block">{p.changesSummary}</span>}
                  </h5>

                  {p.changesGivenBy && (
                    <div className="text-[10px] text-slate-500 mb-2.5 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <span className="font-bold text-slate-400">Request By:</span> {p.changesGivenBy}
                    </div>
                  )}

                  {p.completedWorkDescription && (
                    <div className="mt-2.5 p-2.5 bg-emerald-50/50 border border-emerald-100/80 rounded-lg text-emerald-800 text-[11px] leading-relaxed">
                      <span className="font-bold block mb-0.5 text-emerald-900">Completed Work:</span> {p.completedWorkDescription}
                    </div>
                  )}

                  {p.updates?.find((u: any) => u.screenshotUrl)?.screenshotUrl && (
                    <div className="mt-2 text-[11px] flex items-center gap-1">
                      <span className="text-slate-400 font-bold">Proof:</span>
                      <a href={uploadsApi.getFileUrl(p.updates.find((u: any) => u.screenshotUrl).screenshotUrl)} target="_blank" rel="noreferrer" className="text-indigo-600 hover:text-indigo-800 hover:underline font-bold inline-flex items-center gap-0.5 transition-colors">
                        View Proof <ChevronRight size={10} />
                      </a>
                    </div>
                  )}

                  {p.delayReason && (
                    <div className="mt-2.5 p-2.5 bg-rose-50/60 border border-rose-100 rounded-lg text-rose-800 text-[11px] leading-relaxed">
                      <span className="font-bold block mb-0.5 text-rose-900">Delay Reason:</span> {p.delayReason}
                    </div>
                  )}

                  {p.blockedReason && (
                    <div className="mt-2.5 p-2.5 bg-red-50/60 border border-red-100 rounded-lg text-red-800 text-[11px] leading-relaxed">
                      <span className="font-bold block mb-0.5 text-red-900">Blocked Reason:</span> {p.blockedReason}
                    </div>
                  )}

                  <div className="mt-3.5 pt-2.5 border-t border-slate-55 flex justify-between items-center">
                    <div className="flex gap-3">
                      {(p.assignedByUserId === user?.id || p.assignmentType === 'SELF') && task && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleEditInit(task)}
                            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer flex items-center gap-1 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingTaskId(p.id)}
                            className="text-[11px] font-bold text-rose-600 hover:text-rose-800 hover:underline cursor-pointer flex items-center gap-1 transition-colors"
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                    <button 
                      type="button"
                      onClick={() => handleOpenEditModal(p, task)}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer flex items-center gap-1 transition-colors"
                    >
                      View Details & Comments
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

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

      <>
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
                <div className="max-w-4xl mx-auto space-y-8">
                  {/* Today's Workspace Header Card */}
                  <div className="flex justify-between items-center bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                    <div>
                      <h3 className="text-lg font-bold text-indigo-900">Today's Workspace</h3>
                      <p className="text-xs text-indigo-700 font-medium mt-1">
                        {new Date(todayTasks[0].startDate).toLocaleDateString()} • Started at {todayTasks[0].startTime} • Expected End: {new Date(todayTasks[0].expectedEndDate).toLocaleDateString()}
                      </p>
                    </div>
                    <button onClick={() => handleEditInit(todayTasks[0])} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition-colors">
                      <Edit size={16} /> Review Tasks
                    </button>
                  </div>

                  {/* Render Carry Forward Section */}
                  {renderTodayGroupGrid("Carry Forward Workspace", <Clock size={18} />, todayGroupedProjects.carryForward, 'CARRY_FORWARD')}
                  
                  {/* Render Self-Assigned Section */}
                  {renderTodayGroupGrid("My Self-Assigned Tasks", <CheckSquare size={18} />, todayGroupedProjects.selfTasks, 'SELF')}
                  
                  {/* Render Assigned Section */}
                  {renderTodayGroupGrid("Assigned Workspace Tasks", <ClipboardList size={18} />, todayGroupedProjects.assignedTasks, 'ASSIGNED')}

                  <div className="text-center mt-6">
                    <button onClick={() => setShowDuplicatePopup(true)} className="inline-flex items-center gap-2 rounded-xl bg-indigo-50 border border-indigo-200 px-6 py-3 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 transition-colors shadow-sm">
                      <Plus size={16} /> Edit Day's Details
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          {/* LIST VIEWS */}
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
                    {filteredTasks.length === 0 ? (
                      <tr>
                        <td colSpan={30} className="text-center py-12 text-slate-500 text-sm bg-white">
                          {activeTab === 'YESTERDAY' ? 'No task was logged yesterday.' : 'No tasks found matching criteria.'}
                        </td>
                      </tr>
                    ) : (
                      groupedTasks.map(group => (
                        <React.Fragment key={group.dateStr}>
                          <tr className="bg-emerald-400 border-y border-emerald-700">
                            <td colSpan={30} className="sticky left-0 z-10 bg-emerald-400 p-0 text-xs font-bold text-white text-left uppercase tracking-wider">
                              <div className="sticky left-4 px-3 py-3 inline-block">
                                {group.displayDate}
                              </div>
                            </td>
                          </tr>
                          {group.tasks.map((t, idx) => {
                            const isOnLeaveRow = t.status === 'ON_LEAVE';
                            
                            if (isOnLeaveRow) {
                              return (
                                <tr key={`${t.id}-${idx}`} className="bg-red-50 hover:bg-red-100 transition-colors align-top divide-x divide-red-200 border-y-2 border-red-500 text-red-700">
                                  <td className="md:sticky md:left-0 md:z-10 bg-red-50 w-[100px] min-w-[100px] max-w-[100px] px-3 py-2.5 text-xs text-red-700 font-medium whitespace-nowrap md:outline md:outline-1 md:outline-red-200">{new Date(t.startDate).toLocaleDateString()}</td>
                                  <td className="px-3 py-2.5 text-xs text-red-700 font-bold whitespace-nowrap">LEAVE</td>
                                  <td colSpan={28} className="px-3 py-2.5 text-xs text-red-955 whitespace-normal leading-relaxed">
                                    <strong className="block text-red-800 mb-1">Leave Type: {t.leaveType}</strong>
                                    <span>Reason: {t.leaveReason}</span>
                                  </td>
                                </tr>
                              );
                            }

                            return (
                              <tr key={`${t.id}-${idx}`} className="hover:bg-slate-50 transition-colors align-top divide-x divide-slate-400 bg-white text-slate-700">
                                {/* 1. Date */}
                                <td className="md:sticky md:left-0 md:z-10 bg-white w-[100px] min-w-[100px] max-w-[100px] px-3 py-2.5 text-xs text-slate-500 font-medium whitespace-nowrap md:outline md:outline-1 md:outline-slate-400">{new Date(t.startDate).toLocaleDateString()}</td>
                                {/* 3. Role */}
                                <td className="px-3 py-2.5 text-xs text-slate-700 whitespace-nowrap font-medium">
                                  {t.jobRoleType === 'Other' ? t.customJobRole : (t.jobRoleType || 'N/A')}
                                </td>
                                {/* 4. Project */}
                                <td className="px-3 py-2.5 text-xs text-indigo-700 font-bold whitespace-nowrap">
                                  <div className="flex flex-col gap-1 items-start">
                                    <span>{t.project?.name || 'N/A'}</span>
                                    {t.carryForwardedFromId && (
                                      <span className="inline-block px-1.5 py-0.5 text-[9px] font-extrabold uppercase rounded bg-purple-100 text-purple-700 border border-purple-200">
                                        Carry Forward
                                      </span>
                                    )}
                                  </div>
                                </td>
                                {/* 5. Task */}
                                <td className="px-3 py-2.5 text-xs text-slate-700 whitespace-normal leading-relaxed min-w-[200px]">
                                  {t.taskDescription}
                                  {t.changesSummary && <span className="text-indigo-600 font-bold ml-1.5 block mt-1">{t.changesSummary}</span>}
                                </td>
                                {/* 6. Start Time */}
                                <td className="px-3 py-2.5 text-xs text-slate-700 whitespace-nowrap">{t.startTime || 'N/A'}</td>
                                {/* 7. End Time */}
                                <td className="px-3 py-2.5 text-xs text-slate-700 whitespace-nowrap">{t.endTime || 'N/A'}</td>
                                {/* 8. Task Type */}
                                <td className="px-3 py-2.5 text-xs whitespace-nowrap">{getTaskTypeBadge(t.assignmentType)}</td>
                                {/* 9. Assigned By */}
                                <td className="px-3 py-2.5 text-xs text-slate-700 whitespace-nowrap">{t.assignedBy?.name || 'Self'}</td>
                                {/* 10. Assigned To */}
                                <td className="px-3 py-2.5 text-xs text-slate-700 whitespace-nowrap">{t.assignedTo?.name || t.employee?.name || 'Self'}</td>
                                {/* 11. Proof Req */}
                                <td className="px-3 py-2.5 text-xs font-bold text-slate-600 whitespace-nowrap">{t.proofRequired ? 'Yes' : 'No'}</td>
                                {/* 12. Completion */}
                                <td className="px-3 py-2.5 text-xs text-slate-700 font-bold whitespace-nowrap">{t.completionPercentage || 0}%</td>
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
                                <td className="px-3 py-2.5 text-xs font-bold text-right whitespace-nowrap">
                                  {t.acceptanceStatus === 'PENDING' ? (
                                    <div className="flex gap-1.5 justify-end">
                                      <button onClick={() => handleAcceptTask(t.taskId)} className="px-3 py-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-lg text-[10px] uppercase font-extrabold cursor-pointer">Accept</button>
                                      <button onClick={() => setRejectingTask(t)} className="px-3 py-1 bg-rose-100 text-rose-700 hover:bg-rose-200 rounded-lg text-[10px] uppercase font-extrabold cursor-pointer">Reject</button>
                                    </div>
                                  ) : (
                                    <div className="flex gap-1.5 justify-end items-center">
                                      <button
                                        type="button"
                                        onClick={() => handleOpenEditModal(t, t.fullParentTask || t)}
                                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-lg text-[10px] uppercase font-bold transition-colors cursor-pointer"
                                      >
                                        View Details
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
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
        </>

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
                  const selfTask = todayTasks.find(t => !t.carryForwardedFromId);
                  if (selfTask) handleEditInit(selfTask);
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/40 backdrop-blur-sm p-0 sm:p-4">
          <div className="w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl border border-slate-200 bg-white shadow-2xl animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 max-h-[95vh] sm:max-h-[90vh] flex flex-col overflow-hidden">
            <div className="flex justify-between items-center p-4 sm:p-6 border-b border-slate-100 bg-white sticky top-0 z-20 shrink-0">
              <div>
                <h3 className="font-heading text-lg sm:text-xl font-bold text-slate-800">{editTask ? 'Edit Task' : "Create Today's Task"}</h3>
                {!editTask && selectedProjects.length > 0 && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">✓ Draft saved</span>
                    <button type="button" onClick={() => { clearDraft(); setSelectedProjects([]); setProjectDetails({}); }} className="text-[10px] text-slate-400 hover:text-rose-500 font-semibold transition-colors cursor-pointer">Clear draft</button>
                  </div>
                )}
              </div>
              <button onClick={() => { setShowCreateModal(false); setEditTask(null); }} className="text-slate-400 hover:text-slate-600 cursor-pointer p-1">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleCreateTask} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 text-left">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Start Date *</label>
                  <input 
                    type="date" 
                    value={startDate} 
                    disabled
                    onChange={(e) => setStartDate(e.target.value)} 
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors text-sm font-medium bg-slate-100/80 text-slate-500 cursor-not-allowed opacity-80"
                  />
                </div>

                <div className="border-t border-slate-200 pt-5">
                  <label className="block text-sm font-bold text-slate-800 mb-3">Select Projects *</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                    {projects.map(p => (
                      <label key={p.id} className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-colors ${selectedProjects.includes(p.id) ? 'border-indigo-500 bg-indigo-50 text-indigo-800 shadow-sm' : 'border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600'}`}>
                        <input
                          type="checkbox"
                          checked={selectedProjects.includes(p.id)}
                          onChange={() => handleProjectToggle(p.id)}
                          className="w-4 h-4 text-indigo-600 bg-white border-slate-300 rounded focus:ring-indigo-500 shrink-0"
                        />
                        <span className="text-sm font-bold leading-tight">{p.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {selectedProjects.length > 0 && (
                  <div className="space-y-5 pt-4 border-t border-slate-200">
                    <h4 className="text-sm font-bold text-slate-800">Project Details</h4>
                    {selectedProjects.map(pid => {
                      const project = projects.find(p => p.id === pid);
                      return (
                        <div key={pid} className="p-4 rounded-xl border border-indigo-100 bg-white shadow-sm space-y-4">
                          <div className="flex items-center gap-2 border-b border-indigo-50 pb-2 mb-2">
                            <CheckSquare className="text-indigo-600 shrink-0" size={16} />
                            <h5 className="font-bold text-indigo-900 text-sm leading-tight">{project?.name}</h5>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Task Description *</label>
                            <textarea 
                              value={projectDetails[pid]?.taskDescription || ''} 
                              onChange={(e) => handleProjectDetailChange(pid, 'taskDescription', e.target.value)} 
                              required 
                              placeholder={`What are you working on for ${project?.name}?`} 
                              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 min-h-[80px] focus:outline-none" 
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Priority *</label>
                              <select 
                                value={projectDetails[pid]?.priority || 'MEDIUM'} 
                                onChange={(e) => handleProjectDetailChange(pid, 'priority', e.target.value)} 
                                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 bg-white focus:outline-none"
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
                                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 bg-white focus:outline-none"
                              >
                                <option value="Frontend">Frontend</option>
                                <option value="Backend">Backend</option>
                                <option value="Full Stack">Full Stack</option>
                                <option value="Other">Other</option>
                              </select>
                            </div>
                          </div>

                          {projectDetails[pid]?.jobRoleType === 'Other' && (
                            <div className="animate-in fade-in">
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Enter Role Name *</label>
                              <input 
                                type="text"
                                required
                                placeholder="UI/UX, Testing, DevOps, etc."
                                value={projectDetails[pid]?.customJobRole || ''}
                                onChange={(e) => handleProjectDetailChange(pid, 'customJobRole', e.target.value)}
                                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 bg-white focus:outline-none"
                              />
                            </div>
                          )}

                          {/* Start & End Time — responsive, stacks on mobile */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Start Time *</label>
                              <TimePicker 
                                value={projectDetails[pid]?.startTime || '09:00 AM'}
                                onChange={(val) => handleProjectDetailChange(pid, 'startTime', val)}
                                className="w-full"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">End Time *</label>
                              <TimePicker 
                                value={projectDetails[pid]?.endTime || '06:00 PM'}
                                onChange={(val) => handleProjectDetailChange(pid, 'endTime', val)}
                                className="w-full"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Expected End Date *</label>
                            <input
                              type="date"
                              required
                              value={projectDetails[pid]?.expectedEndDate || ''}
                              min={startDate}
                              onChange={(e) => handleProjectDetailChange(pid, 'expectedEndDate', e.target.value)}
                              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 bg-white focus:outline-none"
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-slate-100 pt-3">
                            <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Changes Given By (Optional)</label>
                              <input 
                                type="text" 
                                value={projectDetails[pid]?.changesGivenBy || ''} 
                                onChange={(e) => handleProjectDetailChange(pid, 'changesGivenBy', e.target.value)} 
                                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 bg-white focus:outline-none" 
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Changes Summary</label>
                              <input 
                                type="text" 
                                value={projectDetails[pid]?.changesSummary || ''} 
                                onChange={(e) => handleProjectDetailChange(pid, 'changesSummary', e.target.value)} 
                                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 bg-white focus:outline-none" 
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="flex gap-3 justify-end p-4 sm:p-6 border-t border-slate-200 bg-white sticky bottom-0 z-20 shrink-0">
                <button type="button" onClick={() => { setShowCreateModal(false); setEditTask(null); }} className="px-4 sm:px-5 py-2.5 rounded-xl text-sm font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer">Cancel</button>
                <button type="submit" disabled={isSubmitting || selectedProjects.length === 0} className="flex-1 sm:flex-none px-4 sm:px-5 py-2.5 rounded-xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50">
                  {isSubmitting && <Loader2 size={16} className="animate-spin" />} {editTask ? 'Next' : 'Submit Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Evening Review Modal (Multi-Project) */}
      {showEveningReview && editTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 backdrop-blur-md p-4">
          <ErrorBoundary>
            <div className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white/95 backdrop-blur-md shadow-2xl animate-in slide-in-from-bottom-10 duration-300 max-h-[92vh] flex flex-col overflow-hidden">
              <div className="flex items-center justify-between px-6 py-5 bg-gradient-to-r from-slate-50 to-indigo-50/20 border-b border-slate-150 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-indigo-100 text-indigo-650 shadow-sm">
                    <ClipboardList size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Today's Work Review</h3>
                    <p className="text-xs text-slate-550 mt-0.5 font-semibold">Submit reviews for all active projects</p>
                  </div>
                </div>
                <button onClick={() => { setShowEveningReview(false); setEditTask(null); }}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors ml-1 cursor-pointer">
                  <X size={18} />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6">
                <form id="review-form" onSubmit={handleReviewSubmit} className="space-y-6">
                  
                  {/* Per Project Review */}
                  <div className="space-y-6">
                    {selectedProjects.map((pid) => {
                      const reviewState = reviewProjects[pid];
                      const project = projects.find(pr => pr.id === pid);
                      if (!reviewState || !project) return null;

                      return (
                        <div key={pid} className="border border-slate-200 rounded-2xl p-5 shadow-sm bg-white relative overflow-hidden">
                          <div className={`absolute top-0 left-0 w-1.5 h-full ${
                            reviewState.status === 'COMPLETED' ? 'bg-emerald-500' :
                            reviewState.status === 'IN_PROGRESS' ? 'bg-indigo-500' :
                            reviewState.status === 'DELAYED' ? 'bg-rose-500' :
                            reviewState.status === 'BLOCKED' ? 'bg-red-550' : 'bg-slate-350'
                          }`}></div>
                          
                          <div className="flex justify-between items-start mb-4 border-b border-slate-100 pb-3">
                            <div>
                              <span className="inline-block px-2.5 py-1 bg-indigo-50 text-indigo-750 text-[10px] font-black uppercase rounded-lg mb-2 border border-indigo-150/40">
                                {project.name}
                              </span>
                              <h5 className="font-bold text-slate-800 text-sm leading-relaxed">{projectDetails[pid]?.taskDescription}</h5>
                            </div>
                          </div>

                          <div className="space-y-5">
                            <div>
                              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Status</label>
                              <div className="flex flex-wrap gap-2">
                                {['PENDING', 'COMPLETED', 'IN_PROGRESS', 'DELAYED', 'BLOCKED'].map((st) => (
                                  <label key={st} className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border cursor-pointer transition-all duration-200 ${reviewState.status === st ? 'border-indigo-500 bg-indigo-50/60 text-indigo-750 font-bold shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}>
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
                                <label className="block text-xs font-bold text-slate-550 uppercase tracking-widest mb-2">Completed Work Description</label>
                                <textarea 
                                  value={reviewState.completedWorkDescription} 
                                  onChange={(e) => handleReviewChange(pid, 'completedWorkDescription', e.target.value)} 
                                  required 
                                  placeholder="What was completed?"
                                  className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 min-h-[60px] shadow-sm font-medium transition-colors" 
                                />
                              </div>
                            )}

                            {reviewState.status === 'DELAYED' && (
                              <div className="animate-in fade-in slide-in-from-top-2">
                                <label className="block text-xs font-bold text-rose-600 uppercase tracking-widest mb-2">Delay Reason</label>
                                <textarea 
                                  value={reviewState.delayReason} 
                                  onChange={(e) => handleReviewChange(pid, 'delayReason', e.target.value)} 
                                  required 
                                  placeholder="Why was the task delayed?"
                                  className="w-full rounded-xl border border-rose-250 bg-rose-50/20 px-4 py-3 text-sm text-rose-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 min-h-[60px] shadow-sm font-medium transition-colors" 
                                />
                              </div>
                            )}

                            {reviewState.status === 'BLOCKED' && (
                              <div className="animate-in fade-in slide-in-from-top-2">
                                <label className="block text-xs font-bold text-rose-600 uppercase tracking-widest mb-2">Blocked Reason</label>
                                <textarea 
                                  value={reviewState.blockedReason} 
                                  onChange={(e) => handleReviewChange(pid, 'blockedReason', e.target.value)} 
                                  required 
                                  placeholder="What is blocking this task?"
                                  className="w-full rounded-xl border border-rose-255 bg-rose-50/20 px-4 py-3 text-sm text-rose-900 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 min-h-[60px] shadow-sm font-medium transition-colors" 
                                />
                              </div>
                            )}

                            <div className="animate-in fade-in slide-in-from-top-2 mt-4 p-4 bg-slate-50/40 border-2 border-dashed border-indigo-200 rounded-2xl relative">
                              <label className="block text-xs font-black text-indigo-900 uppercase tracking-wider mb-2.5 flex justify-between items-center">
                                Work Done Proof (Screenshot / Document)
                                <span className="text-[9px] font-black bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full uppercase tracking-widest">Optional</span>
                              </label>
                              <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-indigo-150/50 text-indigo-600 shadow-sm shrink-0">
                                  <Upload size={16} />
                                </div>
                                <input 
                                  type="file" 
                                  onChange={(e) => handleReviewChange(pid, 'uploadFile', e.target.files ? e.target.files[0] : null)}
                                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[11px] file:font-bold file:bg-indigo-100 file:text-indigo-750 hover:file:bg-indigo-200 cursor-pointer" 
                                />
                              </div>
                            </div>

                            <div className="flex gap-4 items-center bg-slate-50/60 p-4 rounded-xl border border-slate-150">
                              <div className="flex-1">
                                <label className="flex justify-between items-end mb-2">
                                  <span className="text-[10px] font-black text-slate-550 uppercase tracking-wider">Completion Percentage</span>
                                  <span className="text-xs font-extrabold text-indigo-700">{reviewState.completionPercentage}%</span>
                                </label>
                                <input 
                                  type="range" 
                                  min="0" 
                                  max="100" 
                                  step="5"
                                  value={reviewState.completionPercentage} 
                                  onChange={(e) => handleReviewChange(pid, 'completionPercentage', Number(e.target.value))}
                                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-650 shadow-inner" 
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

              <div className="shrink-0 p-5 border-t border-slate-150 bg-slate-50 rounded-b-3xl">
                <button 
                  type="submit" 
                  form="review-form"
                  disabled={isSubmitting} 
                  className="w-full py-4 rounded-xl text-sm font-bold bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} 
                  Submit Today's Review
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

      {/* Delete Confirmation Popup */}
      {deletingTaskId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-center">
            <h3 className="font-heading text-lg font-bold text-slate-800 mb-2">Delete Task?</h3>
            <p className="text-xs text-slate-500 mb-6 font-medium">This action cannot be undone.</p>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setDeletingTaskId(null)}
                className="rounded-xl bg-slate-100 border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await tasksApi.delete(deletingTaskId);
                    setDeletingTaskId(null);
                    await fetchDashboardData();
                  } catch (err: any) {
                    console.error(err);
                    alert(err.response?.data?.message || err.message || 'Failed to delete task');
                  }
                }}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-500 transition-colors cursor-pointer shadow-md shadow-rose-600/10"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
    </ErrorBoundary>
  );
};
