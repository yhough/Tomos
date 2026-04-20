'use client'

import { mockTimelineEvents, MOCK_BOOK_ID } from '@/lib/mock-data'
import { useEffect, useMemo, useState } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface TimelineEvent {
  id: string
  title: string
  description: string
  source: string
  inStoryDate: string | null
  category: string
  characters: string[]
  sortOrder: number
  createdAt: number
}

// ── Category config ───────────────────────────────────────────────────────────

const CATEGORY_STYLES: Record<string, { badge: string; border: string; label: string }> = {
  historical: { badge: 'bg-zinc-100 text-zinc-600',       border: 'border-l-zinc-400',    label: 'Historical'  },
  political:  { badge: 'bg-violet-100 text-violet-700',   border: 'border-l-violet-400',  label: 'Political'   },
  conflict:   { badge: 'bg-red-100 text-red-700',         border: 'border-l-red-400',     label: 'Conflict'    },
  mystery:    { badge: 'bg-amber-100 text-amber-700',     border: 'border-l-amber-400',   label: 'Mystery'     },
  story:      { badge: 'bg-blue-100 text-blue-700',       border: 'border-l-blue-400',    label: 'Story'       },
  economic:   { badge: 'bg-green-100 text-green-700',     border: 'border-l-green-400',   label: 'Economic'    },
  magic:      { badge: 'bg-violet-100 text-violet-700',   border: 'border-l-violet-400',  label: 'Magic'       },
  history:    { badge: 'bg-zinc-100 text-zinc-600',       border: 'border-l-zinc-400',    label: 'History'     },
}

function categoryStyle(cat: string) {
  return CATEGORY_STYLES[cat.toLowerCase()] ?? {
    badge: 'bg-zinc-100 text-zinc-600',
    border: 'border-l-zinc-300',
    label: cat.charAt(0).toUpperCase() + cat.slice(1),
  }
}

function formatSource(source: string): string {
  if (source === 'world_chat' || source === 'chat') return 'World'
  const m = source.match(/chapter[_\s]?(\d+)/i)
  if (m) return `Ch. ${m[1]}`
  return source
}

// ── Normalise mock → unified shape ────────────────────────────────────────────

function normaliseMock(e: (typeof mockTimelineEvents)[0], i: number): TimelineEvent {
  return {
    id: e.id,
    title: e.title,
    description: e.description,
    source: e.source,
    inStoryDate: e.inStoryDate ?? null,
    category: e.category,
    characters: e.characters,
    sortOrder: i,
    createdAt: e.createdAt instanceof Date ? e.createdAt.getTime() : Number(e.createdAt),
  }
}

function normaliseApi(e: Record<string, unknown>, i: number): TimelineEvent {
  return {
    id: String(e.id),
    title: String(e.title ?? ''),
    description: String(e.description ?? ''),
    source: String(e.source ?? 'chat'),
    inStoryDate: e.in_story_date ? String(e.in_story_date) : null,
    category: String(e.category ?? 'history'),
    characters: (() => { try { return JSON.parse(String(e.characters ?? '[]')) } catch { return [] } })(),
    sortOrder: Number(e.sort_order ?? i),
    createdAt: Number(e.created_at ?? 0),
  }
}

// ── Event card ────────────────────────────────────────────────────────────────

const CATEGORY_DOT: Record<string, string> = {
  historical: 'bg-zinc-400',
  political:  'bg-violet-400',
  conflict:   'bg-red-400',
  mystery:    'bg-amber-400',
  story:      'bg-blue-400',
  economic:   'bg-green-400',
  magic:      'bg-violet-400',
  history:    'bg-zinc-400',
}

function categoryDot(cat: string) {
  return CATEGORY_DOT[cat.toLowerCase()] ?? 'bg-zinc-400'
}

