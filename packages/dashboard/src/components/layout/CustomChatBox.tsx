import { useState, useRef, useEffect, useCallback } from 'react'
import { 
  Bot, User, Send, X, Minimize2, Maximize2, Copy, Check, 
  BarChart3, AlertTriangle, MapPin, Clock, Shield, Leaf  
} from 'lucide-react'
import { useAlerts, useNodes } from '@/hooks/useLiveData'
import { useRole } from '@/providers/RoleProvider'

const SUGGESTIONS = [
  'What are the latest alerts?',
  'Which zones have high activity?',
  'How many nodes are offline?',
  'Explain the threat scoring system',
  'Show me recent dispatches',
  'What is JungleSathi?',
  'How does the sensor network work?',
  'Risk prevention recommendations',
]

const WILDLIFE_KNOWLEDGE: Array<{ keywords: string[]; response: string }> = [
  {
    keywords: ['deforestation', 'illegal', 'logging'],
    response: 'Based on historical data, illegal logging typically occurs during low visibility hours between 2-5 AM in buffer zones with limited sensor coverage. I recommend increasing patrol frequency in these areas during these hours and ensuring 100% node coverage in critical zones.'
  },
  {
    keywords: ['elephant', 'human', 'conflict', 'herd'],
    response: 'Elephant-human conflicts peak during monsoon months when migration corridors flood. Early warning systems near villages and crop fields show 75% effectiveness in preventing incidents. Recommended: deploy additional audio sensors during migration season.'
  },
  {
    keywords: ['fire', 'burn', 'hotspot'],
    response: 'Fire incidents historically spike during dry periods with temperatures exceeding 35°C for 3+ consecutive days. Pre-positioning firefighting teams in high-risk zones during these periods reduces response time by 40%. Ensure temperature and humidity sensors are active in vulnerable areas.'
  },
  {
    keywords: ['poaching', 'gunshot', 'trap', 'chainsaw'],
    response: 'Poaching activity correlates with new road construction and logging activity. Historical data shows concentrated efforts in sectors bordering human settlements during moonless nights. Risk mitigation: increase night patrols and deploy motion-triggered cameras at entry points.'
  },
  {
    keywords: ['sensor', 'node', 'offline', 'battery', 'maintenance'],
    response: 'Sensor failures occur most frequently after heavy rains (>100mm) due to water ingress. Nodes require preventive maintenance every 4 weeks during monsoon season. Battery life is typically shorter in high-humidity zones. Recommended: weekly battery status checks and monthly calibration.'
  },
  {
    keywords: ['risk', 'prevention', 'strategy', 'mitigate', 'reduce'],
    response: 'Risk prevention strategies for wildlife monitoring:\n\n1. Peak Hours Monitoring: Increase patrol frequency between 2-5 AM (highest risk period)\n2. Zone Prioritization: Focus resources on buffer zones bordering human settlements\n3. Weather-Based Alerts: Activate additional sensors during dry periods for fire prevention\n4. Seasonal Adjustments: Calibrate AI thresholds seasonally (migration vs. dry season)\n5. Redundancy Planning: Ensure overlapping sensor coverage in critical areas\n6. Response Drills: Conduct monthly response drills for different alert scenarios'
  },
]

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  hasImage?: boolean
}

interface ChatBoxProps {
  compact?: boolean
}

