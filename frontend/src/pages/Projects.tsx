import React, { useEffect, useState } from 'react';
import { projectsApi, usersApi } from '../services/api';
import { FolderPlus, Trash, Archive, Check, Loader2 } from 'lucide-react';

export const Projects: React.FC = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // New Project Form
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [allocatedUserIds, setAllocatedUserIds] = useState<number[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [users, setUsers] = useState<any[]>([]);

  // Editing Project State
  const [editingProject, setEditingProject] = useState<any | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editAllocatedUserIds, setEditAllocatedUserIds] = useState<number[]>([]);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const res = await projectsApi.list();
      setProjects(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await usersApi.list({ role: 'EMPLOYEE' });
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchUsers();

    const handleSyncProjects = () => {
      fetchProjects();
    };
    const handleSyncUsers = () => {
      fetchUsers();
    };

    window.addEventListener('sync-projects', handleSyncProjects);
    window.addEventListener('sync-users', handleSyncUsers);

    return () => {
      window.removeEventListener('sync-projects', handleSyncProjects);
      window.removeEventListener('sync-users', handleSyncUsers);
    };
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsCreating(true);
    try {
      await projectsApi.create({ name, description, allocatedUserIds });
      setName('');
      setDescription('');
      setAllocatedUserIds([]);
      await fetchProjects();
    } catch (err) {
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleArchive = async (project: any) => {
    try {
      await projectsApi.update(project.id, {
        isArchived: !project.isArchived,
      });
      await fetchProjects();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this project?')) return;
    try {
      await projectsApi.delete(id);
      await fetchProjects();
    } catch (err) {
      console.error(err);
    }
  };

  const startEdit = (proj: any) => {
    setEditingProject(proj);
    setEditName(proj.name);
    setEditDesc(proj.description || '');
    setEditAllocatedUserIds(proj.allocations ? proj.allocations.map((a: any) => a.userId) : []);
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject || !editName.trim()) return;
    setIsUpdating(true);
    try {
      await projectsApi.update(editingProject.id, {
        name: editName,
        description: editDesc,
        allocatedUserIds: editAllocatedUserIds,
      });
      setEditingProject(null);
      await fetchProjects();
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <div>
        <h2 className="text-2xl font-heading font-extrabold text-slate-800 font-bold">Projects Management</h2>
        <p className="text-xs text-slate-550">Configure client or internal code bases for time reporting.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Creation Form Panel */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 h-fit space-y-4 shadow-sm">
          <h3 className="font-heading font-bold text-slate-800 text-sm flex items-center gap-2">
            <FolderPlus size={16} className="text-indigo-650" /> New Project
          </h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                Project Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. CRM Dashboard"
                required
                className="block w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional summary..."
                className="block w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500 min-h-20"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                Allocate to Employees
              </label>
              <div className="space-y-2 max-h-40 overflow-y-auto p-2 border border-slate-200 rounded-xl bg-slate-50">
                {users.map(u => (
                  <label key={u.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-100 p-1.5 rounded-lg">
                    <input
                      type="checkbox"
                      checked={allocatedUserIds.includes(u.id)}
                      onChange={(e) => {
                        if (e.target.checked) setAllocatedUserIds([...allocatedUserIds, u.id]);
                        else setAllocatedUserIds(allocatedUserIds.filter(id => id !== u.id));
                      }}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="font-medium text-slate-700">{u.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={isCreating || !name}
              className="w-full rounded-xl bg-indigo-600 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-indigo-600/10"
            >
              {isCreating ? <Loader2 size={14} className="animate-spin" /> : 'Create Project'}
            </button>
          </form>
        </div>

        {/* Projects List Panel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <h3 className="font-heading font-bold text-slate-800 text-sm">Active & Archived Codes</h3>
            <span className="rounded-full bg-slate-50 px-2 py-0.5 text-xs text-slate-650 border border-slate-200">
              {projects.length} Total
            </span>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 size={24} className="animate-spin text-indigo-500" />
            </div>
          ) : projects.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-10">No projects added yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((p) => (
                <div
                  key={p.id}
                  className={`bg-white rounded-2xl p-5 border flex flex-col justify-between gap-4 transition-all shadow-sm ${
                    p.isArchived ? 'opacity-60 border-slate-200' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-slate-800">{p.name}</h4>
                      {p.isArchived && (
                        <span className="text-[9px] font-bold text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                          ARCHIVED
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {p.description || 'No description provided.'}
                    </p>
                    
                    {p.allocations && p.allocations.length > 0 && (
                      <div className="mt-3">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Allocated To:</p>
                        <div className="flex flex-wrap gap-1">
                          {p.allocations.map((alloc: any) => (
                            <span key={alloc.id} className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${alloc.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                              {alloc.user?.name} ({alloc.status})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                    <button
                      onClick={() => startEdit(p)}
                      className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold cursor-pointer"
                    >
                      Edit
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleArchive(p)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                        title={p.isArchived ? 'Unarchive Project' : 'Archive Project'}
                      >
                        <Archive size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Delete Project"
                      >
                        <Trash size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* EDIT MODAL */}
      {editingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="font-heading text-lg font-bold text-slate-800 mb-4">Edit Project</h3>
            <form onSubmit={handleUpdateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Project Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="block w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-505 uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="block w-full rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-indigo-500 min-h-20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-505 uppercase tracking-wider mb-2">
                  Re-Allocate to Employees
                </label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {users.map(u => (
                    <label key={u.id} className="flex items-center gap-2 p-2 rounded-xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors bg-white">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-600 cursor-pointer"
                        checked={editAllocatedUserIds.includes(u.id)}
                        onChange={(e) => {
                          if (e.target.checked) setEditAllocatedUserIds([...editAllocatedUserIds, u.id]);
                          else setEditAllocatedUserIds(editAllocatedUserIds.filter(id => id !== u.id));
                        }}
                      />
                      <span className="text-sm font-semibold text-slate-700">{u.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="rounded-xl bg-slate-100 border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors flex items-center gap-2 cursor-pointer shadow-md shadow-indigo-600/10"
                >
                  {isUpdating ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
