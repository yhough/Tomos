'use client'

import { CharacterCard } from '@/components/CharacterCard'
import { CharacterDetailSlideOver, type CharacterFull } from '@/components/CharacterDetailSlideOver'
import { LoreSidebar, type LoreSidebarHandle } from '@/components/LoreSidebar'
import { TypingIndicator } from '@/components/TypingIndicator'
import { WorldMessage, type WorldMessageData } from '@/components/WorldMessage'
import { mockBook, mockCharacters, mockLoreSections, mockMessages, MOCK_BOOK_ID } from '@/lib/mock-data'
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

type Tab = 'world' | 'characters' | 'chapters' | 'timeline'

const TAB_LABELS: Record<Tab, string> = {
  world: 'World',
  characters: 'Characters',
  chapters: 'Chapters',
  timeline: 'Timeline',
}

interface Props {
  params: { id: string }
}

export default function BookPage({ params }: Props) {
  const [tab, setTab] = useState<Tab>('world')

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Top nav */}
      <header className="shrink-0 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Sparkles size={16} className="text-primary" />
            <span className="text-foreground text-xl" style={{ fontFamily: 'Lumos' }}>Grimm</span>
          </Link>

          <nav className="flex items-center gap-1">
            {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                  tab === t
                    ? 'bg-primary/15 text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {TAB_LABELS[t]}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Tab content — fills remaining height, no outer scroll */}
      <div className="flex-1 min-h-0">
        {tab === 'world' && <WorldTab bookId={params.id} />}
        {tab === 'characters' && <CharactersTab bookId={params.id} />}
        {tab === 'chapters' && <ChaptersTab bookId={params.id} />}
        {tab === 'timeline' && <TimelineTab bookId={params.id} />}
      </div>
    </div>
  )
}

// ── World tab ─────────────────────────────────────────────────────────────────

