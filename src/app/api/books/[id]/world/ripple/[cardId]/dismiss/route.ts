import { queryFirst, execute } from '@/db'
import { NextResponse } from 'next/server'

export async function POST(
  _: Request,
  { params }: { params: { id: string; cardId: string } }
) {
  const exists = await queryFirst(
    'SELECT id FROM ripple_cards WHERE id = ? AND book_id = ?',
    [params.cardId, params.id]
  )

  if (!exists) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await execute('UPDATE ripple_cards SET status = ? WHERE id = ?', ['dismissed', params.cardId])

  return NextResponse.json({ ok: true })
}
