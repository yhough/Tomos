'use client'

import { LoreSidebar, type LoreSidebarHandle } from '@/components/LoreSidebar'
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useRef, useState } from 'react'

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
  const sidebarRef = useRef<LoreSidebarHandle>(null)

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

      {/* Chat area */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Sidebar toggle */}
        <div className="shrink-0 px-4 py-2 border-b border-border flex items-center">
          <button
            onClick={() => setSidebarOpen((o) => !o)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {sidebarOpen ? <ChevronLeft size={13} /> : <ChevronRight size={13} />}
            {sidebarOpen ? 'Hide sidebar' : 'Show sidebar'}
          </button>
        </div>

        {/* Messages — scrollable */}
        <div className="flex-1 overflow-y-auto p-6 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Chat interface coming soon.</p>
        </div>

        {/* Input — pinned to bottom */}
        <div className="shrink-0 border-t border-border p-4">
          <div className="rounded-lg border border-input bg-card px-4 py-3 text-sm text-muted-foreground/50">
            Narrate an event, establish a fact, or ask a question…
          </div>
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
