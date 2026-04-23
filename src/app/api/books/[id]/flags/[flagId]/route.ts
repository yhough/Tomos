import { queryFirst, execute } from '@/db'
import { NextResponse } from 'next/server'

export async function PATCH(
  _req: Request,
  { params }: { params: { id: string; flagId: string } }
) {
  const flag = await queryFirst(
    'SELECT id FROM continuity_flags WHERE id = ? AND book_id = ?',
    [params.flagId, params.id]
  )

  if (!flag) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await execute(
    'UPDATE continuity_flags SET resolved = 1, resolved_by = ? WHERE id = ?',
    ['manual', params.flagId]
  )

  return NextResponse.json({ ok: true })
}
