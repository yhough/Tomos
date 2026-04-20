'use client'

import { X } from 'lucide-react'
import { useEffect } from 'react'

export interface CharacterFull {
  id: string
  name: string
  role: string
  description: string | null
  status: string
  arc_status: string | null
  data: string // JSON: { traits, relationships, notable_moments }
}

const ROLE_STYLES: Record<string, string> = {
  protagonist: 'text-blue-700 bg-blue-500/10',
  antagonist:  'text-red-700 bg-red-500/10',
  supporting:  'text-amber-700 bg-amber-500/10',
  minor:       'text-zinc-600 bg-zinc-500/10',
}

const STATUS_DOT: Record<string, string> = {
  alive:     'bg-green-400',
  dead:      'bg-zinc-400',
  unknown:   'bg-amber-400',
  ambiguous: 'bg-amber-400',
}

interface Props {
  character: CharacterFull | null
  onClose: () => void
}

export function CharacterDetailSlideOver({ character, onClose }: Props) {
  useEffect(() => {
    if (!character) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [character, onClose])

  if (!character) return null

  let traits: string[] = []
  let relationships: Array<{ character_name: string; description: string }> = []
  let notable_moments: string[] = []
  try {
    const d = JSON.parse(character.data)
    traits = d.traits ?? []
    relationships = d.relationships ?? []
    notable_moments = d.notable_moments ?? []
  } catch { /* ok */ }

  const roleStyle = ROLE_STYLES[character.role] ?? ROLE_STYLES.minor
  const statusDot = STATUS_DOT[character.status] ?? 'bg-amber-400'

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-[400px] z-50 flex flex-col bg-background border-l border-border shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border shrink-0">
          <div className="flex flex-col gap-2 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded capitalize ${roleStyle}`}>
                {character.role}
              </span>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
                <span className="text-[11px] text-muted-foreground capitalize">{character.status}</span>
              </div>
            </div>
            <h2 className="text-base font-semibold leading-tight">{character.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground mt-0.5"
          >
            <X size={15} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-6">
          {/* Description */}
          {character.description && (
            <section>
              <p className="text-sm leading-relaxed text-foreground/90">{character.description}</p>
            </section>
          )}

          {/* Arc status */}
          {character.arc_status && (
            <section>
              <h3 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Arc
              </h3>
              <p className="text-sm text-foreground/80 italic">{character.arc_status}</p>
            </section>
          )}

          {/* Traits */}
          {traits.length > 0 && (
            <section>
              <h3 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Traits
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {traits.map((trait) => (
                  <span
                    key={trait}
                    className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground"
                  >
                    {trait}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Relationships */}
          {relationships.length > 0 && (
            <section>
              <h3 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Relationships
              </h3>
              <div className="flex flex-col gap-2">
                {relationships.map((rel, i) => (
                  <div key={i} className="flex flex-col gap-0.5">
                    <span className="text-xs font-medium text-foreground">{rel.character_name}</span>
                    <span className="text-xs text-muted-foreground leading-relaxed">{rel.description}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Notable moments */}
          {notable_moments.length > 0 && (
            <section>
              <h3 className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-2">
                Notable Moments
              </h3>
              <ul className="flex flex-col gap-2">
                {notable_moments.map((moment, i) => (
                  <li key={i} className="flex gap-2 text-sm text-foreground/80">
                    <span className="text-muted-foreground shrink-0 mt-0.5">·</span>
                    {moment}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </>
  )
}
