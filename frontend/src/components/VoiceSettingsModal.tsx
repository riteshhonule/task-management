import React, { useState, useEffect } from 'react';
import { X, Volume2, PlayCircle } from 'lucide-react';
import { voiceService, type VoiceSettings } from '../services/voiceService';

interface VoiceSettingsModalProps {
  onClose: () => void;
}

export const VoiceSettingsModal: React.FC<VoiceSettingsModalProps> = ({ onClose }) => {
  const [settings, setSettings] = useState<VoiceSettings>(voiceService.getSettings());
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  useEffect(() => {
    setVoices(voiceService.getAvailableVoices());
    const handleVoicesChanged = () => setVoices(voiceService.getAvailableVoices());
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
    }
    return () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
      }
    };
  }, []);

  const handleUpdate = (updates: Partial<VoiceSettings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    voiceService.saveSettings(newSettings);
  };

  const testVoice = () => {
    voiceService.testVoice();
  };

  return (
    <div className="fixed left-1/2 -translate-x-1/2 top-16 w-[calc(100vw-2rem)] max-w-sm sm:absolute sm:left-auto sm:right-0 sm:translate-x-0 sm:top-auto sm:mt-3 sm:w-80 rounded-xl bg-white border border-slate-200 shadow-2xl p-5 z-50 animate-in fade-in sm:zoom-in-95 duration-200">
      <div className="flex items-center justify-between mb-5 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <Volume2 className="text-indigo-600" size={16} />
          <h3 className="font-heading text-sm font-bold text-slate-800">Voice Notifications</h3>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-rose-600 transition-colors p-1 rounded-lg hover:bg-rose-50"
          title="Close Settings"
        >
          <X size={16} />
        </button>
      </div>

      <div className="space-y-5">
        <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
          <div>
            <p className="text-xs font-bold text-slate-800">Enable Voice</p>
            <p className="text-[9px] text-slate-500 mt-0.5 uppercase tracking-wide font-bold">Hear task updates out loud</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={settings.enabled}
              onChange={(e) => handleUpdate({ enabled: e.target.checked })}
            />
            <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>

        <div className={`space-y-4 ${!settings.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wide">Volume</label>
              <span className="text-[10px] font-bold text-indigo-600">{Math.round(settings.volume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={settings.volume}
              onChange={(e) => handleUpdate({ volume: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wide mb-1.5">Voice Style</label>
            <select
              value={settings.voiceURI || ''}
              onChange={(e) => handleUpdate({ voiceURI: e.target.value })}
              className="w-full text-xs border border-slate-200 rounded-lg px-2 py-2 text-slate-700 focus:outline-none focus:border-indigo-500 bg-white"
            >
              {voices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={testVoice}
            className="w-full flex items-center justify-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 py-2 rounded-lg font-bold text-xs transition-colors mt-2"
          >
            <PlayCircle size={14} /> Test Announcement
          </button>
        </div>
      </div>
    </div>
  );
};
