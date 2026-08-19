import { useState, useRef, useEffect } from 'react'

const SUGGESTIONS = [
  'What is JungleSathi?',
  'Services & pricing',
  'How does the sensor network work?',
  'Demo login credentials',
  'Contact info',
]

const FALLBACK_EN = "I don't have this information yet. Please contact our support team."

const GREETING_EN = "Hello there! 👋 It's nice to meet you! What brings you here today? Please use the navigation below or ask me anything about JungleSathi product. 🪄"

function sanitizeChatReply(reply: string): string {
  const lower = reply.toLowerCase();
  if (lower.includes('cannot read') || lower.includes('does not support image input') || lower.startsWith('error:')) {
    return "I received your message, but I'm unable to process it fully right now. Please try rephrasing or send a text-only question.";
  }
  return reply;
}



function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      const base64 = result.split(',')[1] ?? ''
      resolve(base64)
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<{ from: 'user' | 'bot'; text: string; image?: string }[]>([
    { from: 'bot', text: GREETING_EN },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [pendingImage, setPendingImage] = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open || !listRef.current) return
    listRef.current.scrollTop = listRef.current.scrollHeight
  }, [open, messages])

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus()
  }, [open])

  async function send(text?: string) {
    const trimmed = (text ?? input).trim()
    const imageBase64 = pendingImage
    if (!trimmed && !imageBase64) return
    if (loading) return

    setMessages((prev) => [...prev, { from: 'user', text: trimmed, image: imageBase64 ? `data:image/jpeg;base64,${imageBase64}` : undefined }])
    setInput('')
    setPendingImage(null)
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, imageBase64 }),
      })
      const data = await res.json()
      let reply = data.reply || ''
      reply = sanitizeChatReply(reply)
      if (!reply || reply.includes('I do not have a specific answer')) {
        reply = FALLBACK_EN
      }
      setMessages((prev) => [...prev, { from: 'bot', text: reply }])
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          from: 'bot',
          text: 'I could not reach the assistant right now. Please try again shortly.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be under 5MB')
      return
    }
    const base64 = await toBase64(file)
    setPendingImage(base64)
  }

  return (
    <div className="fixed bottom-5 right-5 z-[90]">
      {open && (
        <div className="mb-3 flex h-[520px] w-[360px] flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl shadow-black/30">
          {/* Header */}
          <div className="flex items-center gap-3 bg-white px-5 py-4">
            <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-blue-600">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-400 ring-2 ring-white" />
            </div>
            <div className="min-w-0">
              <p className="text-base font-bold text-gray-900">JungleBhai</p>
              <p className="text-xs font-medium text-gray-500">Online</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="ml-auto rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              aria-label="Close chat"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div ref={listRef} className="flex-1 overflow-y-auto bg-gray-50 p-4">
            <div className="flex flex-col gap-3">
              {messages.map((msg, idx) => (
                <div key={idx} className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.from === 'user'
                    ? 'self-end rounded-br-sm bg-blue-600 text-white'
                    : 'self-start rounded-bl-sm bg-white text-gray-800 shadow-sm border border-gray-100'
                }`}>
                  {msg.image && (
                    <img
                      src={msg.image}
                      alt="Uploaded"
                      className="mb-2 max-h-40 max-w-full rounded-lg object-cover"
                    />
                  )}
                  {msg.text}
                </div>
              ))}
              {loading && (
                <div className="self-start rounded-2xl rounded-bl-sm bg-white px-4 py-3 text-xs text-gray-500 shadow-sm border border-gray-100">
                  <span className="inline-flex items-center gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '0ms' }} />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '120ms' }} />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '240ms' }} />
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Suggestions */}
          {messages.length <= 2 && !pendingImage && (
            <div className="border-t border-gray-100 bg-white px-4 py-3">
              <div className="flex flex-col gap-2">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-medium text-blue-700 transition-colors hover:border-blue-400 hover:bg-blue-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Pending image preview */}
          {pendingImage && (
            <div className="border-t border-gray-100 bg-white px-4 py-2">
              <div className="flex items-center gap-2">
                <img src={`data:image/jpeg;base64,${pendingImage}`} alt="Pending" className="h-10 w-10 rounded-lg object-cover" />
                <span className="text-xs text-gray-600">Image ready to send</span>
                <button
                  onClick={() => setPendingImage(null)}
                  className="ml-auto rounded-full p-1 text-gray-400 hover:text-gray-600"
                  aria-label="Remove image"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Input */}
          <div className="border-t border-gray-100 bg-white px-4 py-3">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                send(input)
              }}
              className="flex items-center gap-2"
            >
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message here"
                className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-blue-400 focus:bg-white"
              />
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200"
                aria-label="Attach image"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </button>
              <button
                type="submit"
                disabled={!input.trim() && !pendingImage || loading}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                aria-label="Send message"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                </svg>
              </button>
            </form>
            <p className="mt-2 text-center text-[11px] text-gray-400">
              Powered by <span className="font-semibold text-gray-600">JungleSathi</span>
            </p>
          </div>
        </div>
      )}

      {/* FAB */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-black/20 transition-transform hover:scale-105"
        aria-label={open ? 'Close chat' : 'Open chat'}
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
      </button>
    </div>
  )
}
