'use client'

import { LoreSidebar, type LoreSidebarHandle } from '@/components/LoreSidebar'
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
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [logline, setLogline] = useState<string | null>(null)
  const sidebarRef = useRef<LoreSidebarHandle>(null)

  useEffect(() => {
    fetch(`/api/books/${bookId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((b) => b && setLogline(b.logline ?? null))
      .catch(() => {})
  }, [bookId])

  return (
    <div className="h-full flex overflow-hidden">
      {/* Lore sidebar */}
      <aside
        className={`shrink-0 border-r border-border flex flex-col overflow-hidden transition-all duration-200 ${
          sidebarOpen ? 'w-[270px]' : 'w-0 border-r-0'
        }`}
      >
        <LoreSidebar ref={sidebarRef} bookId={bookId} />
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
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="flex flex-col gap-6 px-6 py-8">
            {/* Messages render here — placeholder */}
            <div className="flex items-center justify-center py-16">
              <p className="text-sm text-muted-foreground">
                Narrate an event or ask a question to begin.
              </p>
            </div>
          </div>
        </div>

        {/* Zone 3 — Pinned input bar */}
        <div className="shrink-0 border-t border-border bg-background px-4 py-3">
          <textarea
            rows={1}
            placeholder="Narrate an event, establish a fact, or ask a question…"
            className="w-full resize-none rounded-lg border border-input bg-card px-4 py-2.5 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-ring leading-relaxed"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                // send handler wired in next step
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

// ── Other tab placeholders ────────────────────────────────────────────────────

function CharactersTab({ bookId }: { bookId: string }) {
  return (
    <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
      Characters tab coming soon. Book ID: {bookId}
    </div>
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
