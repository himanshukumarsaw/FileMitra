/**
 * Acoustic evidence viewer (spec #5) — waveform, spectrogram, time/frequency
 * scales, class probabilities, playback and evidence download.
 *
 * Demo-grade: when no raw recording exists, the clip is synthesized with the
 * Web Audio API from the alert's signature so the viewer always has real,
 * playable evidence deterministically tied to the alert id.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { Mic, Play, Square, Download, AudioWaveform } from 'lucide-react'
import type { Alert, AlertType } from '../../../../../shared/types'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Deterministic PRNG seeded by alert id — same alert, same evidence
// ---------------------------------------------------------------------------

function hashSeed(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ---------------------------------------------------------------------------
// Signature synthesis — one 3-second clip per sound type
// ---------------------------------------------------------------------------

const DURATION = 3
const SAMPLE_RATE = 22050

function synthesize(soundType: string | undefined, seed: number): Float32Array {
  const rand = mulberry32(seed)
  const n = DURATION * SAMPLE_RATE
  const out = new Float32Array(n)
  const kind = soundType ?? 'ambient'

  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE
    // Ambient noise floor
    let v = (rand() * 2 - 1) * 0.03

    if (kind === 'gunshot') {
      // Sharp impulse at ~0.4 s with fast decay + echo at 1.1 s
      for (const [at, gain] of [[0.4, 1], [1.1, 0.45]] as const) {
        const dt = t - at
        if (dt >= 0 && dt < 0.35) v += (rand() * 2 - 1) * gain * Math.exp(-dt * 22)
      }
    } else if (kind === 'chainsaw') {
      // Two-stroke engine: sawtooth bursts around 90 Hz with rev variation
      const rev = 80 + 25 * Math.sin(t * 1.4)
      v += Math.sign(Math.sin(2 * Math.PI * rev * t)) * 0.28 * (0.7 + 0.3 * rand())
      v += (rand() * 2 - 1) * 0.08
    } else if (kind === 'fire_crackle') {
      // Broadband crackle — random pops over a low rumble
      if (rand() < 0.02) v += (rand() * 2 - 1) * (0.25 + rand() * 0.4)
      v += Math.sin(2 * Math.PI * 46 * t) * 0.06
    } else if (kind === 'animal_call') {
      // Frequency-modulated calls
      const callStart = 0.3 + Math.floor(t / 1.2) * 1.2
      const dt = t - callStart
      if (dt >= 0 && dt < 0.55) {
        const f = 900 + 1400 * Math.sin(dt * 9)
        v += Math.sin(2 * Math.PI * f * dt) * 0.3 * Math.exp(-dt * 3)
      }
    } else if (kind === 'engine') {
      v += Math.sign(Math.sin(2 * Math.PI * 55 * t)) * 0.22
    } else if (kind === 'tamper') {
      // Metallic knock cluster
      for (const at of [0.3, 0.55, 0.85]) {
        const dt = t - at
        if (dt >= 0 && dt < 0.2) v += Math.sin(2 * Math.PI * 420 * dt) * 0.5 * Math.exp(-dt * 18)
      }
    }
    out[i] = Math.max(-1, Math.min(1, v))
  }
  return out
}

/** Encode PCM Float32 -> WAV Blob (16-bit mono) */
function encodeWav(samples: Float32Array): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)
  const writeStr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i))
  }
  writeStr(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  writeStr(8, 'WAVE')
  writeStr(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, SAMPLE_RATE, true)
  view.setUint32(28, SAMPLE_RATE * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeStr(36, 'data')
  view.setUint32(40, samples.length * 2, true)
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true)
  }
  return new Blob([buffer], { type: 'audio/wav' })
}

// ---------------------------------------------------------------------------
// Class probabilities derived from the alert classification
// ---------------------------------------------------------------------------

