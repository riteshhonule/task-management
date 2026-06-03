import React, { useEffect, useState } from 'react';
import { announcementsApi } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Megaphone, Send, CheckCircle2, User, Loader2 } from 'lucide-react';

export const Announcements: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State (Admin only)
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Selected Announcement (Admin viewing readers)
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<any | null>(null);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const res = await announcementsApi.list();
      setAnnouncements(res.data);
      if (selectedAnnouncement) {
        const updated = res.data.find((a: any) => a.id === selectedAnnouncement.id);
        if (updated) setSelectedAnnouncement(updated);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();

    const handleSyncAnnouncements = () => {
      fetchAnnouncements();
    };

    window.addEventListener('sync-announcements', handleSyncAnnouncements);

    return () => {
      window.removeEventListener('sync-announcements', handleSyncAnnouncements);
    };
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;
    setIsSending(true);
    try {
      await announcementsApi.create({ title, content });
      setTitle('');
      setContent('');
      await fetchAnnouncements();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  const handleAcknowledge = async (id: number) => {
    try {
      await announcementsApi.acknowledge(id);
      await fetchAnnouncements();
    } catch (err) {
      console.error(err);
    }
  };

  const hasAcknowledged = (ann: any) => {
    return ann.acknowledgements?.some((ack: any) => ack.userId === user?.id);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <div>
        <h2 className="text-2xl font-heading font-extrabold text-slate-800 font-bold">Announcements & Bulletins</h2>
        <p className="text-xs text-slate-550">Read system-wide broadcasts or publish organization alerts.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Compose Announcement (Admins Only) */}
        {isAdmin && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4 h-fit shadow-sm">
            <h3 className="font-heading font-bold text-slate-800 text-sm flex items-center gap-2">
              <Megaphone size={16} className="text-indigo-600" /> Publish Bulletin
            </h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1.5">
                  Bulletin Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Server Maintenance Notice"
                  required
                  className="block w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide block mb-1.5">
                  Content Details
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Type full announcement message here..."
                  required
                  className="block w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 min-h-24"
                />
              </div>

              <button
                type="submit"
                disabled={isSending || !title.trim() || !content.trim()}
                className="w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/10"
              >
                {isSending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Publish Bulletin
              </button>
            </form>
          </div>
        )}

        {/* Announcements List Container */}
        <div className={isAdmin ? 'lg:col-span-2 space-y-6' : 'lg:col-span-3 space-y-6'}>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4 shadow-sm">
            <h3 className="font-heading font-bold text-slate-800 text-sm">Recent Bulletins</h3>

            {loading ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 size={24} className="animate-spin text-indigo-500" />
              </div>
            ) : announcements.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">No bulletins have been posted yet.</p>
            ) : (
              <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                {announcements.map((ann) => {
                  const ack = hasAcknowledged(ann);
                  return (
                    <div
                      key={ann.id}
                      onClick={() => isAdmin && setSelectedAnnouncement(ann)}
                      className={`p-4 rounded-xl border transition-all ${
                        isAdmin && selectedAnnouncement?.id === ann.id
                          ? 'bg-indigo-50 border-indigo-250'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                      } ${isAdmin ? 'cursor-pointer' : ''}`}
                    >
                      <div className="flex justify-between items-start mb-2.5">
                        <h4 className="text-sm font-bold text-slate-800">{ann.title}</h4>
                        <span className="text-[10px] text-slate-400">
                          {new Date(ann.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-xs text-slate-650 leading-relaxed whitespace-pre-wrap">{ann.content}</p>

                      <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between">
                        <span className="text-[10px] text-slate-500">
                          Published by: {ann.publisher?.name || 'Administrator'}
                        </span>

                        {!isAdmin ? (
                          ack ? (
                            <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                              <CheckCircle2 size={12} /> Acknowledged
                            </span>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAcknowledge(ann.id);
                              }}
                              className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 text-[10px] font-semibold text-white transition-colors cursor-pointer shadow-sm shadow-indigo-600/10"
                            >
                              Mark Acknowledged
                            </button>
                          )
                        ) : (
                          <span className="text-[10px] text-slate-500">
                            Read by: {ann.acknowledgements?.length || 0} employees
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Acknowledgements / Readers Log Panel */}
          {isAdmin && selectedAnnouncement && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4 animate-in slide-in-from-bottom duration-350 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="font-heading font-bold text-slate-800 text-sm">Bulletin Readers Log</h3>
                <button
                  onClick={() => setSelectedAnnouncement(null)}
                  className="text-xs font-bold text-slate-550 hover:text-slate-700 cursor-pointer"
                >
                  Close logs
                </button>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl max-h-40 overflow-y-auto space-y-2">
                {selectedAnnouncement.acknowledgements && selectedAnnouncement.acknowledgements.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4">No employees have acknowledged yet.</p>
                ) : (
                  selectedAnnouncement.acknowledgements?.map((ack: any) => (
                    <div
                      key={ack.id}
                      className="flex items-center gap-2 justify-between text-xs text-slate-600 p-1 rounded hover:bg-slate-100"
                    >
                      <span className="flex items-center gap-1.5 text-slate-850 font-medium">
                        <User size={12} className="text-indigo-600" /> {ack.user?.name}
                      </span>
                      <span className="text-slate-450">
                        Read on: {new Date(ack.createdAt).toLocaleDateString()} at{' '}
                        {new Date(ack.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
