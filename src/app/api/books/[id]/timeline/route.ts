import { db } from '@/db'
import { NextResponse } from 'next/server'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const book = db.prepare('SELECT id FROM books WHERE id = ?').get(params.id)
  if (!book) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const events = db
    .prepare(
      `SELECT id, title, description, category, characters, source, source_id, in_story_date, sort_order, created_at
       FROM timeline_events WHERE book_id = ? AND (is_correction IS NULL OR is_correction = 0) ORDER BY sort_order ASC, created_at ASC`
    )
    .all(params.id)

  return NextResponse.json(events)
}
