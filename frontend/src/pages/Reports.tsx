import React, { useEffect, useState } from 'react';
import { reportsApi } from '../services/api';
import { FileSpreadsheet, FileText, Calendar, Loader2 } from 'lucide-react';

export const Reports: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDailyReview = async () => {
    try {
      setLoading(true);
      const res = await reportsApi.dailyReview(selectedDate);
      const tasks = res.data || [];
      const groupedMap = new Map<number, any>();

      for (const t of tasks) {
        const empId = t.employeeId;
        const empName = t.employee?.name || 'N/A';
        const projName = t.project?.name;

        if (!groupedMap.has(empId)) {
          groupedMap.set(empId, {
            employeeId: empId,
            employeeName: empName,
            projects: [],
            totalTasks: 0,
            completedTasks: 0,
            delayedTasks: 0,
            tasks: [],
          });
        }

        const group = groupedMap.get(empId);
        group.totalTasks++;
        if (t.status === 'COMPLETED') group.completedTasks++;
        if (t.status === 'DELAYED') group.delayedTasks++;

        if (projName && !group.projects.includes(projName)) {
          group.projects.push(projName);
        }

        group.tasks.push(t);
      }

      setData(Array.from(groupedMap.values()));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDailyReview();
  }, [selectedDate]);

  const handleExportExcel = () => {
    window.open(reportsApi.getExcelUrl(selectedDate), '_blank');
  };

  const handleExportPdf = () => {
    window.open(reportsApi.getPdfUrl(selectedDate), '_blank');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-heading font-extrabold text-slate-800 font-bold">Daily Reviews Sheet</h2>
          <p className="text-xs text-slate-550">Review task reports and export sheets for managers.</p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={handleExportExcel}
            className="rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 hover:bg-emerald-600 hover:text-white px-4 py-2.5 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
          >
            <FileSpreadsheet size={15} /> Export Excel
          </button>
          <button
            onClick={handleExportPdf}
            className="rounded-xl bg-rose-50 border border-rose-100 text-rose-700 hover:bg-rose-600 hover:text-white px-4 py-2.5 text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5"
          >
            <FileText size={15} /> Export PDF
          </button>
        </div>
      </div>

      {/* Date Select Bar */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 flex items-center gap-4 shadow-sm">
        <Calendar size={16} className="text-indigo-650" />
        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Review Date</label>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="rounded-xl bg-white border border-slate-200 px-3.5 py-2 text-xs text-slate-805 text-slate-800 focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* Reports Table */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 size={36} className="animate-spin text-indigo-500" />
        </div>
      ) : data.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-slate-200 text-xs text-slate-500 bg-slate-50/50">
          No task entries or activity reports logged for {new Date(selectedDate).toLocaleDateString()}.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/50 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  <th className="px-5 py-4">Employee</th>
                  <th className="px-5 py-4">Projects Work Log</th>
                  <th className="px-5 py-4 text-center">Tasks Logged</th>
                  <th className="px-5 py-4 text-center">Completed</th>
                  <th className="px-5 py-4 text-center">Delayed</th>
                  <th className="px-5 py-4">Daily Tasks detail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs text-slate-705 text-slate-700">
                {data.map((row) => (
                  <tr key={row.employeeId} className="hover:bg-slate-50">
                    <td className="px-5 py-4 font-bold text-slate-800">{row.employeeName}</td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {row.projects.length === 0 ? (
                          <span className="text-[10px] text-slate-550 italic">None</span>
                        ) : (
                          row.projects.map((proj: string) => (
                            <span
                              key={proj}
                              className="text-[9px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 border border-indigo-100 rounded"
                            >
                              {proj}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4 text-center font-semibold">{row.totalTasks}</td>
                    <td className="px-5 py-4 text-center text-emerald-700 font-semibold">{row.completedTasks}</td>
                    <td className="px-5 py-4 text-center text-rose-700 font-semibold">{row.delayedTasks}</td>
                    <td className="px-5 py-4 max-w-sm">
                      <ul className="list-disc pl-4 space-y-1.5 text-[11px] text-slate-500">
                        {row.tasks.map((t: any) => (
                          <li key={t.id}>
                            <span className="font-semibold text-slate-700">{t.project?.name}:</span>{' '}
                            {t.description} —{' '}
                            <span
                              className={`font-semibold ${
                                t.status === 'COMPLETED'
                                  ? 'text-emerald-700'
                                  : t.status === 'DELAYED'
                                  ? 'text-rose-700'
                                  : 'text-amber-700'
                                }`}
                            >
                              {t.status}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
