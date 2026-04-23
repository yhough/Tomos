import { queryFirst, queryAll } from '@/db'
import { NextResponse } from 'next/server'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const book = await queryFirst('SELECT id FROM books WHERE id = ?', [params.id])
  if (!book) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const events = await queryAll(
    `SELECT te.id, te.title, te.description, te.category, te.characters,
            te.source, te.source_id, te.in_story_date, te.sort_order, te.created_at,
            c.number AS chapter_number
     FROM timeline_events te
     LEFT JOIN chapters c ON te.source = 'chapter' AND te.source_id = c.id
     WHERE te.book_id = ? AND (te.is_correction IS NULL OR te.is_correction = 0)
     ORDER BY te.sort_order ASC, te.created_at ASC`,
    [params.id]
  )

  return NextResponse.json(events)
}
