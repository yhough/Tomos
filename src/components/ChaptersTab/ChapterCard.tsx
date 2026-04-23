'use client'

import { mockChapters, MOCK_BOOK_ID } from '@/lib/mock-data'
import { AlertTriangle, Edit3, Info, PenLine, ScrollText, Trash2, Upload, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { ChapterTextModal } from './ChapterTextModal'

type Chapter = typeof mockChapters[0]

interface Annotation {
  id: string
  text: string
  created_at: number
}

interface Props {
  chapter: Chapter
  bookId: string
  isExpanded: boolean
  onToggle: () => void
  onResolveViaChat?: (message: string, flagId: string) => void
  onRequestUpload?: (number: number, title: string) => void
  onDeleted?: (chapterId: string) => void
  onNumberChanged?: (chapterId: string, newNumber: number) => void
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
}

function formatAnnotationTime(ts: number) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(new Date(ts))
}

function formatNumber(n: number) {
  return n.toLocaleString('en-US')
}

function formatCorrectionTime(iso: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(new Date(iso))
}

const btn: React.CSSProperties = {
  backgroundColor: 'hsl(var(--grimm-surface-raised))',
  color: 'hsl(var(--grimm-muted))',
  border: '0.5px solid hsl(var(--grimm-border))',
  padding: '6px 14px',
  borderRadius: 6,
  fontSize: 12,
  cursor: 'pointer',
}

function StatusBadge({ chapter }: { chapter: Chapter }) {
  const ch = chapter as Chapter & { processingError?: string | null }
  if (ch.processingError) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, backgroundColor: 'hsl(var(--grimm-danger) / 0.12)', color: 'hsl(var(--grimm-danger))', fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 500 }}>
        <AlertTriangle size={12} /> Analysis failed
      </span>
    )
  }
  if (!chapter.processed) {
    return (
      <span style={{ backgroundColor: 'hsl(var(--grimm-surface-raised))', color: 'hsl(var(--grimm-muted))', fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 500 }}>
        Unprocessed
      </span>
    )
  }
  const unresolvedFlags = chapter.flags.filter((f) => !f.resolved)
  const errors = unresolvedFlags.filter((f) => f.severity === 'error')
  const warnings = unresolvedFlags.filter((f) => f.severity === 'warning')
  if (errors.length > 0) {
    const total = errors.length + warnings.length
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, backgroundColor: 'hsl(var(--grimm-danger) / 0.12)', color: 'hsl(var(--grimm-danger))', fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 500 }}>
        <AlertTriangle size={12} />{total} {total === 1 ? 'issue' : 'issues'}
      </span>
    )
  }
  if (warnings.length > 0) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, backgroundColor: 'hsl(var(--grimm-accent) / 0.12)', color: 'hsl(var(--grimm-accent))', fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 500 }}>
        <AlertTriangle size={12} />{warnings.length} {warnings.length === 1 ? 'warning' : 'warnings'}
      </span>
    )
  }
  return (
    <span style={{ backgroundColor: 'hsl(var(--grimm-success))', color: 'hsl(var(--grimm-success-text))', fontSize: 11, padding: '2px 8px', borderRadius: 20, fontWeight: 500 }}>
      Clean
    </span>
  )
}

