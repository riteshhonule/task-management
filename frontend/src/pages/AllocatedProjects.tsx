import React, { useEffect, useState } from 'react';
import { projectsApi } from '../services/api';
import { FolderKanban, Check, Loader2 } from 'lucide-react';

export const AllocatedProjects: React.FC = () => {
  const [allocations, setAllocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<number | null>(null);

  const fetchAllocations = async () => {
    try {
      setLoading(true);
      const res = await projectsApi.myAllocations();
      setAllocations(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllocations();
  }, []);

  const handleAccept = async (id: number) => {
    try {
      setAcceptingId(id);
      await projectsApi.acceptAllocation(id);
      await fetchAllocations();
    } catch (err) {
      console.error(err);
    } finally {
      setAcceptingId(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <div>
        <h2 className="text-2xl font-heading font-extrabold text-slate-800">Allocated Projects</h2>
        <p className="text-xs text-slate-500 mt-1">Review and accept projects allocated to you by the administrator.</p>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 size={32} className="animate-spin text-indigo-500" />
        </div>
      ) : allocations.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 border border-slate-200 text-center shadow-sm">
          <FolderKanban size={48} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-bold text-slate-700 mb-2">No Projects Allocated</h3>
          <p className="text-sm text-slate-500">You currently have no project allocations pending or accepted.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allocations.map((alloc) => (
            <div key={alloc.id} className="bg-white rounded-2xl p-6 border border-slate-200 flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
              <div className={`absolute top-0 left-0 w-1 h-full ${alloc.status === 'ACCEPTED' ? 'bg-emerald-500' : 'bg-amber-400'}`}></div>
              
              <div className="mb-6">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="text-lg font-bold text-slate-800">{alloc.project?.name}</h4>
                  <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider ${
                    alloc.status === 'ACCEPTED' 
                      ? 'bg-emerald-100 text-emerald-700' 
                      : 'bg-amber-100 text-amber-700'
                  }`}>
                    {alloc.status}
                  </span>
                </div>
                <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed">
                  {alloc.project?.description || 'No description provided for this project.'}
                </p>
                
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <p className="text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">Allocated On:</span> {new Date(alloc.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {alloc.status === 'PENDING' ? (
                <button
                  onClick={() => handleAccept(alloc.id)}
                  disabled={acceptingId === alloc.id}
                  className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-indigo-600/10"
                >
                  {acceptingId === alloc.id ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      <Check size={16} /> Accept Project
                    </>
                  )}
                </button>
              ) : (
                <div className="w-full rounded-xl bg-slate-50 py-2.5 text-sm font-semibold text-slate-500 text-center border border-slate-200">
                  Accepted
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
