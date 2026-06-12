export interface VoiceSettings {
  enabled: boolean;
  volume: number;
  voiceURI: string | null;
}

class VoiceNotificationService {
  private settings: VoiceSettings = {
    enabled: true,
    volume: 0.8,
    voiceURI: null,
  };
  private queue: { text: string; priority: number }[] = [];
  private isSpeaking: boolean = false;
  private voices: SpeechSynthesisVoice[] = [];

  constructor() {
    this.loadSettings();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      // Chrome/Safari load voices asynchronously
      window.speechSynthesis.onvoiceschanged = () => {
        this.voices = window.speechSynthesis.getVoices();
        this.loadPreferredVoice();
      };
      this.voices = window.speechSynthesis.getVoices();
      if (this.voices.length > 0) this.loadPreferredVoice();
    }
  }

  private loadSettings() {
    const saved = localStorage.getItem('voice_settings');
    if (saved) {
      try {
        this.settings = { ...this.settings, ...JSON.parse(saved) };
      } catch (e) {}
    }
  }

  public saveSettings(newSettings: Partial<VoiceSettings>) {
    this.settings = { ...this.settings, ...newSettings };
    localStorage.setItem('voice_settings', JSON.stringify(this.settings));
  }

  public getSettings() {
    return this.settings;
  }

  public getAvailableVoices() {
    return this.voices.filter(v => v.lang.startsWith('en'));
  }

  private loadPreferredVoice() {
    if (!this.settings.voiceURI && this.voices.length > 0) {
      // Find a male english voice if possible, fallback to Google US English
      const maleVoice = this.voices.find(
        (v) => v.lang.startsWith('en') && (v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('david') || v.name.toLowerCase().includes('guy'))
      );
      const fallbackVoice = this.voices.find((v) => v.lang === 'en-US');
      this.settings.voiceURI = (maleVoice || fallbackVoice || this.voices[0]).voiceURI;
      this.saveSettings({});
    }
  }

  public getVoiceInstance() {
    return this.voices.find(v => v.voiceURI === this.settings.voiceURI) || this.voices[0];
  }

  public announce(text: string | undefined, priority: number = 3) {
    if (!this.settings.enabled) return;
    if (!text) return;

    // Filter text to be more speech friendly (remove special chars if needed)
    let cleanText = text.replace(/["*]/g, '');

    // Prevent duplicate exact phrases in queue
    if (this.queue.some(q => q.text === cleanText)) return;

    if (priority === 1) {
      // Priority 1 interrupts current speech
      window.speechSynthesis.cancel();
      this.queue = [];
      this.isSpeaking = false;
    }

    this.queue.push({ text: cleanText, priority });
    this.queue.sort((a, b) => a.priority - b.priority); // Lower number = higher priority
    
    this.processQueue();
  }

  public testVoice() {
    if (!this.settings.enabled) return;
    this.announce("Voice notifications are enabled and working correctly.", 1);
  }

  private processQueue() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      if (!window.speechSynthesis.speaking && this.isSpeaking) {
        this.isSpeaking = false;
      }
    }

    if (this.isSpeaking || this.queue.length === 0) return;

    const next = this.queue.shift();
    if (!next) return;

    this.isSpeaking = true;
    const utterance = new SpeechSynthesisUtterance(next.text);
    
    const voice = this.getVoiceInstance();
    if (voice) {
      utterance.voice = voice;
    }
    utterance.volume = this.settings.volume;
    utterance.rate = 0.95; // Slightly slower, medium speed
    utterance.pitch = 1.0;

    utterance.onend = () => {
      this.isSpeaking = false;
      this.processQueue();
    };

    utterance.onerror = (err) => {
      console.error('SpeechSynthesisUtterance error:', err);
      this.isSpeaking = false;
      this.processQueue();
    };

    window.speechSynthesis.speak(utterance);
  }
}

export const voiceService = new VoiceNotificationService();
