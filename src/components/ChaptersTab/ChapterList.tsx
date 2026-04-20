'use client'

import { mockChapters } from '@/lib/mock-data'
import { BookOpen } from 'lucide-react'
import { ChapterCard } from './ChapterCard'

type Chapter = typeof mockChapters[0]
type SortBy = 'order' | 'recent'

interface Props {
  chapters: Chapter[]
  bookId: string
  expandedChapterId: string | null
  onToggleChapter: (id: string) => void
  sortBy: SortBy
  onSortChange: (value: SortBy) => void
  onResolveViaChat?: (chapterNumber: number, flagDescription: string) => void
}

export function ChapterList({
  chapters,
  bookId,
  expandedChapterId,
  onToggleChapter,
  sortBy,
  onSortChange,
  onResolveViaChat,
}: Props) {
  const processedCount = chapters.filter((c) => c.processed).length

  if (chapters.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 24px',
          textAlign: 'center',
        }}
      >
        <BookOpen size={48} style={{ color: 'hsl(var(--grimm-muted))' }} />
        <p
          style={{
            fontFamily: 'var(--font-playfair)',
            fontSize: 20,
            color: 'hsl(var(--grimm-text))',
            marginTop: 16,
          }}
        >
          No chapters yet
        </p>
        <p
          style={{
            color: 'hsl(var(--grimm-muted))',
            fontSize: 14,
            marginTop: 8,
            maxWidth: 320,
            lineHeight: 1.5,
          }}
        >
          Upload your first chapter to begin building your story&apos;s history.
        </p>
        <button
          onClick={() => console.log('Upload chapter')}
          style={{
            backgroundColor: 'hsl(var(--grimm-accent))',
            color: '#1a0e00',
            padding: '8px 18px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
            marginTop: 20,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Upload chapter
        </button>
      </div>
    )
  }

  return (
    <div>
      {/* Header row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <span style={{ color: 'hsl(var(--grimm-muted))', fontSize: 13 }}>
          {processedCount} of {chapters.length} chapters processed
        </span>

        <select
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as SortBy)}
          style={{
            backgroundColor: 'hsl(var(--grimm-surface-raised))',
            color: 'hsl(var(--grimm-text))',
            border: '0.5px solid hsl(var(--grimm-border))',
            borderRadius: 6,
            padding: '5px 10px',
            fontSize: 12,
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          <option value="order">Chapter order</option>
          <option value="recent">Most recent</option>
        </select>
      </div>

      {/* Chapter cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {chapters.map((chapter) => (
          <ChapterCard
            key={chapter.id}
            chapter={chapter}
            bookId={bookId}
            isExpanded={expandedChapterId === chapter.id}
            onToggle={() => onToggleChapter(chapter.id)}
            onResolveViaChat={onResolveViaChat}
          />
        ))}
      </div>
    </div>
  )
}
