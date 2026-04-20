'use client'

import { MOCK_BOOK_ID } from '@/lib/mock-data'
import { formatRelativeDate } from '@/lib/utils'
import type { Book } from '@/types'
import { Camera, FileText, Trash2, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

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
  const router = useRouter()
  const isMock = book.id === MOCK_BOOK_ID

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [relativeDate, setRelativeDate] = useState('')
  const [coverImage, setCoverImage] = useState<string | null>(book.cover_image ?? null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [coverVersion, setCoverVersion] = useState(Date.now())

  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setRelativeDate(formatRelativeDate(book.updated_at))
  }, [book.updated_at])

  const gradient = GENRE_GRADIENTS[book.genre] ?? GENRE_GRADIENTS.Other
  const glyph = GENRE_GLYPHS[book.genre] ?? GENRE_GLYPHS.Other
  const href = `/books/${book.id}`

  // Navigate programmatically so action buttons can stopPropagation cleanly
  function navigateToBook() {
    router.push(href)
  }

  function stopAndRun(fn: () => void) {
    return (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      fn()
    }
  }

  function handleDelete(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (confirmDelete) {
      onDelete?.(book.id)
    } else {
      setConfirmDelete(true)
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    setUploading(true)
    setUploadError('')
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(`/api/books/${book.id}/cover`, { method: 'POST', body: fd })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Upload failed')
      }
      const { cover_image } = await res.json()
      setCoverImage(cover_image)
      setCoverVersion(Date.now())
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  async function removeCover() {
    await fetch(`/api/books/${book.id}/cover`, { method: 'DELETE' })
    setCoverImage(null)
  }

  return (
    <div
      className="group relative flex flex-col rounded-xl border border-border bg-card overflow-hidden hover:border-primary/40 transition-all duration-200 hover:shadow-[0_0_24px_rgba(120,80,40,0.1)] cursor-pointer"
      onMouseLeave={() => { setConfirmDelete(false); setUploadError('') }}
    >
      {/* ── Cover ── */}
      <div
        className={`relative h-32 flex items-center justify-center shrink-0 overflow-hidden ${
          coverImage ? 'bg-zinc-900' : `bg-gradient-to-br ${gradient}`
        }`}
        onClick={(e) => {
          // Don't navigate if a button or the file input triggered this click
          if ((e.target as HTMLElement).closest('button, input')) return
          navigateToBook()
        }}
      >
        {coverImage ? (
          <img
            src={`${coverImage}?v=${coverVersion}`}
            alt={book.title}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <>
            <span className="text-5xl opacity-20 select-none">{glyph}</span>
            <div className="absolute inset-0 bg-gradient-to-t from-card/60 to-transparent" />
          </>
        )}

        {/* Cover photo actions */}
        {!isMock && (
          <>
            <button
              onClick={stopAndRun(() => fileInputRef.current?.click())}
              disabled={uploading}
              title={coverImage ? 'Change cover photo' : 'Add cover photo'}
              className={`absolute bottom-2 left-2 flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium transition-all duration-150 ${
                uploading
                  ? 'bg-black/60 text-zinc-300 opacity-100 cursor-wait'
                  : 'bg-black/50 text-zinc-200 opacity-0 group-hover:opacity-100 hover:bg-black/70'
              }`}
            >
              <Camera size={11} />
              {uploading ? 'Uploading…' : coverImage ? 'Change' : 'Add cover'}
            </button>

            {coverImage && !uploading && (
              <button
                onClick={stopAndRun(removeCover)}
                title="Remove cover"
                className="absolute bottom-2 right-2 p-1 rounded bg-black/50 text-zinc-300 opacity-0 group-hover:opacity-100 hover:bg-black/70 transition-all duration-150"
              >
                <X size={11} />
              </button>
            )}
          </>
        )}

        {/* Delete book */}
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

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onClick={(e) => e.stopPropagation()}
          onChange={handleFileChange}
        />
      </div>

      {/* ── Body — keep as Link for right-click / open-in-tab ── */}
      <Link href={href} className="flex flex-col flex-1 p-4 gap-2">
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

        {uploadError && (
          <p className="text-[11px] text-destructive">{uploadError}</p>
        )}

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
      </Link>
    </div>
  )
}
