import { db } from '@/db'
import { NextResponse } from 'next/server'

// ── GET /api/books/[id]/chapters/[chapterId] ──────────────────────────────────

export async function GET(
  _req: Request,
  { params }: { params: { id: string; chapterId: string } }
) {
  const chapter = db
    .prepare('SELECT id, number, title, content, word_count, summary FROM chapters WHERE id = ? AND book_id = ?')
    .get(params.chapterId, params.id) as {
      id: string; number: number; title: string; content: string; word_count: number; summary: string | null
    } | undefined

  if (!chapter) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(chapter)
}

// ── PATCH /api/books/[id]/chapters/[chapterId] ────────────────────────────────
// Updates the chapter number. If another chapter holds that number, they swap.

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; chapterId: string } }
) {
  const { number: newNumber } = await req.json() as { number: number }

  if (!Number.isInteger(newNumber) || newNumber < 1) {
    return NextResponse.json({ error: 'Invalid chapter number' }, { status: 400 })
  }

  const chapter = db
    .prepare('SELECT id, number FROM chapters WHERE id = ? AND book_id = ?')
    .get(params.chapterId, params.id) as { id: string; number: number } | undefined

  if (!chapter) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (chapter.number === newNumber) return NextResponse.json({ ok: true })

  const conflict = db
    .prepare('SELECT id FROM chapters WHERE book_id = ? AND number = ?')
    .get(params.id, newNumber) as { id: string } | undefined

  db.transaction(() => {
    if (conflict) {
      // Swap: give the conflicting chapter the old number
      db.prepare('UPDATE chapters SET number = ? WHERE id = ?').run(chapter.number, conflict.id)
    }
    db.prepare('UPDATE chapters SET number = ? WHERE id = ?').run(newNumber, params.chapterId)
    db.prepare('UPDATE books SET updated_at = ? WHERE id = ?').run(Date.now(), params.id)
  })()

  return NextResponse.json({ ok: true })
}

// ── DELETE /api/books/[id]/chapters/[chapterId] ───────────────────────────────
// Deletes the chapter and all data sourced from it:
//   - timeline events, world-state entries, continuity flags, annotations (cascade)
//   - characters that only appeared in this chapter

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; chapterId: string } }
) {
  const chapter = db
    .prepare('SELECT id, number, characters_appearing FROM chapters WHERE id = ? AND book_id = ?')
    .get(params.chapterId, params.id) as {
      id: string; number: number; characters_appearing: string
    } | undefined

  if (!chapter) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Parse character names that appeared in this chapter
  let chapterCharNames: string[] = []
  try { chapterCharNames = JSON.parse(chapter.characters_appearing) } catch { /* ok */ }

  // Build the set of character names that appear in at least one other chapter
  const otherChapters = db
    .prepare('SELECT characters_appearing FROM chapters WHERE book_id = ? AND id != ?')
    .all(params.id, params.chapterId) as Array<{ characters_appearing: string }>

  const namesElsewhere = new Set<string>()
  for (const ch of otherChapters) {
    try {
      const names = JSON.parse(ch.characters_appearing) as string[]
      for (const n of names) namesElsewhere.add(n)
    } catch { /* ok */ }
  }

  db.transaction(() => {
    // 1. Delete timeline events sourced from this chapter
    db.prepare(
      `DELETE FROM timeline_events WHERE source = 'chapter' AND source_id = ?`
    ).run(params.chapterId)

    // 2. Delete world-state entries sourced from this chapter
    db.prepare(
      `DELETE FROM book_state_entries WHERE source = 'chapter' AND source_id = ?`
    ).run(params.chapterId)

    // 3. Delete characters that only appeared in this chapter
    for (const name of chapterCharNames) {
      if (namesElsewhere.has(name)) continue
      db.prepare(
        'DELETE FROM characters WHERE book_id = ? AND name = ?'
      ).run(params.id, name)
    }

    // 4. Delete the chapter (cascades to continuity_flags, annotations via FK)
    db.prepare('DELETE FROM chapters WHERE id = ?').run(params.chapterId)

    // 5. Shift all higher-numbered chapters in this book down by 1
    db.prepare(
      'UPDATE chapters SET number = number - 1 WHERE book_id = ? AND number > ?'
    ).run(params.id, chapter.number)

    // 6. Bump book updated_at
    db.prepare('UPDATE books SET updated_at = ? WHERE id = ?').run(Date.now(), params.id)
  })()

  return NextResponse.json({ ok: true })
}