export function ChapterCard({ chapter, bookId, isExpanded, onToggle, onResolveViaChat, onRequestUpload, onDeleted, onNumberChanged }: Props) {
  const isMock = bookId === MOCK_BOOK_ID
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [addingNote, setAddingNote] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [saving, setSaving] = useState(false)
  const [showAllNotes, setShowAllNotes] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [editingNumber, setEditingNumber] = useState(false)
  const [numberDraft, setNumberDraft] = useState('')
  const [textModalOpen, setTextModalOpen] = useState(false)
  const numberInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const unresolvedFlags = chapter.flags.filter((f) => !f.resolved)
  const correctionNotes = chapter.correctionNotes ?? []

  // Fetch annotations when card first expands (real books only)
  useEffect(() => {
    if (!isExpanded || isMock) return
    fetch(`/api/books/${bookId}/chapters/${chapter.id}/annotations`)
      .then((r) => r.ok ? r.json() : [])
      .then(setAnnotations)
      .catch(() => {})
  }, [isExpanded, isMock, bookId, chapter.id])

  // Focus textarea when add-note form opens
  useEffect(() => {
    if (addingNote) setTimeout(() => textareaRef.current?.focus(), 50)
  }, [addingNote])

  async function saveNote() {
    const text = noteText.trim()
    if (!text) return
    setSaving(true)

    if (isMock) {
      const ann: Annotation = { id: `local-${Date.now()}`, text, created_at: Date.now() }
      setAnnotations((prev) => [...prev, ann])
    } else {
      try {
        const res = await fetch(`/api/books/${bookId}/chapters/${chapter.id}/annotations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        })
        if (res.ok) {
          const ann = await res.json() as Annotation
          setAnnotations((prev) => [...prev, ann])
        }
      } catch { /* silent */ }
    }

    setNoteText('')
    setAddingNote(false)
    setSaving(false)
  }

  async function deleteNote(id: string) {
    if (isMock) {
      setAnnotations((prev) => prev.filter((a) => a.id !== id))
      return
    }
    try {
      await fetch(`/api/books/${bookId}/chapters/${chapter.id}/annotations/${id}`, { method: 'DELETE' })
      setAnnotations((prev) => prev.filter((a) => a.id !== id))
    } catch { /* silent */ }
  }

  async function handleDelete() {
    if (isMock) { setConfirmDelete(false); return }
    setDeleting(true)
    try {
      await fetch(`/api/books/${bookId}/chapters/${chapter.id}`, { method: 'DELETE' })
      onDeleted?.(chapter.id)
    } catch { /* silent */ } finally {
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  function startEditNumber(e: React.MouseEvent) {
    e.stopPropagation()
    if (isMock) return
    setNumberDraft(String(chapter.number))
    setEditingNumber(true)
    setTimeout(() => { numberInputRef.current?.select() }, 30)
  }

  async function saveNumber() {
    const n = parseInt(numberDraft, 10)
    if (!n || n < 1 || n === chapter.number) { setEditingNumber(false); return }
    setEditingNumber(false)
    try {
      await fetch(`/api/books/${bookId}/chapters/${chapter.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ number: n }),
      })
      onNumberChanged?.(chapter.id, n)
    } catch { /* silent */ }
  }

  const showNotesSection = annotations.length > 0 || addingNote

  if (confirmDelete) {
    return (
      <div style={{ backgroundColor: 'hsl(var(--grimm-surface))', border: '0.5px solid hsl(var(--grimm-border))', borderRadius: 10, padding: '24px 32px', textAlign: 'center' }}>
        <p style={{ color: 'hsl(var(--grimm-text))', fontSize: 14, fontWeight: 500, marginBottom: 6 }}>
          Delete &ldquo;{chapter.title}&rdquo;?
        </p>
        <p style={{ color: 'hsl(var(--grimm-muted))', fontSize: 12, marginBottom: 16, lineHeight: 1.5 }}>
          This will remove the chapter and shift subsequent chapter numbers down.
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button
            onClick={() => setConfirmDelete(false)}
            disabled={deleting}
            style={{ backgroundColor: 'hsl(var(--grimm-surface-raised))', color: 'hsl(var(--grimm-muted))', border: '0.5px solid hsl(var(--grimm-border))', padding: '6px 16px', borderRadius: 6, fontSize: 12, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}
          >
            <X size={11} /> Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            style={{ backgroundColor: 'hsl(var(--grimm-danger))', color: '#fff', border: 'none', padding: '6px 16px', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: deleting ? 'not-allowed' : 'pointer', opacity: deleting ? 0.7 : 1, display: 'inline-flex', alignItems: 'center', gap: 5 }}
          >
            <Trash2 size={11} /> {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{ backgroundColor: 'hsl(var(--grimm-surface))', border: '0.5px solid hsl(var(--grimm-border))', borderRadius: 10, overflow: 'hidden' }}>

      {/* ── Header ── */}
      <div
        role="button" tabIndex={0}
        onClick={onToggle} onKeyDown={(e) => e.key === 'Enter' && onToggle()}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', cursor: 'pointer', borderRadius: isExpanded ? '10px 10px 0 0' : 10, transition: 'background-color 150ms ease' }}
        className="hover:bg-grimm-surface-raised"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {editingNumber ? (
            <input
              ref={numberInputRef}
              type="number"
              min={1}
              value={numberDraft}
              onChange={(e) => setNumberDraft(e.target.value)}
              onBlur={saveNumber}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveNumber()
                if (e.key === 'Escape') setEditingNumber(false)
                e.stopPropagation()
              }}
              onClick={(e) => e.stopPropagation()}
              style={{ width: 52, backgroundColor: 'hsl(var(--grimm-surface))', border: '1px solid hsl(var(--grimm-accent))', color: 'hsl(var(--grimm-text))', fontSize: 11, fontWeight: 500, padding: '2px 6px', borderRadius: 4, outline: 'none', flexShrink: 0 }}
            />
          ) : (
            <span
              onClick={startEditNumber}
              title={isMock ? undefined : 'Click to edit chapter number'}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, backgroundColor: 'hsl(var(--grimm-surface-raised))', color: 'hsl(var(--grimm-muted))', fontSize: 11, fontWeight: 500, padding: '3px 8px', borderRadius: 4, flexShrink: 0, cursor: isMock ? 'default' : 'text', userSelect: 'none' }}
            >
              Ch. {String(chapter.number).padStart(2, '0')}
            </span>
          )}
          <span style={{ color: 'hsl(var(--grimm-text))', fontSize: 15, fontFamily: 'var(--font-playfair)' }}>
            {chapter.title}
          </span>
          {chapter.wordCount > 0 && (
            <span style={{ color: 'hsl(var(--grimm-muted))', fontSize: 12 }}>
              {formatNumber(chapter.wordCount)} words
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <StatusBadge chapter={chapter} />
          <Info
            size={14}
            style={{ color: isExpanded ? 'hsl(var(--grimm-muted))' : 'transparent', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 200ms ease' }}
          />
          {!isMock && (
            <button
              onClick={(e) => { e.stopPropagation(); setConfirmDelete(true) }}
              title="Delete chapter"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', color: 'hsl(var(--grimm-muted))', display: 'flex', alignItems: 'center', borderRadius: 4, opacity: 0.5, transition: 'opacity 150ms ease, color 150ms ease' }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = 'hsl(var(--grimm-danger))' }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.5'; e.currentTarget.style.color = 'hsl(var(--grimm-muted))' }}
            >
              <Trash2 size={13} />
            </button>
          )}
          <svg
            width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
            style={{ color: 'hsl(var(--grimm-muted))', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 200ms ease', flexShrink: 0 }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      {/* ── Expandable content ── */}
      <div style={{ maxHeight: isExpanded ? 3000 : 0, overflow: 'hidden', transition: 'max-height 350ms ease' }}>
        <div style={{ opacity: isExpanded ? 1 : 0, transform: isExpanded ? 'translateY(0)' : 'translateY(4px)', transition: isExpanded ? 'opacity 200ms ease 50ms, transform 200ms ease 50ms' : 'none' }}>
          <div style={{ height: '0.5px', backgroundColor: 'hsl(var(--grimm-border))' }} />

          {chapter.processed ? (
            <>
              {/* Summary */}
              <div style={{ padding: '16px 20px' }}>
                <p style={{ color: 'hsl(var(--grimm-muted))', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Summary</p>
                <p style={{ color: 'hsl(var(--grimm-text))', fontSize: 14, lineHeight: 1.8 }}>{chapter.summary}</p>
              </div>

              {/* Characters */}
              {chapter.charactersAppearing.length > 0 && (
                <div style={{ padding: '0 20px 16px' }}>
                  <p style={{ color: 'hsl(var(--grimm-muted))', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Characters in this chapter
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                    {chapter.charactersAppearing.map((name) => (
                      <span key={name} style={{ backgroundColor: 'hsl(var(--grimm-surface-raised))', color: 'hsl(var(--grimm-muted))', fontSize: 12, padding: '4px 10px', borderRadius: 20, border: '0.5px solid hsl(var(--grimm-border))' }}>
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Correction notes */}
              {correctionNotes.length > 0 && (
                <div style={{ padding: '0 20px 16px', borderTop: '0.5px solid hsl(var(--grimm-border))', paddingTop: 14 }}>
                  <p style={{ color: 'hsl(var(--grimm-muted))', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                    Corrections applied
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {(showAllNotes ? correctionNotes : correctionNotes.slice(0, 3)).map((note) => (
                      <div
                        key={note.id}
                        style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, minWidth: 0 }}>
                          <Edit3 size={11} style={{ color: 'hsl(var(--grimm-muted))', flexShrink: 0, marginTop: 2 }} />
                          <span style={{ color: 'hsl(var(--grimm-muted))', fontSize: 12, lineHeight: 1.5 }}>
                            {note.summary}
                          </span>
                        </div>
                        <span style={{ color: 'hsl(var(--grimm-muted))', fontSize: 11, flexShrink: 0, opacity: 0.7 }}>
                          {formatCorrectionTime(note.appliedAt)}
                        </span>
                      </div>
                    ))}
                    {correctionNotes.length > 3 && !showAllNotes && (
                      <button
                        onClick={() => setShowAllNotes(true)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--grimm-accent))', fontSize: 12, padding: 0, textAlign: 'left' }}
                      >
                        Show all {correctionNotes.length} corrections
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Flags — unresolved only */}
              {unresolvedFlags.length > 0 && (
                <div style={{ padding: '0 20px 20px' }}>
                  <p style={{ color: 'hsl(var(--grimm-muted))', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                    Flags
                  </p>
                  {unresolvedFlags.map((flag) => {
                    const cat = (flag as { category?: string }).category ?? 'continuity'
                    const isError = flag.severity === 'error'

                    const flagStyle = (() => {
                      if (cat === 'duplicate') return {
                        bg: 'hsl(var(--grimm-warn-duplicate) / 0.12)',
                        border: 'hsl(var(--grimm-warn-duplicate))',
                        color: 'hsl(var(--grimm-warn-duplicate))',
                        label: isError ? 'Duplicate chapter' : 'Repeated content',
                        icon: <AlertTriangle size={12} style={{ color: 'hsl(var(--grimm-warn-duplicate))', flexShrink: 0 }} />,
                      }
                      if (cat === 'character') return {
                        bg: 'hsl(var(--grimm-warn-char) / 0.12)',
                        border: 'hsl(var(--grimm-warn-char))',
                        color: 'hsl(var(--grimm-warn-char))',
                        label: 'Character inconsistency',
                        icon: <AlertTriangle size={12} style={{ color: 'hsl(var(--grimm-warn-char))', flexShrink: 0 }} />,
                      }
                      if (cat === 'narrative') return {
                        bg: 'hsl(var(--grimm-warn-narrative) / 0.12)',
                        border: 'hsl(var(--grimm-warn-narrative))',
                        color: 'hsl(var(--grimm-warn-narrative))',
                        label: 'Narrative gap',
                        icon: <Info size={12} style={{ color: 'hsl(var(--grimm-warn-narrative))', flexShrink: 0 }} />,
                      }
                      // continuity (default)
                      if (isError) return {
                        bg: 'hsl(var(--grimm-danger) / 0.1)',
                        border: 'hsl(var(--grimm-danger))',
                        color: 'hsl(var(--grimm-danger))',
                        label: 'Continuity error',
                        icon: <AlertTriangle size={12} style={{ color: 'hsl(var(--grimm-danger))', flexShrink: 0 }} />,
                      }
                      return {
                        bg: 'hsl(var(--grimm-accent) / 0.1)',
                        border: 'hsl(var(--grimm-accent))',
                        color: 'hsl(var(--grimm-accent))',
                        label: 'Worth checking',
                        icon: <Info size={12} style={{ color: 'hsl(var(--grimm-accent))', flexShrink: 0 }} />,
                      }
                    })()

                    return (
                      <div key={flag.id} style={{ backgroundColor: flagStyle.bg, borderLeft: `3px solid ${flagStyle.border}`, borderRadius: '0 6px 6px 0', padding: '10px 14px', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {flagStyle.icon}
                          <span style={{ color: flagStyle.color, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 500 }}>
                            {flagStyle.label}
                          </span>
                        </div>
                        <p style={{ color: 'hsl(var(--grimm-text))', fontSize: 13, lineHeight: 1.6, marginTop: 6 }}>
                          {flag.description}
                        </p>
                        {onResolveViaChat && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              const summaryLine = chapter.summary
                                ? `\n\nThe chapter summary reads: "${chapter.summary}"`
                                : ''
                              const message =
                                `In Chapter ${chapter.number} — "${chapter.title}" — there is a ${flagStyle.label.toLowerCase()}:\n\n"${flag.description}"${summaryLine}\n\nHow should I correct this?`
                              onResolveViaChat(message, flag.id)
                            }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--grimm-accent))', fontSize: 12, padding: '4px 0 0', display: 'inline-flex', alignItems: 'center', gap: 3 }}
                          >
                            Resolve via chat →
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          ) : (() => {
            const processingError = (chapter as Chapter & { processingError?: string | null }).processingError
            if (processingError) {
              return (
                /* Analysis failed */
                <div style={{ padding: '24px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <AlertTriangle size={32} style={{ color: 'hsl(var(--grimm-danger))' }} />
                  <p style={{ color: 'hsl(var(--grimm-text))', fontSize: 14, marginTop: 12, fontWeight: 500 }}>
                    Analysis failed
                  </p>
                  <p style={{ color: 'hsl(var(--grimm-muted))', fontSize: 13, marginTop: 6, maxWidth: 400, lineHeight: 1.5 }}>
                    {processingError}
                  </p>
                  <button
                    onClick={() => onRequestUpload?.(chapter.number, chapter.title)}
                    style={{ backgroundColor: 'hsl(var(--grimm-accent))', color: 'hsl(var(--background))', padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 500, marginTop: 16, border: 'none', cursor: 'pointer' }}
                  >
                    Try again
                  </button>
                </div>
              )
            }
            return (
              /* Unprocessed */
              <div style={{ padding: '24px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Upload size={32} style={{ color: 'hsl(var(--grimm-muted))' }} />
                <p style={{ color: 'hsl(var(--grimm-text))', fontSize: 14, marginTop: 12 }}>
                  This chapter hasn&apos;t been analyzed yet
                </p>
                <p style={{ color: 'hsl(var(--grimm-muted))', fontSize: 13, marginTop: 6, maxWidth: 360, lineHeight: 1.5 }}>
                  Upload the text to extract characters, check continuity, and update your world.
                </p>
                <button
                  onClick={() => onRequestUpload?.(chapter.number, chapter.title)}
                  style={{ backgroundColor: 'hsl(var(--grimm-accent))', color: 'hsl(var(--background))', padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 500, marginTop: 16, border: 'none', cursor: 'pointer' }}
                >
                  Analyze now
                </button>
              </div>
            )
          })()}

          {/* ── Notes section ── */}
          {showNotesSection && (
            <div style={{ padding: '0 20px 16px', borderTop: annotations.length > 0 || addingNote ? '0.5px solid hsl(var(--grimm-border))' : 'none', paddingTop: 16 }}>
              {annotations.length > 0 && (
                <>
                  <p style={{ color: 'hsl(var(--grimm-muted))', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                    Notes
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: addingNote ? 12 : 0 }}>
                    {annotations.map((ann) => (
                      <div
                        key={ann.id}
                        style={{ backgroundColor: 'hsl(var(--grimm-surface-raised))', border: '0.5px solid hsl(var(--grimm-border))', borderRadius: 6, padding: '10px 12px' }}
                      >
                        <p style={{ color: 'hsl(var(--grimm-text))', fontSize: 13, lineHeight: 1.6, marginBottom: 6 }}>
                          {ann.text}
                        </p>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ color: 'hsl(var(--grimm-muted))', fontSize: 11 }}>
                            {formatAnnotationTime(ann.created_at)}
                          </span>
                          <button
                            onClick={() => deleteNote(ann.id)}
                            title="Delete note"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', color: 'hsl(var(--grimm-muted))', display: 'flex', alignItems: 'center', borderRadius: 4, transition: 'color 150ms ease' }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = 'hsl(var(--grimm-danger))')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = 'hsl(var(--grimm-muted))')}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Inline add-note form */}
              {addingNote && (
                <div>
                  {annotations.length === 0 && (
                    <p style={{ color: 'hsl(var(--grimm-muted))', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                      Notes
                    </p>
                  )}
                  <textarea
                    ref={textareaRef}
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Write a note about this chapter..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) saveNote()
                      if (e.key === 'Escape') { setAddingNote(false); setNoteText('') }
                    }}
                    style={{ width: '100%', minHeight: 80, backgroundColor: 'hsl(var(--grimm-surface))', border: '0.5px solid hsl(var(--grimm-border))', borderRadius: 6, padding: '10px 12px', fontSize: 13, color: 'hsl(var(--grimm-text))', resize: 'vertical', outline: 'none', fontFamily: 'inherit', lineHeight: 1.6, boxSizing: 'border-box' }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                    <button
                      onClick={() => { setAddingNote(false); setNoteText('') }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'hsl(var(--grimm-muted))', fontSize: 12, padding: '4px 8px' }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveNote}
                      disabled={!noteText.trim() || saving}
                      style={{ backgroundColor: noteText.trim() ? 'hsl(var(--grimm-accent))' : 'hsl(var(--grimm-surface-raised))', color: noteText.trim() ? '#1a0e00' : 'hsl(var(--grimm-muted))', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 500, cursor: noteText.trim() ? 'pointer' : 'default', transition: 'background-color 150ms ease' }}
                    >
                      {saving ? 'Saving…' : 'Save note'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Action row ── */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px 16px', borderTop: '0.5px solid hsl(var(--grimm-border))' }}>
            <span style={{ color: 'hsl(var(--grimm-muted))', fontSize: 12 }}>
              {chapter.processed ? `Uploaded ${formatDate(chapter.createdAt)}` : 'Not yet analyzed'}
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              {chapter.processed && (
                <button
                  onClick={(e) => { e.stopPropagation(); setTextModalOpen(true) }}
                  style={{ ...btn, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'hsl(var(--grimm-text))')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'hsl(var(--grimm-muted))')}
                >
                  <ScrollText size={11} />
                  View text
                </button>
              )}
              <button
                onClick={() => { setAddingNote(true) }}
                style={{ ...btn, display: 'inline-flex', alignItems: 'center', gap: 5 }}
                onMouseEnter={(e) => (e.currentTarget.style.color = 'hsl(var(--grimm-text))')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'hsl(var(--grimm-muted))')}
              >
                <PenLine size={11} />
                Add note
              </button>
              {chapter.processed && (
                <button
                  onClick={() => onRequestUpload?.(chapter.number, chapter.title)}
                  style={btn}
                  onMouseEnter={(e) => (e.currentTarget.style.color = 'hsl(var(--grimm-text))')}
                  onMouseLeave={(e) => (e.currentTarget.style.color = 'hsl(var(--grimm-muted))')}
                >
                  Re-upload
                </button>
              )}
            </div>
          </div>

        </div>
      </div>

      <ChapterTextModal
        chapterId={textModalOpen ? chapter.id : null}
        chapterNumber={chapter.number}
        chapterTitle={chapter.title}
        bookId={bookId}
        isMock={isMock}
        onClose={() => setTextModalOpen(false)}
      />
    </div>
  )
}
