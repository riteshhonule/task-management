import React, { useEffect, useState } from 'react';
import { messagesApi, usersApi } from '../services/api';
import { Mail, Send, CheckCircle, XCircle, MessageSquare, Loader2 } from 'lucide-react';

export const Messages: React.FC = () => {
  const [sent, setSent] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Message Form State
  const [content, setContent] = useState('');
  const [isMandatory, setIsMandatory] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState<number[]>([]);
  const [isSending, setIsSending] = useState(false);

  // Selected Broadcast Log Details
  const [selectedBroadcast, setSelectedBroadcast] = useState<any | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sentRes, usersRes] = await Promise.all([
        messagesApi.sent(),
        usersApi.list({ role: 'EMPLOYEE' }),
      ]);
      setSent(sentRes.data);
      setEmployees(usersRes.data.filter((u: any) => u.role === 'EMPLOYEE'));
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
        isMandatory,
        recipientIds: selectedRecipients,
      });

      setContent('');
      setIsMandatory(false);
      setSelectedRecipients([]);
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
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
      <div>
        <h2 className="text-2xl font-heading font-extrabold text-slate-800 font-bold">Messages Center</h2>
        <p className="text-xs text-slate-550">Communicate with staff and track mandatory responses.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Broadcast Form Panel */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 h-fit shadow-sm">
          <h3 className="font-heading font-bold text-slate-800 text-sm flex items-center gap-2">
            <Mail size={16} className="text-indigo-650" /> Compose Broadcast
          </h3>

          <form onSubmit={handleBroadcast} className="space-y-4">
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
                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700"
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
              className="w-full rounded-xl bg-indigo-600 py-3 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-indigo-600/10"
            >
              {isSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Broadcast Message
            </button>
          </form>
        </div>

        {/* Sent Broadcasts and Response Log Panel */}
        <div className="lg:col-span-2 space-y-6">
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
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] text-slate-500">
                        {new Date(msg.createdAt).toLocaleDateString()} at{' '}
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>

                      {msg.isMandatory && (
                        <span className="text-[9px] font-extrabold text-rose-700 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded">
                          MANDATORY
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-700 leading-relaxed">{msg.content}</p>
                    <div className="mt-3 flex items-center justify-between text-[10px] text-slate-500">
                      <span>Recipients: {msg.recipients?.length || 0}</span>
                      <span>Responses: {msg.responses?.length || 0}</span>
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

              <div className="rounded-xl border border-slate-200 bg-slate-50 overflow-hidden">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-100/50 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      <th className="px-4 py-3">Employee</th>
                      <th className="px-4 py-3">Action</th>
                      <th className="px-4 py-3">Comment</th>
                      <th className="px-4 py-3 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-xs text-slate-700">
                    {selectedBroadcast.responses && selectedBroadcast.responses.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                          No recipient has responded yet.
                        </td>
                      </tr>
                    ) : (
                      selectedBroadcast.responses?.map((r: any) => (
                        <tr key={r.id} className="hover:bg-slate-100/50">
                          <td className="px-4 py-3 font-semibold text-slate-800">{r.user?.name}</td>
                          <td className="px-4 py-3">
                            <span className="flex items-center gap-1.5 font-bold">
                              {getResponseIcon(r.response)} {r.response}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-650 truncate max-w-[200px]" title={r.comment}>
                            {r.comment || '—'}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-500">
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
      </div>
    </div>
  );
};
