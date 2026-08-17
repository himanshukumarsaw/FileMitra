import { useCallback, useEffect, useRef, useState } from 'react'
import { Radio, Mic, MicOff, Crosshair, Axe, Flame, MapPin, BatteryMedium, SignalHigh, Send, CloudOff } from 'lucide-react'
import { AudioClassifier, type DetectionEvent, type DetectedSound } from '@/services/audioClassifier'
import {
  registerNode,
  sendAlert,
  sendHeartbeat,
  simulatedRssi,
  offlineQueueSize,
  flushOfflineQueue,
} from '@/services/loraTransport'
import { captureAudioClip, capturePhoto, uploadEvidence } from '@/services/evidenceCapture'
import type { AlertPayload } from '../../../../shared/types'

const FALLBACK_COORDS = { lat: 21.58, lng: 79.6 }

interface LogEntry {
  time: string
  text: string
  tone: 'ok' | 'warn' | 'alert' | 'info'
}

const toneColors: Record<LogEntry['tone'], string> = {
  ok: 'text-emerald-400',
  warn: 'text-amber-400',
  alert: 'text-red-400',
  info: 'text-slate-400',
}

/** Map an Edge AI detection to the backend alert payload */
function toAlertPayload(nodeId: string, lat: number, lng: number, event: DetectionEvent): AlertPayload {
  if (event.soundType === 'fire') {
    return {
      type: 'fire',
      soundType: 'fire_crackle',
      confidence: Math.round(event.confidence * 100) / 100,
      location: { lat, lng },
      nodeId,
      timestamp: event.timestamp.toISOString(),
      description: event.simulated
        ? 'Fire crackle signature (manual test trigger from mobile node)'
        : 'Fire crackle acoustic signature detected by mobile node Edge AI',
    }
  }
  return {
    type: 'human',
    soundType: event.soundType,
    confidence: Math.round(event.confidence * 100) / 100,
    location: { lat, lng },
    nodeId,
    timestamp: event.timestamp.toISOString(),
    description: event.simulated
      ? `${event.soundType === 'gunshot' ? 'Gunshot' : 'Chainsaw'} signature (manual test trigger from mobile node)`
      : `${event.soundType === 'gunshot' ? 'Gunshot' : 'Chainsaw'} acoustic signature detected by mobile node Edge AI`,
  }
}

