import React, { useEffect, useState } from 'react';
import { Outlet, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { messagesApi, usersApi, tasksApi } from '../services/api';
import { AlertTriangle, MessageSquare, X, Send, User, CheckCheck, AlertCircle, KeyRound } from 'lucide-react';
import { GlobalNotificationPopup } from './GlobalNotificationPopup';

import { useDispatch } from 'react-redux';
import { setCredentials } from '../redux/slices/authSlice';

export const Layout: React.FC = () => {
  const { token, user, loading, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    if (token && user) {
      dispatch(setCredentials({ user: user as any, token }));
    }
  }, [token, user, dispatch]);

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editMobile, setEditMobile] = useState('');
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [updateError, setUpdateError] = useState<string | null>(null);

  const openProfileModal = () => {
    setEditName(user?.name || '');
    setEditEmail(user?.email || '');
    setEditMobile(user?.mobileNumber || '');
    setUpdateSuccess(false);
    setUpdateError(null);
    setIsEditing(false);
    setShowProfileModal(true);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setUpdateLoading(true);
    setUpdateSuccess(false);
    setUpdateError(null);
    try {
      await usersApi.update(user.id, {
        name: editName,
        email: editEmail,
        mobileNumber: editMobile,
      });
      await refreshProfile();
      setUpdateSuccess(true);
      setIsEditing(false);
    } catch (err: any) {
      console.error(err);
      setUpdateError(err.response?.data?.message || 'Failed to update profile details.');
    } finally {
      setUpdateLoading(false);
    }
  };

  // Carry Forward State
  const [carryForwardTasks, setCarryForwardTasks] = useState<any[]>([]);
  const [carryForwardReason, setCarryForwardReason] = useState('');
  const [carryForwardError, setCarryForwardError] = useState('');
  const [submittingCarryForward, setSubmittingCarryForward] = useState(false);
  const location = useLocation();

  const checkCarryForwardTasks = async () => {
    if (!user || user.role !== 'EMPLOYEE') return;
    try {
      const res = await tasksApi.checkCarryForward();
      setCarryForwardTasks(res.data || []);
    } catch (err) {
      console.error('Failed to check carry forward tasks:', err);
    }
  };

  const getScenario = (task: any) => {
    if (!task) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expectedEndDate = new Date(task.expectedEndDate);
    const expectedDateOnly = new Date(expectedEndDate.getFullYear(), expectedEndDate.getMonth(), expectedEndDate.getDate());

    if (expectedDateOnly.getTime() > today.getTime()) {
      return 'FUTURE'; // Scenario 1
    } else if (expectedDateOnly.getTime() === today.getTime()) {
      return 'TODAY'; // Scenario 2
    } else {
      return 'PAST'; // Scenario 3
    }
  };

  const currentCarryForwardTask = carryForwardTasks[0] || null;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && currentCarryForwardTask) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [currentCarryForwardTask]);

  useEffect(() => {
    if (token && user && user.role === 'EMPLOYEE') {
      checkCarryForwardTasks();
    }
  }, [token, user, location.pathname]);

  const handleCarryForwardSubmit = async () => {
    if (!currentCarryForwardTask) return;

    const scenario = getScenario(currentCarryForwardTask);
    const reasonRequired = scenario !== 'FUTURE';

    if (reasonRequired && carryForwardReason.trim().length < 20) {
      setCarryForwardError('Delay reason is required and must be at least 20 characters.');
      return;
    }

    setCarryForwardError('');
    setSubmittingCarryForward(true);
    try {
      await tasksApi.handleCarryForward({
        taskId: currentCarryForwardTask.id,
        carryForward: true,
        reason: reasonRequired ? carryForwardReason.trim() : undefined,
      });

      setCarryForwardReason('');
      await checkCarryForwardTasks();
      window.dispatchEvent(new CustomEvent('sync-tasks'));
    } catch (err: any) {
      console.error(err);
      setCarryForwardError(err.response?.data?.message || 'Failed to carry forward task.');
    } finally {
      setSubmittingCarryForward(false);
    }
  };

  // Mandatory Messages Blocker State
  const [pendingMandatoryMessages, setPendingMandatoryMessages] = useState<any[]>([]);
  const [currentMandatoryMessage, setCurrentMandatoryMessage] = useState<any | null>(null);
  const [mandatoryComment, setMandatoryComment] = useState('');
  const [mandatoryError, setMandatoryError] = useState('');
  const [submittingResponse, setSubmittingResponse] = useState(false);

  // Normal Messages State
  const [pendingNormalMessages, setPendingNormalMessages] = useState<any[]>([]);
  const [currentNormalMessage, setCurrentNormalMessage] = useState<any | null>(null);
  const [normalComment, setNormalComment] = useState('');
  const [submittingNormalResponse, setSubmittingNormalResponse] = useState(false);

  // Responsive Sidebar State
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Load checks for employee users
  const runEmployeeChecks = async () => {
    if (!user || user.role !== 'EMPLOYEE') return;

    try {
      // 2. Check Pending Messages (Both Mandatory and Normal)
      const msgRes = await messagesApi.getPendingMandatory();
      const mandatoryMsgs = msgRes.data.filter((m: any) => m.type === 'MANDATORY_RESPONSE');
      const normalMsgs = msgRes.data.filter((m: any) => m.type !== 'MANDATORY_RESPONSE');

      setPendingMandatoryMessages(mandatoryMsgs);
      if (mandatoryMsgs.length > 0) {
        setCurrentMandatoryMessage(mandatoryMsgs[0]);
      }

      setPendingNormalMessages(normalMsgs);
      if (normalMsgs.length > 0) {
        setCurrentNormalMessage(normalMsgs[0]);
      }
    } catch (err) {
      console.error('Error during employee flow checks:', err);
    }
  };

  useEffect(() => {
    if (token && user) {
      runEmployeeChecks();

      const handleNewMessage = (e: Event) => {
        const customEvent = e as CustomEvent;
        const msg = customEvent.detail;
        if (msg.type === 'MANDATORY_RESPONSE') {
          setPendingMandatoryMessages(prev => [...prev, msg]);
        } else {
          setPendingNormalMessages(prev => [...prev, msg]);
        }
      };

      window.addEventListener('sync-new-message', handleNewMessage);

      return () => {
        window.removeEventListener('sync-new-message', handleNewMessage);
      };
    }
  }, [token, user]);

  useEffect(() => {
    if (!currentMandatoryMessage && pendingMandatoryMessages.length > 0) {
      setCurrentMandatoryMessage(pendingMandatoryMessages[0]);
    }
  }, [pendingMandatoryMessages, currentMandatoryMessage]);

  useEffect(() => {
    if (!currentNormalMessage && pendingNormalMessages.length > 0) {
      setCurrentNormalMessage(pendingNormalMessages[0]);
    }
  }, [pendingNormalMessages, currentNormalMessage]);

  const handleMandatorySubmit = async () => {
    if (!currentMandatoryMessage) return;

    if (!mandatoryComment.trim()) {
      setMandatoryError('A reply is mandatory. Please provide your input before submitting.');
      return;
    }

    setMandatoryError('');
    setSubmittingResponse(true);
    try {
      await messagesApi.respond(currentMandatoryMessage.id, {
        response: mandatoryComment.trim() ? 'COMMENT' : 'ACCEPT',
        comment: mandatoryComment,
      });

      // Clear fields
      setMandatoryComment('');

      // Look for next pending blocker
      const nextMessages = pendingMandatoryMessages.filter((m) => m.id !== currentMandatoryMessage.id);
      setPendingMandatoryMessages(nextMessages);
      if (nextMessages.length > 0) {
        setCurrentMandatoryMessage(nextMessages[0]);
      } else {
        setCurrentMandatoryMessage(null);
      }
    } catch (err) {
      console.error('Failed to submit response to mandatory message', err);
    } finally {
      setSubmittingResponse(false);
    }
  };

  const dismissNormalMessage = async () => {
    if (!currentNormalMessage) return;
    try {
      await messagesApi.respond(currentNormalMessage.id, { response: 'DISMISSED' });
    } catch (err) {
      console.error('Failed to dismiss message', err);
    }
    const next = pendingNormalMessages.filter(m => m.id !== currentNormalMessage.id);
    setPendingNormalMessages(next);
    setCurrentNormalMessage(next.length > 0 ? next[0] : null);
    setNormalComment('');
  };

  const handleNormalSubmit = async () => {
    if (!currentNormalMessage) return;
    setSubmittingNormalResponse(true);
    try {
      await messagesApi.respond(currentNormalMessage.id, {
        response: normalComment.trim() ? 'COMMENT' : 'ACCEPT',
        comment: normalComment,
      });
      dismissNormalMessage();
    } catch (err) {
      console.error('Failed to submit response to normal message', err);
    } finally {
      setSubmittingNormalResponse(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-800">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          <p className="text-md font-medium tracking-wide text-orange-400">Please Wait...</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen bg-slate-50 relative overflow-hidden">
      <GlobalNotificationPopup />

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <div className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 h-full flex-shrink-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar onClose={() => setIsMobileMenuOpen(false)} />
      </div>

      <div className="flex-1 flex flex-col h-full overflow-y-auto w-full max-w-full overflow-x-hidden">
        <Navbar onMenuToggle={() => setIsMobileMenuOpen(true)} onProfileClick={openProfileModal} />
        <main className="flex-grow p-4 md:p-6 w-full max-w-full overflow-x-hidden">
          <Outlet />
        </main>
      </div>


      {/* MANDATORY MESSAGE BLOCKER POPUP */}
      {currentMandatoryMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-rose-200 bg-white p-6 shadow-2xl shadow-rose-500/5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-rose-500">
              <div className="rounded-lg bg-rose-500/10 p-2 border border-rose-500/20">
                <AlertTriangle size={24} />
              </div>
              <h3 className="font-heading text-lg font-semibold text-slate-800">Mandatory Response Required</h3>
            </div>

            <p className="mt-3 text-sm text-slate-500 leading-relaxed">
              An administrator has sent you a mandatory response task request. You must submit your reply and input before continuing to use the dashboard:
            </p>

            <div className="mt-4 p-4 rounded-xl bg-rose-500/5 border border-rose-200/60 text-slate-800 text-sm whitespace-pre-wrap leading-relaxed font-medium">
              {currentMandatoryMessage.content}
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Remarks / Notes <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={mandatoryComment}
                  onChange={(e) => {
                    setMandatoryComment(e.target.value);
                    if (e.target.value.trim()) setMandatoryError('');
                  }}
                  placeholder="Enter detailed feedback or comments here..."
                  className={`w-full rounded-xl bg-white border ${mandatoryError ? 'border-rose-500 ring-1 ring-rose-500/20' : 'border-slate-200'} px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 min-h-24 resize-none transition-colors`}
                />
                {mandatoryError && (
                  <p className="text-xs text-rose-500 font-medium mt-1.5">{mandatoryError}</p>
                )}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end">
              <button
                disabled={submittingResponse}
                onClick={handleMandatorySubmit}
                className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/15"
              >
                {submittingResponse ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Submitting response...
                  </>
                ) : (
                  <>
                    <MessageSquare size={16} /> Submit Reply
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NORMAL MESSAGE POPUP */}
      {currentNormalMessage && !currentMandatoryMessage && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-indigo-200 bg-white p-6 shadow-2xl shadow-indigo-500/10 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-indigo-600">
                <div className="rounded-lg bg-indigo-500/10 p-2 border border-indigo-500/20">
                  <MessageSquare size={24} />
                </div>
                <h3 className="font-heading text-lg font-semibold text-slate-800">New Admin Message</h3>
              </div>
              <button
                onClick={dismissNormalMessage}
                className="text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 p-2 rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mt-5 p-4 rounded-xl bg-indigo-50/50 border border-indigo-100 text-slate-800 text-sm whitespace-pre-wrap leading-relaxed font-medium">
              {currentNormalMessage.content}
            </div>

            <div className="mt-5 space-y-4">

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Your Reply Message
                </label>
                <textarea
                  value={normalComment}
                  onChange={(e) => setNormalComment(e.target.value)}
                  placeholder="Type your reply here (optional)..."
                  className="w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 min-h-24 resize-none transition-colors"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={dismissNormalMessage}
                className="rounded-xl px-5 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Close without replying
              </button>
              <button
                disabled={submittingNormalResponse}
                onClick={handleNormalSubmit}
                className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/15"
              >
                {submittingNormalResponse ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send size={16} /> Send Reply
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CARRY FORWARD POPUP BLOCKER */}
      {currentCarryForwardTask && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4">
          <div className="w-full max-w-xl rounded-2xl border bg-white p-8 shadow-2xl animate-in zoom-in-95 duration-200 border-slate-200">
            {getScenario(currentCarryForwardTask) === 'FUTURE' ? (
              <div className="space-y-6">
                <div className="flex items-center gap-3.5 text-indigo-600">
                  <div className="rounded-xl bg-indigo-50 p-2.5 border border-indigo-100 shadow-sm">
                    <Send size={24} className="animate-pulse" />
                  </div>
                  <div>
                    <h3 className="font-heading text-lg font-bold text-slate-800">Carry Forward Previous Task</h3>
                    <p className="text-xs text-slate-400">Shift unfinished work from yesterday to your schedule today.</p>
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-slate-50 border border-slate-100 text-slate-700 text-sm whitespace-pre-wrap leading-relaxed">
                  <span className="font-bold text-slate-800 block mb-2 text-xs uppercase tracking-wider text-slate-500">Unfinished Projects:</span>
                  <ul className="list-disc pl-5 space-y-1.5 font-medium text-slate-600">
                    {currentCarryForwardTask.projects?.map((p: any) => (
                      <li key={p.id}>
                        <strong className="text-indigo-600">{p.project?.name}:</strong> {p.taskDescription}
                      </li>
                    ))}
                  </ul>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Since the expected end date is in the future ({new Date(currentCarryForwardTask.expectedEndDate).toLocaleDateString()}), no delay reason is required. Let's move this to today's schedule.
                </p>

                <div className="flex items-center justify-end pt-2">
                  <button
                    disabled={submittingCarryForward}
                    onClick={handleCarryForwardSubmit}
                    className="w-full rounded-xl bg-indigo-600 py-3.5 text-sm font-bold text-white hover:bg-indigo-500 active:bg-indigo-700 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
                  >
                    {submittingCarryForward ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Carrying forward...
                      </>
                    ) : (
                      'Carry Forward Task'
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center gap-3.5 text-rose-650">
                  <div className="rounded-xl bg-rose-50 p-2.5 border border-rose-100 shadow-sm">
                    <AlertTriangle size={24} className="animate-bounce text-rose-600" />
                  </div>
                  <div>
                    <h3 className="font-heading text-lg font-bold text-slate-800">
                      {getScenario(currentCarryForwardTask) === 'TODAY' ? '⚠ Danger Zone' : '⚠ Overdue Task'}
                    </h3>
                    <p className="text-xs text-rose-600 font-semibold">
                      {getScenario(currentCarryForwardTask) === 'TODAY' 
                        ? 'Task expected deadline is today!' 
                        : 'Task expected deadline has already passed!'}
                    </p>
                  </div>
                </div>

                <div className="p-5 rounded-xl bg-slate-50 border border-slate-100 text-slate-700 text-sm whitespace-pre-wrap leading-relaxed">
                  <span className="font-bold text-slate-800 block mb-2 text-xs uppercase tracking-wider text-slate-500">Unfinished Projects:</span>
                  <ul className="list-disc pl-5 space-y-1.5 font-medium text-slate-600">
                    {currentCarryForwardTask.projects?.map((p: any) => (
                      <li key={p.id}>
                        <strong className="text-indigo-600">{p.project?.name}:</strong> {p.taskDescription}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Delay Reason <span className="text-rose-500">* (Minimum 20 characters)</span>
                  </label>
                  <textarea
                    value={carryForwardReason}
                    onChange={(e) => {
                      setCarryForwardReason(e.target.value);
                      if (e.target.value.trim().length >= 20) setCarryForwardError('');
                    }}
                    placeholder="Provide a detailed explanation of why the task is delayed or overdue..."
                    className={`w-full rounded-xl bg-white border ${
                      carryForwardError ? 'border-rose-500 ring-1 ring-rose-500/20' : 'border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20'
                    } px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none min-h-24 resize-none transition-colors`}
                  />
                  {carryForwardError && (
                    <p className="text-xs text-rose-500 font-semibold">{carryForwardError}</p>
                  )}
                  <p className="text-[10px] text-slate-400 font-medium text-right">
                    {carryForwardReason.trim().length} / 20 characters minimum
                  </p>
                </div>

                <div className="flex items-center justify-end pt-2">
                  <button
                    disabled={submittingCarryForward}
                    onClick={handleCarryForwardSubmit}
                    className="w-full rounded-xl bg-rose-600 py-3.5 text-sm font-bold text-white hover:bg-rose-500 active:bg-rose-700 transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-rose-650/20"
                  >
                    {submittingCarryForward ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Carrying forward...
                      </>
                    ) : (
                      'Carry Forward & Submit Reason'
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showProfileModal && user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="relative p-6 bg-indigo-600 text-white">
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-xl bg-white/15 flex items-center justify-center text-white border border-white/25">
                  <User size={28} />
                </div>
                <div>
                  <h3 className="font-heading font-extrabold text-lg leading-snug">My Profile</h3>
                  <span className="inline-block mt-1 text-[10px] font-bold bg-white/25 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                    {user.role.replace('_', ' ')}
                  </span>
                </div>
              </div>
            </div>

            {/* Content */}
            <form onSubmit={handleUpdateProfile} className="p-6 space-y-4">
              {updateSuccess && (
                <div className="flex items-start gap-3 rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-xs font-medium text-emerald-600">
                  <CheckCheck size={16} className="shrink-0 mt-0.5" />
                  <span>Profile updated successfully!</span>
                </div>
              )}

              {updateError && (
                <div className="flex items-start gap-3 rounded-xl bg-rose-50 border border-rose-100 p-3 text-xs font-medium text-rose-600">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <span>{updateError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  readOnly={!isEditing}
                  className={`block w-full rounded-xl px-3.5 py-2.5 text-sm transition-all focus:outline-none ${
                    isEditing
                      ? 'bg-white border border-slate-200 text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20'
                      : 'bg-slate-50 border border-slate-100 text-slate-500 cursor-default select-none'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  readOnly={!isEditing}
                  className={`block w-full rounded-xl px-3.5 py-2.5 text-sm transition-all focus:outline-none ${
                    isEditing
                      ? 'bg-white border border-slate-200 text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20'
                      : 'bg-slate-50 border border-slate-100 text-slate-500 cursor-default select-none'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Mobile Number
                </label>
                <input
                  type="text"
                  placeholder={isEditing ? "Enter mobile number" : "Not specified"}
                  value={editMobile}
                  onChange={(e) => setEditMobile(e.target.value)}
                  readOnly={!isEditing}
                  className={`block w-full rounded-xl px-3.5 py-2.5 text-sm transition-all focus:outline-none ${
                    isEditing
                      ? 'bg-white border border-slate-200 text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20'
                      : 'bg-slate-50 border border-slate-100 text-slate-500 cursor-default select-none'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Job Role
                </label>
                <input
                  type="text"
                  readOnly
                  value={user.jobRole || 'Not specified'}
                  className="block w-full rounded-xl px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-100 text-slate-500 cursor-default select-none focus:outline-none"
                />
              </div>

              {/* Action Buttons */}
              {isEditing ? (
                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setEditName(user.name || '');
                      setEditEmail(user.email || '');
                      setEditMobile(user.mobileNumber || '');
                      setIsEditing(false);
                      setUpdateError(null);
                    }}
                    className="flex-1 rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 py-2.5 text-sm font-semibold transition-all cursor-pointer text-center"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updateLoading}
                    className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 text-sm font-semibold transition-all active:translate-y-0 hover:-translate-y-0.5 shadow-lg shadow-indigo-600/10 cursor-pointer flex items-center justify-center gap-2"
                  >
                    {updateLoading ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </div>
              ) : (
                <div className="pt-2 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 text-sm font-semibold transition-all active:translate-y-0 hover:-translate-y-0.5 shadow-lg shadow-indigo-600/10 cursor-pointer text-center"
                  >
                    Edit Info
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileModal(false);
                      navigate('/change-password');
                    }}
                    className="w-full rounded-xl bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 py-2.5 text-sm font-semibold transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <KeyRound size={16} />
                    Change Password / Security
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
