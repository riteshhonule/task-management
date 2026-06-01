import React, { useEffect, useState, useMemo } from 'react';
import { tasksApi, projectsApi } from '../services/api';
import { FileSpreadsheet, FileText, Search, Loader2, Calendar } from 'lucide-react';

type TabType = 'TODAY' | 'YESTERDAY' | 'ALL' | 'COMPLETED' | 'IN_PROGRESS' | 'DELAYED' | 'PENDING';

export const Reports: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('TODAY');
  const [tasks, setTasks] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search & Filter for All Tasks
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterDate, setFilterDate] = useState('');

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const [tasksRes, projectsRes] = await Promise.all([
        tasksApi.list(),
        projectsApi.list(),
      ]);
      
      // Flatten multi-project tasks
      const flatTasks: any[] = [];
      if (tasksRes.data && Array.isArray(tasksRes.data)) {
        tasksRes.data.forEach((parentTask: any) => {
          if (parentTask.projects && parentTask.projects.length > 0) {
            parentTask.projects.forEach((tp: any) => {
              flatTasks.push({
                ...tp,
                startDate: parentTask.startDate,
                startTime: parentTask.startTime,
                expectedEndDate: parentTask.expectedEndDate,
                employee: parentTask.employee,
                parentTaskId: parentTask.id,
                screenshotUrl: tp.updates && tp.updates.length > 0 ? tp.updates[0].screenshotUrl : null,
              });
            });
          }
        });
      }

      setTasks(flatTasks);
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

  const handleExportExcel = () => {
    window.open('http://localhost:3000/reports/export-excel', '_blank');
  };

  const handleExportPdf = () => {
    window.open('http://localhost:3000/reports/export-pdf', '_blank');
  };

  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  const filteredTasks = useMemo(() => {
    let filtered = tasks;
    
    if (activeTab === 'TODAY') {
      filtered = filtered.filter(t => new Date(t.startDate).toDateString() === today);
    } else if (activeTab === 'YESTERDAY') {
      filtered = filtered.filter(t => new Date(t.startDate).toDateString() === yesterday);
    } else if (activeTab === 'COMPLETED') {
      filtered = filtered.filter(t => t.status === 'COMPLETED');
    } else if (activeTab === 'IN_PROGRESS') {
      filtered = filtered.filter(t => t.status === 'IN_PROGRESS');
    } else if (activeTab === 'DELAYED') {
      filtered = filtered.filter(t => t.status === 'DELAYED');
    } else if (activeTab === 'PENDING') {
      filtered = filtered.filter(t => t.status === 'PENDING');
    }
    
    if (searchQuery) {
      filtered = filtered.filter(t => 
        (t.taskDescription || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
        (t.project?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.employee?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    if (filterProject) {
      filtered = filtered.filter(t => t.projectId.toString() === filterProject);
    }
    if (filterDate) {
      filtered = filtered.filter(t => {
        const d = new Date(t.startDate);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}` === filterDate;
      });
    }
    return filtered;
  }, [tasks, activeTab, searchQuery, filterProject, filterDate, today, yesterday]);

  const groupedTasks = useMemo(() => {
    const sorted = [...filteredTasks].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
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

  const tabs: { id: TabType, label: string }[] = [
    { id: 'TODAY', label: "Today's Task" },
    { id: 'YESTERDAY', label: "Yesterday's Task" },
    { id: 'ALL', label: "All Tasks" },
    { id: 'COMPLETED', label: "Completed" },
    { id: 'IN_PROGRESS', label: "In Progress" },
    { id: 'DELAYED', label: "Delayed" },
    { id: 'PENDING', label: "Pending" },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'IN_PROGRESS': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'DELAYED': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'BLOCKED': return 'bg-rose-100 text-rose-800 border-rose-300';
      default: return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-heading font-extrabold text-slate-800">All Employee Tasks</h2>
          <p className="text-xs text-slate-550">Monitor and review daily work schedules across all employees.</p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={handleExportExcel}
            className="rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 hover:bg-emerald-600 hover:text-white px-4 py-2.5 text-xs font-semibold transition-all flex items-center gap-1.5"
          >
            <FileSpreadsheet size={15} /> Export Excel
          </button>
          <button
            onClick={handleExportPdf}
            className="rounded-xl bg-rose-50 border border-rose-100 text-rose-700 hover:bg-rose-600 hover:text-white px-4 py-2.5 text-xs font-semibold transition-all flex items-center gap-1.5"
          >
            <FileText size={15} /> Export PDF
          </button>
        </div>
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
        <div className="space-y-6">
          {/* Filters for non-today/yesterday tabs */}
          {['ALL', 'COMPLETED', 'IN_PROGRESS', 'DELAYED', 'PENDING'].includes(activeTab) && (
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Search by task, project, or employee name..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-sm"
                />
              </div>
              <input
                type="date"
                value={filterDate}
                onChange={e => setFilterDate(e.target.value)}
                className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none shadow-sm text-slate-600"
              />
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
          )}

          {filteredTasks.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
              <Calendar className="mx-auto text-slate-300 mb-3" size={32} />
              <h3 className="text-lg font-bold text-slate-700">No Tasks Found</h3>
              <p className="text-sm text-slate-500">There are no employee tasks matching the current filters.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="max-h-[75vh] overflow-auto">
                <table className="w-full text-left border-collapse min-w-max">
                  <thead className="sticky top-0 z-20 bg-slate-200 outline outline-1 outline-slate-400 shadow-sm">
                    <tr className="bg-slate-200 divide-x divide-slate-400">
                      <th className="px-5 py-4 text-xs font-extrabold text-slate-800 uppercase tracking-wider">Date</th>
                      <th className="px-5 py-4 text-xs font-extrabold text-slate-800 uppercase tracking-wider">Employee Name</th>
                      <th className="px-5 py-4 text-xs font-extrabold text-slate-800 uppercase tracking-wider">Project</th>
                      <th className="px-5 py-4 text-xs font-extrabold text-slate-800 uppercase tracking-wider w-[250px]">Task</th>
                      <th className="px-5 py-4 text-xs font-extrabold text-slate-800 uppercase tracking-wider">Completion</th>
                      <th className="px-5 py-4 text-xs font-extrabold text-slate-800 uppercase tracking-wider">Screenshot</th>
                      <th className="px-5 py-4 text-xs font-extrabold text-slate-800 uppercase tracking-wider">Start Time</th>
                      <th className="px-5 py-4 text-xs font-extrabold text-slate-800 uppercase tracking-wider">Expected End</th>
                      <th className="px-5 py-4 text-xs font-extrabold text-slate-800 uppercase tracking-wider">Delay (Y/N)</th>
                      <th className="px-5 py-4 text-xs font-extrabold text-slate-800 uppercase tracking-wider w-[200px]">Delay Reason</th>
                      <th className="px-5 py-4 text-xs font-extrabold text-slate-800 uppercase tracking-wider w-[250px]">Extra Note</th>
                      <th className="px-5 py-4 text-xs font-extrabold text-slate-800 uppercase tracking-wider text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-400">
                    {groupedTasks.map(group => (
                      <React.Fragment key={group.dateStr}>
                        <tr className="bg-indigo-50/80 border-y border-indigo-100">
                          <td colSpan={12} className="px-5 py-3 text-sm font-bold text-indigo-900 text-left uppercase tracking-widest shadow-inner">
                            {group.displayDate}
                          </td>
                        </tr>
                        {group.tasks.map((t: any) => (
                          <tr key={t.id} className="hover:bg-slate-50 transition-colors align-top divide-x divide-slate-400">
                            <td className="px-5 py-5 text-xs text-slate-500 font-medium whitespace-nowrap">{new Date(t.startDate).toLocaleDateString()}</td>
                            <td className="px-5 py-5 text-xs font-bold text-slate-800 whitespace-nowrap">{t.employee?.name || 'N/A'}</td>
                            <td className="px-5 py-5 text-xs text-indigo-700 font-bold whitespace-nowrap">{t.project?.name || 'N/A'}</td>
                            <td className="px-5 py-5 text-xs text-slate-700 whitespace-normal leading-relaxed">{t.taskDescription}</td>
                            <td className="px-5 py-5 text-xs font-bold text-slate-700 whitespace-nowrap">{t.completionPercentage || 0}%</td>
                            <td className="px-5 py-5 text-xs text-slate-700 whitespace-nowrap">
                              {t.screenshotUrl ? (
                                <a href={`http://localhost:3000/${t.screenshotUrl}`} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline font-semibold bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100 inline-block">
                                  View
                                </a>
                              ) : <span className="text-slate-300">-</span>}
                            </td>
                            <td className="px-5 py-5 text-xs text-slate-700 whitespace-nowrap">{t.startTime}</td>
                            <td className="px-5 py-5 text-xs text-slate-700 whitespace-nowrap">
                              {new Date(t.expectedEndDate).toLocaleDateString()}
                            </td>
                            <td className="px-5 py-5 text-xs font-bold text-slate-700 whitespace-nowrap">
                              {t.status === 'DELAYED' ? <span className="text-rose-700 bg-rose-50 px-2.5 py-1 rounded-md border border-rose-100">Yes</span> : <span className="text-slate-400">No</span>}
                            </td>
                            <td className="px-5 py-5 text-xs text-slate-600 whitespace-normal leading-relaxed">
                              {t.delayReason || <span className="text-slate-300">-</span>}
                            </td>
                            <td className="px-5 py-5 text-xs text-slate-600 whitespace-normal leading-relaxed">
                              {t.completedWorkDescription ? (
                                <div><strong className="text-emerald-700 block mb-1">Work:</strong> {t.completedWorkDescription}</div>
                              ) : t.blockedReason ? (
                                <div><strong className="text-rose-700 block mb-1">Blocked:</strong> {t.blockedReason}</div>
                              ) : t.notes ? (
                                <div><strong className="text-slate-600 block mb-1">Note:</strong> {t.notes}</div>
                              ) : <span className="text-slate-300">-</span>}
                            </td>
                            <td className="px-5 py-5 text-xs text-right whitespace-nowrap">
                              <span className={`px-3 py-1.5 rounded-lg font-bold border inline-block ${getStatusColor(t.status)}`}>
                                {(t.status || '').replace('_', ' ')}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
