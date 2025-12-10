
export class AudioService {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private ambienceNodes: AudioNode[] = [];
  private isMuted: boolean = false;

  private static instance: AudioService;

  private constructor() {
    this.init();
  }

  public static getInstance(): AudioService {
    if (!AudioService.instance) {
      AudioService.instance = new AudioService();
    }
    const instance = AudioService.instance;
    if (instance.ctx && instance.ctx.state === 'suspended') {
      instance.ctx.resume().catch(() => {});
    }
    return instance;
  }

  public init() {
    try {
      if (!this.ctx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
            this.ctx = new AudioContextClass();
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = 0.3; // Master volume
            this.masterGain.connect(this.ctx.destination);
        }
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    } catch (e) {
      console.warn("AudioService init failed:", e);
    }
  }

  public toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.3, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  // --- HAPTIC ENGINE ---
  // Haptic presets for consistent game feel
  public haptics = {
      light: 5,
      medium: 15,
      heavy: 40,
      success: [10, 30, 10, 30, 50],
      failure: [50, 50, 50, 50, 100],
      warning: [15, 100, 15, 100],
      impact: [20, 50, 20],
      rhythm: [10, 100, 10, 100, 10, 100]
  };

  public vibrate(pattern: number | number[]) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
            // Respect user OS settings if possible (reduced motion), but generally trigger for game feel
            navigator.vibrate(pattern);
        } catch (e) {
            // Haptics not supported or blocked
        }
    }
  }

  private createOscillator(type: OscillatorType, freq: number, duration: number, volume: number = 0.1, detune: number = 0) {
    if (!this.ctx || !this.masterGain) return;
    try {
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, t);
        osc.detune.setValueAtTime(detune, t);

        gain.gain.setValueAtTime(volume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(t + duration);
    } catch (e) {}
  }

  public playClick() {
    this.createOscillator('sine', 800, 0.05, 0.05);
    this.vibrate(this.haptics.light); 
  }

  public playHover() {
    this.createOscillator('triangle', 400, 0.02, 0.02);
    this.vibrate(2); // Micro tick
  }

  public playSuccess() {
    if (!this.ctx) return;
    this.createOscillator('sine', 440, 0.2, 0.1); 
    setTimeout(() => this.createOscillator('sine', 554, 0.2, 0.1), 100); 
    setTimeout(() => this.createOscillator('sine', 659, 0.4, 0.1), 200); 
    this.vibrate(this.haptics.success); 
  }

  public playError() {
    this.createOscillator('sawtooth', 150, 0.3, 0.1);
    setTimeout(() => this.createOscillator('sawtooth', 120, 0.3, 0.1), 100);
    this.vibrate(this.haptics.failure); 
  }

  public playTyping() {
    this.createOscillator('square', 800 + Math.random() * 200, 0.03, 0.02);
    this.vibrate(3); // Typewriter feel
  }

  public playScan() {
    this.createOscillator('sine', 1200, 0.1, 0.05);
    this.vibrate(this.haptics.medium);
  }

  public playEngine(rpm: number) {
    this.createOscillator('sawtooth', 50 + (rpm * 0.02), 0.1, 0.05);
    // Continuous vibration for engine is tricky on web, usually better to pulse or avoid to save battery
  }

  public playGlitch() {
    if (!this.ctx || !this.masterGain) return;
    try {
        const bufferSize = this.ctx.sampleRate * 0.2; 
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * 0.5;
        }
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const gain = this.ctx.createGain();
        gain.gain.value = 0.1;
        noise.connect(gain);
        gain.connect(this.masterGain);
        noise.start();
        
        this.createOscillator('sawtooth', 100 + Math.random() * 500, 0.1, 0.05);
        this.vibrate([20, 20, 40, 20, 20]); // Random glitch feel
    } catch(e){}
  }

  public playDataLoad() {
    if (!this.ctx || !this.masterGain) return;
    try {
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.frequency.setValueAtTime(200, t);
        osc.frequency.exponentialRampToValueAtTime(800, t + 0.5);
        gain.gain.setValueAtTime(0.05, t);
        gain.gain.linearRampToValueAtTime(0, t + 0.5);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        osc.stop(t + 0.5);
        this.vibrate(this.haptics.medium);
    } catch(e){}
  }

  public playFootstep() {
    if (!this.ctx || !this.masterGain) return;
    try {
        const t = this.ctx.currentTime;
        const bufferSize = this.ctx.sampleRate * 0.1; 
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * 0.5;
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(300, t); 
        filter.Q.value = 1;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        noise.start();
        this.vibrate(5);
    } catch(e){}
  }

  public playWallHit() {
    if (!this.ctx || !this.masterGain) return;
    try {
        const t = this.ctx.currentTime;
        
        const osc = this.ctx.createOscillator();
        osc.type = 'square'; 
        osc.frequency.setValueAtTime(50, t);
        osc.frequency.exponentialRampToValueAtTime(10, t + 0.2);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.4, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);

        const bufferSize = this.ctx.sampleRate * 0.1;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.value = 0.2;
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

        osc.connect(gain);
        gain.connect(this.masterGain);
        
        noise.connect(noiseGain);
        noiseGain.connect(this.masterGain);

        osc.start();
        osc.stop(t + 0.2);
        noise.start();
        this.vibrate(this.haptics.impact); 
    } catch(e){}
  }

  public startAmbience(type: 'CYBER' | 'HORROR' | 'SPACE' | 'BUNKER') {
    this.stopAmbience();
    if (!this.ctx || !this.masterGain) return;

    try {
        const bufferSize = this.ctx.sampleRate * 2; 
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1;
          data[i] = (white + (i > 0 ? data[i-1] : 0)) * 0.5; 
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;

        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        if (type === 'CYBER') {
          filter.type = 'lowpass';
          filter.frequency.value = 200;
          gain.gain.value = 0.05;
        } else if (type === 'HORROR') {
          filter.type = 'highpass';
          filter.frequency.value = 1000;
          gain.gain.value = 0.02;
          
          const lfo = this.ctx.createOscillator();
          lfo.frequency.value = 0.5;
          const lfoGain = this.ctx.createGain();
          lfoGain.gain.value = 500;
          lfo.connect(lfoGain);
          lfoGain.connect(filter.frequency);
          lfo.start();
          this.ambienceNodes.push(lfo, lfoGain);
        } else if (type === 'BUNKER') {
            filter.type = 'lowpass';
            filter.frequency.value = 80;
            gain.gain.value = 0.15;
        } else {
          filter.type = 'lowpass';
          filter.frequency.value = 100;
          gain.gain.value = 0.08;
        }

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);
        noise.start();

        this.ambienceNodes.push(noise, filter, gain);
    } catch(e){}
  }

  public stopAmbience() {
    this.ambienceNodes.forEach(n => {
      try { (n as any).stop(); } catch(e){}
      try { n.disconnect(); } catch(e){}
    });
    this.ambienceNodes = [];
  }
}

export const audio = AudioService.getInstance();
