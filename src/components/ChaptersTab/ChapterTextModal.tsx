'use client'

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'

interface Props {
  chapterId: string | null
  chapterNumber: number
  chapterTitle: string
  bookId: string
  isMock: boolean
  onClose: () => void
}

export function ChapterTextModal({ chapterId, chapterNumber, chapterTitle, bookId, isMock, onClose }: Props) {
  const [content, setContent] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const open = chapterId !== null

  useEffect(() => {
    if (!open) { setContent(null); setError(null); return }
    if (isMock) { setContent(null); return }

    setLoading(true)
    setError(null)
    fetch(`/api/books/${bookId}/chapters/${chapterId}`)
      .then((r) => r.ok ? r.json() : Promise.reject(new Error('Failed to load')))
      .then((data: { content: string }) => setContent(data.content))
      .catch(() => setError('Could not load the chapter text.'))
      .finally(() => setLoading(false))
  }, [chapterId, bookId, isMock, open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-3xl max-h-[90vh] bg-card border border-border rounded-xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="shrink-0 flex items-start justify-between px-6 py-4 border-b border-border">
          <div>
            <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground/60 mb-0.5">
              Chapter {String(chapterNumber).padStart(2, '0')}
            </p>
            <h2
              className="text-lg text-foreground leading-tight"
              style={{ fontFamily: 'var(--font-playfair)' }}
            >
              {chapterTitle}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="ml-4 mt-0.5 shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-8 py-6">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <p className="text-sm text-muted-foreground">Loading…</p>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center py-16">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {isMock && !loading && (
            <div className="flex items-center justify-center py-16">
              <p className="text-sm text-muted-foreground italic">
                Full text is not available in demo mode.
              </p>
            </div>
          )}

          {!isMock && !loading && !error && content !== null && (
            <div
              className="text-sm text-foreground leading-[1.9] whitespace-pre-wrap"
              style={{ fontFamily: 'var(--font-playfair)', fontSize: '15px' }}
            >
              {content}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
