'use client'

import { formatRelativeDate } from '@/lib/utils'
import type { World } from '@/types'
import { Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

const GENRE_GRADIENTS: Record<string, string> = {
  Fantasy: 'from-violet-950 via-purple-900 to-indigo-950',
  'Science Fiction': 'from-blue-950 via-cyan-900 to-slate-950',
  'Historical Fiction': 'from-amber-950 via-yellow-900 to-stone-950',
  Horror: 'from-red-950 via-rose-950 to-zinc-950',
  Contemporary: 'from-emerald-950 via-teal-900 to-cyan-950',
  Mythology: 'from-orange-950 via-amber-900 to-yellow-950',
  Steampunk: 'from-yellow-950 via-orange-900 to-amber-950',
  'Post-Apocalyptic': 'from-zinc-800 via-stone-900 to-neutral-950',
  Thriller: 'from-slate-800 via-zinc-900 to-neutral-950',
  Other: 'from-zinc-800 via-zinc-900 to-zinc-950',
}

const GENRE_GLYPHS: Record<string, string> = {
  Fantasy: '᚛',
  'Science Fiction': '⬡',
  'Historical Fiction': '⌘',
  Horror: '☽',
  Contemporary: '◈',
  Mythology: '⊕',
  Steampunk: '⚙',
  'Post-Apocalyptic': '◬',
  Thriller: '◆',
  Other: '◇',
}

interface Props {
  world: World
  onDelete?: (id: string) => void
}

export function WorldCard({ world, onDelete }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const gradient = GENRE_GRADIENTS[world.genre] ?? GENRE_GRADIENTS.Other
  const glyph = GENRE_GLYPHS[world.genre] ?? GENRE_GLYPHS.Other

  function handleDelete(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (confirmDelete) {
      onDelete?.(world.id)
    } else {
      setConfirmDelete(true)
    }
  }

  return (
    <Link
      href={`/worlds/${world.id}`}
      className="group relative flex flex-col rounded-xl border border-border bg-card overflow-hidden hover:border-primary/40 transition-all duration-200 hover:shadow-[0_0_24px_rgba(245,158,11,0.08)]"
      onMouseLeave={() => setConfirmDelete(false)}
    >
      {/* Cover */}
      <div className={`relative h-36 bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0`}>
        <span className="text-5xl opacity-20 select-none">{glyph}</span>
        <div className="absolute inset-0 bg-gradient-to-t from-card/60 to-transparent" />

        {/* Delete button */}
        {onDelete && (
          <button
            onClick={handleDelete}
            className={`absolute top-3 right-3 p-1.5 rounded-md transition-all duration-150 ${
              confirmDelete
                ? 'bg-destructive text-destructive-foreground opacity-100'
                : 'bg-black/40 text-zinc-400 opacity-0 group-hover:opacity-100 hover:text-white'
            }`}
            title={confirmDelete ? 'Click again to confirm' : 'Delete world'}
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 p-4 gap-2">
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-semibold text-base leading-tight text-foreground group-hover:text-primary transition-colors line-clamp-1">
            {world.name}
          </h2>
          <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-sm bg-muted text-muted-foreground uppercase tracking-wider">
            {world.genre}
          </span>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 flex-1">
          {world.description ?? world.premise ?? 'No description yet.'}
        </p>

        <p className="text-[11px] text-muted-foreground/60 mt-auto pt-2 border-t border-border">
          Updated {formatRelativeDate(world.updatedAt)}
        </p>
      </div>
    </Link>
  )
}