export function NodePage() {
  const classifierRef = useRef<AudioClassifier | null>(null)
  const [nodeId, setNodeId] = useState<string | null>(localStorage.getItem('fg_node_id'))
  const [nodeName, setNodeName] = useState<string>(localStorage.getItem('fg_node_name') ?? '')
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [listening, setListening] = useState(false)
  const [level, setLevel] = useState(0)
  const [state, setState] = useState('Idle')
  const [battery, setBattery] = useState<number | null>(null)
  const [rssi, setRssi] = useState<number | null>(null)
  const [lastTx, setLastTx] = useState<string | null>(null)
  const [log, setLog] = useState<LogEntry[]>([])
  const [registering, setRegistering] = useState(false)
  const [pendingOffline, setPendingOffline] = useState<number>(() => offlineQueueSize())

  const pushLog = useCallback((text: string, tone: LogEntry['tone']) => {
    setLog((prev) =>
      [{ time: new Date().toLocaleTimeString(), text, tone }, ...prev].slice(0, 30)
    )
  }, [])

  // --- Offline queue sync — retransmit stored alerts when the link returns ---
  const syncOfflineQueue = useCallback(async () => {
    const queued = offlineQueueSize()
    if (queued === 0) {
      setPendingOffline(0)
      return
    }
    const synced = await flushOfflineQueue()
    setPendingOffline(offlineQueueSize())
    if (synced > 0) pushLog(`Connectivity restored — ${synced} offline alert(s) synchronised`, 'ok')
  }, [pushLog])

  useEffect(() => {
    const onOnline = () => void syncOfflineQueue()
    window.addEventListener('online', onOnline)
    const timer = setInterval(() => void syncOfflineQueue(), 20_000)
    return () => {
      window.removeEventListener('online', onOnline)
      clearInterval(timer)
    }
  }, [syncOfflineQueue])

  // --- GPS -----------------------------------------------------------------
  useEffect(() => {
    if (!navigator.geolocation) {
      setCoords(FALLBACK_COORDS)
      pushLog('Geolocation unavailable — using reserve fallback coordinates', 'warn')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        pushLog(`GPS locked: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`, 'ok')
      },
      () => {
        setCoords(FALLBACK_COORDS)
        pushLog('GPS denied — using reserve fallback coordinates', 'warn')
      },
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }, [pushLog])

  // --- Battery API -----------------------------------------------------------
  useEffect(() => {
    const nav = navigator as Navigator & { getBattery?: () => Promise<{ level: number }> }
    if (nav.getBattery) {
      nav
        .getBattery()
        .then((b) => setBattery(Math.round(b.level * 100)))
        .catch(() => setBattery(null))
    }
  }, [])

  // --- Node registration -----------------------------------------------------
  useEffect(() => {
    if (nodeId || !coords || registering) return
    setRegistering(true)
    const name = nodeName || `Mobile Node ${Math.random().toString(36).slice(2, 6).toUpperCase()}`
    registerNode({ name, lat: coords.lat, lng: coords.lng })
      .then((node) => {
        setNodeId(node.id)
        setNodeName(node.name)
        localStorage.setItem('fg_node_id', node.id)
        localStorage.setItem('fg_node_name', node.name)
        pushLog(`Registered on mesh as "${node.name}"`, 'ok')
      })
      .catch((err) => pushLog(`Registration failed: ${(err as Error).message}`, 'warn'))
      .finally(() => setRegistering(false))
  }, [nodeId, coords, nodeName, registering, pushLog])

  // --- Heartbeat loop ----------------------------------------------------------
  useEffect(() => {
    if (!nodeId) return
    const timer = setInterval(async () => {
      const ok = await sendHeartbeat(nodeId, battery ?? 100)
      setRssi(simulatedRssi())
      pushLog(ok ? 'Heartbeat transmitted over LoRa mesh' : 'Heartbeat failed — gateway unreachable', ok ? 'info' : 'warn')
    }, 15_000)
    return () => clearInterval(timer)
  }, [nodeId, battery, pushLog])

  // --- Detection handler -----------------------------------------------------
  const handleDetection = useCallback(
    async (event: DetectionEvent) => {
      pushLog(
        `${event.simulated ? '[TEST] ' : ''}Edge AI detected ${event.soundType} (${Math.round(event.confidence * 100)}%) — ${event.details}`,
        'alert'
      )
      if (!nodeId || !coords) {
        pushLog('Cannot transmit — node not registered or no GPS fix', 'warn')
        return
      }
      const payload = toAlertPayload(nodeId, coords.lat, coords.lng, event)

      // --- Capture evidence (audio clip + camera frame) and upload out-of-band ---
      pushLog('Capturing evidence: audio clip + camera frame...', 'info')
      const micStream = classifierRef.current?.getStream() ?? null
      const [audioClip, photo] = await Promise.all([
        captureAudioClip(micStream, event.soundType),
        capturePhoto(),
      ])

      const [audioUrl, imageUrl] = await Promise.all([
        audioClip ? uploadEvidence(nodeId, 'audio', audioClip.dataUrl) : Promise.resolve(null),
        photo ? uploadEvidence(nodeId, 'image', photo) : Promise.resolve(null),
      ])
      if (audioUrl) payload.audioUrl = audioUrl
      if (imageUrl) payload.imageUrl = imageUrl

      const attached = [audioUrl ? 'audio' : null, imageUrl ? 'photo' : null].filter(Boolean).join(' + ')
      pushLog(
        attached ? `Evidence uploaded and attached: ${attached}` : 'No evidence captured (camera/mic unavailable)',
        attached ? 'ok' : 'warn'
      )

      const ok = await sendAlert(payload)
      setLastTx(new Date().toLocaleTimeString())
      setRssi(simulatedRssi())
      setPendingOffline(offlineQueueSize())
      pushLog(
        ok
          ? `LoRa uplink TX OK — alert relayed via gateway (seq confirmed)`
          : 'LoRa uplink FAILED — alert stored offline, will sync when link returns',
        ok ? 'ok' : 'warn'
      )
    },
    [nodeId, coords, pushLog]
  )

  // --- Mic control ---------------------------------------------------------------
  const toggleMic = useCallback(async () => {
    if (listening) {
      classifierRef.current?.stop()
      classifierRef.current = null
      setListening(false)
      setLevel(0)
      setState('Idle')
      pushLog('Microphone stopped — Edge AI disarmed', 'info')
      return
    }
    try {
      const classifier = new AudioClassifier()
      classifier.onDetection = (e) => void handleDetection(e)
      await classifier.start()
      classifierRef.current = classifier
      setListening(true)
      pushLog('Microphone armed — Edge AI listening for gunshots, chainsaws, fire', 'ok')

      // UI refresh loop for meter/status
      const refresh = setInterval(() => {
        if (!classifierRef.current) return clearInterval(refresh)
        const s = classifierRef.current.getStatus()
        setLevel(s.level)
        setState(s.state)
      }, 120)
    } catch {
      pushLog('Microphone access denied — use the manual trigger buttons instead', 'warn')
    }
  }, [listening, handleDetection, pushLog])

  useEffect(() => () => classifierRef.current?.stop(), [])

  const simulate = useCallback(
    (kind: DetectedSound) => {
      void handleDetection({
        soundType: kind,
        confidence: 0.88 + Math.random() * 0.1,
        details: 'Manual test trigger',
        timestamp: new Date(),
        simulated: true,
      })
    },
    [handleDetection]
  )

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col gap-4 bg-[#0F172A] p-4 text-slate-100">
      {/* Header */}
      <div className="rounded-xl border border-white/10 bg-[#1E293B] p-4">
        <div className="flex items-center gap-2">
          <Radio size={20} className="text-emerald-400" />
          <h1 className="text-lg font-bold">Forest Guard Node</h1>
          <span
            className={`ml-auto rounded-full px-2 py-0.5 text-xs font-semibold ${
              nodeId ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
            }`}
          >
            {nodeId ? 'ON MESH' : registering ? 'JOINING...' : 'OFFLINE'}
          </span>
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Solar-assisted edge AI sensor — smartphone mode
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1.5 rounded-lg bg-black/20 p-2">
            <MapPin size={13} className="text-emerald-400" />
            {coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : 'Acquiring GPS...'}
          </div>
          <div className="flex items-center gap-1.5 rounded-lg bg-black/20 p-2">
            <BatteryMedium size={13} className="text-emerald-400" />
            {battery !== null ? `${battery}%` : 'AC power'}
          </div>
          <div className="flex items-center gap-1.5 rounded-lg bg-black/20 p-2">
            <SignalHigh size={13} className="text-emerald-400" />
            {rssi !== null ? `${rssi} dBm` : 'No TX yet'}
          </div>
          {pendingOffline > 0 && (
            <div className="flex items-center gap-1.5 rounded-lg bg-amber-500/20 p-2 text-amber-300">
              <CloudOff size={13} />
              {pendingOffline} queued offline
            </div>
          )}
          <div className="flex items-center gap-1.5 rounded-lg bg-black/20 p-2">
            <Send size={13} className="text-emerald-400" />
            {lastTx ? `Last TX ${lastTx}` : 'No TX yet'}
          </div>
        </div>
        {nodeName && <p className="mt-2 text-xs text-slate-500">Node ID: {nodeName}</p>}
      </div>

      {/* Edge AI monitor */}
      <div className="rounded-xl border border-white/10 bg-[#1E293B] p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Edge AI Audio Monitor</h2>
          <button
            onClick={() => void toggleMic()}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              listening
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
            }`}
          >
            {listening ? <MicOff size={14} /> : <Mic size={14} />}
            {listening ? 'Stop' : 'Arm Mic'}
          </button>
        </div>

        {/* Level meter */}
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/30">
          <div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-amber-400 to-red-500 transition-all duration-100"
            style={{ width: `${Math.round(level * 100)}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-slate-400">{state}</p>
      </div>

      {/* Manual triggers */}
      <div className="rounded-xl border border-white/10 bg-[#1E293B] p-4">
        <h2 className="text-sm font-semibold">Manual Test Triggers</h2>
        <p className="mb-3 mt-1 text-xs text-slate-400">
          Simulate edge detections for demonstration — same pipeline as real detections.
        </p>
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => simulate('gunshot')}
            className="flex flex-col items-center gap-1.5 rounded-lg bg-red-500/15 p-3 text-red-400 transition hover:bg-red-500/25"
          >
            <Crosshair size={20} />
            <span className="text-xs font-semibold">Gunshot</span>
          </button>
          <button
            onClick={() => simulate('chainsaw')}
            className="flex flex-col items-center gap-1.5 rounded-lg bg-amber-500/15 p-3 text-amber-400 transition hover:bg-amber-500/25"
          >
            <Axe size={20} />
            <span className="text-xs font-semibold">Chainsaw</span>
          </button>
          <button
            onClick={() => simulate('fire')}
            className="flex flex-col items-center gap-1.5 rounded-lg bg-orange-500/15 p-3 text-orange-400 transition hover:bg-orange-500/25"
          >
            <Flame size={20} />
            <span className="text-xs font-semibold">Fire</span>
          </button>
        </div>
      </div>

      {/* Event log */}
      <div className="flex-1 rounded-xl border border-white/10 bg-[#1E293B] p-4">
        <h2 className="text-sm font-semibold">Node Event Log</h2>
        <div className="mt-2 flex flex-col gap-1 font-mono text-[11px]">
          {log.length === 0 && <p className="text-slate-500">Waiting for events...</p>}
          {log.map((entry, i) => (
            <div key={i} className="flex gap-2">
              <span className="shrink-0 text-slate-600">{entry.time}</span>
              <span className={toneColors[entry.tone]}>{entry.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