function WorldTab({ bookId }: { bookId: string }) {
  const isMock = bookId === MOCK_BOOK_ID
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [logline, setLogline] = useState<string | null>(isMock ? mockBook.logline : null)
  const [messages, setMessages] = useState<WorldMessageData[]>(isMock ? mockMessages : [])
  const [isTyping, setIsTyping] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const sidebarRef = useRef<LoreSidebarHandle>(null)
  const feedRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isMock) return
    fetch(`/api/books/${bookId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((b) => b && setLogline(b.logline ?? null))
      .catch(() => {})
  }, [bookId, isMock])

  useEffect(() => {
    if (isMock) return
    fetch(`/api/books/${bookId}/world/messages`)
      .then((r) => r.ok ? r.json() : [])
      .then((msgs) => setMessages(msgs))
      .catch(() => {})
  }, [bookId, isMock])

  // Scroll to bottom whenever messages change or typing indicator appears
  useEffect(() => {
    const el = feedRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, isTyping])

  async function sendMessage() {
    const text = input.trim()
    if (!text || isTyping || isMock) return

    setSendError(null)
    const optimisticUser: WorldMessageData = {
      id: `opt-${Date.now()}`,
      role: 'user',
      content: text,
      metadata: '{}',
      created_at: Date.now(),
      ripple_cards: [],
    }

    setMessages((prev) => [...prev, optimisticUser])
    setInput('')
    setIsTyping(true)

    try {
      const res = await fetch(`/api/books/${bookId}/world/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data?.error || `Request failed (${res.status})`)
      }

      // Replace optimistic user message with server version, add assistant message
      setMessages((prev) => {
        const withoutOptimistic = prev.filter((m) => m.id !== optimisticUser.id)
        return [...withoutOptimistic, data.user_message, data.message]
      })

      // Refetch lore sidebar if state was updated
      sidebarRef.current?.refetch()
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticUser.id))
      setSendError(err instanceof Error ? err.message : 'Something went wrong')
      setInput(text) // restore input so user can retry
    } finally {
      setIsTyping(false)
    }
  }

  function handleRippleAccepted() {
    sidebarRef.current?.refetch()
  }

  return (
    <div className="h-full flex overflow-hidden">
      {/* Lore sidebar */}
      <aside
        className={`shrink-0 border-r border-border flex flex-col overflow-hidden transition-all duration-200 ${
          sidebarOpen ? 'w-[270px]' : 'w-0 border-r-0'
        }`}
      >
        <LoreSidebar
          ref={sidebarRef}
          bookId={bookId}
          mockData={isMock ? { logline: mockBook.logline, sections: mockLoreSections } : undefined}
        />
      </aside>

      {/* Chat column — three zones */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">

        {/* Zone 1 — World overview bar (48px) */}
        <div className="shrink-0 h-12 border-b border-border flex items-center gap-3 px-4">
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            title={sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
          >
            {sidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
          </button>
          <p className="text-xs text-muted-foreground truncate">
            {logline ?? 'No overview yet — start building the world below.'}
          </p>
        </div>

        {/* Zone 2 — Scrollable message feed */}
        <div ref={feedRef} className="flex-1 min-h-0 overflow-y-auto">
          <div className="flex flex-col gap-6 px-6 py-8">
            {messages.length === 0 && !isTyping ? (
              <div className="flex items-center justify-center py-16">
                <p className="text-sm text-muted-foreground">
                  Narrate an event or ask a question to begin.
                </p>
              </div>
            ) : (
              messages.map((msg) => (
                <WorldMessage
                  key={msg.id}
                  message={msg}
                  bookId={bookId}
                  onRippleAccepted={handleRippleAccepted}
                />
              ))
            )}
            {isTyping && <TypingIndicator />}
          </div>
        </div>

        {/* Zone 3 — Pinned input bar */}
        <div className="shrink-0 border-t border-border bg-background px-4 py-3">
          {sendError && (
            <p className="text-xs text-red-600 mb-2 px-1">{sendError}</p>
          )}
          <textarea
            rows={1}
            value={input}
            onChange={(e) => { setInput(e.target.value); if (sendError) setSendError(null) }}
            placeholder="Narrate an event, establish a fact, or ask a question…"
            className="w-full resize-none rounded-lg border border-input bg-card px-4 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring leading-relaxed"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage()
              }
            }}
          />
          <p className="text-[10px] text-muted-foreground/40 mt-1.5 pl-1">
            Enter to send · Shift+Enter for new line
          </p>
        </div>

      </div>
    </div>
  )
}

// ── Characters tab ────────────────────────────────────────────────────────────

function CharactersTab({ bookId }: { bookId: string }) {
  const isMock = bookId === MOCK_BOOK_ID
  const [characters, setCharacters] = useState<CharacterFull[]>(isMock ? mockCharacters : [])
  const [selected, setSelected] = useState<CharacterFull | null>(null)

  useEffect(() => {
    if (isMock) return
    fetch(`/api/books/${bookId}/characters`)
      .then((r) => r.ok ? r.json() : [])
      .then(setCharacters)
      .catch(() => {})
  }, [bookId, isMock])

  return (
    <>
      <div className="h-full overflow-y-auto">
        {characters.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-sm text-muted-foreground">
              No characters yet — they'll appear here as you build the world.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4 p-8">
            {characters.map((char) => (
              <CharacterCard
                key={char.id}
                character={char}
                onClick={() => setSelected(char)}
              />
            ))}
          </div>
        )}
      </div>

      <CharacterDetailSlideOver
        character={selected}
        onClose={() => setSelected(null)}
      />
    </>
  )
}

function ChaptersTab({ bookId }: { bookId: string }) {
  return (
    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
      Chapters tab coming soon. Book ID: {bookId}
    </div>
  )
}

function TimelineTab({ bookId }: { bookId: string }) {
  return (
    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
      Timeline tab coming soon. Book ID: {bookId}
    </div>
  )
}
