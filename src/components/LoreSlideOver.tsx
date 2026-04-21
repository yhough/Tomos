'use client'

import { MessageSquare, Pencil, X } from 'lucide-react'
import { useEffect } from 'react'

export type LoreCategory = 'character' | 'faction' | 'location' | 'magic' | 'misc'

export interface LoreEntry {
  id: string
  name: string
  summary: string | null
  data: string
  category: LoreCategory
  status?: string
}

const CATEGORY_LABELS: Record<LoreCategory, string> = {
  character: 'Character',
  faction:   'Faction',
  location:  'Location',
  magic:     'Magic & Systems',
  misc:      'Lore & Misc',
}

const CATEGORY_COLORS: Record<LoreCategory, string> = {
  character: 'text-blue-500 bg-blue-500/10',
  faction:   'text-amber-500 bg-amber-500/10',
  location:  'text-green-500 bg-green-500/10',
  magic:     'text-violet-500 bg-violet-500/10',
  misc:      'text-zinc-500 bg-zinc-500/10',
}

interface Props {
  entry: LoreEntry | null
  onClose: () => void
  onEditInChat: (message: string) => void
}

export function LoreSlideOver({ entry, onClose, onEditInChat }: Props) {
  useEffect(() => {
    if (!entry) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [entry, onClose])

  if (!entry) return null

  let parsedData: Record<string, unknown> = {}
  try { parsedData = JSON.parse(entry.data) } catch { /* ok */ }

  const labelColor = CATEGORY_COLORS[entry.category]

  function handleEditInChat() {
    onEditInChat(`I'd like to update "${entry!.name}": `)
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]" onClick={onClose} />

      <div className="fixed right-0 top-0 h-full w-[380px] z-50 flex flex-col bg-background border-l border-border shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border shrink-0">
          <div className="flex flex-col gap-1.5 min-w-0">
            <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded self-start ${labelColor}`}>
              {CATEGORY_LABELS[entry.category]}
            </span>
            <h2 className="text-base font-semibold leading-tight truncate">{entry.name}</h2>
            {entry.status && (
              <span className="text-xs text-muted-foreground capitalize">{entry.status}</span>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground mt-0.5"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">
          {entry.summary && (
            <section>
              <p className="text-sm leading-relaxed text-foreground/90">{entry.summary}</p>
            </section>
          )}

          {Object.entries(parsedData).map(([key, value]) => {
            if (key === 'category') return null
            if (!value || (Array.isArray(value) && value.length === 0)) return null
            return (
              <section key={key}>
                <h3 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
                  {key.replace(/_/g, ' ')}
                </h3>
                {Array.isArray(value) ? (
                  <ul className="flex flex-col gap-1">
                    {(value as string[]).map((item, i) => (
                      <li key={i} className="text-sm text-foreground/80 flex gap-2">
                        <span className="text-muted-foreground shrink-0 mt-0.5">·</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-foreground/80">{String(value)}</p>
                )}
              </section>
            )
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border shrink-0">
          <button
            onClick={handleEditInChat}
            className="flex items-center justify-center gap-2 w-full px-3 py-2 rounded-md border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <MessageSquare size={13} />
            <Pencil size={11} className="opacity-50" />
            Edit in chat
          </button>
        </div>
      </div>
    </>
  )
}
