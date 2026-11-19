export type VoiceId =
  | 'elige_personaje'
  | 'char_carlos'
  | 'char_mateo'
  | 'char_ariel'
  | 'elige_juego'
  | 'intro_carrera'
  | 'intro_patio'
  | 'victoria_carlos'
  | 'victoria_mateo'
  | 'victoria_ariel'
  | 'victoria_general';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private voiceCache = new Map<VoiceId, HTMLAudioElement>();
  private currentVoice: HTMLAudioElement | null = null;
  public muted = false;

  public unlock(): void {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.muted) {
      this.stopVoice();
    } else {
      this.playTap();
    }
    return this.muted;
  }

  public stopVoice(): void {
    if (this.currentVoice) {
      try {
        this.currentVoice.pause();
        this.currentVoice.currentTime = 0;
      } catch {
        // ignore
      }
      this.currentVoice = null;
    }
    const androidTts = (
      window as unknown as {
        AndroidTTS?: { speak: (t: string) => void; stop: () => void };
      }
    ).AndroidTTS;
    if (androidTts) {
      try {
        androidTts.stop();
      } catch {
        // ignore
      }
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
  }

  public speak(text: string): void {
    if (this.muted) return;
    const androidTts = (
      window as unknown as {
        AndroidTTS?: { speak: (t: string) => void; stop: () => void };
      }
    ).AndroidTTS;
    if (androidTts) {
      try {
        androidTts.speak(text);
        return;
      } catch {
        // fallback below
      }
    }
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = 'es-MX';
      utter.rate = 0.95;
      utter.pitch = 1.0;
      window.speechSynthesis.speak(utter);
    } catch {
      // ignore on unsupported WebViews
    }
  }

  public playAnimalSound(animalId: string): void {
    switch (animalId) {
      case 'cow':
        // Deep friendly moo
        this.tone(175, 130, 0.45, 'sawtooth', 0.14, 0);
        this.tone(130, 115, 0.25, 'triangle', 0.14, 0.35);
        break;
      case 'pig':
        // Double oink-oink snort
        this.tone(240, 180, 0.11, 'sawtooth', 0.14, 0);
        this.tone(260, 175, 0.13, 'sawtooth', 0.14, 0.16);
        break;
      case 'sheep':
      case 'goat':
        // Vibrato bleat
        this.tone(360, 320, 0.14, 'triangle', 0.16, 0);
        this.tone(340, 300, 0.14, 'triangle', 0.16, 0.13);
        this.tone(330, 290, 0.16, 'triangle', 0.15, 0.26);
        break;
      case 'chick':
        // Cute high pío-pío chirp
        this.tone(1100, 1650, 0.09, 'sine', 0.16, 0);
        this.tone(1150, 1720, 0.1, 'sine', 0.16, 0.13);
        break;
      case 'horse':
        // Neigh whinny
        this.tone(620, 420, 0.16, 'sawtooth', 0.12, 0);
        this.tone(540, 320, 0.24, 'triangle', 0.14, 0.14);
        break;
      case 'duck':
        // Quack-quack
        this.tone(420, 260, 0.11, 'sawtooth', 0.13, 0);
        this.tone(430, 250, 0.12, 'sawtooth', 0.13, 0.15);
        break;
      case 'dog':
        // Guau-guau bark
        this.tone(320, 160, 0.12, 'sawtooth', 0.15, 0);
        this.tone(340, 150, 0.14, 'sawtooth', 0.15, 0.17);
        break;
      case 'cat':
        // Gentle meow glide
        this.tone(540, 780, 0.18, 'triangle', 0.16, 0);
        this.tone(780, 460, 0.28, 'sine', 0.16, 0.16);
        break;
      case 'rooster':
        // Kikirikí crow!
        this.tone(620, 740, 0.1, 'triangle', 0.15, 0);
        this.tone(740, 880, 0.1, 'triangle', 0.15, 0.11);
        this.tone(880, 1080, 0.26, 'sawtooth', 0.12, 0.22);
        break;
      case 'rabbit':
        // Cute boing-boing hop
        this.tone(340, 720, 0.12, 'sine', 0.16, 0);
        this.tone(380, 780, 0.12, 'sine', 0.16, 0.15);
        break;
      case 'donkey':
        // Hee-haw!
        this.tone(480, 760, 0.18, 'sawtooth', 0.13, 0);
        this.tone(360, 190, 0.28, 'sawtooth', 0.14, 0.2);
        break;
      default:
        this.playCollect();
    }
  }

  public playVoice(id: VoiceId): void {
    if (this.muted) return;
    this.stopVoice();

    let audio = this.voiceCache.get(id);
    if (!audio) {
      audio = new Audio(`./audio/${id}.wav`);
      audio.preload = 'auto';
      this.voiceCache.set(id, audio);
    }

    try {
      audio.currentTime = 0;
      audio.volume = 1.0;
      this.currentVoice = audio;
      const promise = audio.play();
      if (promise) {
        promise.catch(() => {});
      }
    } catch {
      // ignore playback restriction errors
    }
  }

  private getCtx(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx) this.unlock();
    if (!this.ctx || this.ctx.state === 'suspended') return null;
    return this.ctx;
  }

  private tone(
    freqStart: number,
    freqEnd: number,
    duration: number,
    type: OscillatorType = 'sine',
    volume = 0.18,
    delay = 0
  ): void {
    const ctx = this.getCtx();
    if (!ctx) return;

    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, now);
    if (freqEnd !== freqStart) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(20, freqEnd),
        now + duration
      );
    }

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public playTap(): void {
    this.tone(520, 760, 0.09, 'triangle', 0.16);
  }

  public playSelect(): void {
    this.tone(440, 587, 0.09, 'triangle', 0.16, 0);
    this.tone(587, 880, 0.13, 'triangle', 0.16, 0.07);
  }

  public playJump(): void {
    this.tone(260, 620, 0.18, 'sine', 0.2);
    this.tone(390, 780, 0.12, 'triangle', 0.1, 0.03);
  }

  public playBoost(): void {
    this.tone(240, 480, 0.09, 'sawtooth', 0.08);
    this.tone(480, 720, 0.08, 'triangle', 0.1, 0.03);
  }

  public playCollect(): void {
    this.tone(660, 880, 0.1, 'sine', 0.17, 0);
    this.tone(880, 1175, 0.14, 'triangle', 0.15, 0.06);
  }

  public playBonus(): void {
    this.tone(523, 659, 0.1, 'triangle', 0.18, 0);
    this.tone(659, 784, 0.1, 'triangle', 0.18, 0.08);
    this.tone(784, 1046, 0.18, 'sine', 0.2, 0.16);
  }

  public playBonk(): void {
    this.tone(240, 110, 0.16, 'triangle', 0.2);
    this.tone(180, 95, 0.14, 'sine', 0.16, 0.04);
  }

  public playSplash(): void {
    this.tone(360, 160, 0.14, 'sine', 0.16, 0);
    this.tone(280, 120, 0.15, 'triangle', 0.14, 0.05);
  }

  public playFlagPlant(): void {
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((n, i) => {
      this.tone(n, n * 1.02, 0.16, 'triangle', 0.2, i * 0.09);
    });
  }

  public playVictory(): void {
    const melody = [
      { f: 523.25, t: 0.0, d: 0.14 },
      { f: 659.25, t: 0.12, d: 0.14 },
      { f: 783.99, t: 0.24, d: 0.14 },
      { f: 1046.5, t: 0.36, d: 0.32 },
      { f: 783.99, t: 0.58, d: 0.14 },
      { f: 1046.5, t: 0.72, d: 0.42 },
    ];
    for (const note of melody) {
      this.tone(note.f, note.f, note.d, 'triangle', 0.2, note.t);
      this.tone(note.f * 0.5, note.f * 0.5, note.d, 'sine', 0.1, note.t);
    }
  }
}

export const sound = new SoundEngine();
