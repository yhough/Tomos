'use client'

import type { CharacterFull } from '@/components/CharacterDetailSlideOver'

const ROLE_STYLES: Record<string, string> = {
  protagonist: 'text-blue-700 bg-blue-100 border-blue-200',
  antagonist:  'text-red-700 bg-red-100 border-red-200',
  supporting:  'text-amber-700 bg-amber-100 border-amber-200',
  minor:       'text-zinc-600 bg-zinc-100 border-zinc-200',
}

const STATUS_DOT: Record<string, string> = {
  alive:     'bg-green-400',
  dead:      'bg-zinc-400',
  unknown:   'bg-amber-400',
  ambiguous: 'bg-amber-400',
}

interface Props {
  character: CharacterFull
  onClick: () => void
  onMouseEnter?: () => void
  onMouseLeave?: () => void
  highlighted?: boolean
}

export function CharacterCard({ character, onClick, onMouseEnter, onMouseLeave, highlighted }: Props) {
  let traits: string[] = []
  try {
    const d = JSON.parse(character.data)
    traits = d.traits ?? []
  } catch { /* ok */ }

  const roleStyle = ROLE_STYLES[character.role] ?? ROLE_STYLES.minor
  const statusDot = STATUS_DOT[character.status] ?? 'bg-amber-400'

  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`text-left w-full rounded-xl border bg-card hover:border-amber-300/60 hover:bg-amber-50/40 transition-all duration-150 p-5 flex flex-col gap-3 group ${
        highlighted ? 'border-amber-400/70 bg-amber-50/30 shadow-sm' : 'border-border'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-col gap-1.5 min-w-0">
          <h3 className="text-sm font-semibold leading-tight truncate group-hover:text-amber-900 transition-colors">
            {character.name}
          </h3>
          <span className={`self-start text-[10px] font-medium px-1.5 py-0.5 rounded border capitalize ${roleStyle}`}>
            {character.role}
          </span>
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
          <span className={`w-1.5 h-1.5 rounded-full ${statusDot}`} />
          <span className="text-[10px] text-muted-foreground capitalize">{character.status}</span>
        </div>
      </div>

      {/* Description */}
      {character.description && (
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
          {character.description}
        </p>
      )}

      {/* Traits */}
      {traits.length > 0 && (
        <div className="flex flex-wrap gap-1 pt-1">
          {traits.slice(0, 4).map((trait) => (
            <span
              key={trait}
              className="text-[10px] px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground"
            >
              {trait}
            </span>
          ))}
          {traits.length > 4 && (
            <span className="text-[10px] px-1.5 py-0.5 text-muted-foreground/60">
              +{traits.length - 4} more
            </span>
          )}
        </div>
      )}

      {/* Arc status */}
      {character.arc_status && (
        <p className="text-[10px] text-muted-foreground/60 italic leading-snug border-t border-border pt-2">
          Arc: {character.arc_status}
        </p>
      )}
    </button>
  )
}