// side: which side of the center line this card is on.
// The accent border always faces the center line.
function EventCard({ event, side }: { event: TimelineEvent; side: 'left' | 'right' }) {
  const cs = categoryStyle(event.category)
  const borderClass = side === 'left'
    ? `border-r-4 ${cs.border}`
    : `border-l-4 ${cs.border}`

  return (
    <div className={`bg-card border border-border rounded-xl ${borderClass} px-5 py-4 flex flex-col gap-2`}>
      {/* Top row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {event.inStoryDate && (
            <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full font-medium">
              {event.inStoryDate}
            </span>
          )}
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full capitalize ${cs.badge}`}>
            {cs.label}
          </span>
        </div>
        <span className="text-[11px] text-muted-foreground/60 shrink-0 mt-0.5">
          {formatSource(event.source)}
        </span>
      </div>

      {/* Title */}
      <h3
        className="text-sm font-semibold text-foreground leading-snug"
        style={{ fontFamily: 'var(--font-playfair)', fontStyle: 'italic' }}
      >
        {event.title}
      </h3>

      {/* Description */}
      <p className="text-xs text-muted-foreground leading-relaxed">
        {event.description}
      </p>

      {/* Characters */}
      {event.characters.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {event.characters.map((name) => (
            <span
              key={name}
              className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border"
            >
              {name}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Select ────────────────────────────────────────────────────────────────────

function FilterSelect({
  value, onChange, children,
}: {
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="text-xs bg-card border border-border rounded-lg px-3 py-2 text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring appearance-none pr-7"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 8px center',
      }}
    >
      {children}
    </select>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  bookId?: string
  refreshKey?: number
}

export function TimelineTab({ bookId, refreshKey }: Props) {
  const isMock = !bookId || bookId === MOCK_BOOK_ID

  const [events, setEvents] = useState<TimelineEvent[]>(() =>
    isMock ? mockTimelineEvents.map(normaliseMock) : []
  )
  const [character, setCharacter] = useState('all')
  const [category, setCategory]   = useState('all')
  const [sort, setSort]           = useState<'story' | 'added'>('story')

  useEffect(() => {
    if (isMock || !bookId) return
    fetch(`/api/books/${bookId}/timeline`)
      .then((r) => r.ok ? r.json() : [])
      .then((rows: Record<string, unknown>[]) => setEvents(rows.map(normaliseApi)))
      .catch(() => {})
  }, [bookId, isMock, refreshKey])

  // Derived filter options
  const allCharacters = useMemo(() => {
    const set = new Set<string>()
    events.forEach((e) => e.characters.forEach((c) => set.add(c)))
    return Array.from(set).sort()
  }, [events])

  const allCategories = useMemo(() => {
    const set = new Set<string>()
    events.forEach((e) => set.add(e.category))
    return Array.from(set).sort()
  }, [events])

  // Filtering + sorting
  const displayed = useMemo(() => {
    let out = events.filter((e) => {
      if (character !== 'all' && !e.characters.includes(character)) return false
      if (category !== 'all' && e.category !== category) return false
      return true
    })
    if (sort === 'added') {
      out = [...out].sort((a, b) => a.createdAt - b.createdAt)
    }
    // story order: keep original array order (sort_order asc)
    return out
  }, [events, character, category, sort])

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (events.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-6">
        <p className="text-sm font-medium text-foreground" style={{ fontFamily: 'var(--font-playfair)', fontStyle: 'italic' }}>
          No timeline events yet
        </p>
        <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">
          Events will appear here as you narrate the world and analyze chapters.
        </p>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[860px] mx-auto px-6 py-8">

        {/* Header */}
        <div className="mb-5">
          <h2
            className="text-2xl font-semibold text-foreground"
            style={{ fontFamily: 'var(--font-playfair)', fontStyle: 'italic' }}
          >
            Timeline
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            {events.length} event{events.length !== 1 ? 's' : ''} recorded
          </p>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <FilterSelect value={character} onChange={setCharacter}>
            <option value="all">All characters</option>
            {allCharacters.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </FilterSelect>

          <FilterSelect value={category} onChange={setCategory}>
            <option value="all">All categories</option>
            {allCategories.map((c) => (
              <option key={c} value={c} className="capitalize">
                {categoryStyle(c).label}
              </option>
            ))}
          </FilterSelect>

          {/* Sort toggle */}
          <div className="flex items-center gap-0.5 bg-card border border-border rounded-lg p-0.5 ml-auto">
            {(['story', 'added'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSort(s)}
                className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
                  sort === s
                    ? 'bg-muted text-foreground font-medium'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {s === 'story' ? 'Story order' : 'Added date'}
              </button>
            ))}
          </div>
        </div>

        {/* Event list */}
        {displayed.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-16">
            No events match the current filters.
          </p>
        ) : (
          <div className="relative">
            {/* Center spine */}
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border -translate-x-1/2 pointer-events-none" />

            <div className="flex flex-col gap-8">
              {displayed.map((event, i) => {
                const side = i % 2 === 0 ? 'left' : 'right'
                const dot = categoryDot(event.category)
                return (
                  <div key={event.id} className="relative flex items-start gap-6">
                    {/* Left half */}
                    <div className="flex-1 flex justify-end">
                      {side === 'left' && <div className="w-full max-w-[380px]"><EventCard event={event} side="left" /></div>}
                    </div>

                    {/* Center dot */}
                    <div className={`relative z-10 shrink-0 w-3 h-3 rounded-full ${dot} ring-2 ring-background mt-5`} />

                    {/* Right half */}
                    <div className="flex-1">
                      {side === 'right' && <div className="w-full max-w-[380px]"><EventCard event={event} side="right" /></div>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
