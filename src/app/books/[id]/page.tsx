'use client'

import { CharacterCard } from '@/components/CharacterCard'
import { CharacterDetailSlideOver, type CharacterFull } from '@/components/CharacterDetailSlideOver'
import { RelationshipMap, type RelationshipWithNames } from '@/components/RelationshipMap'
import { RelationshipEdgePanel } from '@/components/RelationshipEdgePanel'
import { AddRelationshipModal } from '@/components/AddRelationshipModal'
import { ChapterList } from '@/components/ChaptersTab/ChapterList'
import { ProcessingPipeline } from '@/components/ChaptersTab/ProcessingPipeline'
import { TimelineTab as TimelineTabContent } from '@/components/TimelineTab'
import { LoreSidebar, type LoreSidebarHandle } from '@/components/LoreSidebar'
import { BookDetailsSlideOver } from '@/components/BookDetailsSlideOver'
import { TypingIndicator } from '@/components/TypingIndicator'
import { WorldMessage, type WorldMessageData } from '@/components/WorldMessage'
import { ExportModal } from '@/components/ExportModal'
import { mockBook, mockChapters, mockCharacters, mockLoreSections, mockMessages, mockProcessingSteps, mockRelationships, MOCK_BOOK_ID } from '@/lib/mock-data'
import { useTheme } from '@/hooks/useTheme'
import type { ChatMetadata } from '@/types'
import { AlertTriangle, BookOpen, CheckCircle, ChevronLeft, ChevronRight, Download, Moon, Settings2, Sparkles, Sun, Upload, Zap } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'

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
  const [preFillMessage, setPreFillMessage] = useState<string | null>(null)
  const [chaptersKey, setChaptersKey] = useState(0)
  const [charactersKey, setCharactersKey] = useState(0)
  const [timelineKey, setTimelineKey] = useState(0)
  const [pendingResolveFlagId, setPendingResolveFlagId] = useState<string | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [bookDetails, setBookDetails] = useState<{ title: string; genre: string; premise: string | null; cover_image: string | null } | null>(null)
  const { dark, toggle: toggleTheme } = useTheme()

  const isMockBook = params.id === MOCK_BOOK_ID

  useEffect(() => {
    if (isMockBook) return
    fetch(`/api/books/${params.id}`)
      .then((r) => r.ok ? r.json() : null)
      .then((b) => b && setBookDetails({ title: b.title, genre: b.genre, premise: b.premise, cover_image: b.cover_image ?? null }))
      .catch(() => {})
  }, [params.id, isMockBook])

  function handleResolveViaChat(message: string, flagId: string) {
    setPreFillMessage(message)
    setPendingResolveFlagId(flagId)
    setTab('world')
  }

  function handleCorrectionApplied() {
    setChaptersKey((k) => k + 1)
    setCharactersKey((k) => k + 1)
    setTimelineKey((k) => k + 1)
  }

  function handleTabChange(t: Tab) {
    setTab(t)
    if (t === 'chapters') setChaptersKey((k) => k + 1)
    if (t === 'characters') setCharactersKey((k) => k + 1)
    if (t === 'timeline') setTimelineKey((k) => k + 1)
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Top nav */}
      <header className="shrink-0 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Sparkles size={16} className="text-primary" />
            <span className="text-foreground text-xl" style={{ fontFamily: 'Lumos' }}>Fief</span>
          </Link>

          <nav className="flex items-center gap-1">
            {(Object.keys(TAB_LABELS) as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => handleTabChange(t)}
                className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                  tab === t
                    ? 'bg-primary/15 text-primary font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {TAB_LABELS[t]}
              </button>
            ))}
            <div className="w-px h-4 bg-border mx-1" />
            {!isMockBook && (
              <>
                <button
                  onClick={() => setExportOpen(true)}
                  title="Export world bible"
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <Download size={14} />
                </button>
                <button
                  onClick={() => setDetailsOpen(true)}
                  title="Edit book details"
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <Settings2 size={14} />
                </button>
              </>
            )}
            <button
              onClick={toggleTheme}
              title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              {dark ? <Sun size={14} /> : <Moon size={14} />}
            </button>
          </nav>
        </div>
      </header>

      <BookDetailsSlideOver
        open={detailsOpen}
        bookId={params.id}
        initial={bookDetails}
        onClose={() => setDetailsOpen(false)}
        onSaved={(updated) => setBookDetails({ ...updated, cover_image: updated.cover_image ?? null })}
      />

      <ExportModal
        bookId={params.id}
        open={exportOpen}
        onClose={() => setExportOpen(false)}
      />

      {/* Tab content — fills remaining height, no outer scroll */}
      <div className="flex-1 min-h-0">
        {tab === 'world' && (
          <WorldTab
            bookId={params.id}
            preFillMessage={preFillMessage}
            onPreFillConsumed={() => setPreFillMessage(null)}
            pendingResolveFlagId={pendingResolveFlagId}
            onFlagResolved={() => {
              setPendingResolveFlagId(null)
              setChaptersKey((k) => k + 1)
            }}
            onCorrectionApplied={handleCorrectionApplied}
          />
        )}
        {tab === 'characters' && (
          <CharactersTab
            bookId={params.id}
            refreshKey={charactersKey}
            onEditInChat={(msg) => { setPreFillMessage(msg); setTab('world') }}
          />
        )}
        {tab === 'chapters' && (
          <ChaptersTab
            bookId={params.id}
            refreshKey={chaptersKey}
            onResolveViaChat={handleResolveViaChat}
            onChapterReordered={() => setTimelineKey((k) => k + 1)}
            onChapterAnalyzed={() => {
              setCharactersKey((k) => k + 1)
              setTimelineKey((k) => k + 1)
            }}
          />
        )}
        {tab === 'timeline' && <TimelineTab bookId={params.id} refreshKey={timelineKey} />}
      </div>
    </div>
  )
}

