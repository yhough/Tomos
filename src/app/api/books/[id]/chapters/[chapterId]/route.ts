import { queryFirst, queryAll, execute, batchWrite } from '@/db'
import { NextResponse } from 'next/server'

export async function GET(
  _req: Request,
  { params }: { params: { id: string; chapterId: string } }
) {
  const chapter = await queryFirst<{
    id: string; number: number; title: string; content: string; word_count: number; summary: string | null
  }>(
    'SELECT id, number, title, content, word_count, summary FROM chapters WHERE id = ? AND book_id = ?',
    [params.chapterId, params.id]
  )

  if (!chapter) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(chapter)
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; chapterId: string } }
) {
  const { number: newNumber } = await req.json() as { number: number }

  if (!Number.isInteger(newNumber) || newNumber < 1) {
    return NextResponse.json({ error: 'Invalid chapter number' }, { status: 400 })
  }

  const chapter = await queryFirst<{ id: string; number: number }>(
    'SELECT id, number FROM chapters WHERE id = ? AND book_id = ?',
    [params.chapterId, params.id]
  )

  if (!chapter) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (chapter.number === newNumber) return NextResponse.json({ ok: true })

  const conflict = await queryFirst<{ id: string }>(
    'SELECT id FROM chapters WHERE book_id = ? AND number = ?',
    [params.id, newNumber]
  )

  const statements: Array<{ sql: string; args: unknown[] }> = []
  if (conflict) {
    statements.push({ sql: 'UPDATE chapters SET number = ? WHERE id = ?', args: [chapter.number, conflict.id] })
  }
  statements.push({ sql: 'UPDATE chapters SET number = ? WHERE id = ?', args: [newNumber, params.chapterId] })
  statements.push({ sql: 'UPDATE books SET updated_at = ? WHERE id = ?', args: [Date.now(), params.id] })

  await batchWrite(statements)
  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string; chapterId: string } }
) {
  const chapter = await queryFirst<{ id: string; number: number; characters_appearing: string }>(
    'SELECT id, number, characters_appearing FROM chapters WHERE id = ? AND book_id = ?',
    [params.chapterId, params.id]
  )

  if (!chapter) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let chapterCharNames: string[] = []
  try { chapterCharNames = JSON.parse(chapter.characters_appearing) } catch { /* ok */ }

  const otherChapters = await queryAll<{ characters_appearing: string }>(
    'SELECT characters_appearing FROM chapters WHERE book_id = ? AND id != ?',
    [params.id, params.chapterId]
  )

  const namesElsewhere = new Set<string>()
  for (const ch of otherChapters) {
    try {
      const names = JSON.parse(ch.characters_appearing) as string[]
      for (const n of names) namesElsewhere.add(n)
    } catch { /* ok */ }
  }

  const statements: Array<{ sql: string; args: unknown[] }> = [
    { sql: `DELETE FROM timeline_events WHERE source = 'chapter' AND source_id = ?`, args: [params.chapterId] },
    { sql: `DELETE FROM book_state_entries WHERE source = 'chapter' AND source_id = ?`, args: [params.chapterId] },
    { sql: 'DELETE FROM chapters WHERE id = ?', args: [params.chapterId] },
    { sql: 'UPDATE chapters SET number = number - 1 WHERE book_id = ? AND number > ?', args: [params.id, chapter.number] },
    { sql: 'UPDATE books SET updated_at = ? WHERE id = ?', args: [Date.now(), params.id] },
  ]

  // Delete characters that only appeared in this chapter
  for (const name of chapterCharNames) {
    if (namesElsewhere.has(name)) continue
    statements.splice(-2, 0, {
      sql: 'DELETE FROM characters WHERE book_id = ? AND name = ?',
      args: [params.id, name],
    })
  }

  await batchWrite(statements)
  return NextResponse.json({ ok: true })
}
