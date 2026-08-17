/**
 * Edge AI audio classifier — runs entirely on the device.
 *
 * Web Audio DSP heuristics approximating what a trained Edge Impulse model
 * would output, so the demo works on any phone with zero model download:
 *
 *   - Gunshot  : broadband impulse transient (sharp RMS spike, < 350 ms)
 *   - Chainsaw : sustained low-band harmonic tone (>= 1.2 s)
 *   - Fire     : sustained broadband crackle noise (>= 3 s)
 */

export type DetectedSound = 'gunshot' | 'chainsaw' | 'fire';

export interface DetectionEvent {
  soundType: DetectedSound;
  confidence: number; // 0-1
  details: string;
  timestamp: Date;
  simulated: boolean;
}

export interface ClassifierStatus {
  listening: boolean;
  level: number; // 0-1 mic level for the meter
  state: string; // human-readable analysis state
}

const COOLDOWN_MS = 5000;
const GUNSHOT_MAX_MS = 350;
const CHAINSAW_MIN_MS = 1200;
const FIRE_MIN_MS = 3000;

export class AudioClassifier {
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private stream: MediaStream | null = null;
  private rafId = 0;

  private freqData = new Uint8Array(0);
  private timeData = new Float32Array(0);
  private rmsHistory: number[] = [];
  private chainsawStreakMs = 0;
  private fireStreakMs = 0;
  private spikeStartedAt: number | null = null;
  private lastDetectionAt = 0;
  private lastFrameAt = 0;

  private status: ClassifierStatus = { listening: false, level: 0, state: 'Idle' };

  /** Subscribe to detections */
  onDetection: ((event: DetectionEvent) => void) | null = null;

  getStatus(): ClassifierStatus {
    return { ...this.status };
  }