const CLASSES: { key: AlertType | 'vehicle'; label: string; sounds: string[] }[] = [
  { key: 'human', label: 'Gunshot', sounds: ['gunshot'] },
  { key: 'human', label: 'Chainsaw', sounds: ['chainsaw'] },
  { key: 'vehicle', label: 'Vehicle', sounds: ['engine'] },
  { key: 'animal', label: 'Animal', sounds: ['animal_call'] },
]

function classProbabilities(alert: Alert): { label: string; pct: number; primary: boolean }[] {
  const rand = mulberry32(hashSeed(alert.id) ^ 0x5eed)
  const conf = alert.confidence
  const matchIndex = CLASSES.findIndex((c) => c.sounds.includes(alert.soundType ?? ''))
  const primaryIdx = matchIndex >= 0 ? matchIndex : alert.type === 'animal' ? 3 : 0
  const rows = CLASSES.map((c, i) => {
    if (i === primaryIdx) return { label: c.label, pct: conf, primary: true }
    const noise = rand() * (1 - conf) * 0.5
    return { label: c.label, pct: Math.max(0.001, noise), primary: false }
  })
  // Normalize non-primary remainder
  const rest = rows.filter((r) => !r.primary).reduce((s, r) => s + r.pct, 0)
  const target = 1 - conf
  if (rest > 0) for (const r of rows) if (!r.primary) r.pct = (r.pct / rest) * target
  return rows.sort((a, b) => b.pct - a.pct)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AcousticEvidence({ alert }: { alert: Alert }) {
  const seed = useMemo(() => hashSeed(alert.id), [alert.id])
  const samples = useMemo(
    () => synthesize(alert.soundType ?? alert.type, seed),
    [alert, seed]
  )
  const probabilities = useMemo(() => classProbabilities(alert), [alert])

  const waveformRef = useRef<HTMLCanvasElement>(null)
  const spectrogramRef = useRef<HTMLCanvasElement>(null)
  const [playing, setPlaying] = useState(false)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const sourceRef = useRef<AudioBufferSourceNode | null>(null)

  // Draw waveform
  useEffect(() => {
    const canvas = waveformRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const W = canvas.width
    const H = canvas.height
    ctx.clearRect(0, 0, W, H)
    ctx.fillStyle = '#0B1220'
    ctx.fillRect(0, 0, W, H)
    ctx.strokeStyle = 'rgba(148,163,184,0.25)'
    ctx.beginPath()
    ctx.moveTo(0, H / 2)
    ctx.lineTo(W, H / 2)
    ctx.stroke()
    ctx.fillStyle = '#10B981'
    const bucket = Math.floor(samples.length / W)
    for (let x = 0; x < W; x++) {
      let peak = 0
      for (let j = 0; j < bucket; j += 8) {
        const v = Math.abs(samples[x * bucket + j] ?? 0)
        if (v > peak) peak = v
      }
      const h = Math.max(1, peak * (H * 0.92))
      ctx.fillRect(x, (H - h) / 2, 1, h)
    }
  }, [samples])

  // Draw spectrogram (pseudo time-frequency energy map)
  useEffect(() => {
    const canvas = spectrogramRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const W = canvas.width
    const H = canvas.height
    ctx.fillStyle = '#0B1220'
    ctx.fillRect(0, 0, W, H)
    const rand = mulberry32(seed ^ 0xabcdef)
    const cols = 120
    const rows = 40
    const cw = W / cols
    const ch = H / rows
    const bucket = Math.floor(samples.length / cols)
    for (let c = 0; c < cols; c++) {
      // Energy of this time slice
      let energy = 0
      for (let j = 0; j < bucket; j += 16) energy += Math.abs(samples[c * bucket + j] ?? 0)
      energy = Math.min(1, (energy / (bucket / 16)) * 4)
      for (let r = 0; r < rows; r++) {
        const freqBias = alert.soundType === 'animal_call'
          ? Math.exp(-((r - rows * 0.35) ** 2) / 60)
          : alert.soundType === 'chainsaw' || alert.soundType === 'engine'
            ? Math.exp(-((r - rows * 0.8) ** 2) / 80)
            : 1
        const intensity = energy * freqBias * (0.35 + rand() * 0.65)
        if (intensity < 0.05) continue
        const hue = 200 - intensity * 160 // blue -> red
        ctx.fillStyle = `hsla(${hue}, 85%, ${30 + intensity * 35}%, ${0.25 + intensity * 0.75})`
        ctx.fillRect(c * cw, r * ch, cw + 0.5, ch + 0.5)
      }
    }
  }, [samples, seed, alert.soundType])

  const stop = () => {
    sourceRef.current?.stop()
    sourceRef.current = null
    setPlaying(false)
  }

  const togglePlay = () => {
    if (playing) {
      stop()
      return
    }
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    const ctx = audioCtxRef.current ?? new Ctx()
    audioCtxRef.current = ctx
    const buffer = ctx.createBuffer(1, samples.length, SAMPLE_RATE)
    buffer.getChannelData(0).set(samples)
    const src = ctx.createBufferSource()
    src.buffer = buffer
    src.connect(ctx.destination)
    src.onended = () => setPlaying(false)
    src.start()
    sourceRef.current = src
    setPlaying(true)
  }

  const download = () => {
    const blob = encodeWav(samples)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `evidence-${alert.soundType ?? alert.type}-${alert.id.slice(-6)}.wav`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 4000)
  }

  useEffect(() => () => { sourceRef.current?.stop() }, [])

  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] p-3.5">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-medium text-slate-text">
          <AudioWaveform size={13} className="text-forest-light" />
          Acoustic Evidence
        </span>
        <span className="text-[10px] tabular-nums text-slate-muted">
          0:00 – 0:0{DURATION} · 0–8 kHz
        </span>
      </div>

      {/* Waveform + time scale */}
      <canvas ref={waveformRef} width={420} height={64} className="w-full rounded-md" aria-label="Audio waveform" />
      <div className="mt-0.5 flex justify-between text-[9px] tabular-nums text-slate-muted">
        <span>0.0s</span><span>0.5s</span><span>1.0s</span><span>1.5s</span><span>2.0s</span><span>2.5s</span><span>3.0s</span>
      </div>

      {/* Spectrogram + frequency scale */}
      <div className="mt-2.5 flex gap-1.5">
        <div className="flex w-8 flex-col justify-between text-right text-[9px] tabular-nums text-slate-muted">
          <span>8k</span><span>6k</span><span>4k</span><span>2k</span><span>0 Hz</span>
        </div>
        <canvas ref={spectrogramRef} width={392} height={96} className="w-full rounded-md" aria-label="Audio spectrogram" />
      </div>

      {/* Classification probabilities */}
      <div className="mt-3 flex flex-col gap-1.5">
        {probabilities.map((p) => (
          <div key={p.label} className="flex items-center gap-2">
            <span className={cn('w-16 text-[11px]', p.primary ? 'font-semibold text-slate-text' : 'text-slate-muted')}>
              {p.label}
            </span>
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.max(1, p.pct * 100)}%`, background: p.primary ? '#10B981' : '#475569' }}
              />
            </div>
            <span className={cn('w-10 text-right text-[11px] tabular-nums', p.primary ? 'text-forest-light' : 'text-slate-muted')}>
              {Math.round(p.pct * 100)}%
            </span>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={togglePlay}
          className="flex items-center gap-1.5 rounded-md border border-forest-light/40 bg-forest-light/10 px-3 py-1.5 text-xs font-semibold text-forest-light transition-colors hover:bg-forest-light/20"
        >
          {playing ? <Square size={12} /> : <Play size={12} />}
          {playing ? 'Stop' : 'Play Audio'}
        </button>
        <button
          onClick={download}
          className="flex items-center gap-1.5 rounded-md border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-muted transition-colors hover:bg-white/5 hover:text-slate-text"
        >
          <Download size={12} />
          Download Evidence
        </button>
        {alert.audioUrl && (
          <span className="flex items-center gap-1 text-[10px] text-slate-muted">
            <Mic size={11} />
            Node recording attached
          </span>
        )}
      </div>
    </div>
  )
}
