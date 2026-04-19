'use client'

import { Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

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
    <div className="h-screen flex flex-col">
      {/* Top nav */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-sm shrink-0">
        <div className="px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <Sparkles size={16} className="text-primary" />
            <span className="text-foreground text-xl" style={{ fontFamily: 'Lumos' }}>Grimoire</span>
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

      <div className="flex-1 overflow-hidden">
        {tab === 'world' && <WorldTab bookId={params.id} />}
        {tab === 'characters' && <CharactersTab bookId={params.id} />}
        {tab === 'chapters' && <ChaptersTab bookId={params.id} />}
        {tab === 'timeline' && <TimelineTab bookId={params.id} />}
      </div>
    </div>
  )
}

// ── Tab placeholders ──────────────────────────────────────────────────────────

function WorldTab({ bookId }: { bookId: string }) {
  return (
    <div className="h-full flex">
      <aside className="w-72 border-r border-border shrink-0 p-4">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Book State</p>
        <p className="text-sm text-muted-foreground">Facts, locations, factions, and events will appear here as you build the world.</p>
      </aside>
      <main className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-sm gap-1">
        <p>World chat coming soon.</p>
        <p className="text-xs text-muted-foreground/60">Book ID: {bookId}</p>
      </main>
    </div>
  )
}

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
