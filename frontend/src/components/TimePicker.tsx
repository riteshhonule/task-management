import React from 'react';

interface TimePickerProps {
  value: string;
  onChange: (val: string) => void;
  className?: string;
}

export const TimePicker: React.FC<TimePickerProps> = ({ value, onChange, className }) => {
  const parseValue = (val: string) => {
    if (!val) return { hour: '09', minute: '00', ampm: 'AM' };
    
    // Check 12-hour format e.g. "09:30 AM" or "9:30 AM"
    const match12 = val.match(/^\s*(\d+):(\d+)\s*(AM|PM)\s*$/i);
    if (match12) {
      const h = parseInt(match12[1], 10);
      const m = match12[2].padStart(2, '0');
      const ap = match12[3].toUpperCase();
      return { hour: h.toString().padStart(2, '0'), minute: m, ampm: ap };
    }
    
    // Check 24-hour format e.g. "09:00" or "18:00"
    const match24 = val.match(/^\s*(\d+):(\d+)\s*$/);
    if (match24) {
      let h = parseInt(match24[1], 10);
      const m = match24[2].padStart(2, '0');
      let ap = 'AM';
      if (h >= 12) {
        ap = 'PM';
        if (h > 12) h -= 12;
      }
      if (h === 0) h = 12;
      return { hour: h.toString().padStart(2, '0'), minute: m, ampm: ap };
    }
    
    return { hour: '09', minute: '00', ampm: 'AM' };
  };

  const { hour, minute, ampm } = parseValue(value);

  const setTime = (newH: string, newM: string, newAP: string) => {
    onChange(`${newH}:${newM} ${newAP}`);
  };

  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  return (
    <div className={`flex gap-1 sm:gap-1.5 items-center w-full ${className || ''}`}>
      <select
        value={hour}
        onChange={(e) => setTime(e.target.value, minute, ampm)}
        className="flex-1 min-w-0 rounded-xl border border-slate-200 px-1 sm:px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 bg-white text-slate-800 focus:outline-none"
      >
        {hours.map((h) => (
          <option key={h} value={h}>{h}</option>
        ))}
      </select>
      <span className="text-slate-400 font-bold text-xs shrink-0">:</span>
      <select
        value={minute}
        onChange={(e) => setTime(hour, e.target.value, ampm)}
        className="flex-1 min-w-0 rounded-xl border border-slate-200 px-1 sm:px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 bg-white text-slate-800 focus:outline-none"
      >
        {minutes.map((m) => (
          <option key={m} value={m}>{m}</option>
        ))}
      </select>
      <select
        value={ampm}
        onChange={(e) => setTime(hour, minute, e.target.value)}
        className="flex-1 min-w-0 rounded-xl border border-slate-200 px-1 sm:px-2 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500/20 bg-white text-slate-800 focus:outline-none"
      >
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  );
};
