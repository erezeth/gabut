/**
 * All audio is synthesized with the Web Audio API: no sound files, no licenses.
 * Music is a slow generative arpeggio; effects are short oscillator/noise bursts.
 */

export type SfxName =
  | 'jump'
  | 'land'
  | 'plate'
  | 'switch'
  | 'door'
  | 'ready'
  | 'death'
  | 'complete'
  | 'click'
  | 'unlock'
  | 'respawn';

const MUTE_STORAGE_KEY = 'coop-puzzle:muted-v1';

/** A minor -> F major -> C major -> G major, one bar each. */
const PROGRESSION: number[][] = [
  [220.0, 261.63, 329.63, 392.0],
  [174.61, 220.0, 261.63, 349.23],
  [261.63, 329.63, 392.0, 523.25],
  [196.0, 246.94, 293.66, 392.0],
];

const BPM = 76;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;

class GameAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private musicTimer: ReturnType<typeof setInterval> | null = null;
  private nextBarAt = 0;
  private barIndex = 0;
  private muted = false;
  private unlocked = false;

  constructor() {
    try {
      this.muted = globalThis.localStorage?.getItem(MUTE_STORAGE_KEY) === '1';
    } catch {
      this.muted = false;
    }
  }

  get isMuted(): boolean {
    return this.muted;
  }

  get isUnlocked(): boolean {
    return this.unlocked;
  }

  /** Browsers only allow audio after a user gesture; call this from one. */
  unlock(): void {
    if (this.unlocked) {
      void this.ctx?.resume();
      return;
    }

    const AudioCtor =
      globalThis.AudioContext ??
      (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioCtor) return;

    this.ctx = new AudioCtor();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.9;
    this.master.connect(this.ctx.destination);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = this.muted ? 0 : 0.5;
    this.musicGain.connect(this.master);

    this.unlocked = true;
    void this.ctx.resume();
    this.startMusic();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;

    if (this.master) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.9, this.ctx!.currentTime, 0.02);
    }
    if (this.musicGain) {
      this.musicGain.gain.setTargetAtTime(muted ? 0 : 0.5, this.ctx!.currentTime, 0.02);
    }

    try {
      globalThis.localStorage?.setItem(MUTE_STORAGE_KEY, muted ? '1' : '0');
    } catch {
      // Private mode or disabled storage: audio still works for this session.
    }
  }

  toggleMuted(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  play(name: SfxName): void {
    if (!this.ctx || this.muted) return;

    switch (name) {
      case 'jump':
        this.tone({ type: 'square', from: 300, to: 540, duration: 0.11, gain: 0.055 });
        break;
      case 'land':
        this.noise({ duration: 0.09, gain: 0.05, cutoff: 520 });
        this.tone({ type: 'sine', from: 120, to: 70, duration: 0.09, gain: 0.06 });
        break;
      case 'plate':
        this.tone({ type: 'sine', from: 660, to: 880, duration: 0.07, gain: 0.05 });
        break;
      case 'switch':
        this.tone({ type: 'square', from: 380, to: 760, duration: 0.09, gain: 0.05 });
        break;
      case 'door':
        this.tone({ type: 'sawtooth', from: 190, to: 85, duration: 0.28, gain: 0.045 });
        break;
      case 'ready':
        this.tone({ type: 'triangle', from: 523, to: 784, duration: 0.12, gain: 0.05 });
        break;
      case 'death':
        this.tone({ type: 'sawtooth', from: 320, to: 55, duration: 0.42, gain: 0.06 });
        this.noise({ duration: 0.2, gain: 0.04, cutoff: 900 });
        break;
      case 'complete':
        this.sequence([523.25, 659.25, 783.99, 1046.5], 0.09, 0.06);
        break;
      case 'unlock':
        this.sequence([392, 523.25, 659.25], 0.08, 0.045);
        break;
      case 'click':
        this.tone({ type: 'square', from: 640, to: 640, duration: 0.035, gain: 0.035 });
        break;
      case 'respawn':
        this.tone({ type: 'sine', from: 260, to: 120, duration: 0.14, gain: 0.05 });
        break;
    }
  }

  private tone(options: {
    type: OscillatorType;
    from: number;
    to: number;
    duration: number;
    gain: number;
    delay?: number;
  }): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;

    const start = ctx.currentTime + (options.delay ?? 0);
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = options.type;
    osc.frequency.setValueAtTime(options.from, start);
    if (options.to !== options.from) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, options.to), start + options.duration);
    }

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(options.gain, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + options.duration);

    osc.connect(gain);
    gain.connect(master);
    osc.start(start);
    osc.stop(start + options.duration + 0.02);
  }

  private noise(options: { duration: number; gain: number; cutoff: number }): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master) return;

    const frameCount = Math.max(1, Math.floor(ctx.sampleRate * options.duration));
    const buffer = ctx.createBuffer(1, frameCount, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frameCount; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / frameCount);
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = options.cutoff;

    const gain = ctx.createGain();
    gain.gain.value = options.gain;

    source.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    source.start();
  }

  private sequence(notes: number[], spacing: number, gain: number): void {
    notes.forEach((frequency, index) => {
      this.tone({
        type: 'triangle',
        from: frequency,
        to: frequency,
        duration: 0.16,
        gain,
        delay: index * spacing,
      });
    });
  }

  private startMusic(): void {
    if (!this.ctx || this.musicTimer !== null) return;

    this.nextBarAt = this.ctx.currentTime + 0.2;
    this.musicTimer = setInterval(() => this.scheduleMusic(), 200);
    this.scheduleMusic();
  }

  private scheduleMusic(): void {
    const ctx = this.ctx;
    const musicGain = this.musicGain;
    if (!ctx || !musicGain) return;

    while (this.nextBarAt < ctx.currentTime + BAR) {
      const chord = PROGRESSION[this.barIndex % PROGRESSION.length] ?? PROGRESSION[0]!;
      const bass = ctx.createOscillator();
      const bassGain = ctx.createGain();
      bass.type = 'triangle';
      bass.frequency.value = (chord[0] ?? 220) / 2;

      const start = this.nextBarAt;
      bassGain.gain.setValueAtTime(0.0001, start);
      bassGain.gain.exponentialRampToValueAtTime(0.035, start + 0.3);
      bassGain.gain.exponentialRampToValueAtTime(0.0001, start + BAR * 0.95);

      bass.connect(bassGain);
      bassGain.connect(musicGain);
      bass.start(start);
      bass.stop(start + BAR);

      chord.forEach((frequency, step) => {
        const noteAt = start + step * BEAT;
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = frequency * 2;

        noteGain.gain.setValueAtTime(0.0001, noteAt);
        noteGain.gain.exponentialRampToValueAtTime(0.018, noteAt + 0.02);
        noteGain.gain.exponentialRampToValueAtTime(0.0001, noteAt + 1.4);

        osc.connect(noteGain);
        noteGain.connect(musicGain);
        osc.start(noteAt);
        osc.stop(noteAt + 1.5);
      });

      this.barIndex += 1;
      this.nextBarAt += BAR;
    }
  }
}

export const audio = new GameAudio();
