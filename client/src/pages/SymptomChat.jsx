import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Send, Pill } from 'lucide-react'
import { mockRotation } from '../mocks/symptoms'

function nowTime() {
  return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })
}
let idSeq = 0
const nextId = () => `m${++idSeq}`

export default function SymptomChat() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const rotationRef = useRef(0)
  const bottomRef = useRef(null)
  const taRef = useRef(null)

  // Scroll to the newest message / typing indicator.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  function autoGrow(el) {
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 3 * 28 + 16) + 'px'
  }

  function send() {
    const text = input.trim()
    if (!text || typing) return

    const userMsg = { id: nextId(), role: 'user', content: text, data: null, timestamp: nowTime() }
    setMessages((m) => [...m, userMsg])
    setInput('')
    if (taRef.current) taRef.current.style.height = 'auto'

    setTyping(true)
    const data = mockRotation[rotationRef.current % mockRotation.length]
    rotationRef.current += 1

    setTimeout(() => {
      setTyping(false)
      setMessages((m) => [
        ...m,
        { id: nextId(), role: 'assistant', content: data.reply, data, timestamp: nowTime() },
      ])
    }, 2000)
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 pt-6 pb-44">
      {/* Header */}
      <div>
        <Link to="/dashboard" className="inline-flex min-h-12 items-center gap-1.5 py-2 text-lg text-primary">
          <ArrowLeft size={20} /> Back to my medicines
        </Link>
        <h1 className="mt-1 text-3xl font-bold text-[var(--color-primary)]">How are you feeling?</h1>
        <p className="mt-1 text-lg text-[var(--color-uncertain-text)]">
          Describe your symptoms — we'll check if they might relate to your medicines.
        </p>
        <div className="mt-3 rounded-xl bg-[#EFF6FF] px-4 py-2 text-base text-[var(--color-primary)]">
          This is not a diagnosis. Always consult your doctor.
        </div>
      </div>

      {/* Thread */}
      <div className="mt-4 flex flex-1 flex-col gap-3">
        {messages.length === 0 && (
          <p className="mt-8 text-center text-lg text-[var(--color-uncertain-text)]">
            Start by describing how you feel below.
          </p>
        )}

        {messages.map((msg) =>
          msg.role === 'user' ? (
            <UserBubble key={msg.id} msg={msg} />
          ) : (
            <AssistantMessage key={msg.id} msg={msg} />
          )
        )}

        {typing && <TypingBubble />}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div className="fixed inset-x-0 bottom-16 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-end gap-2">
          <textarea
            ref={taRef}
            rows={1}
            value={input}
            placeholder="Describe how you feel…"
            onChange={(e) => { setInput(e.target.value); autoGrow(e.target) }}
            onKeyDown={onKeyDown}
            className="max-h-28 min-h-12 flex-1 resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-lg outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/30"
          />
          <button
            type="button"
            onClick={send}
            disabled={!input.trim() || typing}
            aria-label="Send"
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-white shadow-md transition-transform active:scale-95 disabled:opacity-50"
          >
            <Send size={22} />
          </button>
        </div>
      </div>
    </main>
  )
}

function UserBubble({ msg }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-[var(--color-primary)] px-4 py-3 text-lg text-white">
        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
        <div className="mt-1 text-right text-base text-white/70">{msg.timestamp}</div>
      </div>
    </div>
  )
}

function AssistantMessage({ msg }) {
  const { data } = msg

  // Emergency: replace the normal bubble with an impossible-to-miss red banner.
  if (data?.urgency === 'emergency') {
    return (
      <div className="rounded-2xl bg-[var(--color-danger)] px-5 py-4 text-white">
        <div className="text-2xl font-bold">🚨 Seek emergency help now</div>
        <p className="mt-2 text-lg">{data.reply}</p>
        <p className="mt-2 text-lg font-bold">{data.recommendation}</p>
        <div className="mt-2 text-right text-base text-white/80">{msg.timestamp}</div>
      </div>
    )
  }

  const uncertain = data?.isUncertain
  return (
    <div className="flex justify-start">
      <div
        className={
          'max-w-[80%] rounded-2xl rounded-bl-sm bg-[#F1F5F9] px-4 py-3 text-[var(--color-text)] ' +
          (uncertain ? 'border-2 border-dashed border-[var(--color-uncertain)]' : '')
        }
      >
        <p className="whitespace-pre-wrap break-words text-lg">{data.reply}</p>

        {uncertain && data.uncertaintyReason && (
          <p className="mt-1 text-base italic text-[var(--color-uncertain-text)]">
            {data.uncertaintyReason}
          </p>
        )}

        {data.possibleRelatedMedication && (
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-base text-primary">
            <Pill size={16} /> Possibly related to: {data.possibleRelatedMedication}
          </div>
        )}

        <p className="mt-2 text-base text-[var(--color-uncertain-text)]">{data.recommendation}</p>
        <div className="mt-1 text-right text-base text-[var(--color-uncertain-text)]">{msg.timestamp}</div>
      </div>
    </div>
  )
}

function TypingBubble() {
  return (
    <div className="flex justify-start">
      <div className="flex gap-1 rounded-2xl rounded-bl-sm bg-[#F1F5F9] px-4 py-4">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="h-2.5 w-2.5 animate-bounce rounded-full bg-slate-400"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
    </div>
  )
}
