import { queryFirst, execute } from '@/db'
import { generateId } from '@/lib/utils'
import { NextResponse } from 'next/server'

export async function POST(
  _: Request,
  { params }: { params: { id: string; cardId: string } }
) {
  const card = await queryFirst<{ id: string; title: string; description: string; book_id: string }>(
    'SELECT id, title, description, book_id FROM ripple_cards WHERE id = ? AND book_id = ?',
    [params.cardId, params.id]
  )

  if (!card) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await execute('UPDATE ripple_cards SET status = ? WHERE id = ?', ['accepted', params.cardId])

  await execute(
    `INSERT INTO book_state_entries
       (id, book_id, type, name, summary, data, source, source_id, created_at, updated_at)
     VALUES (?, ?, 'world_fact', ?, ?, '{}', 'chat', ?, ?, ?)`,
    [generateId(), params.id, card.title, card.description, card.id, Date.now(), Date.now()]
  )

  await execute('UPDATE books SET updated_at = ? WHERE id = ?', [Date.now(), params.id])

  return NextResponse.json({ ok: true })
}
