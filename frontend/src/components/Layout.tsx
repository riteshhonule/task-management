import React, { useEffect, useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { tasksApi, messagesApi } from '../services/api';
import { HelpCircle, AlertTriangle, MessageSquare } from 'lucide-react';

export const Layout: React.FC = () => {
  const { token, user, loading } = useAuth();
  
  // Carry Forward State
  const [pendingCarryForwards, setPendingCarryForwards] = useState<any[]>([]);
  const [currentCarryForward, setCurrentCarryForward] = useState<any | null>(null);

  // Mandatory Messages Blocker State
  const [pendingMandatoryMessages, setPendingMandatoryMessages] = useState<any[]>([]);
  const [currentMandatoryMessage, setCurrentMandatoryMessage] = useState<any | null>(null);
  const [mandatoryResponse, setMandatoryResponse] = useState<'ACCEPT' | 'REJECT' | 'COMMENT'>('ACCEPT');
  const [mandatoryComment, setMandatoryComment] = useState('');
  const [submittingResponse, setSubmittingResponse] = useState(false);

  // Load checks for employee users
  const runEmployeeChecks = async () => {
    if (!user || user.role !== 'EMPLOYEE') return;

    try {
      // 1. Check Carry Forwards
      const carryRes = await tasksApi.checkCarryForward();
      setPendingCarryForwards(carryRes.data);
      if (carryRes.data.length > 0) {
        setCurrentCarryForward(carryRes.data[0]);
      }

      // 2. Check Mandatory Message Blocker
      const msgRes = await messagesApi.getPendingMandatory();
      setPendingMandatoryMessages(msgRes.data);
      if (msgRes.data.length > 0) {
        setCurrentMandatoryMessage(msgRes.data[0]);
      }
    } catch (err) {
      console.error('Error during employee flow checks:', err);
    }
  };

  useEffect(() => {
    if (token && user) {
      runEmployeeChecks();
    }
  }, [token, user]);

  const handleCarryForwardSubmit = async (carry: boolean) => {
    if (!currentCarryForward) return;
    try {
      await tasksApi.handleCarryForward({
        taskId: currentCarryForward.id,
        carryForward: carry,
      });

      // Filter resolved and look for next
      const nextCarry = pendingCarryForwards.filter((t) => t.id !== currentCarryForward.id);
      setPendingCarryForwards(nextCarry);
      if (nextCarry.length > 0) {
        setCurrentCarryForward(nextCarry[0]);
      } else {
        setCurrentCarryForward(null);
      }
    } catch (err) {
      console.error('Failed to update carry forward', err);
    }
  };

  const handleMandatorySubmit = async () => {
    if (!currentMandatoryMessage) return;
    setSubmittingResponse(true);
    try {
      await messagesApi.respond(currentMandatoryMessage.id, {
        response: mandatoryResponse,
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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-800">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          <p className="text-sm font-medium tracking-wide">Syncing session state...</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-h-screen overflow-y-auto">
        <Navbar />
        <main className="flex-grow p-6">
          <Outlet />
        </main>
      </div>

      {/* CARRY FORWARD POPUP PROMPT */}
      {currentCarryForward && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-amber-500">
              <div className="rounded-lg bg-amber-500/10 p-2 border border-amber-500/20">
                <HelpCircle size={24} />
              </div>
              <h3 className="font-heading text-lg font-semibold text-slate-850">Carry Forward Task?</h3>
            </div>
            
            <p className="mt-3 text-sm text-slate-500 leading-relaxed">
              You left the following task incomplete on{' '}
              <span className="font-semibold text-slate-700">
                {new Date(currentCarryForward.date).toLocaleDateString()}
              </span>
              :
            </p>

            <div className="mt-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">
                {currentCarryForward.project?.name}
              </p>
              <p className="text-sm font-medium text-slate-800 mt-1">{currentCarryForward.description}</p>
            </div>

            <p className="mt-4 text-xs text-slate-400 leading-normal">
              Would you like to copy this task schedule into your schedule for today?
            </p>

            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={() => handleCarryForwardSubmit(true)}
                className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer shadow-lg shadow-indigo-600/10"
              >
                Yes, Carry Forward
              </button>
              <button
                onClick={() => handleCarryForwardSubmit(false)}
                className="flex-1 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-700 border border-slate-200 hover:bg-slate-200 hover:text-slate-900 transition-all cursor-pointer"
              >
                No, Dismiss
              </button>
            </div>
          </div>
        </div>
      )}

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
              An administrator has sent you a mandatory response task request. You must submit your acknowledgement and input before continuing to use the dashboard:
            </p>

            <div className="mt-4 p-4 rounded-xl bg-rose-500/5 border border-rose-200/60 text-slate-800 text-sm whitespace-pre-wrap leading-relaxed font-medium">
              {currentMandatoryMessage.content}
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                  Select Action
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['ACCEPT', 'REJECT', 'COMMENT'] as const).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setMandatoryResponse(opt)}
                      className={`py-2 rounded-xl text-xs font-bold tracking-wide border transition-all cursor-pointer ${
                        mandatoryResponse === opt
                          ? opt === 'ACCEPT'
                            ? 'bg-emerald-600/15 border-emerald-500/30 text-emerald-600'
                            : opt === 'REJECT'
                            ? 'bg-rose-600/15 border-rose-500/30 text-rose-600'
                            : 'bg-indigo-600/15 border-indigo-500/30 text-indigo-600'
                          : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-100'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Remarks / Notes
                </label>
                <textarea
                  value={mandatoryComment}
                  onChange={(e) => setMandatoryComment(e.target.value)}
                  placeholder="Enter detailed feedback or comments here..."
                  className="w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 min-h-24 resize-none transition-colors"
                />
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
                    <MessageSquare size={16} /> Submit Acknowledgement
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