  async start(): Promise<void> {
    if (this.ctx) return;

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });

    this.ctx = new AudioContext();
    await this.ctx.resume();

    const source = this.ctx.createMediaStreamSource(this.stream);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.4;
    source.connect(this.analyser);

    this.freqData = new Uint8Array(this.analyser.frequencyBinCount);
    this.timeData = new Float32Array(this.analyser.fftSize);

    this.status.listening = true;
    this.status.state = 'Listening — Edge AI armed';
    this.lastFrameAt = performance.now();
    this.loop();
  }

  stop(): void {
    cancelAnimationFrame(this.rafId);
    this.stream?.getTracks().forEach((t) => t.stop());
    void this.ctx?.close();
    this.ctx = null;
    this.analyser = null;
    this.stream = null;
    this.rmsHistory = [];
    this.chainsawStreakMs = 0;
    this.fireStreakMs = 0;
    this.spikeStartedAt = null;
    this.status = { listening: false, level: 0, state: 'Idle' };
  }

  /** Expose the live mic stream so evidence capture can record it */
  getStream(): MediaStream | null {
    return this.stream;
  }

  /** Inject a detection without audio — the guaranteed demo path */
  simulate(soundType: DetectedSound): void {
    const details: Record<DetectedSound, string> = {
      gunshot: 'Simulated impulse transient (manual trigger)',
      chainsaw: 'Simulated low-band harmonic signature (manual trigger)',
      fire: 'Simulated broadband crackle signature (manual trigger)',
    };
    this.emit({
      soundType,
      confidence: 0.88 + Math.random() * 0.1,
      details: details[soundType],
      timestamp: new Date(),
      simulated: true,
    });
  }

  // -------------------------------------------------------------------------
  // Analysis loop
  // -------------------------------------------------------------------------

  private loop = (): void => {
    if (!this.analyser || !this.ctx) return;
    const now = performance.now();
    const dt = now - this.lastFrameAt;
    this.lastFrameAt = now;

    this.analyser.getByteFrequencyData(this.freqData);
    this.analyser.getFloatTimeDomainData(this.timeData);

    const rms = this.computeRms();
    this.status.level = Math.min(1, rms * 4);

    this.rmsHistory.push(rms);
    if (this.rmsHistory.length > 40) this.rmsHistory.shift();
    const ambient = this.rmsHistory.slice(0, Math.max(1, this.rmsHistory.length - 4)).reduce((a, b) => a + b, 0) /
      Math.max(1, this.rmsHistory.length - 4);

    const { flatness, lowBandRatio } = this.spectralFeatures();

    // --- Gunshot: broadband impulse transient ---
    const isSpike = rms > 0.08 && rms > Math.max(ambient * 6, 0.001);
    if (isSpike) {
      if (this.spikeStartedAt === null) this.spikeStartedAt = now;
      this.status.state = 'Transient detected — analysing...';
    } else if (this.spikeStartedAt !== null) {
      const duration = now - this.spikeStartedAt;
      this.spikeStartedAt = null;
      if (duration < GUNSHOT_MAX_MS && flatness > 0.25) {
        this.emit({
          soundType: 'gunshot',
          confidence: Math.min(0.97, 0.65 + rms * 2 + flatness * 0.2),
          details: `Impulse transient ${Math.round(duration)} ms, flatness ${flatness.toFixed(2)}`,
          timestamp: new Date(),
          simulated: false,
        });
      }
    }

    // --- Chainsaw: sustained low-band harmonic tone ---
    if (lowBandRatio > 0.62 && flatness < 0.3 && rms > 0.015) {
      this.chainsawStreakMs += dt;
      this.status.state = 'Low-band harmonic tone — possible machinery...';
      if (this.chainsawStreakMs >= CHAINSAW_MIN_MS) {
        this.chainsawStreakMs = 0;
        this.emit({
          soundType: 'chainsaw',
          confidence: Math.min(0.95, 0.62 + lowBandRatio * 0.3 + (1 - flatness) * 0.1),
          details: `Sustained harmonic tone, ${Math.round(lowBandRatio * 100)}% low-band energy`,
          timestamp: new Date(),
          simulated: false,
        });
      }
    } else {
      this.chainsawStreakMs = Math.max(0, this.chainsawStreakMs - dt * 2);
    }

    // --- Fire: sustained broadband crackle ---
    if (flatness > 0.5 && rms > Math.max(ambient * 2, 0.02) && rms > 0.02) {
      this.fireStreakMs += dt;
      this.status.state = 'Broadband noise pattern — monitoring for crackle...';
      if (this.fireStreakMs >= FIRE_MIN_MS) {
        this.fireStreakMs = 0;
        this.emit({
          soundType: 'fire',
          confidence: Math.min(0.92, 0.6 + flatness * 0.35),
          details: `Sustained broadband crackle, flatness ${flatness.toFixed(2)}`,
          timestamp: new Date(),
          simulated: false,
        });
      }
    } else {
      this.fireStreakMs = Math.max(0, this.fireStreakMs - dt * 2);
    }

    if (this.chainsawStreakMs === 0 && this.fireStreakMs === 0 && this.spikeStartedAt === null) {
      this.status.state = 'Listening — Edge AI armed';
    }

    this.rafId = requestAnimationFrame(this.loop);
  };

  private computeRms(): number {
    let sum = 0;
    for (let i = 0; i < this.timeData.length; i++) sum += this.timeData[i] * this.timeData[i];
    return Math.sqrt(sum / this.timeData.length);
  }

  /** Spectral flatness (noisiness) and low-band energy ratio */
  private spectralFeatures(): { flatness: number; lowBandRatio: number } {
    const n = this.freqData.length;
    if (!this.ctx || n === 0) return { flatness: 0, lowBandRatio: 0 };

    const binHz = this.ctx.sampleRate / 2 / n;
    const lowCutoff = Math.min(n - 1, Math.floor(600 / binHz));

    let total = 0;
    let low = 0;
    let logSum = 0;
    let count = 0;
    for (let i = 0; i < n; i++) {
      const v = this.freqData[i] / 255;
      total += v;
      if (i <= lowCutoff) low += v;
      if (v > 0.001) {
        logSum += Math.log(v);
        count++;
      }
    }

    const geoMean = count > 0 ? Math.exp(logSum / count) : 0;
    const arithMean = total / n;
    const flatness = arithMean > 0 ? Math.min(1, geoMean / arithMean) : 0;
    const lowBandRatio = total > 0 ? low / total : 0;

    return { flatness, lowBandRatio };
  }

  private emit(event: DetectionEvent): void {
    const now = Date.now();
    if (now - this.lastDetectionAt < COOLDOWN_MS) return; // debounce
    this.lastDetectionAt = now;
    this.status.state = `Detected: ${event.soundType}`;
    this.onDetection?.(event);
  }
}
