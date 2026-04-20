'use client'

import { LoreSlideOver, type LoreCategory, type LoreEntry } from '@/components/LoreSlideOver'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'

const SECTIONS: { key: keyof LoreSections; label: string; dot: string }[] = [
  { key: 'characters', label: 'Characters',      dot: 'bg-blue-400' },
  { key: 'factions',   label: 'Factions',        dot: 'bg-amber-400' },
  { key: 'locations',  label: 'Locations',        dot: 'bg-green-400' },
  { key: 'magic',      label: 'Magic & Systems',  dot: 'bg-violet-400' },
  { key: 'misc',       label: 'Lore & Misc',      dot: 'bg-zinc-400' },
]

interface LoreSections {
  characters: LoreEntry[]
  factions:   LoreEntry[]
  locations:  LoreEntry[]
  magic:      LoreEntry[]
  misc:       LoreEntry[]
}

interface LoreData {
  logline: string | null
  sections: LoreSections
}

export interface LoreSidebarHandle {
  refetch: () => void
}

interface Props {
  bookId: string
}

export const LoreSidebar = forwardRef<LoreSidebarHandle, Props>(function LoreSidebar({ bookId }, ref) {
  const [data, setData] = useState<LoreData | null>(null)
  const [open, setOpen] = useState<Record<string, boolean>>({
    characters: true, factions: true, locations: true, magic: true, misc: true,
  })
  const [selected, setSelected] = useState<LoreEntry | null>(null)

  function fetchLore() {
    fetch(`/api/books/${bookId}/lore`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && setData(d))
      .catch(() => {})
  }

  useEffect(() => { fetchLore() }, [bookId])

  useImperativeHandle(ref, () => ({ refetch: fetchLore }))

  const totalEntries = data
    ? Object.values(data.sections).reduce((n, s) => n + s.length, 0)
    : 0

  return (
    <>
      <div className="h-full flex flex-col overflow-hidden">
        {/* World overview strip */}
        <div className="px-4 py-3 border-b border-border shrink-0">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
            World Overview
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
            {data?.logline ?? 'Overview will appear once you start building the world.'}
          </p>
        </div>

        {/* Sections */}
        <div className="flex-1 overflow-y-auto py-2">
          {totalEntries === 0 && data ? (
            <p className="px-4 py-3 text-xs text-muted-foreground/60">
              No lore yet. Start narrating in the World chat to populate this sidebar.
            </p>
          ) : (
            SECTIONS.map(({ key, label, dot }) => {
              const entries = data?.sections[key] ?? []
              const isOpen = open[key]

              return (
                <div key={key} className="mb-1">
                  <button
                    onClick={() => setOpen((o) => ({ ...o, [key]: !o[key] }))}
                    className="w-full flex items-center gap-2 px-4 py-1.5 hover:bg-muted/50 transition-colors group"
                  >
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />
                    <span className="flex-1 text-left text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                      {label}
                    </span>
                    {entries.length > 0 && (
                      <span className="text-[10px] text-muted-foreground/50">{entries.length}</span>
                    )}
                    {isOpen
                      ? <ChevronDown size={11} className="text-muted-foreground/50" />
                      : <ChevronRight size={11} className="text-muted-foreground/50" />
                    }
                  </button>

                  {isOpen && entries.length > 0 && (
                    <div className="flex flex-col gap-0.5 pb-1 px-3">
                      {entries.map((entry) => (
                        <button
                          key={entry.id}
                          onClick={() => setSelected(entry)}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/60 transition-colors text-left w-full group"
                        >
                          <span className={`w-1 h-1 rounded-full shrink-0 ${dot} opacity-70`} />
                          <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors truncate">
                            {entry.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="mx-4 border-t border-border/50" />
                </div>
              )
            })
          )}
        </div>
      </div>

      <LoreSlideOver entry={selected} onClose={() => setSelected(null)} />
    </>
  )
})
