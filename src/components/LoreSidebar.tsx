'use client'

import { LoreSlideOver, type LoreCategory, type LoreEntry } from '@/components/LoreSlideOver'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'

type SectionKey = keyof LoreSections

const SECTIONS: { key: SectionKey; label: string; dot: string; optional: boolean }[] = [
  { key: 'characters', label: 'Characters',      dot: 'bg-blue-400',   optional: false },
  { key: 'locations',  label: 'Locations',       dot: 'bg-green-400',  optional: false },
  { key: 'factions',   label: 'Factions',        dot: 'bg-amber-400',  optional: true  },
  { key: 'magic',      label: 'Magic & Systems', dot: 'bg-violet-400', optional: true  },
  { key: 'misc',       label: 'Lore & Misc',     dot: 'bg-zinc-400',   optional: true  },
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
  mockData?: LoreData
  onEditInChat?: (message: string) => void
}

export const LoreSidebar = forwardRef<LoreSidebarHandle, Props>(function LoreSidebar({ bookId, mockData, onEditInChat }, ref) {
  const [data, setData] = useState<LoreData | null>(mockData ?? null)
  const [open, setOpen] = useState<Record<string, boolean>>({
    characters: true, locations: true, factions: true, magic: true, misc: true,
  })
  const [unlocked, setUnlocked] = useState<Set<SectionKey>>(new Set())
  const [selected, setSelected] = useState<LoreEntry | null>(null)

  function fetchLore() {
    if (mockData) return
    fetch(`/api/books/${bookId}/lore`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && setData(d))
      .catch(() => {})
  }

  useEffect(() => { fetchLore() }, [bookId])
  useImperativeHandle(ref, () => ({ refetch: fetchLore }))

  const activeSections = SECTIONS.filter(({ key, optional }) => {
    if (!optional) return true
    return (data?.sections[key]?.length ?? 0) > 0 || unlocked.has(key)
  })

  const hiddenOptional = SECTIONS.filter(({ key, optional }) => {
    if (!optional) return false
    return (data?.sections[key]?.length ?? 0) === 0 && !unlocked.has(key)
  })

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
          {activeSections.map(({ key, label, dot }) => {
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

                {isOpen && entries.length === 0 && (
                  <p className="px-5 pb-2 text-[11px] text-muted-foreground/50 italic">None yet</p>
                )}

                <div className="mx-4 border-t border-border/50" />
              </div>
            )
          })}

          {/* Hidden optional sections — "Add" buttons */}
          {hiddenOptional.length > 0 && (
            <div className="px-4 pt-3 pb-1 flex flex-col gap-1">
              <p className="text-[10px] text-muted-foreground/40 uppercase tracking-wider mb-1">
                Add sections
              </p>
              {hiddenOptional.map(({ key, label, dot }) => (
                <button
                  key={key}
                  onClick={() => setUnlocked((u) => { const n = new Set(u); n.add(key); return n })}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-md text-left w-full hover:bg-muted/50 transition-colors group"
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot} opacity-40 group-hover:opacity-70 transition-opacity`} />
                  <span className="text-[11px] text-muted-foreground/50 group-hover:text-muted-foreground transition-colors">
                    {label}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <LoreSlideOver
        entry={selected}
        onClose={() => setSelected(null)}
        onEditInChat={(msg) => {
          setSelected(null)
          onEditInChat?.(msg)
        }}
      />
    </>
  )
})
