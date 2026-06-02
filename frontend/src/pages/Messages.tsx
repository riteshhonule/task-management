import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { messagesApi, usersApi } from '../services/api';
import { Mail, Send, CheckCircle, XCircle, MessageSquare, Loader2 } from 'lucide-react';

export const Messages: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  const [sent, setSent] = useState<any[]>([]);
  const [inbox, setInbox] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Message Form State
  const [content, setContent] = useState('');
  const [isMandatory, setIsMandatory] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState<number[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [successToast, setSuccessToast] = useState(false);
  const [isComposeModalOpen, setIsComposeModalOpen] = useState(false);

  // Selected Broadcast Log Details
  const [selectedBroadcast, setSelectedBroadcast] = useState<any | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      if (isAdmin) {
        const [sentRes, usersRes] = await Promise.all([
          messagesApi.sent(),
          usersApi.list({ role: 'EMPLOYEE' }),
        ]);
        setSent(sentRes.data);
        setEmployees(usersRes.data.filter((u: any) => u.role === 'EMPLOYEE'));
      } else {
        const inboxRes = await messagesApi.inbox();
        setInbox(inboxRes.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || selectedRecipients.length === 0) return;
    setIsSending(true);
    try {
      await messagesApi.create({
        content,
        type: isMandatory ? 'MANDATORY_RESPONSE' : 'NORMAL',
        recipientIds: selectedRecipients,
      });

      setContent('');
      setIsMandatory(false);
      setSelectedRecipients([]);
      setIsComposeModalOpen(false);
      await loadData();
      setSuccessToast(true);
      setTimeout(() => setSuccessToast(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  const handleRespond = async (messageId: number, responseType: string) => {
    const comment = window.prompt('Optional: Add a comment to your response');
    if (comment === null) return; // User cancelled
    try {
      await messagesApi.respond(messageId, { response: responseType, comment });
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit response');
    }
  };

  const handleRecipientToggle = (id: number) => {
    if (selectedRecipients.includes(id)) {
      setSelectedRecipients(selectedRecipients.filter((rid) => rid !== id));
    } else {
      setSelectedRecipients([...selectedRecipients, id]);
    }
  };

  const selectAllRecipients = () => {
    if (selectedRecipients.length === employees.length) {
      setSelectedRecipients([]);
    } else {
      setSelectedRecipients(employees.map((e) => e.id));
    }
  };

  const getResponseIcon = (resp: string) => {
    switch (resp) {
      case 'ACCEPT':
        return <CheckCircle size={14} className="text-emerald-400" />;
      case 'REJECT':
        return <XCircle size={14} className="text-rose-400" />;
      default:
        return <MessageSquare size={14} className="text-indigo-400" />;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-slate-850 tracking-tight">Messages Center</h1>
          <p className="text-sm font-medium text-slate-500 mt-1">Communicate with staff and track mandatory responses.</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setIsComposeModalOpen(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm shadow-indigo-600/20 cursor-pointer"
          >
            <Mail size={16} /> Compose Message
          </button>
        )}
      </div>

      {/* CUSTOM SUCCESS TOAST */}
      {successToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-emerald-600 text-white shadow-xl shadow-emerald-600/20">
            <CheckCircle size={24} className="text-emerald-100" />
            <div>
              <p className="font-bold tracking-wide text-sm">Message Broadcasted</p>
              <p className="text-xs text-emerald-100 font-medium">Your message was sent successfully to selected employees.</p>
            </div>
          </div>
        </div>
      )}

        {/* Compose Modal */}
        {isAdmin && isComposeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between p-5 border-b border-slate-100">
                <h3 className="font-heading font-bold text-slate-800 text-lg flex items-center gap-2">
                  <Mail size={20} className="text-indigo-600" /> Compose Broadcast
                </h3>
                <button 
                  onClick={() => setIsComposeModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <XCircle size={20} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto">
                <form onSubmit={handleBroadcast} className="space-y-5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                      Message Content
                    </label>
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Type your message or instructions here..."
                      required
                      className="block w-full rounded-xl bg-white border border-slate-200 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 min-h-24"
                    />
                  </div>

                  <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-150">
                    <input
                      type="checkbox"
                      id="isMandatory"
                      checked={isMandatory}
                      onChange={(e) => setIsMandatory(e.target.checked)}
                      className="rounded border-slate-200 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="isMandatory" className="text-xs font-semibold text-slate-600 cursor-pointer select-none">
                      Make Response Mandatory (Blocker)
                    </label>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide">
                        Select Recipients
                      </label>
                      <button
                        type="button"
                        onClick={selectAllRecipients}
                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                      >
                        {selectedRecipients.length === employees.length ? 'Clear All' : 'Select All'}
                      </button>
                    </div>

                    <div className="max-h-40 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-slate-50 border border-slate-200">
                      {employees.length === 0 ? (
                        <p className="text-[10px] text-slate-600 text-center py-4">No employees registered yet.</p>
                      ) : (
                        employees.map((emp) => (
                          <div
                            key={emp.id}
                            onClick={() => handleRecipientToggle(emp.id)}
                            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
                          >
                            <input
                              type="checkbox"
                              checked={selectedRecipients.includes(emp.id)}
                              onChange={() => {}} // handled by parent div click
                              className="rounded border-slate-200 text-indigo-600"
                            />
                            <span className="text-xs font-medium text-slate-700">{emp.name}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSending || !content.trim() || selectedRecipients.length === 0}
                    className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-indigo-600/10"
                  >
                    {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Broadcast Message
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Sent Broadcasts and Response Log Panel */}
        {isAdmin ? (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-sm">
              <h3 className="font-heading font-bold text-slate-800 text-sm">Sent Broadcasts history</h3>

              {loading ? (
                <div className="flex justify-center items-center py-10">
                  <Loader2 size={24} className="animate-spin text-indigo-500" />
                </div>
              ) : sent.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-8">No broadcasts sent yet.</p>
              ) : (
                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                  {sent.map((msg) => (
                    <div
                      key={msg.id}
                      onClick={() => setSelectedBroadcast(msg)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        selectedBroadcast?.id === msg.id
                          ? 'bg-indigo-50/50 border-indigo-200'
                          : 'bg-slate-50/50 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                          <div className="h-6 w-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center">
                            {user?.name?.charAt(0) || 'A'}
                          </div>
                          {user?.name || 'Admin'}
                          {msg.type === 'MANDATORY_RESPONSE' ? (
                            <span className="ml-2 text-[9px] font-extrabold text-rose-700 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded">
                              MANDATORY
                            </span>
                          ) : (
                            <span className="ml-2 text-[9px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                              NORMAL
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 font-medium">
                          {new Date(msg.createdAt).toLocaleDateString()} at{' '}
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-sm text-slate-800 leading-relaxed mb-4">{msg.content}</p>

                      <div className="pt-4 border-t border-slate-200">
                        {msg.responses && msg.responses.length > 0 ? (
                          <div className="flex flex-col gap-2">
                            {msg.responses.map((r: any) => (
                              <div key={r.id} className="flex items-center gap-2 text-xs text-slate-600 bg-slate-100/50 px-3 py-2 rounded-lg border border-slate-200/60 w-fit">
                                <span className="font-bold text-indigo-700">
                                  {r.user?.name || r.employee?.name || 'Employee'}
                                </span>
                                <span className="text-slate-300">•</span>
                                <span className="font-bold flex items-center gap-1.5">
                                  {getResponseIcon(r.response)} {r.response}
                                </span>
                                {r.comment && (
                                  <>
                                    <span className="text-slate-300">•</span>
                                    <span className="italic">"{r.comment}"</span>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-500 italic">No responses yet.</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Response log table details */}
            {selectedBroadcast && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 animate-in slide-in-from-bottom duration-300 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="font-heading font-bold text-slate-800 text-sm">Response details & logs</h3>
                  <button
                    onClick={() => setSelectedBroadcast(null)}
                    className="text-xs font-bold text-slate-500 hover:text-slate-700"
                  >
                    Close logs
                  </button>
                </div>

                <div className="border border-slate-200 bg-slate-50">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-100/50 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        <th className="px-4 py-4 text-center align-middle">Employee</th>
                        <th className="px-4 py-4 text-center align-middle">Action</th>
                        <th className="px-4 py-4 text-center align-middle">Comment</th>
                        <th className="px-4 py-4 text-center align-middle">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-xs text-slate-700">
                      {selectedBroadcast.responses && selectedBroadcast.responses.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-2 py-1.5 text-center text-slate-500 align-middle">
                            No recipient has responded yet.
                          </td>
                        </tr>
                      ) : (
                        selectedBroadcast.responses?.map((r: any) => (
                          <tr key={r.id} className="hover:bg-slate-100/50">
                            <td className="px-2 py-1.5 font-semibold text-slate-800 text-center align-middle">{r.user?.name || r.employee?.name}</td>
                            <td className="px-2 py-1.5 text-center align-middle">
                              <span className="flex items-center gap-1.5 font-bold">
                                {getResponseIcon(r.response)} {r.response}
                              </span>
                            </td>
                            <td className="px-2 py-1.5 text-slate-650 truncate max-w-[200px] text-center align-middle" title={r.comment}>
                              {r.comment || '—'}
                            </td>
                            <td className="px-2 py-1.5 text-slate-500 text-center align-middle">
                              {new Date(r.createdAt).toLocaleDateString()}
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
        ) : (
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-sm">
              <h3 className="font-heading font-bold text-slate-800 text-sm">Inbox</h3>

              {loading ? (
                <div className="flex justify-center items-center py-10">
                  <Loader2 size={24} className="animate-spin text-indigo-500" />
                </div>
              ) : inbox.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-8">No messages received yet.</p>
              ) : (
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
                  {inbox.map((msg) => {
                    const response = msg.responses && msg.responses[0];
                    return (
                      <div
                        key={msg.id}
                        className="p-5 rounded-xl border bg-slate-50/50 border-slate-200"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                            <div className="h-6 w-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center">
                              {msg.sender?.name?.charAt(0) || 'A'}
                            </div>
                            {msg.sender?.name || 'Admin Message'}
                            {msg.type === 'MANDATORY_RESPONSE' ? (
                              <span className="ml-2 text-[9px] font-extrabold text-rose-700 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded">
                                MANDATORY
                              </span>
                            ) : (
                              <span className="ml-2 text-[9px] font-extrabold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded">
                                NORMAL
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 font-medium">
                            {new Date(msg.createdAt).toLocaleDateString()} at{' '}
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-sm text-slate-800 leading-relaxed mb-4">{msg.content}</p>

                        <div className="pt-4 border-t border-slate-200">
                          {response ? (
                            <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-100/50 px-3 py-2 rounded-lg border border-slate-200/60 w-fit">
                              <span className="font-bold flex items-center gap-1.5">
                                {getResponseIcon(response.response)} {response.response}
                              </span>
                              {response.comment && (
                                <>
                                  <span className="text-slate-300">•</span>
                                  <span className="italic">"{response.comment}"</span>
                                </>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => handleRespond(msg.id, 'ACCEPT')}
                                className="px-4 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                              >
                                <CheckCircle size={14} /> {msg.type === 'MANDATORY_RESPONSE' ? 'ACCEPT' : 'GOT IT / REPLY'}
                              </button>
                              {msg.type === 'MANDATORY_RESPONSE' && (
                                <button
                                  onClick={() => handleRespond(msg.id, 'REJECT')}
                                  className="px-4 py-2 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                                >
                                  <XCircle size={14} /> REJECT
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
    </div>
  );
};