export function CustomChatBox({ compact = false }: ChatBoxProps) {
  const [open, setOpen] = useState(false)
  const [minimized, setMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m JungleSathi AI Assistant. I can help you analyze wildlife alerts, investigate sensor data, and provide risk prevention insights. What would you like to know?',
      timestamp: new Date(),
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [pendingImage, setPendingImage] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const { alerts } = useAlerts()
  const { nodes } = useNodes()
  const { roleLabel } = useRole()

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus()
    }
  }, [open])

  const generateLocalResponse = useCallback((query: string): string => {
    const lower = query.toLowerCase().trim()
    
    // Knowledge base responses
    for (const item of WILDLIFE_KNOWLEDGE) {
      if (item.keywords.some(kw => lower.includes(kw))) {
        return item.response
      }
    }

    // System data queries
    if (lower.includes('alert') || lower.includes('threat') || lower.includes('incident')) {
      const critical = alerts.filter(a => a.severity === 'critical' || a.severity === 'high')
      const recent = alerts.slice(0, 5)
      let response = `Currently showing ${alerts.length} total alerts in the system.`
      if (critical.length > 0) {
        response += `\n\n${critical.length} alerts are classified as high/critical severity requiring immediate attention.`
      }
      if (recent.length > 0) {
        response += '\n\nRecent alerts:\n'
        recent.slice(0, 3).forEach(a => {
          response += `- ${a.type} (${a.severity}) - ${a.description || a.id.slice(-6)}\n`
        })
      }
      return response
    }

    if (lower.includes('node') || lower.includes('sensor') || lower.includes('device') || lower.includes('offline')) {
      const online = nodes.filter(n => n.status === 'online')
      const offline = nodes.filter(n => n.status === 'offline')
      const warning = nodes.filter(n => n.status === 'warning')
      return `System has ${nodes.length} nodes deployed.\n\n- Online: ${online.length}\n- Warning: ${warning.length}\n- Offline: ${offline.length}\n\n${offline.length > 0 ? '⚠️ Immediate attention needed for offline nodes.' : 'All nodes operational.'}`
    }

    if (lower.includes('zone') || lower.includes('area')) {
      const zoneMap = new Map<string, number>()
      alerts.forEach(a => {
        const node = nodes.find(n => n.id === a.nodeId)
        const zone = node?.zone || 'Unknown'
        zoneMap.set(zone, (zoneMap.get(zone) || 0) + 1)
      })
      const topZones = Array.from(zoneMap.entries()).sort(([,a],[,b]) => b-a).slice(0, 5)
      let response = 'Top zones by alert activity:\n'
      topZones.forEach(([zone, count]) => {
        response += `- ${zone}: ${count} alerts\n`
      })
      return response || 'No zone activity data available.'
    }

    if (lower.includes('risk') || lower.includes('prevent') || lower.includes('strateg')) {
      return `Risk Prevention Strategies:\n\n1. Peak Hours Monitoring: Increase patrol frequency between 2-5 AM (highest risk period)\n2. Zone Prioritization: Focus resources on buffer zones bordering human settlements\n3. Weather-Based Alerts: Activate additional sensors during dry periods for fire prevention\n4. Seasonal Adjustments: Calibrate AI thresholds seasonally\n5. Redundancy Planning: Ensure overlapping sensor coverage in critical areas\n6. Response Drills: Conduct monthly response drills for different alert scenarios`
    }

    if (lower.includes('threat') || lower.includes('scor')) {
      return `Threat scoring is based on spatial-temporal factors, time-of-day, and multi-sensor confidence:\n\n- Low (0-30): Routine wildlife activity\n- Amber (31-70): Potential human intrusion or unusual activity\n- Critical (71-100): Confirmed threats requiring immediate response\n\nFactors considered: Time of day (highest risk 2-5 AM), proximity to human settlements, animal behavior patterns, and sensor confidence levels.`
    }

    return `I'm here to help with JungleSathi analysis. You can ask me about:\n- Current alerts and their severity\n- Zone activity patterns\n- Node deployment status\n- Risk prevention insights\n- Threat scoring system\n- Sensor maintenance guidance\n\nWhat would you like to explore?`
  }, [alerts, nodes])

  const handleSend = async () => {
    if (!input.trim() && !pendingImage) return
    if (loading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'assistant',
      content: input.trim(),
      timestamp: new Date(),
      hasImage: !!pendingImage
    }

    setMessages(prev => [...prev, userMessage])
    const userQuery = input.trim()
    setInput('')
    setLoading(true)

    // Convert image to base64 if present
    let imageBase64: string | undefined
    if (pendingImage) {
      try {
        imageBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => {
            const result = reader.result as string
            resolve(result.split(',')[1] ?? '')
          }
          reader.onerror = reject
          reader.readAsDataURL(selectedFile!)
        })
      } catch {
        imageBase64 = undefined
      }
      setPendingImage(null)
      setSelectedFile(null)
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userQuery || 'Analyze this wildlife image',
          imageBase64,
          history: messages.slice(-10).map(m => ({
            role: m.role === 'user' ? 'assistant' : 'user',
            content: m.content
          })) as any
        })
      })

      const data = await response.json()
      let reply = data.reply || ''
      
      if (!reply || reply.toLowerCase().includes('error') || reply.toLowerCase().includes('cannot')) {
        reply = generateLocalResponse(userQuery)
      }

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: reply,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, botMessage])
    } catch {
      const localResponse = generateLocalResponse(userQuery)
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: localResponse,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, botMessage])
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be under 5MB')
      return
    }
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }
    setSelectedFile(file)
    const reader = new FileReader()
    reader.onload = (e) => {
      setPendingImage(e.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className={`${compact ? 'h-10 w-10' : 'h-14 w-14'} fixed bottom-5 right-5 z-[9000] flex items-center justify-center rounded-full bg-gradient-to-r from-forest to-forest-light text-white shadow-2xl shadow-black/40 transition-all duration-300 hover:scale-105 hover:shadow-3xl`}
        aria-label="Open ChatBot"
      >
        <Bot size={compact ? 20 : 24} />
      </button>
    )
  }

  return (
    <div className={`fixed bottom-5 right-5 z-[9000] flex transition-all duration-300 ${
      minimized ? 'h-14 w-14' : compact ? 'h-[400px] w-[320px]' : 'h-[550px] w-[400px]'
    }`}>
      {!minimized && (
        <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-dark shadow-2xl shadow-black/40">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-700/50 bg-slate-surface px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-forest-light/20">
                <Bot className="h-5 w-5 text-forest-light" />
                <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-dark" />
              </div>
              <div>
                <p className="font-semibold text-slate-text">JungleSathi AI</p>
                <p className="text-xs text-slate-muted">{roleLabel} | Live analysis</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setMinimized(true)}
                className="rounded-lg p-1 text-slate-muted transition-colors hover:bg-slate-surface hover:text-slate-text"
                aria-label="Minimize chat"
              >
                <Minimize2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-slate-muted transition-colors hover:bg-slate-surface hover:text-red-400"
                aria-label="Close chat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div ref={listRef} className="flex-1 overflow-y-auto bg-slate-dark p-4">
            <div className="flex flex-col gap-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      msg.role === 'assistant'
                        ? 'bg-slate-surface text-slate-text border border-slate-700/50'
                        : 'bg-forest-light/20 text-slate-text'
                    }`}
                  >
                    {msg.hasImage && (
                      <div className="mb-2 flex items-center gap-2 rounded-lg bg-slate-800/50 px-2 py-1.5">
                        <img 
                          src={msg.content} 
                          alt="Uploaded" 
                          className="h-16 w-16 rounded object-cover"
                        />
                      </div>
                    )}
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-xs text-slate-muted opacity-70">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {msg.role === 'assistant' && (
                        <button
                          onClick={() => handleCopy(msg.id, msg.content)}
                          className="rounded bg-slate-800/50 p-1 opacity-0 transition-opacity hover:text-slate-text group-hover:opacity-100"
                          title="Copy message"
                        >
                          {copiedId === msg.id ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl border border-slate-700/50 bg-slate-surface px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Bot className="h-3 w-3 text-forest-light animate-pulse" />
                      <span className="text-xs text-slate-muted">
                        Analyzing data...
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Suggestions */}
          {messages.length <= 3 && (
            <div className="border-t border-slate-700/50 bg-slate-surface/50 p-3">
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.slice(0, compact ? 4 : 6).map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setInput(s)
                      setTimeout(() => {
                        inputRef.current?.focus()
                        handleSend()
                      }, 100)
                    }}
                    className="rounded-lg border border-slate-600/50 bg-slate-dark px-3 py-1.5 text-xs text-slate-muted transition-colors hover:border-forest-light/30 hover:bg-slate-800 hover:text-slate-text"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Pending image preview */}
          {pendingImage && (
            <div className="border-t border-slate-700/50 bg-slate-surface/50 p-2">
              <div className="flex items-center gap-2 px-2">
                <img src={pendingImage} alt="Pending" className="h-10 w-10 rounded object-cover" />
                <span className="text-xs text-slate-muted">Image ready to send</span>
                <button
                  onClick={() => {
                    setPendingImage(null)
                    setSelectedFile(null)
                  }}
                  className="ml-auto rounded p-1 text-slate-muted hover:text-slate-text"
                  aria-label="Remove image"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>
          )}

          {/* Input */}
          <div className="border-t border-slate-700/50 bg-slate-surface p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSend()
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSend()
                  }
                }}
                placeholder="Ask about alerts, zones, risks..."
                className="flex-1 rounded-xl border border-slate-600/50 bg-slate-dark px-4 py-2.5 text-sm text-slate-text placeholder-slate-muted outline-none focus:border-forest-light focus:ring-1 focus:ring-forest-light/20"
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-slate-muted transition-colors hover:bg-slate-700 hover:text-slate-text"
                aria-label="Attach image"
                title="Attach image for analysis"
              >
                <span className="text-lg">📎</span>
              </button>
              <button
                type="submit"
                disabled={!input.trim() && !pendingImage || loading}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-forest-light text-slate-950 transition-colors hover:bg-forest-light/80 disabled:opacity-50"
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
            <p className="mt-1 text-center text-[10px] text-slate-muted">
              Powered by JungleSathi Intelligence Engine
            </p>
          </div>
        </div>
      )}
      
      {minimized && (
        <button
          onClick={() => setMinimized(false)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-forest to-forest-light text-white shadow-2xl shadow-black/40 transition-all duration-300 hover:scale-105"
          aria-label="Open chat"
        >
          <Bot size={24} />
        </button>
      )}
    </div>
  )
}
