import React, { useState, useRef } from 'react';
import {
  X, CheckCircle, Clock, RotateCcw, Upload, FileText,
  History, GitBranch, User, Calendar, Briefcase,
  Star, Eye, Download, Loader2, Send, ThumbsUp, ThumbsDown, BadgeCheck,
  ClipboardList, Info, AlertCircle, Image
} from 'lucide-react';
import { tasksApi, uploadsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';

// ─── Types ────────────────────────────────────────────────────────────────────
interface TaskProject {
  id: number;
  taskId: number;
  projectId: number;
  project?: { id: number; name: string };
  taskDescription: string;
  taskType?: string;
  status: string;
  priority: string;
  proofRequired: boolean;
  jobRoleType?: string;
  customJobRole?: string;
  startTime?: string;
  endTime?: string;
  adminComment?: string;
  assignedBy?: { id: number; name: string; email: string };
  assignedTo?: { id: number; name: string; email: string };
  assignedByUserId?: number;
  assignedToUserId?: number;
  assignmentType?: string;
  completedWorkDescription?: string;
  completionPercentage?: number;
  timeSpent?: number;
  blockers?: string;
  delayReason?: string;
  blockedReason?: string;
  notes?: string;
  reviewStatus?: string;
  approvedBy?: { id: number; name: string };
  approvedDate?: string;
  approvalComment?: string;
  submissions?: Submission[];
  timeline?: TimelineEvent[];
  taskProjectId?: number;
  expectedEndDate?: string;
  startDate?: string;
  employeeName?: string;
}

interface Submission {
  id: number;
  comment?: string;
  timeSpent?: number;
  blockers?: string;
  notes?: string;
  createdAt: string;
  proofs: Proof[];
  revisions: Revision[];
  approvals: Approval[];
}

interface Proof {
  id: number;
  filename: string;
  filepath: string;
  mimetype: string;
  size: number;
  createdAt: string;
}

interface Revision {
  id: number;
  comment: string;
  reviewer?: { id: number; name: string };
  createdAt: string;
}

interface Approval {
  id: number;
  comment?: string;
  reviewer?: { id: number; name: string };
  createdAt: string;
}

interface TimelineEvent {
  id: number;
  action: string;
  performedBy?: { id: number; name: string };
  details?: string;
  createdAt: string;
}

interface EditTaskModalProps {
  task: TaskProject;
  onClose: () => void;
  onSuccess: () => void;
  initialTab?: 'details' | 'review' | 'approve' | 'history' | 'timeline';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  PENDING: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200', dot: 'bg-slate-400' },
  IN_PROGRESS: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  COMPLETED: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  DELAYED: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500' },
  BLOCKED: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500' },
  REVIEW_PENDING: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
  PENDING_REVIEW: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  REVISION_REQUIRED: { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500' },
  APPROVED: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  ON_HOLD: { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200', dot: 'bg-slate-400' },
};

const PRIORITY_CONFIG: Record<string, { bg: string; text: string; border: string }> = {
  LOW: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  MEDIUM: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
  HIGH: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
};

const TIMELINE_ICONS: Record<string, { icon: React.ReactNode; color: string }> = {
  'Task Created': { icon: <Star size={13} />, color: 'bg-indigo-100 text-indigo-600' },
  'Assigned': { icon: <User size={13} />, color: 'bg-blue-100 text-blue-600' },
  'Review Submitted': { icon: <Send size={13} />, color: 'bg-purple-100 text-purple-600' },
  'Proof Uploaded': { icon: <Upload size={13} />, color: 'bg-indigo-100 text-indigo-600' },
  'Proof Uploaded Again': { icon: <Upload size={13} />, color: 'bg-orange-100 text-orange-600' },
  'Revision Requested': { icon: <RotateCcw size={13} />, color: 'bg-rose-100 text-rose-600' },
  'Approved': { icon: <ThumbsUp size={13} />, color: 'bg-emerald-100 text-emerald-600' },
  'Completed': { icon: <CheckCircle size={13} />, color: 'bg-emerald-100 text-emerald-600' },
};

function fmt(date: string) {
  return new Date(date).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}
function fmtDate(date?: string) {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
export function parseTimeToMinutes(timeStr?: string): number | null {
  if (!timeStr) return null;
  // Check if it's 12-hour format with AM/PM
  const match12 = timeStr.match(/^\s*(\d+):(\d+)\s*(AM|PM)\s*$/i);
  if (match12) {
    let hour = parseInt(match12[1], 10);
    const minute = parseInt(match12[2], 10);
    const ampm = match12[3].toUpperCase();
    if (ampm === 'PM' && hour < 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;
    return hour * 60 + minute;
  }
  // Fallback to 24-hour style
  const match24 = timeStr.match(/^\s*(\d+):(\d+)\s*$/);
  if (match24) {
    const hour = parseInt(match24[1], 10);
    const minute = parseInt(match24[2], 10);
    return hour * 60 + minute;
  }
  return null;
}
function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
const API_BASE = import.meta.env.VITE_API_URL || '';
function proofUrl(filepath: string) {
  if (!filepath) return '';
  return `${API_BASE}/${filepath.replace(/^\/?uploads\//, 'uploads/')}`;
}

// ─── Badge ────────────────────────────────────────────────────────────────────
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {(status === 'PENDING_REVIEW' || status === 'IN_PROGRESS') ? 'IN PROGRESS' : status.replace(/_/g, ' ')}
    </span>
  );
};

// ─── Meta Field ───────────────────────────────────────────────────────────────
const MetaField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1.5">{label}</p>
    <div className="text-sm font-semibold text-slate-800">{children}</div>
  </div>
);

// ─── Section Header ───────────────────────────────────────────────────────────
const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
  <div className="flex items-center gap-3 mb-4">
    <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest bg-slate-100/80 border border-slate-200 px-2.5 py-1 rounded-lg">{title}</span>
    <div className="h-px flex-1 bg-slate-200/60" />
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export const EditTaskModal: React.FC<EditTaskModalProps> = ({ task, onClose, onSuccess, initialTab }) => {
  const { user } = useAuth();

  // ─── Role Resolution ──────────────────────────────────────────────────────
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  // Self-assigned = same person created and is doing the task
  const isSelfAssigned = (
    task.assignedByUserId != null && task.assignedToUserId != null &&
    task.assignedByUserId === task.assignedToUserId
  ) || (
      // No explicit assignedTo means it's a self task
      task.assignedByUserId === user?.id && !task.assignedToUserId
    );

  // Assigner = person who assigned this task to SOMEONE ELSE (reviewer)
  // Self-assigned tasks → treat as assignee always, even if assignedByUserId === user.id
  const isAssigner = !isSelfAssigned && (isAdmin || (task.assignedByUserId != null && task.assignedByUserId === user?.id));

  // Does this task require review approval? (only if NOT self-assigned and (proofRequired or HIGH priority))
  const requiresApproval = !isSelfAssigned && (task.proofRequired || task.priority === 'HIGH');

  // Tab visibility rules:
  // Assigner/Admin: Details, Review & Approve, History, Timeline
  // Assignee (incl. self-tasks): Details, Work Review, History, Timeline
  // If user is Admin or reviewer, they should be able to see the Approve tab
  const showWorkReviewTab = !isAssigner;
  const showApproveTab = isAssigner;

  // Start on appropriate tab
  const defaultTab = showApproveTab && task.status === 'REVIEW_PENDING' ? 'approve' : 'details';
  const [activeTab, setActiveTab] = useState<'details' | 'review' | 'approve' | 'history' | 'timeline'>(initialTab || defaultTab);

  // Work Review state
  const [reviewStatus, setReviewStatus] = useState(task.status || 'IN_PROGRESS');
  const [workSummary, setWorkSummary] = useState(task.completedWorkDescription || '');
  const [completionPct, setCompletionPct] = useState<number | ''>(task.completionPercentage ?? 0);
  const [timeSpent, setTimeSpent] = useState(() => {
    if (task.timeSpent != null && task.timeSpent !== 0) {
      return task.timeSpent.toString();
    }
    if (task.startTime && task.endTime) {
      try {
        const startMin = parseTimeToMinutes(task.startTime);
        const endMin = parseTimeToMinutes(task.endTime);
        if (startMin !== null && endMin !== null) {
          if (endMin > startMin) {
            return ((endMin - startMin) / 60).toString();
          }
        }
      } catch (e) {
        // ignore
      }
    }
    return '';
  });
  const [blockers, setBlockers] = useState(task.blockers || '');
  const additionalNotes = task.notes || '';
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [employeeComment, setEmployeeComment] = useState('');
  const [isSubmittingWork, setIsSubmittingWork] = useState(false);

  // Review/Approve state
  const [revisionComment, setRevisionComment] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasPendingReview = task.status === 'REVIEW_PENDING';
  const needsRevision = task.status === 'REVISION_REQUIRED';
  const latestSubmission = task.submissions?.[0];

  // ─── Work Review Submit ───────────────────────────────────────────────────
  const handleWorkReviewSubmit = async () => {
    if (reviewStatus === 'COMPLETED') {
      if (!workSummary.trim()) {
        alert("Today's Work Summary is required when marking as complete.");
        return;
      }
      if (task.proofRequired && !proofFile) {
        alert('Proof upload is mandatory for this task.');
        return;
      }
    } else if ((reviewStatus === 'DELAYED' || reviewStatus === 'BLOCKED') && !blockers.trim()) {
      alert('Delay/Blocker reason is required.');
      return;
    }
    setIsSubmittingWork(true);
    try {
      let uploadedProof = null;
      if (proofFile) {
        const uploadRes = await uploadsApi.upload(proofFile);
        uploadedProof = { url: uploadRes.data.url, filename: proofFile.name, mimetype: proofFile.type, size: proofFile.size };
      }
      const taskProjId = task.id || task.taskProjectId;

      if (reviewStatus === 'COMPLETED') {
        // Use submitProjectTask — backend handles status (COMPLETED or REVIEW_PENDING based on proofRequired/priority)
        await tasksApi.submitProjectTask(taskProjId!, {
          comment: employeeComment || workSummary,
          proof: uploadedProof,
          workReview: {
            workSummary,
            completionPercentage: Number(completionPct),
            timeSpent: timeSpent ? Number(timeSpent) : undefined,
            blockers: blockers || undefined,
            additionalNotes: additionalNotes || undefined,
          },
        });
      } else {
        // For non-completion status updates (IN_PROGRESS, DELAYED, BLOCKED, ON_HOLD)
        // Use update but ONLY send the one project being updated — backend now protects other projects
        await tasksApi.update(task.taskId, {
          partialUpdate: true,
          projects: [{
            id: taskProjId,
            projectId: task.projectId,
            taskDescription: task.taskDescription,
            status: reviewStatus,
            completionPercentage: Number(completionPct),
            completedWorkDescription: workSummary || undefined,
            delayReason: reviewStatus === 'DELAYED' ? blockers : undefined,
            blockedReason: reviewStatus === 'BLOCKED' ? blockers : undefined,
            blockers: blockers || undefined,
            notes: additionalNotes || undefined,
            timeSpent: timeSpent ? Number(timeSpent) : undefined,
          }],
        });
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to submit work review');
    } finally {
      setIsSubmittingWork(false);
    }
  };

  // ─── Review Actions ───────────────────────────────────────────────────────
  const handleReviewAction = async (action: 'APPROVED' | 'REVISION_REQUIRED') => {
    if (action === 'REVISION_REQUIRED' && !revisionComment.trim()) {
      alert('Please provide a revision comment.');
      return;
    }
    setIsSubmittingReview(true);
    try {
      const taskProjId = task.id || task.taskProjectId;
      await tasksApi.reviewProjectTask(taskProjId!, {
        status: action,
        comment: action === 'APPROVED' ? (revisionComment || 'Approved') : revisionComment,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || 'Failed to submit review');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // ─── Proof Viewer ─────────────────────────────────────────────────────────
  const renderProofFiles = (proofs: Proof[]) => {
    if (!proofs || proofs.length === 0)
      return <p className="text-xs text-slate-400 italic py-3 text-center bg-slate-50 rounded-xl border border-slate-100">No proof files attached.</p>;
    return (
      <div className="space-y-2">
        {proofs.map(p => {
          const url = proofUrl(p.filepath);
          const isImage = p.mimetype?.startsWith('image/');
          return (
            <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200 hover:border-indigo-200 transition-colors shadow-sm">
              <div className={`flex-shrink-0 p-2.5 rounded-xl ${isImage ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                {isImage ? <Image size={16} /> : <FileText size={16} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate">{p.filename}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{fileSize(p.size)} · {fmt(p.createdAt)}</p>
              </div>
              {/* Always-visible action buttons */}
              <div className="flex gap-1.5 flex-shrink-0">
                <a href={url} target="_blank" rel="noreferrer"
                  className="p-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-600 transition-colors font-semibold text-[10px] flex items-center gap-1 cursor-pointer" title="View File">
                  <Eye size={13} /> View
                </a>
                <a href={url} target="_blank" rel="noreferrer" download
                  className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors font-semibold text-[10px] flex items-center gap-1 cursor-pointer" title="Download">
                  <Download size={13} /> Download
                </a>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  // ─── Tab: Details ─────────────────────────────────────────────────────────
  const renderDetails = () => {
    const pc = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.MEDIUM;
    return (
      <div className="space-y-6">
        {/* Revision warning banner */}
        {needsRevision && latestSubmission?.revisions?.[0] && (
          <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-rose-50 border border-rose-250/60 shadow-sm animate-in fade-in duration-200">
            <div className="p-2.5 bg-rose-100 text-rose-650 rounded-xl flex-shrink-0"><RotateCcw size={16} /></div>
            <div>
              <p className="text-xs font-black text-rose-800 mb-1.5 uppercase tracking-wide">Revision Required — Action Needed</p>
              <p className="text-sm text-rose-750 leading-relaxed font-medium">{latestSubmission.revisions[0].comment}</p>
              <p className="text-[10px] text-rose-500 mt-2 font-bold">— {latestSubmission.revisions[0].reviewer?.name} · {fmt(latestSubmission.revisions[0].createdAt)}</p>
            </div>
          </div>
        )}

        {/* Approved banner */}
        {task.status === 'COMPLETED' && task.approvedBy && (
          <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-emerald-50 border border-emerald-250/60 shadow-sm animate-in fade-in duration-200">
            <div className="p-2.5 bg-emerald-100 text-emerald-650 rounded-xl flex-shrink-0"><CheckCircle size={16} /></div>
            <div>
              <p className="text-xs font-black text-emerald-800 mb-0.5 uppercase tracking-wide">Approved & Verified</p>
              <p className="text-[10px] text-emerald-500 font-bold">Approved by {task.approvedBy.name} on {fmtDate(task.approvedDate)}</p>
              {task.approvalComment && <p className="text-xs text-emerald-700 mt-2 font-medium italic">"{task.approvalComment}"</p>}
            </div>
          </div>
        )}

        {/* Task Description */}
        <div>
          <SectionHeader title="Task Info" />
          <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-5 hover:border-slate-350 transition-colors">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Description</p>
            <p className="text-sm text-slate-750 leading-relaxed font-medium whitespace-pre-wrap">{task.taskDescription}</p>
          </div>
        </div>

        {/* Meta Grid */}
        <div>
          <SectionHeader title="Details" />
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50/40 hover:bg-slate-50 rounded-2xl border border-slate-200/60 p-4 transition-all duration-200 shadow-sm">
              <MetaField label="Project">
                <span className="text-indigo-600 font-black text-sm tracking-wide">{task.project?.name || 'N/A'}</span>
              </MetaField>
            </div>
            <div className="bg-slate-50/40 hover:bg-slate-50 rounded-2xl border border-slate-200/60 p-4 transition-all duration-200 shadow-sm">
              <MetaField label="Priority">
                <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black border tracking-wider uppercase shadow-sm ${pc.bg} ${pc.text} ${pc.border}`}>
                  {task.priority}
                </span>
              </MetaField>
            </div>
            <div className="bg-slate-50/40 hover:bg-slate-50 rounded-2xl border border-slate-200/60 p-4 transition-all duration-200 shadow-sm">
              <MetaField label="Assigned By">
                <span className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                  <div className="p-1 rounded-lg bg-slate-200/65 text-slate-500">
                    <User size={13} />
                  </div>
                  {task.assignedBy?.name || 'Self'}
                </span>
              </MetaField>
            </div>
            <div className="bg-slate-50/40 hover:bg-slate-50 rounded-2xl border border-slate-200/60 p-4 transition-all duration-200 shadow-sm">
              <MetaField label="Assigned To">
                <span className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                  <div className="p-1 rounded-lg bg-slate-200/65 text-slate-500">
                    <User size={13} />
                  </div>
                  {task.assignedTo?.name || task.employeeName || 'Self'}
                </span>
              </MetaField>
            </div>
            <div className="bg-slate-50/40 hover:bg-slate-50 rounded-2xl border border-slate-200/60 p-4 transition-all duration-200 shadow-sm">
              <MetaField label="Job Role">
                <span className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                  <div className="p-1 rounded-lg bg-slate-200/65 text-slate-500">
                    <Briefcase size={13} />
                  </div>
                  {task.jobRoleType === 'Other' ? task.customJobRole : (task.jobRoleType || 'N/A')}
                </span>
              </MetaField>
            </div>
            <div className="bg-slate-50/40 hover:bg-slate-50 rounded-2xl border border-slate-200/60 p-4 transition-all duration-200 shadow-sm">
              <MetaField label="Mandatory Proof">
                <span className={`inline-flex items-center gap-1.5 text-xs font-black uppercase ${task.proofRequired ? 'text-rose-700' : 'text-slate-500'}`}>
                  <span className={`w-2 h-2 rounded-full ${task.proofRequired ? 'bg-rose-500 animate-pulse' : 'bg-slate-350'}`} />
                  {task.proofRequired ? 'YES — Required' : 'NO'}
                </span>
              </MetaField>
            </div>
            <div className="bg-slate-50/40 hover:bg-slate-50 rounded-2xl border border-slate-200/60 p-4 transition-all duration-200 shadow-sm">
              <MetaField label="Timings">
                <span className="font-bold text-slate-700">{task.startTime || 'N/A'} → {(task as any).endTime || 'N/A'}</span>
              </MetaField>
            </div>
            <div className="bg-slate-50/40 hover:bg-slate-50 rounded-2xl border border-slate-200/60 p-4 transition-all duration-200 shadow-sm">
              <MetaField label="Due Date">
                <span className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                  <div className="p-1 rounded-lg bg-slate-200/65 text-slate-500">
                    <Calendar size={13} />
                  </div>
                  {fmtDate(task.expectedEndDate || (task as any).task?.expectedEndDate || task.startDate)}
                </span>
              </MetaField>
            </div>
          </div>
        </div>

        {/* Instructions */}
        {task.adminComment && (
          <div>
            <SectionHeader title="Instructions" />
            <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 shadow-sm animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <AlertCircle size={15} className="text-indigo-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-indigo-900 leading-relaxed font-semibold">{task.adminComment}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ─── Tab: Work Review (Assignee only) ─────────────────────────────────────
  const renderWorkReview = () => (
    <div className="space-y-6">
      {/* Revision banner */}
      {needsRevision && latestSubmission?.revisions?.[0] && (
        <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-rose-50 border border-rose-200 shadow-sm animate-in fade-in duration-200">
          <div className="p-2.5 bg-rose-100 rounded-xl text-rose-600 flex-shrink-0"><RotateCcw size={16} /></div>
          <div>
            <p className="text-xs font-bold text-rose-800 mb-1">Please address this revision request</p>
            <p className="text-sm text-rose-700 leading-relaxed font-medium">{latestSubmission.revisions[0].comment}</p>
            <p className="text-[10px] text-rose-500 mt-2 font-bold">— {latestSubmission.revisions[0].reviewer?.name} · {fmt(latestSubmission.revisions[0].createdAt)}</p>
          </div>
        </div>
      )}

      {/* Work Status */}
      <div>
        <label className="block text-xs font-bold text-slate-550 uppercase tracking-widest mb-2">Work Status *</label>
        <select
          value={reviewStatus}
          onChange={e => setReviewStatus(e.target.value)}
          className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 bg-white cursor-pointer shadow-sm font-medium transition-colors"
        >
          {['IN_PROGRESS', 'COMPLETED', 'DELAYED', 'BLOCKED', 'ON_HOLD'].map(s => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      {/* Work Summary */}
      <div>
        <label className="block text-xs font-bold text-slate-550 uppercase tracking-widest mb-2">
          Today's Work Summary {reviewStatus === 'COMPLETED' ? <span className="text-rose-500">*</span> : <span className="text-slate-400 normal-case font-normal">(optional)</span>}
        </label>
        <textarea
          value={workSummary}
          onChange={e => setWorkSummary(e.target.value)}
          placeholder="Describe what was accomplished today..."
          rows={3}
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 resize-none font-medium shadow-sm transition-colors"
        />
      </div>

      {/* Completion % + Time */}
      <div className="grid grid-cols-2 gap-5">
        <div>
          <label className="block text-xs font-bold text-slate-550 uppercase tracking-widest mb-2">Completion %</label>
          <div className="relative">
            <input
              type="number" min={0} max={100}
              value={completionPct}
              onChange={e => setCompletionPct(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 pr-8 text-sm text-slate-850 font-bold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 shadow-sm"
            />
            <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-black">%</span>
          </div>
          <div className="mt-2.5 h-2 bg-slate-150 rounded-full overflow-hidden border border-slate-200/50 shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(Math.max(Number(completionPct) || 0, 0), 100)}%` }}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-550 uppercase tracking-widest mb-2">Time Spent (hrs)</label>
          <input
            type="number" min={0} step={0.5}
            value={timeSpent}
            onChange={e => setTimeSpent(e.target.value)}
            placeholder="e.g. 3.5"
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 font-semibold shadow-sm"
          />
        </div>
      </div>

      {/* Blockers */}
      <div>
        <label className="block text-xs font-bold text-slate-555 uppercase tracking-widest mb-2">
          Blockers {(reviewStatus === 'DELAYED' || reviewStatus === 'BLOCKED') ? <span className="text-rose-500">*</span> : <span className="text-slate-400 normal-case font-normal">(optional)</span>}
        </label>
        <textarea
          value={blockers}
          onChange={e => setBlockers(e.target.value)}
          placeholder="Any blockers, dependencies, or issues..."
          rows={2}
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 resize-none font-medium shadow-sm transition-colors"
        />
      </div>



      {/* Proof Upload */}
      {reviewStatus === 'COMPLETED' && (
        <div>
          <label className="block text-xs font-bold text-slate-555 uppercase tracking-widest mb-2">
            Proof Upload {task.proofRequired ? <span className="text-rose-500">*</span> : <span className="text-slate-400 normal-case font-normal">(optional)</span>}
          </label>
          <div className={`border-2 border-dashed rounded-2xl p-6 transition-all duration-200 ${task.proofRequired
              ? 'border-rose-300 bg-rose-50/20 hover:bg-rose-50/35'
              : 'border-indigo-200 bg-slate-50/40 hover:bg-slate-50/70 hover:border-slate-350'
            }`}>
            <div className="flex flex-col items-center justify-center text-center">
              <div className={`p-3 rounded-full mb-3 shadow-sm ${task.proofRequired ? 'bg-rose-100 text-rose-600 animate-pulse' : 'bg-indigo-100 text-indigo-600'}`}>
                <Upload size={18} />
              </div>
              <p className="text-xs font-bold text-indigo-700">Choose a file to upload</p>
              <p className="text-[10px] text-slate-400 mt-1 max-w-[280px]">Supported formats: Images, PDF, Word, APK, ZIP, Video up to 50MB</p>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*,application/pdf,.doc,.docx,.apk,.zip,video/*" onChange={e => setProofFile(e.target.files?.[0] || null)} className="hidden" />
            {proofFile ? (
              <div className="flex items-center gap-3 p-3 bg-white rounded-xl border border-slate-200 shadow-sm mt-4">
                <FileText size={16} className="text-indigo-600 flex-shrink-0 animate-bounce" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">{proofFile.name}</p>
                  <p className="text-[10px] text-slate-400 font-medium">{fileSize(proofFile.size)}</p>
                </div>
                <button onClick={() => setProofFile(null)} className="p-1 hover:bg-slate-100 rounded-lg text-slate-450 hover:text-slate-700 transition-colors cursor-pointer"><X size={14} /></button>
              </div>
            ) : (
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="mt-4 w-full py-2.5 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-600 text-xs font-bold hover:bg-indigo-100 hover:border-indigo-300 transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-sm">
                Browse Files
              </button>
            )}
          </div>
        </div>
      )}

      {/* Note to Reviewer — only show if task requires review/approval */}
      {requiresApproval && (
        <div>
          <label className="block text-xs font-bold text-slate-550 uppercase tracking-widest mb-2">Note to Reviewer <span className="text-slate-400 normal-case font-normal">(optional)</span></label>
          <textarea
            value={employeeComment}
            onChange={e => setEmployeeComment(e.target.value)}
            placeholder="Any note to send to reviewer..."
            rows={2}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-850 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 resize-none font-medium shadow-sm transition-colors"
          />
        </div>
      )}

      {/* Approval flow info banner */}
      {reviewStatus === 'COMPLETED' && requiresApproval && (
        <div className="flex items-start gap-2.5 p-3.5 bg-purple-50/65 border border-purple-200/80 rounded-2xl shadow-sm mt-2">
          <span className="text-purple-650 flex-shrink-0 mt-0.5">⏳</span>
          <p className="text-xs text-purple-900 leading-relaxed font-bold">
            This task {task.proofRequired ? 'requires proof' : task.priority === 'HIGH' ? 'is HIGH priority' : 'was admin-assigned'}, so it will be sent for <strong>reviewer approval</strong> before being marked complete.
          </p>
        </div>
      )}

      <button
        type="button"
        disabled={isSubmittingWork}
        onClick={handleWorkReviewSubmit}
        className="w-full py-4 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer mt-4"
      >
        {isSubmittingWork ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        {isSubmittingWork
          ? 'Submitting...'
          : reviewStatus === 'COMPLETED'
            ? requiresApproval ? 'Submit for Approval' : 'Mark as Completed ✓'
            : 'Save Progress'}
      </button>
    </div>
  );

  // ─── Tab: Review & Approve (Assigner/Admin only) ──────────────────────────
  const renderApprove = () => {
    if (!hasPendingReview) {
      return (
        <div className="text-center py-20 animate-in fade-in">
          <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center mx-auto mb-4 border border-slate-250/30">
            <Clock size={28} className="text-slate-400" />
          </div>
          <p className="text-sm font-black text-slate-600">No Pending Review</p>
          <p className="text-xs text-slate-450 mt-1">Current status: <StatusBadge status={task.status} /></p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Summary card */}
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50/60 border border-purple-100 rounded-2xl p-5 shadow-sm">
          <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse"></span>
            Pending Your Review
          </p>
          <p className="text-sm font-extrabold text-slate-800 leading-snug">{task.project?.name} — {task.taskDescription?.slice(0, 70)}{(task.taskDescription?.length || 0) > 70 ? '...' : ''}</p>
          <p className="text-xs text-slate-550 mt-2 font-medium">Submitted by: <span className="font-bold text-slate-705">{task.assignedTo?.name || task.employeeName || '—'}</span></p>
        </div>

        {/* Employee's submission */}
        {latestSubmission && (
          <div className="space-y-3">
            <SectionHeader title="Work Review from Employee" />
            <div className="bg-white border border-slate-200/80 rounded-2xl divide-y divide-slate-100 overflow-hidden shadow-sm">
              {latestSubmission.comment && (
                <div className="p-4 bg-slate-50/30">
                  <p className="text-[10px] text-slate-400 mb-1.5 uppercase font-bold tracking-wide">Comment</p>
                  <p className="text-sm text-slate-700 font-medium leading-relaxed">{latestSubmission.comment}</p>
                </div>
              )}
              <div className="p-4 grid grid-cols-2 gap-4 bg-white">
                {latestSubmission.timeSpent && (
                  <div>
                    <p className="text-[10px] text-slate-400 mb-1.5 uppercase font-bold tracking-wide">Time Spent</p>
                    <p className="text-sm font-black text-slate-800">{latestSubmission.timeSpent}h</p>
                  </div>
                )}
                {latestSubmission.blockers && (
                  <div>
                    <p className="text-[10px] text-slate-400 mb-1.5 uppercase font-bold tracking-wide">Blockers</p>
                    <p className="text-sm text-slate-700 font-medium">{latestSubmission.blockers}</p>
                  </div>
                )}
                {latestSubmission.notes && (
                  <div className="col-span-2">
                    <p className="text-[10px] text-slate-400 mb-1.5 uppercase font-bold tracking-wide">Notes</p>
                    <p className="text-sm text-slate-700 font-medium leading-relaxed">{latestSubmission.notes}</p>
                  </div>
                )}
              </div>
              {latestSubmission.proofs?.length > 0 && (
                <div className="p-4 bg-slate-50/20 border-t border-slate-100">
                  <p className="text-[10px] text-slate-450 mb-3 uppercase font-bold tracking-wide">Proof Files ({latestSubmission.proofs.length})</p>
                  {renderProofFiles(latestSubmission.proofs)}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Review comment */}
        <div>
          <SectionHeader title="Your Review Decision" />
          <textarea
            value={revisionComment}
            onChange={e => setRevisionComment(e.target.value)}
            placeholder="Add a comment — required when requesting revision..."
            rows={3}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 resize-none font-medium shadow-sm transition-colors"
          />
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-4 mt-4">
          <button
            type="button" disabled={isSubmittingReview}
            onClick={() => handleReviewAction('APPROVED')}
            className="py-3.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-500 transition-all hover:shadow-lg hover:shadow-emerald-500/10 disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmittingReview ? <Loader2 size={16} className="animate-spin" /> : <ThumbsUp size={16} />}
            Approve & Complete
          </button>
          <button
            type="button" disabled={isSubmittingReview}
            onClick={() => handleReviewAction('REVISION_REQUIRED')}
            className="py-3.5 rounded-xl bg-rose-600 text-white text-sm font-bold hover:bg-rose-500 transition-all hover:shadow-lg hover:shadow-rose-500/10 disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSubmittingReview ? <Loader2 size={16} className="animate-spin" /> : <ThumbsDown size={16} />}
            Request Revision
          </button>
        </div>
      </div>
    );
  };

  // ─── Tab: History ─────────────────────────────────────────────────────────
  const renderHistory = () => {
    const submissions = task.submissions || [];
    if (submissions.length === 0)
      return (
        <div className="text-center py-20 animate-in fade-in">
          <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center mx-auto mb-4 border border-slate-250/30">
            <History size={28} className="text-slate-400" />
          </div>
          <p className="text-sm font-extrabold text-slate-650">No History Yet</p>
          <p className="text-xs text-slate-400 mt-1">Submission history will appear here.</p>
        </div>
      );

    return (
      <div className="space-y-5">
        {submissions.map((sub, idx) => (
          <div key={sub.id} className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-50 to-indigo-50/30 border-b border-slate-150">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-55/10 text-indigo-600 rounded-lg"><Send size={12} /></div>
                <p className="text-xs font-black text-indigo-900">Submission #{submissions.length - idx}</p>
              </div>
              <p className="text-[10px] text-slate-400 font-bold">{fmt(sub.createdAt)}</p>
            </div>
            <div className="p-4 space-y-4 bg-white">
              {sub.comment && (
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-black tracking-wide mb-1">Comment</p>
                  <p className="text-sm text-slate-700 font-semibold leading-relaxed">{sub.comment}</p>
                </div>
              )}
              <div className="flex flex-wrap gap-4 pt-1">
                {sub.timeSpent && <span className="text-xs font-semibold bg-slate-50 px-2 py-1 rounded border border-slate-150 text-slate-600"><span className="font-bold text-slate-400 mr-1">Time:</span> {sub.timeSpent}h</span>}
                {sub.blockers && <span className="text-xs font-semibold bg-rose-50/50 px-2 py-1 rounded border border-rose-100 text-rose-600"><span className="font-bold text-rose-450 mr-1">Blockers:</span> {sub.blockers}</span>}
                {sub.notes && <span className="text-xs font-semibold bg-slate-50 px-2 py-1 rounded border border-slate-150 text-slate-600"><span className="font-bold text-slate-400 mr-1">Notes:</span> {sub.notes}</span>}
              </div>
              {sub.proofs?.length > 0 && (
                <div className="border-t border-slate-100 pt-3">
                  <p className="text-[10px] text-slate-400 uppercase font-black tracking-wide mb-2">Proof Files ({sub.proofs.length})</p>
                  {renderProofFiles(sub.proofs)}
                </div>
              )}
              {sub.revisions?.map((rev, ri) => (
                <div key={rev.id} className="flex items-start gap-3.5 p-3.5 rounded-xl bg-rose-50/70 border border-rose-100 shadow-sm mt-3 animate-in fade-in">
                  <div className="p-2 bg-rose-100 rounded-lg text-rose-600 flex-shrink-0"><RotateCcw size={12} /></div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[10px] font-black text-rose-700 uppercase tracking-wider">Revision Request #{ri + 1}</p>
                      <p className="text-[9px] text-rose-400 font-bold">{fmt(rev.createdAt)}</p>
                    </div>
                    <p className="text-xs text-rose-900 font-medium leading-relaxed">{rev.comment}</p>
                    <p className="text-[10px] text-rose-500 font-bold mt-1.5">— {rev.reviewer?.name}</p>
                  </div>
                </div>
              ))}
              {sub.approvals?.map((appr) => (
                <div key={appr.id} className="flex items-start gap-3.5 p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-150 shadow-sm mt-3 animate-in fade-in">
                  <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600 flex-shrink-0"><CheckCircle size={12} /></div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[10px] font-black text-emerald-700 uppercase tracking-wider">Approval Completed</p>
                      <p className="text-[9px] text-emerald-400 font-bold">{fmt(appr.createdAt)}</p>
                    </div>
                    {appr.comment && <p className="text-xs text-emerald-800 font-medium leading-relaxed">{appr.comment}</p>}
                    <p className="text-[10px] text-emerald-500 font-bold mt-1.5">— {appr.reviewer?.name}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ─── Tab: Timeline ────────────────────────────────────────────────────────
  const renderTimeline = () => {
    const events = task.timeline || [];
    if (events.length === 0)
      return (
        <div className="text-center py-20 animate-in fade-in">
          <div className="w-16 h-16 rounded-3xl bg-slate-100 flex items-center justify-center mx-auto mb-4 border border-slate-250/30">
            <GitBranch size={28} className="text-slate-400" />
          </div>
          <p className="text-sm font-extrabold text-slate-650">No Timeline Events</p>
          <p className="text-xs text-slate-400 mt-1">Events will appear as you progress.</p>
        </div>
      );

    return (
      <div className="relative pl-8 pr-2">
        <div className="absolute left-[15px] top-1 bottom-1 w-0.5 bg-gradient-to-b from-indigo-200 via-slate-200 to-transparent" />
        <div className="space-y-5 animate-in fade-in">
          {events.map((ev) => {
            const cfg = TIMELINE_ICONS[ev.action] || { icon: <Clock size={13} />, color: 'bg-slate-100 text-slate-500' };
            return (
              <div key={ev.id} className="relative group">
                <div className={`absolute -left-[33px] w-8 h-8 rounded-xl flex items-center justify-center ${cfg.color} border-2 border-white shadow-sm transition-all duration-300 group-hover:scale-110`}>
                  {cfg.icon}
                </div>
                <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm hover:border-slate-350 hover:shadow transition-all duration-200">
                  <div className="flex items-center justify-between mb-1.5 gap-2">
                    <p className="text-xs font-black text-slate-800 tracking-wide">{ev.action}</p>
                    <p className="text-[10px] text-slate-400 font-semibold">{fmt(ev.createdAt)}</p>
                  </div>
                  {ev.performedBy && <p className="text-[10px] text-slate-550 font-bold mb-1">by {ev.performedBy.name}</p>}
                  {ev.details && <p className="text-xs text-slate-600 leading-relaxed font-medium mt-1">{ev.details}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ─── Tabs config (role-based) ─────────────────────────────────────────────
  const TABS = [
    { id: 'details' as const, label: 'Task Details', icon: <Info size={13} />, visible: true },
    { id: 'review' as const, label: "Work Review", icon: <ClipboardList size={13} />, visible: showWorkReviewTab },
    { id: 'approve' as const, label: 'Review & Approve', icon: <BadgeCheck size={13} />, visible: showApproveTab },
    { id: 'history' as const, label: 'History', icon: <History size={13} />, visible: true },
    { id: 'timeline' as const, label: 'Timeline', icon: <GitBranch size={13} />, visible: true },
  ].filter(t => t.visible);

  const tabContent = {
    details: renderDetails(),
    review: renderWorkReview(),
    approve: renderApprove(),
    history: renderHistory(),
    timeline: renderTimeline(),
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white/95 backdrop-blur-md shadow-2xl flex flex-col overflow-hidden max-h-[92vh]">

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 bg-gradient-to-r from-slate-50 to-indigo-50/20 border-b border-slate-150 shrink-0">
          <div className="flex items-start gap-4">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm ${isAssigner ? 'bg-purple-100 text-purple-600' : 'bg-indigo-100 text-indigo-600'
              }`}>
              {isAssigner
                ? <BadgeCheck size={20} className="text-purple-600" />
                : <ClipboardList size={20} className="text-indigo-600" />
              }
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">Task Overview</h2>
                {isAssigner && (
                  <span className="text-[9px] font-black tracking-wide px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 border border-purple-200 uppercase">REVIEWER</span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5 font-semibold">{task.project?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={task.status} />
            <button onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors ml-1 cursor-pointer">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Tabs Segmented Control */}
        <div className="bg-slate-50 border-b border-slate-150 px-6 py-2.5 shrink-0 overflow-x-auto">
          <div className="flex gap-1.5 bg-slate-200/50 p-1 rounded-2xl max-w-max">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all duration-200 cursor-pointer ${activeTab === tab.id
                    ? isAssigner
                      ? 'bg-purple-100 text-purple-700 shadow-sm border border-purple-200/40'
                      : 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100/40'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/40'
                  }`}
              >
                <span className={activeTab === tab.id ? (isAssigner ? 'text-purple-600' : 'text-indigo-600') : 'text-slate-500'}>
                  {tab.icon}
                </span>
                {tab.label}
                {tab.id === 'approve' && hasPendingReview && (
                  <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-pulse" />
                )}
                {tab.id === 'history' && (task.submissions?.length || 0) > 0 && (
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded-full transition-colors ${activeTab === tab.id
                      ? isAssigner
                        ? 'bg-purple-200/60 text-purple-800'
                        : 'bg-indigo-100 text-indigo-800'
                      : 'bg-slate-300/80 text-slate-600'
                    }`}>
                    {task.submissions?.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {tabContent[activeTab]}
        </div>
      </div>
    </div>
  );
};