// ── World tab ─────────────────────────────────────────────────────────────────

function WorldTab({
  bookId,
  preFillMessage,
  onPreFillConsumed,
  pendingResolveFlagId,
  onFlagResolved,
  onCorrectionApplied,
}: {
  bookId: string
  preFillMessage?: string | null
  onPreFillConsumed?: () => void
  pendingResolveFlagId?: string | null
  onFlagResolved?: () => void
  onCorrectionApplied?: () => void
}) {
  const isMock = bookId === MOCK_BOOK_ID
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [logline, setLogline] = useState<string | null>(isMock ? mockBook.logline : null)
  const [messages, setMessages] = useState<WorldMessageData[]>(isMock ? mockMessages : [])
  const [isTyping, setIsTyping] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [confirmingMessageId, setConfirmingMessageId] = useState<string | null>(null)
  const sidebarRef = useRef<LoreSidebarHandle>(null)
  const feedRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

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

  // Auto-resize textarea to fit content
  useEffect(() => {
    const el = inputRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [input])

  // Pre-fill textarea when switching to world tab from chapters
  useEffect(() => {
    if (preFillMessage) {
      setInput(preFillMessage)
      onPreFillConsumed?.()
      setTimeout(() => inputRef.current?.focus(), 80)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preFillMessage])

  async function handleConfirmCorrection(messageId: string) {
    const sourceMsg = messages.find((m) => m.id === messageId)

    if (!isMock) {
      setConfirmingMessageId(messageId)
      try {
        const res = await fetch(`/api/books/${bookId}/world/correction/confirm`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ worldMessageId: messageId }),
        })
        if (!res.ok) throw new Error()
      } catch {
        toast.error("Something went wrong — the correction wasn't applied. Try again.", { duration: 5000 })
        setConfirmingMessageId(null)
        return
      }
      setConfirmingMessageId(null)
    }

    // Update message metadata in local state
    setMessages((prev) => prev.map((m) => {
      if (m.id !== messageId) return m
      let meta: ChatMetadata = {}
      try { meta = JSON.parse(m.metadata) } catch { /* ok */ }
      return { ...m, metadata: JSON.stringify({ ...meta, correction_status: 'confirmed' }) }
    }))

    sidebarRef.current?.refetch()

    let summary = 'Correction applied'
    if (sourceMsg) {
      try {
        const meta = JSON.parse(sourceMsg.metadata) as ChatMetadata
        summary = meta.correction_data?.summary ?? summary
      } catch { /* ok */ }
    }
    toast.success(summary, { duration: 4000 })
    onCorrectionApplied?.()
  }

  async function handleCancelCorrection(messageId: string) {
    if (!isMock) {
      try {
        await fetch(`/api/books/${bookId}/world/correction/cancel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ worldMessageId: messageId }),
        })
      } catch { /* silent — update UI regardless */ }
    }

    setMessages((prev) => prev.map((m) => {
      if (m.id !== messageId) return m
      let meta: ChatMetadata = {}
      try { meta = JSON.parse(m.metadata) } catch { /* ok */ }
      return { ...m, metadata: JSON.stringify({ ...meta, correction_status: 'cancelled' }) }
    }))
  }

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

      // If this message was sent to resolve a specific chapter flag, mark it resolved
      if (pendingResolveFlagId && !isMock) {
        fetch(`/api/books/${bookId}/flags/${pendingResolveFlagId}`, { method: 'PATCH' })
          .then(() => onFlagResolved?.())
          .catch(() => {})
      }
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
          onEditInChat={(msg) => {
            setInput(msg)
            setTimeout(() => inputRef.current?.focus(), 80)
          }}
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
                  onCorrectionConfirm={() => handleConfirmCorrection(msg.id)}
                  onCorrectionCancel={() => handleCancelCorrection(msg.id)}
                  isConfirming={confirmingMessageId === msg.id}
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
            ref={inputRef}
            rows={1}
            value={input}
            onChange={(e) => { setInput(e.target.value); if (sendError) setSendError(null) }}
            placeholder="Narrate an event, establish a fact, or ask a question…"
            className="w-full resize-none overflow-hidden rounded-lg border border-input bg-card px-4 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring leading-relaxed"
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

function CharactersTab({ bookId, refreshKey, onEditInChat }: { bookId: string; refreshKey?: number; onEditInChat?: (message: string) => void }) {
  const isMock = bookId === MOCK_BOOK_ID
  const [characters, setCharacters] = useState<CharacterFull[]>(isMock ? mockCharacters : [])
  const [relationships, setRelationships] = useState<RelationshipWithNames[]>(isMock ? mockRelationships : [])
  const [selected, setSelected] = useState<CharacterFull | null>(null)
  const [showMap, setShowMap] = useState(true)
  const [hoveredCharId, setHoveredCharId] = useState<string | null>(null)
  const [selectedRel, setSelectedRel] = useState<RelationshipWithNames | null>(null)
  const [addModalOpen, setAddModalOpen] = useState(false)

  useEffect(() => {
    if (isMock) return
    fetch(`/api/books/${bookId}/characters`)
      .then((r) => r.ok ? r.json() : [])
      .then(setCharacters)
      .catch(() => {})
  }, [bookId, isMock, refreshKey])

  useEffect(() => {
    if (isMock) return
    fetch(`/api/books/${bookId}/relationships`)
      .then((r) => r.ok ? r.json() : [])
      .then(setRelationships)
      .catch(() => {})
  }, [bookId, isMock, refreshKey])

  async function handleSaveRelationship(id: string, patch: Partial<RelationshipWithNames>) {
    if (isMock) { setRelationships((prev) => prev.map((r) => r.id === id ? { ...r, ...patch } : r)); return }
    const res = await fetch(`/api/books/${bookId}/relationships/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (!res.ok) throw new Error('Failed to save')
    const updated = await res.json() as RelationshipWithNames
    setRelationships((prev) => prev.map((r) => r.id === id ? updated : r))
    setSelectedRel(updated)
  }

  async function handleDeleteRelationship(id: string) {
    if (isMock) { setRelationships((prev) => prev.filter((r) => r.id !== id)); return }
    const res = await fetch(`/api/books/${bookId}/relationships/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Failed to delete')
    setRelationships((prev) => prev.filter((r) => r.id !== id))
  }

  function handleAddViaChat(message: string) {
    onEditInChat?.(message)
  }

  const ROLE_ORDER: Record<string, number> = { protagonist: 0, antagonist: 1, supporting: 2, minor: 3 }
  const ROLE_LABELS: Record<string, string> = {
    protagonist: 'Protagonists', antagonist: 'Antagonists', supporting: 'Supporting', minor: 'Minor',
  }

  function charCompleteness(c: CharacterFull) {
    let score = 0
    if (c.description) score += 2
    if (c.arc_status) score += 2
    try { const d = JSON.parse(c.data); if ((d.traits ?? []).length > 0) score += 1 } catch { /* ok */ }
    return score
  }

  const grouped = characters
    .slice()
    .sort((a, b) => {
      const ro = (ROLE_ORDER[a.role] ?? 4) - (ROLE_ORDER[b.role] ?? 4)
      if (ro !== 0) return ro
      return charCompleteness(b) - charCompleteness(a)
    })
    .reduce<Record<string, CharacterFull[]>>((acc, c) => {
      const key = ROLE_ORDER[c.role] !== undefined ? c.role : 'minor'
      if (!acc[key]) acc[key] = []
      acc[key].push(c)
      return acc
    }, {})

  const groupOrder = ['protagonist', 'antagonist', 'supporting', 'minor'].filter((r) => grouped[r]?.length)

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
          <div className="flex flex-col gap-8 p-8">
            {/* Map toggle */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowMap((s) => !s)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  showMap
                    ? 'bg-primary/15 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full transition-colors ${showMap ? 'bg-primary' : 'bg-muted-foreground/40'}`} />
                {showMap ? 'Hide' : 'Show'} relationship map
              </button>
            </div>

            {/* Relationship map */}
            {showMap && (
              <RelationshipMap
                characters={characters}
                relationships={relationships}
                hoveredCharId={hoveredCharId}
                onNodeClick={(id) => {
                  const char = characters.find((c) => c.id === id)
                  if (char) setSelected(char)
                }}
                onEdgeClick={setSelectedRel}
                onAddClick={() => setAddModalOpen(true)}
              />
            )}

            {/* Character grid */}
            {groupOrder.map((role) => (
              <section key={role}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xs font-semibold tracking-widest uppercase text-muted-foreground/70">
                    {ROLE_LABELS[role]}
                  </span>
                  <span className="text-xs text-muted-foreground/40 font-normal">
                    {grouped[role].length}
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {grouped[role].map((char) => (
                    <CharacterCard
                      key={char.id}
                      character={char}
                      onClick={() => setSelected(char)}
                      onMouseEnter={() => setHoveredCharId(char.id)}
                      onMouseLeave={() => setHoveredCharId(null)}
                      highlighted={hoveredCharId === char.id}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      <CharacterDetailSlideOver
        character={selected}
        onClose={() => setSelected(null)}
        onEditInChat={onEditInChat}
      />

      <RelationshipEdgePanel
        relationship={selectedRel}
        onClose={() => setSelectedRel(null)}
        onSave={handleSaveRelationship}
        onDelete={handleDeleteRelationship}
        isMock={isMock}
      />

      <AddRelationshipModal
        open={addModalOpen}
        characters={characters}
        onClose={() => setAddModalOpen(false)}
        onAddViaChat={handleAddViaChat}
      />
    </>
  )
}

type RealChapter = (typeof mockChapters)[0]

function chaptersFromApi(raw: unknown[]): RealChapter[] {
  return raw.map((c) => {
    const ch = c as Record<string, unknown>
    return {
      id: ch.id as string,
      number: ch.number as number,
      title: ch.title as string,
      wordCount: ch.wordCount as number,
      summary: (ch.summary as string | null) ?? null,
      processed: ch.processed as boolean,
      processingError: (ch.processingError as string | null) ?? null,
      createdAt: new Date(ch.createdAt as string | number),
      flags: (ch.flags as RealChapter['flags']) ?? [],
      charactersAppearing: (ch.charactersAppearing as string[]) ?? [],
      correctionNotes: (ch.correctionNotes as RealChapter['correctionNotes']) ?? [],
    }
  })
}

function ChaptersTab({
  bookId,
  refreshKey,
  onResolveViaChat,
  onChapterReordered,
  onChapterAnalyzed,
}: {
  bookId: string
  refreshKey?: number
  onResolveViaChat?: (message: string, flagId: string) => void
  onChapterReordered?: () => void
  onChapterAnalyzed?: () => void
}) {
  const isMock = bookId === MOCK_BOOK_ID
  const [uploadMode, setUploadMode] = useState<'paste' | 'file'>('paste')
  const [expandedChapterId, setExpandedChapterId] = useState<string | null>(isMock ? 'chapter-3' : null)
  const [pasteText, setPasteText] = useState('')
  const [chapterTitle, setChapterTitle] = useState('')
  const [chapterNumber, setChapterNumber] = useState('')
  const [sortBy, setSortBy] = useState<'order' | 'recent'>('order')
  const [chapters, setChapters] = useState<RealChapter[]>(isMock ? mockChapters : [])
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)

  const uploadRef = useRef<HTMLDivElement>(null)
  const pasteTextareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isMock) return
    fetch(`/api/books/${bookId}/chapters`)
      .then((r) => r.ok ? r.json() : [])
      .then((data: unknown[]) => setChapters(chaptersFromApi(data)))
      .catch(() => {})
  }, [bookId, isMock, refreshKey])

  function scrollToUpload() {
    uploadRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setTimeout(() => pasteTextareaRef.current?.focus(), 300)
  }

  function handleRequestUpload(number: number, title: string) {
    setChapterNumber(String(number))
    setChapterTitle(title)
    setUploadMode('paste')
    scrollToUpload()
  }

  async function handleAnalyzeChapter() {
    const text = pasteText.trim()
    if (!text) { setAnalyzeError('Paste your chapter text first.'); return }
    if (!chapterTitle.trim()) { setAnalyzeError('Enter a chapter title.'); return }
    const num = parseInt(chapterNumber, 10)
    if (!num || num < 1) { setAnalyzeError('Enter a valid chapter number.'); return }

    setAnalyzeError(null)
    setIsAnalyzing(true)

    try {
      const res = await fetch(`/api/books/${bookId}/chapters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: chapterTitle.trim(), number: num, content: text }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error ?? `Request failed (${res.status})`)

      const processed = chaptersFromApi([data])[0]
      setChapters((prev) => {
        const without = prev.filter((c) => c.id !== processed.id && c.number !== processed.number)
        return [...without, processed].sort((a, b) => a.number - b.number)
      })
      setPasteText('')
      setChapterTitle('')
      setChapterNumber('')
      setExpandedChapterId(processed.id)
      onChapterAnalyzed?.()
      toast.success(`Chapter ${num} analyzed — ${processed.flags.length} flag${processed.flags.length === 1 ? '' : 's'} found`, { duration: 4000 })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      setAnalyzeError(msg)
      toast.error(msg, { duration: 5000 })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const sortedChapters = [...chapters].sort((a, b) => {
    if (sortBy === 'recent') return b.createdAt.getTime() - a.createdAt.getTime()
    return a.number - b.number
  })

  const processedChapters = chapters.filter((c) => c.processed)
  const totalWords = processedChapters.reduce((sum, c) => sum + c.wordCount, 0)
  const totalFlags = chapters.reduce((sum, c) => sum + c.flags.filter((f) => !f.resolved).length, 0)
  const hasErrors = chapters.some((c) => c.flags.some((f) => f.severity === 'error' && !f.resolved))
  const hasWarnings = chapters.some((c) => c.flags.some((f) => f.severity === 'warning' && !f.resolved))

  const flagIconColor = hasErrors
    ? 'hsl(var(--grimm-danger))'
    : hasWarnings
    ? 'hsl(var(--grimm-accent))'
    : 'hsl(var(--grimm-muted))'

  const inputStyle: React.CSSProperties = {
    backgroundColor: 'hsl(var(--grimm-surface))',
    border: '0.5px solid hsl(var(--grimm-border))',
    color: 'hsl(var(--grimm-text))',
    padding: '6px 10px',
    borderRadius: 6,
    fontSize: 13,
    outline: 'none',
  }

  return (
    <div className="h-full overflow-y-auto">
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '32px 24px' }}>

        {/* ── Tab header row ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1
              style={{
                fontFamily: 'var(--font-playfair)',
                fontSize: 24,
                color: 'hsl(var(--grimm-text))',
                margin: 0,
                lineHeight: 1.2,
              }}
            >
              Chapters
            </h1>
            <p style={{ color: 'hsl(var(--grimm-muted))', fontSize: 13, marginTop: 4 }}>
              {totalWords.toLocaleString('en-US')} words across {processedChapters.length} chapters
            </p>
          </div>
        </div>

        {/* ── Stats bar ── */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          {/* Total words */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              backgroundColor: 'hsl(var(--grimm-surface))',
              border: '0.5px solid hsl(var(--grimm-border))',
              borderRadius: 20,
              padding: '6px 14px',
            }}
          >
            <BookOpen size={14} style={{ color: 'hsl(var(--grimm-muted))' }} />
            <span style={{ color: 'hsl(var(--grimm-text))', fontSize: 13, fontWeight: 500 }}>
              {totalWords.toLocaleString('en-US')}
            </span>
            <span style={{ color: 'hsl(var(--grimm-muted))', fontSize: 12 }}>total words</span>
          </div>

          {/* Chapters processed */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              backgroundColor: 'hsl(var(--grimm-surface))',
              border: '0.5px solid hsl(var(--grimm-border))',
              borderRadius: 20,
              padding: '6px 14px',
            }}
          >
            <CheckCircle size={14} style={{ color: 'hsl(var(--grimm-muted))' }} />
            <span style={{ color: 'hsl(var(--grimm-text))', fontSize: 13, fontWeight: 500 }}>
              {processedChapters.length}
            </span>
            <span style={{ color: 'hsl(var(--grimm-muted))', fontSize: 12 }}>chapters processed</span>
          </div>

          {/* Flags */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              backgroundColor: 'hsl(var(--grimm-surface))',
              border: '0.5px solid hsl(var(--grimm-border))',
              borderRadius: 20,
              padding: '6px 14px',
            }}
          >
            <AlertTriangle size={14} style={{ color: flagIconColor }} />
            <span style={{ color: flagIconColor, fontSize: 13, fontWeight: 500 }}>{totalFlags}</span>
            <span style={{ color: 'hsl(var(--grimm-muted))', fontSize: 12 }}>
              {totalFlags === 1 ? 'flag' : 'flags'} to review
            </span>
          </div>
        </div>

        {/* ── Upload area ── */}
        <div
          ref={uploadRef}
          style={{
            backgroundColor: 'hsl(var(--grimm-surface))',
            border: '0.5px solid hsl(var(--grimm-border))',
            borderRadius: 12,
            padding: 24,
            marginBottom: 24,
          }}
        >
          {/* Tab switcher */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
            {(['paste', 'file'] as const).map((mode) => {
              const isActive = uploadMode === mode
              return (
                <button
                  key={mode}
                  onClick={() => setUploadMode(mode)}
                  style={{
                    padding: '5px 14px',
                    borderRadius: 20,
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                    border: isActive
                      ? '0.5px solid hsl(var(--grimm-accent))'
                      : '0.5px solid hsl(var(--grimm-border))',
                    backgroundColor: isActive
                      ? 'hsl(var(--grimm-accent) / 0.12)'
                      : 'hsl(var(--grimm-surface-raised))',
                    color: isActive ? 'hsl(var(--grimm-accent))' : 'hsl(var(--grimm-muted))',
                    transition: 'all 100ms ease',
                  }}
                >
                  {mode === 'paste' ? 'Paste text' : 'Upload file'}
                </button>
              )
            })}
          </div>

          {/* Chapter number + title row */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <label style={{ color: 'hsl(var(--grimm-muted))', fontSize: 12, whiteSpace: 'nowrap' }}>
                Chapter
              </label>
              <input
                type="number"
                value={chapterNumber}
                onChange={(e) => setChapterNumber(e.target.value)}
                placeholder="1"
                style={{ ...inputStyle, width: 64 }}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
              <label style={{ color: 'hsl(var(--grimm-muted))', fontSize: 12, whiteSpace: 'nowrap' }}>
                Title
              </label>
              <input
                type="text"
                value={chapterTitle}
                onChange={(e) => setChapterTitle(e.target.value)}
                placeholder="Chapter title..."
                style={{ ...inputStyle, flex: 1 }}
              />
            </div>
          </div>

          {uploadMode === 'paste' ? (
            <>
              <textarea
                ref={pasteTextareaRef}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="Paste your chapter text here..."
                style={{
                  ...inputStyle,
                  width: '100%',
                  minHeight: 140,
                  resize: 'vertical',
                  fontSize: 14,
                  padding: 14,
                  lineHeight: 1.6,
                  boxSizing: 'border-box',
                  display: 'block',
                }}
              />
              <p style={{ color: 'hsl(var(--grimm-muted))', fontSize: 12, textAlign: 'right', marginTop: 4 }}>
                {pasteText.length.toLocaleString('en-US')} characters
              </p>

              {analyzeError && (
                <p style={{ color: 'hsl(var(--grimm-danger))', fontSize: 12, marginTop: 8 }}>
                  {analyzeError}
                </p>
              )}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: 16,
                }}
              >
                <span style={{ color: 'hsl(var(--grimm-muted))', fontSize: 12 }}>
                  {isAnalyzing ? 'Analyzing… this takes 15–30 seconds' : 'Processing takes about 15–30 seconds'}
                </span>
                <button
                  onClick={handleAnalyzeChapter}
                  disabled={isAnalyzing}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: isAnalyzing ? 'hsl(var(--grimm-accent) / 0.6)' : 'hsl(var(--grimm-accent))',
                    color: 'hsl(var(--background))',
                    padding: '8px 20px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 500,
                    border: 'none',
                    cursor: isAnalyzing ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isAnalyzing ? (
                    <>
                      <svg style={{ animation: 'spin 1s linear infinite', width: 13, height: 13 }} viewBox="0 0 24 24" fill="none">
                        <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Analyzing…
                    </>
                  ) : (
                    <>
                      <Zap size={13} />
                      Analyze chapter
                    </>
                  )}
                </button>
              </div>
            </>
          ) : (
            <>
              <DropZone
                onFileContent={(text) => { setPasteText(text); setUploadMode('paste') }}
                onError={(msg) => setAnalyzeError(msg)}
              />
              {analyzeError && (
                <p style={{ color: 'hsl(var(--grimm-danger))', fontSize: 12, marginTop: 8 }}>
                  {analyzeError}
                </p>
              )}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: 16,
                }}
              >
                <span style={{ color: 'hsl(var(--grimm-muted))', fontSize: 12 }}>
                  {isAnalyzing ? 'Analyzing… this takes 15–30 seconds' : 'Processing takes about 15–30 seconds'}
                </span>
                <button
                  onClick={handleAnalyzeChapter}
                  disabled={isAnalyzing}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: isAnalyzing ? 'hsl(var(--grimm-accent) / 0.6)' : 'hsl(var(--grimm-accent))',
                    color: 'hsl(var(--background))',
                    padding: '8px 20px',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 500,
                    border: 'none',
                    cursor: isAnalyzing ? 'not-allowed' : 'pointer',
                  }}
                >
                  {isAnalyzing ? (
                    <>
                      <svg style={{ animation: 'spin 1s linear infinite', width: 13, height: 13 }} viewBox="0 0 24 24" fill="none">
                        <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Analyzing…
                    </>
                  ) : (
                    <>
                      <Zap size={13} />
                      Analyze chapter
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>

        {/* ── Processing pipeline (mock only) ── */}
        {isMock && (
          <ProcessingPipeline steps={mockProcessingSteps} chapterTitle="Eastern Hospitality" />
        )}

        {/* ── Chapter list ── */}
        <ChapterList
          chapters={sortedChapters}
          bookId={bookId}
          expandedChapterId={expandedChapterId}
          onToggleChapter={(id) =>
            setExpandedChapterId((prev) => (prev === id ? null : id))
          }
          sortBy={sortBy}
          onSortChange={setSortBy}
          onResolveViaChat={onResolveViaChat}
          onRequestUpload={handleRequestUpload}
          onScrollToUpload={scrollToUpload}
          onChapterDeleted={(deletedId) => {
            setChapters((prev) => {
              const deleted = prev.find((c) => c.id === deletedId)
              if (!deleted) return prev
              return prev
                .filter((c) => c.id !== deletedId)
                .map((c) => c.number > deleted.number ? { ...c, number: c.number - 1 } : c)
            })
            setExpandedChapterId((prev) => (prev === deletedId ? null : prev))
          }}
          onNumberChanged={(changedId, newNumber) => {
            setChapters((prev) => {
              const changed = prev.find((c) => c.id === changedId)
              if (!changed) return prev
              const oldNumber = changed.number
              return prev.map((c) => {
                if (c.id === changedId) return { ...c, number: newNumber }
                if (c.number === newNumber) return { ...c, number: oldNumber } // swap
                return c
              })
            })
            onChapterReordered?.()
          }}
        />
      </div>
    </div>
  )
}

function DropZone({ onFileContent, onError }: { onFileContent: (text: string) => void; onError: (msg: string) => void }) {
  const [hovering, setHovering] = useState(false)

  async function readFile(file: File) {
    const isTxt = file.name.endsWith('.txt')
    const isDocx = file.name.endsWith('.docx')
    if (!isTxt && !isDocx) {
      onError('Only .txt and .docx files are supported.')
      return
    }
    if (isTxt) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const text = e.target?.result as string
        if (text) onFileContent(text)
      }
      reader.onerror = () => onError('Failed to read file.')
      reader.readAsText(file)
    } else {
      try {
        const mammoth = (await import('mammoth')).default
        const arrayBuffer = await file.arrayBuffer()
        const result = await mammoth.extractRawText({ arrayBuffer })
        if (result.value) onFileContent(result.value)
        else onError('Could not extract text from this .docx file.')
      } catch {
        onError('Failed to read .docx file.')
      }
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setHovering(false)
    const file = e.dataTransfer.files[0]
    if (file) readFile(file)
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) readFile(file)
    e.target.value = ''
  }

  return (
    <div
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onDragOver={(e) => { e.preventDefault(); setHovering(true) }}
      onDragLeave={() => setHovering(false)}
      onDrop={handleDrop}
      style={{
        position: 'relative',
        border: `1px dashed ${hovering ? 'hsl(var(--grimm-accent) / 0.5)' : 'hsl(var(--grimm-border))'}`,
        borderRadius: 10,
        backgroundColor: hovering ? 'hsl(var(--grimm-surface-raised) / 0.8)' : 'hsl(var(--grimm-surface-raised))',
        padding: '40px 24px',
        textAlign: 'center',
        cursor: 'pointer',
        transition: 'border-color 150ms ease, background-color 150ms ease',
      }}
    >
      {/* Invisible file input covers the entire zone — most reliable cross-browser approach */}
      <input
        type="file"
        accept=".txt,.docx"
        onChange={handleChange}
        style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
      />
      <Upload size={32} style={{ color: 'hsl(var(--grimm-muted))', margin: '0 auto', pointerEvents: 'none' }} />
      <p style={{ color: 'hsl(var(--grimm-text))', fontSize: 14, marginTop: 12, pointerEvents: 'none' }}>
        Drop your file here
      </p>
      <p style={{ color: 'hsl(var(--grimm-muted))', fontSize: 13, marginTop: 4, pointerEvents: 'none' }}>
        or click to browse
      </p>
      <p style={{ color: 'hsl(var(--grimm-muted))', fontSize: 11, marginTop: 8, pointerEvents: 'none' }}>
        Supports .txt and .docx
      </p>
    </div>
  )
}

function TimelineTab({ bookId, refreshKey }: { bookId: string; refreshKey?: number }) {
  return <TimelineTabContent bookId={bookId} refreshKey={refreshKey} />
}
