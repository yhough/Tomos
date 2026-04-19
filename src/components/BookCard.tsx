'use client'

import { formatRelativeDate } from '@/lib/utils'
import type { Book } from '@/types'
import { FileText, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'

const GENRE_GRADIENTS: Record<string, string> = {
  Fantasy: 'from-violet-950 via-purple-900 to-indigo-950',
  'Science Fiction': 'from-blue-950 via-cyan-900 to-slate-950',
  'Literary Fiction': 'from-stone-800 via-neutral-800 to-zinc-900',
  Thriller: 'from-slate-800 via-zinc-900 to-neutral-950',
  Romance: 'from-rose-950 via-pink-900 to-fuchsia-950',
  Horror: 'from-red-950 via-rose-950 to-zinc-950',
  'Historical Fiction': 'from-amber-950 via-yellow-900 to-stone-950',
  Mystery: 'from-indigo-950 via-slate-900 to-zinc-950',
  'Contemporary Fiction': 'from-emerald-950 via-teal-900 to-cyan-950',
  Screenplay: 'from-zinc-700 via-zinc-800 to-zinc-950',
  Other: 'from-zinc-800 via-zinc-900 to-zinc-950',
}

const GENRE_GLYPHS: Record<string, string> = {
  Fantasy: '᚛',
  'Science Fiction': '⬡',
  'Literary Fiction': '§',
  Thriller: '◆',
  Romance: '❧',
  Horror: '☽',
  'Historical Fiction': '⌘',
  Mystery: '◎',
  'Contemporary Fiction': '◈',
  Screenplay: '▶',
  Other: '◇',
}

interface Props {
  book: Book
  onDelete?: (id: string) => void
}

export function BookCard({ book, onDelete }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [relativeDate, setRelativeDate] = useState('')

  useEffect(() => {
    setRelativeDate(formatRelativeDate(book.updated_at))
  }, [book.updated_at])

  const gradient = GENRE_GRADIENTS[book.genre] ?? GENRE_GRADIENTS.Other
  const glyph = GENRE_GLYPHS[book.genre] ?? GENRE_GLYPHS.Other

  function handleDelete(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (confirmDelete) {
      onDelete?.(book.id)
    } else {
      setConfirmDelete(true)
    }
  }

  return (
    <Link
      href={`/books/${book.id}`}
      className="group relative flex flex-col rounded-xl border border-border bg-card overflow-hidden hover:border-primary/40 transition-all duration-200 hover:shadow-[0_0_24px_rgba(120,80,40,0.1)]"
      onMouseLeave={() => setConfirmDelete(false)}
    >
      {/* Cover */}
      <div className={`relative h-32 bg-gradient-to-br ${gradient} flex items-center justify-center shrink-0`}>
        <span className="text-5xl opacity-20 select-none">{glyph}</span>
        <div className="absolute inset-0 bg-gradient-to-t from-card/60 to-transparent" />

        {onDelete && (
          <button
            onClick={handleDelete}
            className={`absolute top-3 right-3 p-1.5 rounded-md transition-all duration-150 ${
              confirmDelete
                ? 'bg-red-700 text-white opacity-100'
                : 'bg-black/40 text-zinc-400 opacity-0 group-hover:opacity-100 hover:text-white'
            }`}
            title={confirmDelete ? 'Click again to confirm' : 'Delete book'}
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 p-4 gap-2">
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-semibold text-base leading-tight text-foreground group-hover:text-primary transition-colors line-clamp-1">
            {book.title}
          </h2>
          <span className="shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-sm bg-muted text-muted-foreground uppercase tracking-wider">
            {book.genre}
          </span>
        </div>

        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3 flex-1">
          {book.logline ?? book.premise ?? 'No description yet.'}
        </p>

        <div className="flex items-center justify-between mt-auto pt-2 border-t border-border">
          {book.word_count > 0 ? (
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground/60">
              <FileText size={10} />
              {book.word_count.toLocaleString()} words
            </span>
          ) : (
            <span />
          )}
          <span className="text-[11px] text-muted-foreground/60">
            {relativeDate ? `Updated ${relativeDate}` : ''}
          </span>
        </div>
      </div>
    </Link>
  )
}
